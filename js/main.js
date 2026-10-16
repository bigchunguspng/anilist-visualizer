import {
    AniListApiError,
    get_media_lists,
    get_range_activities,
    get_title_activities,
    get_user_by_name,
    search_users
} from "./api.js";
import {
    build_animanga,
    build_mixed_activities,
    build_title_activities
} from "./domain.js";

const CONTENT_ID = "app_content";
const TOOLTIP_ID = "floating_tooltip";
const DEFAULT_FAVICON = "./img/icon.png";
const DAY_MS = 24 * 60 * 60 * 1000;

const VIEW_OVERVIEW = "overview";
const VIEW_THREE_MONTHS = "3m";
const LANG_ENGLISH = "english";
const LANG_JAPANESE = "japanese";
const GROUP_DEFAULT = "default";
const GROUP_GROUPED = "grouped";
const ORDER_DEFAULT = "default";
const ORDER_REVERSE = "reverse";

const STORAGE_KEYS = {
    language: "anilist-visualizer:language",
    grouping: "anilist-visualizer:grouping",
    ordering: "anilist-visualizer:ordering"
};

const status_labels = {
    CURRENT: "Current",
    COMPLETED: "Completed",
    DROPPED: "Dropped",
    PAUSED: "Paused",
    REPEATING: "Repeating"
};

const app_state = {
    routeToken: 0,
    route: {name: "home"},
    userPage: null
};

window.app = app_state;

/**
 * Escapes text before inserting it into generated HTML.
 * @param {*} value - Value to render as text.
 * @returns {string} HTML-safe string.
 * @example escape_html("<AniList>") -> "&lt;AniList&gt;"
 */
function escape_html(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    })[character]);
}
function set_title(title) {
    document.title = title;
}
function set_favicon(url = DEFAULT_FAVICON) {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon";
    link.href = url || DEFAULT_FAVICON;
    document.head.appendChild(link);
}
function read_preference(key, fallback) {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}
function write_preference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage can be disabled; the UI still works for the current session.
    }
}
/**
 * Converts an API exception into the message shown in the page UI.
 * @param {*} error - Thrown value from an AniList request.
 * @returns {string} Safe user-facing error text.
 */
function render_api_error(error) {
    if (!(error instanceof AniListApiError)) {
        return "Could not load data from AniList.";
    }
    return error.message;
}
function tooltip_element() {
    return document.getElementById(TOOLTIP_ID);
}
function hide_tooltip() {
    const tooltip = tooltip_element();
    if (!tooltip) return;
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.classList.remove("visible");
    const legacy_tip = document.getElementById("tip");
    if (legacy_tip) legacy_tip.style.display = "none";
}
/**
 * Positions the legacy tooltip relative to an overview or chart target.
 * @param {HTMLElement} target - Element whose bounds anchor the tooltip.
 * @param {string[]} lines - Plain-text lines to render.
 * @param {boolean} chart - Use chart-specific below-target placement.
 * @returns {void}
 */
function show_legacy_tooltip(target, lines, chart = false) {
    const tip = document.getElementById("tip");
    if (!tip || !lines.length) return;
    tip.innerHTML = lines.map(line => {
        const class_name = /^\+\s*\d+\s+repeats?$/.test(line) ? " class=\"repeats\"" : "";
        return `<p${class_name}>${escape_html(line)}</p>`;
    }).join("");
    tip.style.display = "block";
    const target_rect = chart
        ? target.parentElement.getBoundingClientRect()
        : target.getBoundingClientRect();
    const position_root = tip.offsetParent?.getBoundingClientRect()
        || document.body.getBoundingClientRect();
    const tip_rect = tip.getBoundingClientRect();
    const viewport = document.documentElement.getBoundingClientRect();
    const edge_target = document.querySelector(".tip-rect-ref");
    const edge_rect = edge_target?.getBoundingClientRect();
    const root_left = position_root.left;
    const root_top = position_root.top;
    let left = chart
        ? target_rect.left - (tip_rect.width - target_rect.width) / 2
        : target_rect.left;
    let top = chart
        ? target_rect.bottom + 40
        : target_rect.top - 12 - tip_rect.height;

    if (!chart && edge_rect && left + tip_rect.width > edge_rect.right - 20) {
        left -= tip_rect.width + 5;
    }
    const right_margin = chart ? 30 : 8;
    left = Math.max(viewport.left + 8, Math.min(left, viewport.right - tip_rect.width - right_margin));
    if (top < viewport.top + 8) {
        top = Math.min(target_rect.bottom + 12, viewport.bottom - tip_rect.height - 8);
    }
    if (top + tip_rect.height > viewport.bottom - 8) {
        top = Math.max(viewport.top + 8, target_rect.top - tip_rect.height - 12);
    }

    tip.style.top = `${top - root_top}px`;
    tip.style.left = `${left - root_left}px`;
}
/**
 * Reads newline-separated tooltip text from a data attribute.
 * @param {?HTMLElement} element - Element potentially carrying `data-tooltip`.
 * @returns {string[]} Trimmed non-empty tooltip lines.
 * @example parse_tooltip_lines({dataset: {tooltip: "Title\nJan 1"}}) -> ["Title", "Jan 1"]
 */
