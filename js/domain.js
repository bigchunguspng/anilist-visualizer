const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COVER_COLOR = "#3db4f2";
const MONTH_TITLES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// HELPERS
function valid_integer(value) {
    return Number.isInteger(value);
}
/**
 * Validates an AniList date object and drops invalid calendar components.
 * @param {?Object} value - Date-like `{year, month, day}` value.
 * @returns {?Object} Normalized date, or `null` for invalid input.
 * @example normalize_date({year: 2024, month: 2, day: 29}) -> {year: 2024, month: 2, day: 29}
 */
export function normalize_date(value) {
    if (!value || !valid_integer(value.year) || !valid_integer(value.month) ||
        !valid_integer(value.day) || value.month < 1 || value.month > 12 ||
        value.day < 1 || value.day > 31) {
        return null;
    }
    return {year: value.year, month: value.month, day: value.day};
}
/**
 * Converts a UTC calendar date to an integer day offset from Unix epoch.
 * @param {?Object} value - Date-like `{year, month, day}` value.
 * @returns {?number} Unix day number, or `null` when the date is invalid.
 * @example date_to_day({year: 1970, month: 1, day: 2}) -> 1
 */
export function date_to_day(value) {
    const date = normalize_date(value);
    if (!date) return null;
    return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / DAY_MS);
}
/**
 * Converts a Unix day number back to a UTC calendar date object.
 * @param {number} day - Integer day offset from Unix epoch.
 * @returns {{year: number, month: number, day: number}} UTC date parts.
 * @example day_to_date(1) -> {year: 1970, month: 1, day: 2}
 */
export function day_to_date(day) {
    const date = new Date(day * DAY_MS);
    return {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate()};
}

// ANIMANGA (Overview)
function ov_date_text(value, format) {
    const date = normalize_date(value);
    if (!date) return "";
    if (format === "full") return `${date.day} ${MONTH_TITLES[date.month - 1]} ${date.year}`;
    if (format === "long") return `${MONTH_TITLES[date.month - 1]} ${date.year}`;
    return `${date.day} ${MONTH_TITLES[date.month - 1]}`;
}
/**
 * Normalizes AniList cover URLs and supplies a default accent color.
 * @param {?Object} cover - Raw AniList cover image object.
 * @param {string} media_type - `"ANIME"` or `"MANGA"` URL namespace.
 * @returns {{color: string, large: string, medium: string, extraLarge: string}} Safe cover fields.
 */
function ov_normalize_cover(cover, media_type) {
    const source = cover || {};
    const prefix = `https://s4.anilist.co/file/anilistcdn/media/${media_type === "MANGA" ? "manga" : "anime"}/cover/`;
    const normalize_url = value => value && value.startsWith(prefix) ? value : value || "";
    return {
        color: source.color || DEFAULT_COVER_COLOR,
        large: normalize_url(source.large),
        medium: normalize_url(source.medium),
        extraLarge: normalize_url(source.extraLarge)
    };
}
/**
 * Replaces malformed media fields with display-safe defaults.
 * @param {?Object} media - Raw AniList media object.
 * @returns {Object} Media with normalized title, cover, dates, and timeline fields.
 */
function ov_normalize_media(media) {
    const source = media || {};
    const type = source.type || "ANIME";
    return {
        ...source,
        type,
        title: {
            english: source.title?.english || source.title?.romaji || "",
            romaji: source.title?.romaji || "",
            native: source.title?.native || source.title?.romaji || ""
        },
        coverImage: ov_normalize_cover(source.coverImage, type),
        startDate: normalize_date(source.startDate),
        endDate: normalize_date(source.endDate),
        seriesId: null,
        airing: null
    };
}
/**
 * Collects non-character relation IDs used to connect titles into series.
 * @param {Object} media - Media object containing AniList relation edges.
 * @returns {number[]} Related media IDs.
 */
