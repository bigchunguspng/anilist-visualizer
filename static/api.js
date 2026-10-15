const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
const PAGE_SIZE = 50;
const CACHE_PREFIX = "anilist-visualizer:graphql:";
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX_ENTRIES = 40;

// STATE
const in_flight_requests = new Map();

// QUERIES
const USER_FIELDS = `
    id
    name
    updatedAt
    siteUrl
    avatar { large medium }
`;
const MEDIA_FIELDS = `
    id
    type
    status
    episodes
    chapters
    siteUrl
    title { english romaji native }
    coverImage { large extraLarge color }
    startDate { year month day }
    endDate { year month day }
    season
    seasonYear
    relations {
        edges {
            relationType
            node { id }
        }
    }
`;
const USER_QUERY = `
    query UserById($id: Int) {
        User(id: $id) { ${USER_FIELDS} }
    }
`;
const USER_SEARCH_QUERY = `
    query SearchUsers($search: String!, $page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            users(search: $search) { ${USER_FIELDS} }
        }
    }
`;
const MEDIA_LIST_QUERY = `
    query MediaListPage(
        $userId: Int!,
        $status: MediaListStatus!,
        $page: Int!,
        $perPage: Int!
    ) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            mediaList(userId: $userId, status: $status, sort: STARTED_ON) {
                id
                progress
                repeat
                status
                startedAt { year month day }
                completedAt { year month day }
                media { ${MEDIA_FIELDS} }
            }
        }
    }
`;
const TITLE_ACTIVITIES_QUERY = `
    query TitleActivities(
        $userId: Int!,
        $mediaId: Int!,
        $page: Int!,
        $perPage: Int!
    ) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            activities(userId: $userId, mediaId: $mediaId, type: MEDIA_LIST) {
                ... on ListActivity {
                    progress
                    status
                    createdAt
                }
            }
        }
    }
`;
const RANGE_ACTIVITIES_QUERY = `
    query RangeActivities(
        $userId: Int!,
        $from: Int!,
        $to: Int!,
        $page: Int!,
        $perPage: Int!
    ) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            activities(
                userId: $userId,
                type: MEDIA_LIST,
                createdAt_greater: $from,
                createdAt_lesser: $to
            ) {
                ... on ListActivity {
                    progress
                    status
                    createdAt
                    media {
                        id
                        type
                        title { english romaji native }
                        coverImage { large extraLarge color }
                        siteUrl
                    }
                }
            }
        }
    }
`;

// CACHE
/**
 * Creates a stable session-storage key for a GraphQL query and variables.
 * @param {string} query - GraphQL document.
 * @param {Object} variables - GraphQL variables.
 * @returns {string} Namespaced cache key.
 */
function cache_key(query, variables) {
    return `${CACHE_PREFIX}${query}:${JSON.stringify(variables)}`;
}
/**
 * Reads an unexpired cached GraphQL response.
 * @param {string} key - Cache key.
 * @returns {?Object} Cached data, or `null` when absent/expired/unreadable.
 */
function cache_read(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (!cached || cached.expires_at <= Date.now()) {
            sessionStorage.removeItem(key);
            return null;
        }
        return cached.data;
    } catch {
        return null;
    }
}
/**
 * Stores a response and removes the oldest cache entries beyond the limit.
 * @param {string} key - Cache key.
 * @param {Object} data - GraphQL response data.
 * @returns {void}
 */
function cache_write(key, data) {
    try {
        const entries = [];
        for (let index = 0; index < sessionStorage.length; index++) {
            const storage_key = sessionStorage.key(index);
            if (storage_key?.startsWith(CACHE_PREFIX)) {
                const item = JSON.parse(sessionStorage.getItem(storage_key));
                if (item?.expires_at > Date.now()) {
                    entries.push({key: storage_key, expires_at: item.expires_at});
                }
            }
        }
        entries.sort((a, b) => b.expires_at - a.expires_at);
        for (const entry of entries.slice(CACHE_MAX_ENTRIES - 1)) {
            sessionStorage.removeItem(entry.key);
        }
        sessionStorage.setItem(key, JSON.stringify({
            expires_at: Date.now() + CACHE_TTL_MS,
            data
        }));
    } catch {
        // Storage can be disabled or full; the request result remains usable.
    }
}

// API HELPERS
/**
 * Error type carrying a user-facing message and AniList failure category.
 * @param {string} message - Displayable error message.
 * @param {string} kind - Category such as `network`, `graphql`, or `rate_limit`.
 * @param {Object} details - Extra response/status metadata.
 */
export class AniListApiError extends Error {
    constructor(message, kind, details = {}) {
        super(message);
        this.name = "AniListApiError";
        this.kind = kind;
        Object.assign(this, details);
    }
}
/**
 * Extracts paginated items and `hasNextPage` from a nested GraphQL response.
 * @param {string[]} path - Keys leading to the page object.
 * @param {string} items_key - Page property containing the item array.
 * @returns {Function} Reader returning `{items, hasNextPage}`.
 * @example page_reader(["Page"], "users")(data) -> {items: [...], hasNextPage: false}
 */
function page_reader(path, items_key) {
    return data => {
        let page = data;
        for (const key of path) page = page?.[key];
        return {
            items: page?.[items_key],
            hasNextPage: page?.pageInfo?.hasNextPage
        };
    };
}
/**
 * Posts a GraphQL query with caching and in-flight request deduplication.
 * @param {string} query - GraphQL document.
 * @param {Object} variables - GraphQL variables.
 * @returns {Promise<Object>} GraphQL `data` payload.
 */