function parse_tooltip_lines(element) {
    const raw = element?.dataset?.tooltip;
    return raw ? raw.split("\n").map(item => item.trim()).filter(Boolean) : [];
}
/**
 * Chooses singular/plural episode or chapter wording for a count.
 * @param {string} type - AniList media type.
 * @param {number} count - Unit count.
 * @returns {string} `"episode(s)"` or `"chapter(s)"`.
 */
function unit_label(type, count) {
    const unit = type === "MANGA" ? "chapter" : "episode";
    return `${unit}${count === 1 ? "" : "s"}`;
}
/**
 * Formats completed progress with the media total when it is known.
 * @param {number|string} progress - Completed episode or chapter count.
 * @param {Object} media - Media metadata containing an optional total.
 * @returns {string} Progress with an optional `/total` suffix.
 */
function progress_count(progress, media) {
    let total = media?.type === "MANGA" ? media.chapters : media?.episodes;
    if (media.status === "RELEASING") total ??= "?";
    return total != null && (total === "?" || Number(progress) !== Number(total))
        ? `${progress}/${total}`
        : String(progress);
}
/**
 * Formats a Unix day as a localized UTC date.
 * @param {number} day - Unix day number.
 * @returns {string} Localized date such as `"Jan 2, 2024"`.
 */
function format_day(day) {
    return new Date(day * DAY_MS).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    });
}
/**
 * Formats an AniList timestamp as elapsed time from the current moment.
 * @param {number|string} timestamp - Unix timestamp in seconds.
 * @returns {string} Relative text such as `"3 days ago"` or `"just now"`.
 */
function format_last_activity(timestamp) {
    const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(timestamp || 0));
    const units = [
        ["year", 31536000],
        ["month", 2592000],
        ["week", 604800],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60]
    ];
    for (const [name, size] of units) {
        if (seconds >= size) {
            const value = Math.floor(seconds / size);
            return `${value} ${name}${value === 1 ? "" : "s"} ago`;
        }
    }
    return "just now";
}
/**
 * Selects the preferred title language, falling back through available titles.
 * @param {?Object} titles - AniList title variants.
 * @param {string} language - `english` or the Japanese preference value.
 * @returns {string} Best available title, or `"Untitled"`.
 */
function get_localized_title(titles, language) {
    if (language === LANG_JAPANESE) {
        return titles?.native || titles?.english || titles?.romaji || "Untitled";
    }
    return titles?.english || titles?.romaji || titles?.native || "Untitled";
}
function get_cover_urls(cover) {
    return {
        medium: cover?.medium || cover?.large || cover?.extraLarge || "", // URL: /small/
        large: cover?.large || cover?.extraLarge || cover?.medium || ""   // URL: /medium/
    };
}
function get_cover_color(cover) {
    return cover?.color || "#3db4f2";
}
/**
 * Parses the hash URL into one of the supported application routes.
 * @returns {{name: string, username?: string}} Home, user, or not-found route.
 * @example parse_route() with `#/user/alice` -> {name: "user", username: "alice"}
 */
function parse_route() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const segments = hash.split("/").filter(Boolean).map(decodeURIComponent);
    if (segments.length === 0) {
        return {name: "home"};
    }
    if (segments.length === 2 && segments[0].toLowerCase() === "user" && segments[1]) {
        return {name: "user", username: segments[1]};
    }
    return {name: "not_found"};
}
function render_home() {
    set_title("AniList Visualizer");
    set_favicon();
    return `
        <main class="home pb-3">
            <div class="text-center">
            <img class="logo" draggable="false"
                src="img/anivis-logo.png"
                alt="AniList Visualizer (WHOLESOME 100 | ifunny.co)">
            <form class="searchbar" data-search-form>
                <input id="user-search" class="search section" type="text"
                    name="username" autocomplete="off" placeholder="Enter your username">
            </form>
            <div id="search_results" aria-live="polite"></div>
            <p>Go to <a href="https://anilist.co">AniList</a> if you don't get it.</p>
            </div>
        </main>`;
}
function render_not_found() {
    set_title("Nothing here...");
    set_favicon();
    return `
        <header><div class="nav-mini">
            <a class="nav-logo" href="#" data-home-link>
                <img src="https://anilist.co/img/icons/icon.svg" height="50px" alt="AniList">
                <span>Visualizer</span>
            </a>
        </div></header>
        <main><div class="text-center diffuse">
            <img class="logo" src="img/404.png"
                alt="Akko staring at the monitor">
            <h1>Page Not Found</h1>
            <p>You picked the wrong URL baka!</p>
            </div>
        </main>`;
}
/**
 * Creates the loading, preference, filter, cache, and chart state for a user route.
 * @param {string} username - Requested AniList username.
 * @param {number} token - Navigation token used to reject stale responses.
 * @returns {Object} Mutable user-page state.
 */