function ov_relation_ids(media) {
    return (media.relations?.edges || [])
        .filter(edge => edge.relationType !== "CHARACTER" && edge.node?.id != null)
        .map(edge => Number(edge.node.id))
        .filter(Number.isInteger);
}
/**
 * Assigns one shared series ID to connected related-media groups.
 * @param {Object[]} entries - Normalized media-list entries, mutated in place.
 * @returns {void}
 * @example sequel and prequel IDs 20 and 7 -> both entries receive seriesId 7
 */
function ov_set_series_ids(entries) {
    const ids = new Set(entries.map(entry => entry.media.id));
    for (const entry of entries) {
        for (const related_id of ov_relation_ids(entry.media)) ids.add(related_id);
    }
    const parent = new Map([...ids].map(id => [id, id]));
    const find = id => {
        let root = parent.get(id);
        while (root !== parent.get(root)) {
            parent.set(root, parent.get(parent.get(root)));
            root = parent.get(root);
        }
        return root;
    };
    const union = (a, b) => {
        if (!parent.has(a) || !parent.has(b)) return;
        const root_a = find(a);
        const root_b = find(b);
        if (root_a !== root_b) parent.set(root_b, root_a);
    };

    for (const entry of entries) {
        for (const related_id of ov_relation_ids(entry.media)) {
            union(entry.media.id, related_id);
        }
    }

    const groups = new Map();
    for (const id of ids) {
        const root = find(id);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(id);
    }
    for (const group of groups.values()) {
        const series_id = Math.min(...group);
        for (const entry of entries) {
            if (group.includes(entry.media.id)) entry.media.seriesId = series_id;
        }
    }
}
/**
 * Normalizes an entry and repairs a completion date that precedes its start.
 * @param {Object} entry - Raw AniList media-list entry.
 * @returns {Object} Entry with normalized dates/media and no stale timeline item.
 */
function ov_normalize_entry(entry) {
    const start_date = normalize_date(entry.startedAt);
    let complete_date = normalize_date(entry.completedAt);
    if (start_date && complete_date && date_to_day(complete_date) < date_to_day(start_date)) {
        complete_date = start_date;
        return {
            ...entry,
            startedAt: complete_date,
            completedAt: normalize_date(entry.startedAt),
            media: ov_normalize_media(entry.media),
            timelineItem: null
        };
    }
    return {
        ...entry,
        startedAt: start_date,
        completedAt: complete_date,
        media: ov_normalize_media(entry.media),
        timelineItem: null
    };
}
/**
 * Formats a date interval for timeline tooltips.
 * @param {?Object} start - Start date.
 * @param {?Object} end - Optional end date.
 * @param {string} arrow - Suffix used when the interval is open-ended.
 * @param {string} format - Date display format, either `"short"` or `"long"`.
 * @returns {string} Compact date range text.
 */
function ov_format_date_range(start, end, arrow = "➽", format = "short") {
    if (!end) return `${ov_date_text(start, format)} ${arrow}`;
    return `${ov_date_text(start, format)} - ${ov_date_text(end, format)}`;
}
/**
 * Describes average viewing/reading speed using the media's unit.
 * @param {number} progress - Episodes or chapters completed.
 * @param {number} days - Inclusive elapsed days.
 * @param {string} media_type - `"ANIME"` or `"MANGA"`.
 * @returns {string} Human-readable speed such as `"2 episodes/day"`.
 */
function ov_speed_text(progress, days, media_type) {
    const unit = media_type === "MANGA" ? "chapter" : "episode";
    const speed = progress / days;
    const slow = speed < 1;
    const value = Math.round((slow ? 1 / speed : speed) * 10) / 10;
    const one = Math.abs(value - 1) < 0.1;
    return slow
        ? `${unit} every ${one ? "day" : `${value} days`}`
        : `${value} ${unit}${one ? "" : "s"}/day`;
}
/**
 * Adds a clipped list-entry interval and activity tooltip to an entry.
 * @param {Object} entry - Normalized entry, mutated with `timelineItem`.
 * @param {number} min_day - Visible timeline start.
 * @param {number} max_day - Visible timeline end.
 * @param {number} today - Current Unix day used for unfinished entries.
 * @param {?Map} activities_by_media - Optional media ID to activity-model map.
 * @returns {void}
 */