async function post_graphql(query, variables) {
    const key = cache_key(query, variables);
    const cached = cache_read(key);
    if (cached !== null) return cached;
    if (in_flight_requests.has(key)) return in_flight_requests.get(key);

    const request = fetch(ANILIST_GRAPHQL_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json", Accept: "application/json"},
        body: JSON.stringify({query, variables})
    }).then(async response => {
        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new AniListApiError(
                "AniList returned an invalid response.",
                "invalid_response",
                {status: response.status}
            );
        }
        if (response.status === 429) {
            throw new AniListApiError(
                "AniList rate limit exceeded. Please wait and try again.",
                "rate_limit",
                {status: response.status}
            );
        }
        if (!response.ok) {
            throw new AniListApiError(
                `AniList request failed (HTTP ${response.status}).`,
                "http",
                {status: response.status, payload}
            );
        }
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            const error_message = payload.errors.map(error => error.message)
                .filter(Boolean).join(" ");
            const is_rate_limit = /rate.?limit|too many requests/i.test(error_message);
            throw new AniListApiError(
                is_rate_limit
                    ? "AniList rate limit exceeded. Please wait and try again."
                    : error_message ||
                    "AniList rejected the request.",
                is_rate_limit ? "rate_limit" : "graphql",
                {errors: payload.errors}
            );
        }
        if (!payload.data) {
            throw new AniListApiError(
                "AniList returned no data.",
                "invalid_response",
                {payload}
            );
        }
        cache_write(key, payload.data);
        return payload.data;
    }).catch(error => {
        if (error instanceof AniListApiError) throw error;
        throw new AniListApiError(
            navigator.onLine === false
                ? "You appear to be offline."
                : "Could not connect to AniList. Check your connection or browser CORS access.",
            "network",
            {cause: error}
        );
    }).finally(() => in_flight_requests.delete(key));

    in_flight_requests.set(key, request);
    return request;
}
/**
 * Fetches every page of a GraphQL connection and flattens its items.
 * @param {string} query - GraphQL document accepting `page` and `perPage`.
 * @param {Object} variables - Query variables excluding pagination.
 * @param {Function} get_page - Extractor created by `page_reader`.
 * @returns {Promise<Object[]>} Items from all pages.
 */
async function get_all_pages(query, variables, get_page) {
    const results = [];
    let page = 1;
    let has_next_page = true;
    while (has_next_page) {
        const data = await post_graphql(query, {
            ...variables,
            page,
            perPage: PAGE_SIZE
        });
        const current_page = get_page(data);
        if (!current_page || !Array.isArray(current_page.items)) {
            throw new AniListApiError(
                "AniList returned an unexpected page shape.",
                "invalid_response"
            );
        }
        results.push(...current_page.items);
        has_next_page = current_page.hasNextPage === true;
        page++;
    }
    return results;
}

// EXPORT
/**
 * Searches AniList users across all result pages, newest activity first.
 * @param {string} query - Username search text.
 * @returns {Promise<Object[]>} Matching users sorted by `updatedAt`.
 */
export async function search_users(query) {
    const users = await get_all_pages(
        USER_SEARCH_QUERY,
        {search: query.replace(/\s+/g, "")},
        page_reader(["Page"], "users")
    );
    return users.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
/**
 * Loads a public AniList user by numeric ID.
 * @param {number|string} user_id - AniList user ID.
 * @returns {Promise<?Object>} User object, or `null` when absent.
 */
export async function get_user_by_id(user_id) {
    const data = await post_graphql(USER_QUERY, {id: Number(user_id)});
    return data.User;
}
/**
 * Resolves the first AniList user matching a username search.
 * @param {string} username - Username to search.
 * @returns {Promise<?Object>} Best matching user, or `null`.
 */
export async function get_user_by_name(username) {
    const users = await search_users(username);
    return users[0] || null;
}
/**
 * Loads and combines all supported media-list statuses for a user.
 * @param {number|string} user_id - AniList user ID.
 * @returns {Promise<Object[]>} Combined entries from all supported statuses.
 */
export async function get_media_lists(user_id) {
    const statuses = ["CURRENT", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"];
    const lists = await Promise.all(statuses.map(status => get_all_pages(
        MEDIA_LIST_QUERY,
        {userId: Number(user_id), status},
        page_reader(["Page"], "mediaList")
    )));
    return lists.flat();
}
/**
 * Loads all list-activity updates for one title and user.
 * @param {number|string} user_id - AniList user ID.
 * @param {number|string} media_id - AniList media ID.
 * @returns {Promise<Object[]>} Raw title activities.
 */
export async function get_title_activities(user_id, media_id) {
    return get_all_pages(
        TITLE_ACTIVITIES_QUERY,
        {userId: Number(user_id), mediaId: Number(media_id)},
        page_reader(["Page"], "activities")
    );
}
/**
 * Loads list activities bounded by a Unix timestamp window.
 * @param {number|string} user_id - AniList user ID.
 * @param {number|string} from - Lower timestamp bound.
 * @param {number|string} to - Upper timestamp bound.
 * @returns {Promise<Object[]>} Raw range activities.
 */
export async function get_range_activities(user_id, from, to) {
    return get_all_pages(
        RANGE_ACTIVITIES_QUERY,
        {userId: Number(user_id), from: Number(from), to: Number(to)},
        page_reader(["Page"], "activities")
    );
}