function create_user_state(username, token) {
    return {
        token,
        username,
        phase: "loading_user",
        error: null,
        user: null,
        rawEntries: [],
        currentView: VIEW_OVERVIEW,
        selectedMediaId: null,
        loadingMediaId: null,
        activityCache: new Map(),
        activityErrors: new Map(),
        chart: {
            status: "idle",
            data: null,
            error: null,
            selectedMediaId: null,
            selectedCover: null
        },
        prefs: {
            language: read_preference(STORAGE_KEYS.language, LANG_ENGLISH),
            grouping: read_preference(STORAGE_KEYS.grouping, GROUP_DEFAULT),
            ordering: read_preference(STORAGE_KEYS.ordering, ORDER_DEFAULT)
        },
        filter: {
            mode: "all",
            from: null,
            to: null
        },
        allYears: [new Date().getFullYear()]
    };
}
function get_user_page() {
    return app_state.userPage;
}
/**
 * Builds the overview model using the page's active date filter and activities.
 * @param {Object} page - Current user-page state.
 * @returns {Object} Filtered timeline model from `build_animanga`.
 */
function get_overview_model(page) {
    const options = {activities_by_media: page.activityCache};
    if (page.filter.mode === "last_year") {
        options.last_year = true;
    } else if (page.filter.mode === "range" && page.filter.from != null && page.filter.to != null) {
        options.from = page.filter.from;
        options.to = page.filter.to;
    }
    return build_animanga(page.rawEntries, options);
}
/**
 * Inserts separators between entries belonging to different media series.
 * @param {Object[]} entries - Entries already sorted for display.
 * @returns {(Object|string)[]} Entries grouped by series with `"-"` separators.
 * @example [A, B, C] with A/B related -> [A, B, "-", C]
 */
function group_entries(entries) {
    const series = [];
    const seen = new Set();
    for (const entry of entries) {
        const series_id = entry.media.seriesId ?? entry.media.id;
        if (!seen.has(series_id)) {
            seen.add(series_id);
            series.push(series_id);
        }
    }

    const grouped = [];
    for (const series_id of series) {
        grouped.push(...entries.filter(entry => (entry.media.seriesId ?? entry.media.id) === series_id));
        grouped.push("-");
    }
    grouped.pop();
    return grouped;
}
/**
 * Filters out entries without drawable timeline bars and applies grouping.
 * @param {Object} page - Current user-page state.
 * @param {Object} model - Built overview timeline model.
 * @returns {(Object|string)[]} Entries ready for overview rendering.
 */
function get_display_entries(page, model) {
    const visible = model.visibleEntries.filter(entry => entry.timelineItem !== null);
    return page.prefs.grouping === GROUP_GROUPED ? group_entries(visible) : visible;
}
/**
 * Renders proportional calendar sections used behind each timeline row.
 * @param {Object<string, number>} sections - Section labels mapped to day counts.
 * @param {number} timeframe - Total visible days.
 * @param {boolean} text - Whether to include section labels.
 * @returns {string} Timeline-section HTML.
 */
function timeline_sections_html(sections, timeframe, text) {
    return Object.entries(sections).map(([label, value]) => `
        <div class="timeline-year${text ? " text" : ""}" style="width:${(value / timeframe) * 100}%;">
            ${text ? escape_html(label) : ""}
        </div>`).join("");
}
/**
 * Builds tooltip lines for a title's timeline interval and progress.
 * @param {Object} entry - Normalized timeline entry.
 * @returns {string[]} Date, progress, speed, and repeat lines.
 */
function entry_tooltip_lines(entry) {
    const tip = entry.timelineItem?.tip;
    if (!tip) return [];
    const lines = [entry.timelineItem.tip.dateRange];
    if (tip.episodes != null) {
        lines.push(`${progress_count(tip.episodes, entry.media)} ${unit_label(entry.media.type, tip.episodes)}`);
    }
    if (tip.averageSpeed) lines.push(tip.averageSpeed);
    if ((entry.repeat || 0) > 0) lines.push(`+ ${entry.repeat} repeat${entry.repeat === 1 ? "" : "s"}`);
    return lines;
}
/**
 * Builds tooltip lines for one title activity marker.
 * @param {Object} activity - Chart-ready activity.
 * @param {Object} media - AniList media metadata.
 * @returns {string[]} Date and progress lines.
 */
function title_activity_lines(activity, media) {
    const lines = [format_day(activity.day)];
    if (activity.episodes) lines.push(`Progress: ${activity.episodes}`);
    lines.push(`${progress_count(activity.progress, media)} ${unit_label(media.type, activity.progress)}`);
    return lines;
}
/**
 * Renders per-day activity markers over an overview timeline bar.
 * @param {Object} entry - Entry containing title activities.
 * @param {number} min_day - Timeline's first Unix day.
 * @param {number} timeframe - Number of displayed days.
 * @param {string} color - CSS color for activity markers.
 * @returns {string} Activity overlay HTML, or an empty string.
 */