function ov_set_entry_timeline(entry, min_day, max_day, today, activities_by_media) {
    if (!entry.startedAt) return;
    const day_a = date_to_day(entry.startedAt);
    const day_b = date_to_day(entry.completedAt) ?? today;
    if (day_b <= min_day || day_a >= max_day) return;

    const progress_matters = (entry.media.episodes == null || entry.media.episodes > 1) &&
        entry.progress > 0;
    const days = day_b - day_a + 1;
    const timeline = {
        offset: Math.max(day_a - min_day, 0),
        length: Math.min(day_b, max_day) - Math.max(day_a, min_day) + 1,
        tip: {
            dateRange: day_a === day_b ? ov_date_text(entry.startedAt, "short") :
                ov_format_date_range(entry.startedAt, entry.completedAt),
            episodes: progress_matters ? entry.progress : null,
            averageSpeed: null
        },
        stripes: false,
        activities: activities_by_media?.get(entry.media.id) || null
    };
    if (progress_matters && days > 1) {
        timeline.tip.averageSpeed = ov_speed_text(entry.progress, days, entry.media.type);
        timeline.stripes = days / entry.progress > 30;
    }
    entry.timelineItem = timeline;
}
/**
 * Adds the media's release/airing interval clipped to the visible timeline.
 * @param {Object} media - Normalized media, mutated with `airing`.
 * @param {number} min_day - Visible timeline start.
 * @param {number} max_day - Visible timeline end.
 * @param {number} today - Current Unix day for ongoing releases.
 * @returns {void}
 */
function ov_set_airing_timeline(media, min_day, max_day, today) {
    const start = date_to_day(media.startDate) ?? min_day;
    const end = date_to_day(media.endDate) ?? today;
    if (end <= min_day || start >= max_day) return;
    const length = Math.min(end, max_day) - Math.max(start, min_day) + 1;
    let season = "";
    if (length === 1) season = ov_date_text(media.startDate, "full");
    else if (media.season && length > 30) season = `${media.season} ${media.seasonYear || ""}`.trim().toUpperCase();
    else {
        const date_format = media.season ? "short" : "long";
        season = ov_format_date_range(
            media.startDate || day_to_date(min_day), media.endDate, "→", date_format);
    }
    media.airing = {
        offset: Math.max(start - min_day, 0),
        length,
        season
    };
}
/**
 * Builds day-count sections for a timeline spanning one or more months.
 * @param {Object} min_date - First visible date.
 * @param {Object} max_date - Last visible date.
 * @param {boolean} include_year - Add abbreviated years at range boundaries.
 * @returns {Object<string, number>} Section labels mapped to visible day counts.
 * @example ov_month_days({year: 2024, month: 1, day: 30}, {year: 2024, month: 2, day: 2}, false) -> {Jan: 2, Feb: 2}
 */
function ov_month_days(min_date, max_date, include_year) {
    const result = {};
    let cursor = new Date(Date.UTC(min_date.year, min_date.month - 1, 1));
    const end = new Date(Date.UTC(max_date.year, max_date.month - 1, 1));
    let first = true;
    while (cursor <= end) {
        const year = cursor.getUTCFullYear();
        const month = cursor.getUTCMonth() + 1;
        const last = year === max_date.year && month === max_date.month;
        const name = MONTH_TITLES[month - 1];
        const title = include_year && (first || last) ? `${name} '${String(year).slice(-2)}` : name;
        result[title] = first ? new Date(Date.UTC(year, month, 0)).getUTCDate() - min_date.day + 1 :
            last ? max_date.day : new Date(Date.UTC(year, month, 0)).getUTCDate();
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        first = false;
    }
    return result;
}
/**
 * Converts raw list entries into the complete overview timeline model.
 * @param {Object[]} raw_entries - AniList media-list entries.
 * @param {Object} options - Optional range, last-year, and activity settings.
 * @returns {Object} Bounds, sections, series counts, and visible normalized entries.
 * @example ov_build_animanga(entries, {last_year: true}) -> timeline limited to the last 365 days
 */
export function ov_build_animanga(raw_entries, options = {}) {
    const entries = [];
    const seen_media = new Set();
    for (const raw_entry of raw_entries || []) {
        if (!raw_entry?.media?.id || seen_media.has(raw_entry.media.id)) continue;
        seen_media.add(raw_entry.media.id);
        entries.push(ov_normalize_entry(raw_entry));
    }
    ov_set_series_ids(entries);
    entries.sort((a, b) => (date_to_day(a.startedAt) ?? Infinity) - (date_to_day(b.startedAt) ?? Infinity) ||
        (date_to_day(a.completedAt) ?? Infinity) - (date_to_day(b.completedAt) ?? Infinity) || a.id - b.id);

    const showable = entries.filter(entry => entry.startedAt);
    const today = Math.floor(Date.now() / DAY_MS);
    const all_min = showable.length ? Math.min(...showable.map(entry => date_to_day(entry.startedAt))) : today;
    const from = options.from != null && options.to != null ? Number(options.from) : null;
    const subframe = from != null || options.last_year === true;
    const shown_min = options.last_year ? today - 365 :
        from != null ? Math.floor(Date.UTC(from, 0, 1) / DAY_MS) : all_min;
    const shown_max = options.last_year ? today :
        from != null ? Math.floor(Date.UTC(Number(options.to), 11, 31) / DAY_MS) : today;
    const visible = showable.filter(entry => !subframe ||
        date_to_day(entry.startedAt) <= shown_max &&
        (date_to_day(entry.completedAt) ?? today) >= shown_min);
    const min_date = day_to_date(shown_min);
    const max_date = day_to_date(shown_max);
    const timeline_sections = options.last_year ? ov_month_days(min_date, max_date, true) :
        min_date.year === max_date.year ? ov_month_days(min_date, max_date, false) :
            Object.fromEntries(Array.from({length: max_date.year - min_date.year + 1}, (_, index) => {
                const year = min_date.year + index;
                return [String(year), year === min_date.year ? date_to_day({year, month: 12, day: 31}) - shown_min + 1 :
                    year === max_date.year ? shown_max - date_to_day({year, month: 1, day: 1}) + 1 :
                        (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365)];
            }));
    const activities_by_media = options.activities_by_media;
    for (const entry of showable) {
        ov_set_entry_timeline(entry, shown_min, shown_max, today, activities_by_media);
        ov_set_airing_timeline(entry.media, shown_min, shown_max, today);
    }
    return {
        minDay: shown_min,
        maxDay: shown_max,
        today,
        years: Array.from({length: new Date().getFullYear() - min_date.year + 1}, (_, index) => min_date.year + index),
        timelineSections: timeline_sections,
        seriesShown: new Set(visible.map(entry => entry.media.seriesId ?? entry.media.id)).size,
        seriesTotal: new Set(entries.map(entry => entry.media.seriesId ?? entry.media.id)).size,
        entries,
        visibleEntries: visible
    };
}

// ACTIVITIES & AM3 (Last 3 months)
/**
 * Converts an AniList activity progress value into counted units.
 * @param {Object} activity - Activity with optional progress and status.
 * @returns {number} Units represented; completed-without-progress counts as one.
 * @example activity_progress({progress: "4 - 6"}) -> 3
 */
function activity_progress(activity) {
    if (activity.progress == null || activity.progress === "") {
        return String(activity.status).toLowerCase() === "completed" ? 1 : 0;
    }
    const text = String(activity.progress);
    const match = text.match(/^(\d+)\s*-\s*(\d+)$/);
    return match ? Math.max(Number(match[2]) - Number(match[1]) + 1, 0) : 1;
}
/**
 * Combines same-day activity records, extending episode/chapter ranges.
 * @param {Object[]} activities - Activity records containing `day` and `progress`.
 * @returns {Object[]} Sorted records with one merged record per day.
 * @example [{day: 1, progress: 2}, {day: 1, progress: 1}] -> [{day: 1, progress: 3}]
 */