function render_activity_overlay(entry, min_day, timeframe, color) {
    const activities = entry.timelineItem?.activities?.activities || [];
    if (!activities.length) return "";
    return `<div class="days activity-overlay" style="--color-blue:${color};">${activities.map(activity => {
        const left = ((activity.day - min_day - 1) / timeframe) * 100;
        const width = 100 / timeframe;
        const height = (activity.progress / 8) * 100;
        return `
            <div class="day" style="left:${left}%;width:${width}%;height:${height}%;"
                data-tooltip="${escape_html(title_activity_lines(activity, entry.media).join("\n"))}"></div>`;
    }).join("")}</div>`;
}
/**
 * Renders one anime/manga row with airing, progress, and activity overlays.
 * @param {Object} entry - Timeline entry.
 * @param {Object} page - Current user-page state and preferences.
 * @param {Object} model - Overview timeline model.
 * @returns {string} Entry row HTML.
 */
function render_entry(entry, page, model) {
    const media_id = entry.media.id;
    const timeframe = model.maxDay - model.minDay + 1;
    const title = get_localized_title(entry.media.title, page.prefs.language);
    const item = entry.timelineItem;
    const cover_urls = get_cover_urls(entry.media.coverImage);
    const cover_color = get_cover_color(entry.media.coverImage);
    const activity_color = item.activities ? `${cover_color}10` : cover_color;
    const tooltip = entry_tooltip_lines(entry).join("\n");
    const progress_style = `margin-left:${(item.offset / timeframe) * 100}%;width:${(item.length / timeframe) * 100}%;`;
    const airing = entry.media.airing;

    return `
        <div class="entry">
            <div class="cover">
                <div class="image color" style="background-image:url('${escape_html(cover_urls.large)}'),url('${escape_html(cover_urls.medium)}');--color-blue:${cover_color};"></div>
                <a class="link" href="${escape_html(entry.media.siteUrl || "#")}" target="_blank" rel="noreferrer">
                    ${entry.media.type === "MANGA" ? "マ" : "ア"}
                </a>
            </div>
            <div class="title ${escape_html(entry.status)}">${escape_html(title)}</div>
            <div class="timeline tip-rect-ref">
                <div class="timeline-row">${timeline_sections_html(model.timelineSections, timeframe, false)}</div>
                ${airing ? `
                    <div class="timeline-item releasing stripes"
                        style="margin-left:${(airing.offset / timeframe) * 100}%;width:${(airing.length / timeframe) * 100}%;">
                        <div class="season">${escape_html(airing.season)}</div>
                    </div>` : ""}
                ${render_activity_overlay(entry, model.minDay, timeframe, cover_color)}
                <div class="timeline-item tip" style="${progress_style}">
                    <div class="range${item.stripes ? " stripes" : ""}" style="--color-blue:${activity_color};">
                        <div class="hover-box" data-action="load-entry" data-media-id="${media_id}"
                            data-tooltip="${escape_html(tooltip)}"></div>
                    </div>
                </div>
                <div class="timeline-row text">${timeline_sections_html(model.timelineSections, timeframe, true)}</div>
            </div>
            <span class="entry-status">
                ${entry.status !== "COMPLETED"
                    ? `<img src="./img/status/${escape_html(entry.status)}.svg" alt="${escape_html(entry.status)}">`
                    : ""}
            </span>
        </div>`;
}
function render_overview(page) {
    const model = get_overview_model(page);
    const entries = get_display_entries(page, model);
    const header = `${model.visibleEntries.length}/${model.entries.length} titles · ${model.seriesShown}/${model.seriesTotal} series`;
    const years = page.allYears;
    const list_html = entries.length
        ? entries.map(item => item === "-" ? `<hr class="series-divider">` : render_entry(item, page, model)).join("")
        : `<p class="message">This user has no drawable titles in the selected range.</p>`;

    return `
        <section class="visualizer-body">
            <div class="control-panel">
                <div class="section-name">
                    <h3>All</h3>
                    <div>${escape_html(header)}</div>
                </div>
                <div class="actions" id="buttons">
                    ${page.filter.mode !== "last_year"
                        ? `<button type="button" class="section" data-action="set-filter" data-filter="last_year">Last year</button>`
                        : ""}
                    <button type="button" class="section" data-action="toggle-pref" data-pref="language">
                        ${page.prefs.language === LANG_JAPANESE ? "English" : "日本語"}
                    </button>
                    <button type="button" class="section" data-action="toggle-pref" data-pref="grouping">
                        ${page.prefs.grouping === GROUP_GROUPED ? "Restore" : "Group"}
                    </button>
                    <button type="button" class="section" data-action="toggle-pref" data-pref="ordering">
                        Reverse
                    </button>
                    <label class="year-filter"><div>From:</div>
                    <select class="section" data-filter-year="from">
                            ${years.map(year => `<option value="${year}"${year === page.filter.from ? " selected" : ""}>${year}</option>`).join("")}
                    </select>
                    </label>
                    <label class="year-filter"><div>To:</div>
                    <select class="section" data-filter-year="to">
                            ${years.map(year => `<option value="${year}"${year === page.filter.to ? " selected" : ""}>${year}</option>`).join("")}
                    </select>
                    </label>
                </div>
            </div>
            <div id="animanga" class="medialist section${page.prefs.ordering === ORDER_REVERSE ? " reverse" : ""}">
                ${list_html}
            </div>
            <div class="hint-message-div">
                <span class="hint-message">
                    J - switch language.<br>
                    G - switch grouping.<br>
                    R - reverse / restore.<br><br>
                    Click on colorful rectangle to see activities. Timeline height = 8 episodes / chapters.
                </span>
            </div>
            <div class="tipbox absolute"><span id="tip"></span></div>
        </section>`;
}
/**
 * Calculates the AniList query window covering today and the previous 3 months.
 * @returns {{from: number, to: number}} Unix timestamp bounds in seconds.
 * @example get_chart_range() -> {from: 172..., to: 172...}
 */
function get_chart_range() {
    const today = new Date();
    const start_of_today = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
    ));
    const from = new Date(start_of_today.getTime());
    from.setUTCMonth(from.getUTCMonth() - 3);
    const tomorrow = new Date(start_of_today.getTime() + DAY_MS);
    return {
        from: Math.floor(from.getTime() / 1000) - 1,
        to: Math.floor(tomorrow.getTime() / 1000)
    };
}
/**
 * Builds chart tooltip lines with localized title and progress details.
 * @param {Object} activity - Chart activity containing media metadata.
 * @param {string} language - Current title-language preference.
 * @returns {string[]} Tooltip lines.
 */
function chart_activity_lines(activity, language) {
    const title = get_localized_title(activity.media?.title, language);
    const lines = [title, format_day(activity.day)];
    if (activity.episodes) lines.push(`Progress: ${activity.episodes}`);
    lines.push(`${activity.progress} ${unit_label(activity.media?.type, activity.progress)}`);
    return lines;
}
function render_chart(page) {
    if (page.chart.status === "loading" || page.chart.status === "idle") {
        return `<div class="section-name error">Loading...</div>`;
    }
    if (page.chart.status === "error") {
        return `<div class="section-name error">${escape_html(page.chart.error)}</div>`;
    }

    const chart = page.chart.data;
    if (!chart || chart.activities.length === 0) {
        return `<div class="section-name error">No activities were recorded in the last 3 months.</div>`;
    }

    return `
        <section class="pb-3" style="position:relative">
            <div id="days">
                ${chart.smallerUnits.map((unit, index) => `
                    <div class="am3-day" style="--width:${(unit.value / chart.smallerUnits.length) * 100}%;">
                        <div class="am3-day-title">${escape_html(unit.title)}</div>
                        <div class="am3-activities">
                            ${(chart.activities[index] || []).map(activity => `
                                <div
                                    class="am3-activity tip-rect-ref media-${activity.media.id}${page.chart.selectedMediaId && page.chart.selectedMediaId !== activity.media.id ? " semi" : ""}"
                                    data-action="select-chart-media"
                                    data-media-id="${activity.media.id}"
                                    data-tooltip="${escape_html(chart_activity_lines(activity, page.prefs.language).join("\n"))}"
                                    style="height:${(activity.progress / chart.maxProgressValue) * 100}%;--color-blue:${get_cover_color(activity.media.coverImage)};"
                                    data-cover-medium="${escape_html(get_cover_urls(activity.media.coverImage).medium)}"
                                    data-cover-large="${escape_html(get_cover_urls(activity.media.coverImage).large)}">
                                </div>`).join("")}
                        </div>
                    </div>`).join("")}
            </div>
            <div id="months">
                ${chart.biggerUnits.map(unit => `
                    <div class="am3-month" style="--width:${(unit.value / chart.smallerUnits.length) * 100}%;">
                        ${escape_html(unit.title)}
                    </div>`).join("")}
            </div>
            <div class="hint-message-div">
                <span class="hint-message">
                    Single click - highlight specific title.<br>
                    Escape / Double click - restore.
                </span>
            </div>
            <div
                class="am3-image${page.chart.selectedCover ? " has-selection" : ""}"
                id="image"
                ${page.chart.selectedCover
                    ? `style="background-image:url('${escape_html(page.chart.selectedCover.large)}'),url('${escape_html(page.chart.selectedCover.medium)}');"`
                    : ""}></div>
            <div class="tipbox absolute"><span id="tip"></span></div>
        </section>`;
}
function render_user_page(page) {
    const display_name = page.user?.name || page.username;
    set_title(`${display_name} · Anilist Visualizer`);

    const user = page.user;
    const avatar = user?.avatar?.large || "";
    const base_model = build_animanga(page.rawEntries);
    const header_text = page.phase === "loading_user"
        ? "Loading user..."
        : page.phase === "loading_entries"
            ? "Loading timeline..."
            : page.phase === "error"
                ? page.error
                : `${base_model.visibleEntries.length} titles · ${base_model.seriesShown} series`;

    return `
        <header class="user">
            <div class="nav-mini">
                <a class="nav-logo" href="#" data-home-link>
                    <img src="https://anilist.co/img/icons/icon.svg" height="50px" alt="AniList">
                    <span>Visualizer</span>
                </a>
            </div>
            <div class="banner-shadow"></div>
            <div class="container-xd user-info">
                ${user ? `
                    <a href="${escape_html(user.siteUrl || "#")}" target="_blank" rel="noreferrer">
                        <img class="avatar" src="${escape_html(avatar)}" alt="avatar.jpeg">
                    </a>` : ""}
                ${user
                    ? `<div class="text">
                        <h1 class="user-name">${escape_html(display_name)}</h1>
                        <p class="user-count">Last activity: ${escape_html(format_last_activity(user.updatedAt))}</p>
                    </div>`
                    : `<div class="user-count error">${escape_html(header_text)}</div>`}
            </div>
        </header>
        <main aria-live="polite">
            ${user ? `
                <div class="nav-wrap">
                    <div class="container-xd nav" role="tablist" aria-label="Visualization view">
                        <button
                            type="button"
                            class="nav-link${page.currentView === VIEW_OVERVIEW ? " active" : ""}"
                            data-action="switch-view"
                            data-view="${VIEW_OVERVIEW}"
                            role="tab"
                            aria-selected="${page.currentView === VIEW_OVERVIEW}">
                            Overview
                        </button>
                        <button
                            type="button"
                            class="nav-link${page.currentView === VIEW_THREE_MONTHS ? " active" : ""}"
                            data-action="switch-view"
                            data-view="${VIEW_THREE_MONTHS}"
                            role="tab"
                            aria-selected="${page.currentView === VIEW_THREE_MONTHS}">
                            Last 3 months
                        </button>
                    </div>
                </div>` : ""}
            <div class="container-xd${page.currentView === VIEW_THREE_MONTHS ? " am3-container" : ""}">
                ${page.phase === "loading_user" || page.phase === "loading_entries"
                    ? `<section class="panel"><p class="message">${escape_html(header_text)}</p></section>`
                    : page.phase === "error"
                        ? `<section class="panel"><p class="message error">${escape_html(page.error)}</p></section>`
                        : page.currentView === VIEW_OVERVIEW
                            ? render_overview(page)
                            : render_chart(page)}
            </div>
        </main>`;
}
function render_search_state(message, is_error = false) {
    const results = document.querySelector("#search_results");
    if (!results) return;
    results.innerHTML = `<div class="mb-3 medialist section search-results"><div class="error">${escape_html(message)}</div></div>`;
}
function render_search_results(users) {
    const results = document.querySelector("#search_results");
    if (!results) return;
    if (users.length === 0) {
        results.innerHTML = `
            <div class="mb-3 medialist section search-results">
                <div class="search-result entry">
                    <div class="cover"><div class="image" style="background-image:url(img/nobody.png)"></div></div>
                    <div class="title">Nobody Was Found</div><div class="last-seen">XD</div>
                </div>
            </div>`;
        return;
    }
    results.innerHTML = `
        <div class="mb-3 medialist section search-results">
            ${users.map(user => `
                <a class="search-result entry" href="#/user/${encodeURIComponent(user.name)}">
                    <div class="cover"><div class="image" style="background-image:url('${escape_html(user.avatar?.large || user.avatar?.medium || "")}')"></div></div>
                    <div class="title">${escape_html(user.name)}</div>
                    <div class="last-seen">${escape_html(format_last_activity(user.updatedAt))}</div>
                </a>`).join("")}
        </div>`;
}
/**
 * Re-renders the current route and hides stale tooltips.
 * @returns {void}
 */