function merge_activities_by_day(activities) {
    const sorted = [...activities].sort((a, b) => a.day - b.day);
    const merged = [];
    for (const activity of sorted) {
        const previous = merged[merged.length - 1];
        if (previous && previous.day === activity.day) {
            const previous_parts = String(previous.episodes || "").match(/\d+/g) || [];
            const activity_parts = String(activity.episodes || "").match(/\d+/g) || [];
            const first = Number(previous_parts[0] || 0);
            const previous_end = Number(previous_parts[previous_parts.length - 1] || first + previous.progress - 1);
            const activity_end = Number(activity_parts[activity_parts.length - 1] ||
                previous_end + activity.progress);
            previous.episodes = `${first} - ${activity_end}`;
            previous.progress += activity.progress;
        } else {
            merged.push({...activity});
        }
    }
    return merged;
}
/**
 * Builds per-title activity bars, merging multiple updates on each day.
 * @param {Object[]} raw_activities - Raw AniList list activities.
 * @returns {{maxProgressValue: number, activities: Object[]}} Chart-ready title data.
 */
export function ov_build_title_activities(raw_activities) {
    const activities = (raw_activities || []).map(activity => ({
        ...activity,
        day: Math.floor(Number(activity.createdAt || 0) / 86400),
        episodes: activity.progress == null ? null : String(activity.progress),
        progress: activity_progress(activity)
    })).filter(activity => activity.progress > 0);
    const united = merge_activities_by_day(activities);
    return {
        maxProgressValue: united.length ? Math.max(...united.map(activity => activity.progress)) : 0,
        activities: united
    };
}
/**
 * Builds a day-indexed activity chart grouped by media and calendar month.
 * @param {Object[]} raw_activities - Raw AniList activities from a date range.
 * @returns {{maxProgressValue: number, smallerUnits: Object[], biggerUnits: Object[], activities: Object[][]}} Chart model.
 * @example no activities -> {maxProgressValue: 0, smallerUnits: [], biggerUnits: [], activities: []}
 */
export function am3_build_mixed_activities(raw_activities) {
    const activities = (raw_activities || []).map(activity => ({
        ...activity,
        day: Math.floor(Number(activity.createdAt || 0) / 86400),
        episodes: activity.progress == null ? null : String(activity.progress),
        progress: activity_progress(activity)
    })).filter(activity => activity.progress > 0);
    if (!activities.length) {
        return {maxProgressValue: 0, smallerUnits: [], biggerUnits: [], activities: []};
    }
    const by_media = new Map();
    for (const activity of activities) {
        if (!by_media.has(activity.media.id)) by_media.set(activity.media.id, []);
        by_media.get(activity.media.id).push(activity);
    }
    const united = [...by_media.values()].flatMap(merge_activities_by_day);
    const min_day = Math.min(...united.map(activity => activity.day));
    const max_day = Math.max(...united.map(activity => activity.day));
    const smaller_units = [];
    for (let day = min_day; day <= max_day; day++) {
        smaller_units.push({title: String(day_to_date(day).day), value: 1});
    }
    const bigger_units = [];
    const min_date = day_to_date(min_day);
    let cursor = {year: min_date.year, month: min_date.month, day: 1};
    while (date_to_day(cursor) <= max_day) {
        const next = cursor.month === 12
            ? {year: cursor.year + 1, month: 1, day: 1}
            : {year: cursor.year, month: cursor.month + 1, day: 1};
        const month_start = Math.max(min_day, date_to_day(cursor));
        const month_end = Math.min(max_day, date_to_day(next) - 1);
        if (month_end >= month_start) {
            bigger_units.push({
                title: MONTH_TITLES[cursor.month - 1],
                value: month_end - month_start + 1
            });
        }
        cursor = next;
    }
    const progress_by_day = new Map();
    for (const activity of united) {
        progress_by_day.set(activity.day, (progress_by_day.get(activity.day) || 0) + activity.progress);
    }
    return {
        maxProgressValue: Math.max(...progress_by_day.values()),
        smallerUnits: smaller_units,
        biggerUnits: bigger_units,
        activities: Array.from({length: max_day - min_day + 1}, (_, offset) =>
            united.filter(activity => activity.day === min_day + offset))
    };
}