function update_user_render() {
    const content = document.getElementById(CONTENT_ID);
    if (!content) return;
    hide_tooltip();
    if (app_state.route.name === "home") {
        content.innerHTML = render_home();
    } else if (app_state.route.name === "user" && app_state.userPage) {
        content.innerHTML = render_user_page(app_state.userPage);
    } else {
        content.innerHTML = render_not_found();
    }
}
/**
 * Loads a user route while ignoring responses from obsolete navigations.
 * @param {string} username - AniList username from the hash route.
 * @returns {Promise<void>}
 */
async function load_user_route(username) {
    const token = ++app_state.routeToken;
    const page = create_user_state(username, token);
    app_state.userPage = page;
    app_state.route = {name: "user", username};
    update_user_render();

    try {
        const user = await get_user_by_name(username);
        if (app_state.userPage?.token !== token) return;
        if (!user) {
            page.phase = "error";
            page.error = "User not found.";
            update_user_render();
            return;
        }

        page.user = user;
        page.phase = "loading_entries";
        set_title(`${user.name} · AniList Visualizer`);
        set_favicon(user.avatar?.medium || user.avatar?.large || DEFAULT_FAVICON);
        update_user_render();

        const entries = await get_media_lists(user.id);
        if (app_state.userPage?.token !== token) return;

        page.rawEntries = entries;
        page.phase = "ready";
        const full = build_animanga(entries);
        page.allYears = full.years;
        page.filter.from = full.years[0];
        page.filter.to = full.years[full.years.length - 1];
        update_user_render();
    } catch (error) {
        if (app_state.userPage?.token !== token) return;
        page.phase = "error";
        page.error = render_api_error(error);
        update_user_render();
    }
}
/**
 * Lazily fetches and builds the last-three-month chart for a user page.
 * @param {Object} page - Current user-page state.
 * @returns {Promise<void>}
 */
async function ensure_chart_loaded(page) {
    if (!page?.user || page.chart.status === "loading" || page.chart.status === "ready") return;
    page.chart.status = "loading";
    page.chart.error = null;
    update_user_render();
    try {
        const range = get_chart_range();
        const raw = await get_range_activities(page.user.id, range.from, range.to);
        if (app_state.userPage?.token !== page.token) return;
        page.chart.status = "ready";
        page.chart.data = build_mixed_activities(raw);
        update_user_render();
    } catch (error) {
        if (app_state.userPage?.token !== page.token) return;
        page.chart.status = "error";
        page.chart.error = render_api_error(error);
        update_user_render();
    }
}
/**
 * Lazily loads and caches activity details for one overview title.
 * @param {Object} page - Current user-page state.
 * @param {number} media_id - AniList media ID.
 * @returns {Promise<void>}
 */
async function load_entry_activities(page, media_id) {
    if (!page?.user || page.activityCache.has(media_id) || page.loadingMediaId === media_id) return;
    page.loadingMediaId = media_id;
    page.activityErrors.delete(media_id);
    try {
        const raw = await get_title_activities(page.user.id, media_id);
        if (app_state.userPage?.token !== page.token) return;
        page.activityCache.set(media_id, build_title_activities(raw));
    } catch (error) {
        if (app_state.userPage?.token !== page.token) return;
        page.activityErrors.set(media_id, render_api_error(error));
    } finally {
        if (app_state.userPage?.token !== page.token) return;
        if (page.loadingMediaId === media_id) page.loadingMediaId = null;
        update_user_render();
    }
}
/**
 * Toggles and persists one of the language, grouping, or ordering preferences.
 * @param {Object} page - Current user-page state.
 * @param {string} preference - Preference key selected by the user.
 * @returns {void}
 */
function toggle_preference(page, preference) {
    if (preference === "language") {
        page.prefs.language = page.prefs.language === LANG_JAPANESE ? LANG_ENGLISH : LANG_JAPANESE;
        write_preference(STORAGE_KEYS.language, page.prefs.language);
    } else if (preference === "grouping") {
        page.prefs.grouping = page.prefs.grouping === GROUP_GROUPED ? GROUP_DEFAULT : GROUP_GROUPED;
        write_preference(STORAGE_KEYS.grouping, page.prefs.grouping);
    } else if (preference === "ordering") {
        page.prefs.ordering = page.prefs.ordering === ORDER_REVERSE ? ORDER_DEFAULT : ORDER_REVERSE;
        write_preference(STORAGE_KEYS.ordering, page.prefs.ordering);
    }
    update_user_render();
}
/**
 * Selects all-time or last-year overview filtering.
 * @param {Object} page - Current user-page state.
 * @param {string} mode - `"all"` or `"last_year"`.
 * @returns {void}
 */
function set_filter_mode(page, mode) {
    page.filter.mode = mode;
    if (mode === "all") {
        page.filter.from = page.allYears[0];
        page.filter.to = page.allYears[page.allYears.length - 1];
    }
    update_user_render();
}
/**
 * Sets a year endpoint and keeps the range ordered.
 * @param {Object} page - Current user-page state.
 * @param {"from"|"to"} which - Endpoint being changed.
 * @param {string|number} value - Selected calendar year.
 * @returns {void}
 */
function update_year_filter(page, which, value) {
    page.filter.mode = "range";
    page.filter[which] = Number(value);
    if (page.filter.from > page.filter.to) {
        const swap = page.filter.from;
        page.filter.from = page.filter.to;
        page.filter.to = swap;
    }
    update_user_render();
}
/**
 * Resolves the current hash route and starts any required user loading.
 * @returns {void}
 */
function render_route() {
    const route = parse_route();
    app_state.route = route;
    hide_tooltip();

    if (route.name === "home") {
        app_state.userPage = null;
        update_user_render();
        return;
    }

    if (route.name === "user") {
        if (app_state.userPage?.username === route.username && app_state.route.name === "user") {
            update_user_render();
            return;
        }
        load_user_route(route.username);
        return;
    }

    app_state.userPage = null;
    update_user_render();
}

document.addEventListener("submit", event => {
    const form = event.target.closest("[data-search-form]");
    if (!form) return;

    event.preventDefault();
    const input = form.querySelector("input");
    const username = input?.value.trim() || "";
    if (!username) {
        render_search_state("Enter an AniList username to search.", true);
        return;
    }

    render_search_state("Searching...");
    search_users(username)
        .then(render_search_results)
        .catch(error => render_search_state(render_api_error(error), true));
});

document.addEventListener("click", event => {
    const home_link = event.target.closest("[data-home-link]");
    if (home_link) {
        event.preventDefault();
        window.location.hash = "";
        return;
    }

    const page = get_user_page();
    if (!page || page.phase !== "ready") return;

    const toggle = event.target.closest("[data-action='toggle-pref']");
    if (toggle) {
        toggle_preference(page, toggle.dataset.pref);
        return;
    }

    const filter = event.target.closest("[data-action='set-filter']");
    if (filter) {
        set_filter_mode(page, filter.dataset.filter);
        return;
    }

    const tab = event.target.closest("[data-action='switch-view']");
    if (tab) {
        page.currentView = tab.dataset.view;
        update_user_render();
        if (page.currentView === VIEW_THREE_MONTHS) ensure_chart_loaded(page);
        return;
    }

    const load_entry = event.target.closest("[data-action='load-entry']");
    if (load_entry) {
        load_entry_activities(page, Number(load_entry.dataset.mediaId));
        return;
    }

    const select_chart = event.target.closest("[data-action='select-chart-media']");
    if (select_chart) {
        page.chart.selectedMediaId = Number(select_chart.dataset.mediaId);
        page.chart.selectedCover = {
            large: select_chart.dataset.coverLarge || "",
            medium: select_chart.dataset.coverMedium || ""
        };
        highlight_chart_activity(select_chart);
        return;
    }
});

/**
 * Shows a chart title's cover and dims activities belonging to other titles.
 * @param {HTMLElement} activity - Selected chart activity element.
 * @returns {void}
 */
function highlight_chart_activity(activity) {
    const image = document.getElementById("image");
    if (image) {
        image.style.backgroundImage = `url("${activity.dataset.coverLarge || ""}"), url("${activity.dataset.coverMedium || ""}")`;
        image.classList.add("has-selection");
    }
    document.querySelectorAll(".am3-activity").forEach(item => item.classList.remove("semi"));
    document.querySelectorAll(`.am3-activity:not(.media-${activity.dataset.mediaId})`)
        .forEach(item => item.classList.add("semi"));
}

document.addEventListener("change", event => {
    const page = get_user_page();
    if (!page || page.phase !== "ready") return;
    const select = event.target.closest("[data-filter-year]");
    if (!select) return;
    update_year_filter(page, select.dataset.filterYear, select.value);
});

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.shiftKey) return;
    const page = get_user_page();
    if (!page || page.phase !== "ready") return;
    if (event.code === "Escape" && page.currentView === VIEW_THREE_MONTHS) {
        page_for_chart_reset();
        return;
    }
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable) return;

    if (event.code === "KeyJ") {
        toggle_preference(page, "language");
    } else if (event.code === "KeyG") {
        toggle_preference(page, "grouping");
    } else if (event.code === "KeyR") {
        toggle_preference(page, "ordering");
    }
});

document.addEventListener("mouseover", event => {
    const target = event.target.closest("[data-tooltip]");
    if (!target || target.contains(event.relatedTarget)) return;
    const lines = parse_tooltip_lines(target);
    if (lines.length) show_legacy_tooltip(target, lines, target.classList.contains("am3-activity"));
});

document.addEventListener("mouseout", event => {
    const target = event.target.closest("[data-tooltip]");
    if (!target || target.contains(event.relatedTarget)) return;
    hide_tooltip();
});

document.addEventListener("focusin", event => {
    const target = event.target.closest("[data-tooltip]");
    if (!target) return;
    const lines = parse_tooltip_lines(target);
    if (lines.length) show_legacy_tooltip(target, lines, target.classList.contains("am3-activity"));
});

document.addEventListener("focusout", event => {
    const target = event.target.closest("[data-tooltip]");
    if (!target || target.contains(event.relatedTarget)) return;
    hide_tooltip();
});

window.addEventListener("scroll", hide_tooltip, {passive: true});
window.addEventListener("resize", hide_tooltip);
document.addEventListener("dblclick", event => {
    const page = get_user_page();
    if (!page || page.phase !== "ready" || page.currentView !== VIEW_THREE_MONTHS) return;
    if (!event.target.closest(".am3-container")) return;
    page_for_chart_reset();
});

function page_for_chart_reset() {
    const page = get_user_page();
    if (!page) return;
    page.chart.selectedMediaId = null;
    page.chart.selectedCover = null;
    update_user_render();
}
window.addEventListener("hashchange", render_route);

render_route();
