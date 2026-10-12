const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_COVER_COLOR = "#3db4f2";
const MONTH_TITLES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function valid_integer(value) {
    return Number.isInteger(value);
}
export function normalize_date(value) {
    if (!value || !valid_integer(value.year) || !valid_integer(value.month) ||
        !valid_integer(value.day) || value.month < 1 || value.month > 12 ||
        value.day < 1 || value.day > 31) {
        return null;
    }
    return {year: value.year, month: value.month, day: value.day};
}
export function date_to_day(value) {
    const date = normalize_date(value);
    if (!date) return null;
    return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / DAY_MS);
}
export function day_to_date(day) {
    const date = new Date(day * DAY_MS);
    return {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate()};
}
function date_text(value, format) {
    const date = normalize_date(value);
    if (!date) return "";
    if (format === "full") return `${date.day} ${MONTH_TITLES[date.month - 1]} ${date.year}`;
    if (format === "long") return `${MONTH_TITLES[date.month - 1]} ${date.year}`;
    return `${date.day} ${MONTH_TITLES[date.month - 1]}`;
}
function normalize_cover(cover, media_type) {
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
function normalize_media(media) {
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
        coverImage: normalize_cover(source.coverImage, type),
        startDate: normalize_date(source.startDate),
        endDate: normalize_date(source.endDate),
        seriesId: null,
        airing: null
    };
}
function relation_ids(media) {
    return (media.relations?.edges || [])
        .filter(edge => edge.relationType !== "CHARACTER" && edge.node?.id != null)
        .map(edge => Number(edge.node.id))
        .filter(Number.isInteger);
}
function set_series_ids(entries) {
    const ids = new Set(entries.map(entry => entry.media.id));
    for (const entry of entries) {
        for (const related_id of relation_ids(entry.media)) ids.add(related_id);
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
        for (const related_id of relation_ids(entry.media)) {
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
function normalize_entry(entry) {
    const start_date = normalize_date(entry.startedAt);
    let complete_date = normalize_date(entry.completedAt);
    if (start_date && complete_date && date_to_day(complete_date) < date_to_day(start_date)) {
        complete_date = start_date;
        return {
            ...entry,
            startedAt: complete_date,
            completedAt: normalize_date(entry.startedAt),
            media: normalize_media(entry.media),
            timelineItem: null
        };
    }
    return {
        ...entry,
        startedAt: start_date,
        completedAt: complete_date,
        media: normalize_media(entry.media),
        timelineItem: null
    };
}
function format_date_range(start, end, arrow = "➽") {
    if (!end) return `${date_text(start, "short")} ${arrow}`;
    return `${date_text(start, "short")} - ${date_text(end, "short")}`;
}
function speed_text(progress, days, media_type) {
    const unit = media_type === "MANGA" ? "chapter" : "episode";
    const speed = progress / days;
    const slow = speed < 1;
    const value = Math.round((slow ? 1 / speed : speed) * 10) / 10;
    const one = Math.abs(value - 1) < 0.1;
    return slow
        ? `${unit} every ${one ? "day" : `${value} days`}`
        : `${value} ${unit}${one ? "" : "s"}/day`;
}
function set_entry_timeline(entry, min_day, max_day, today, activities_by_media) {
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
            dateRange: day_a === day_b ? date_text(entry.startedAt, "short") :
                format_date_range(entry.startedAt, entry.completedAt),
            episodes: progress_matters ? entry.progress : null,
            averageSpeed: null
        },
        stripes: false,
        activities: activities_by_media?.get(entry.media.id) || null
    };
    if (progress_matters && days > 1) {
        timeline.tip.averageSpeed = speed_text(entry.progress, days, entry.media.type);
        timeline.stripes = days / entry.progress > 30;
    }
    entry.timelineItem = timeline;
}
function set_airing_timeline(media, min_day, max_day, today) {
    const start = date_to_day(media.startDate) ?? min_day;
    const end = date_to_day(media.endDate) ?? today;
    if (end <= min_day || start >= max_day) return;
    const length = Math.min(end, max_day) - Math.max(start, min_day) + 1;
    let season = "";
    if (length === 1) season = date_text(media.startDate, "full");
    else if (media.season && length > 30) season = `${media.season} ${media.seasonYear || ""}`.trim().toUpperCase();
    else season = format_date_range(media.startDate || day_to_date(min_day), media.endDate, "→");
    media.airing = {
        offset: Math.max(start - min_day, 0),
        length,
        season
    };
}
function month_days(min_date, max_date, include_year) {
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
export function build_animanga(raw_entries, options = {}) {
    const entries = [];
    const seen_media = new Set();
    for (const raw_entry of raw_entries || []) {
        if (!raw_entry?.media?.id || seen_media.has(raw_entry.media.id)) continue;
        seen_media.add(raw_entry.media.id);
        entries.push(normalize_entry(raw_entry));
    }
    set_series_ids(entries);
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
    const timeline_sections = options.last_year ? month_days(min_date, max_date, true) :
        min_date.year === max_date.year ? month_days(min_date, max_date, false) :
            Object.fromEntries(Array.from({length: max_date.year - min_date.year + 1}, (_, index) => {
                const year = min_date.year + index;
                return [String(year), year === min_date.year ? date_to_day({year, month: 12, day: 31}) - shown_min + 1 :
                    year === max_date.year ? shown_max - date_to_day({year, month: 1, day: 1}) + 1 :
                        (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365)];
            }));
    const activities_by_media = options.activities_by_media;
    for (const entry of showable) {
        set_entry_timeline(entry, shown_min, shown_max, today, activities_by_media);
        set_airing_timeline(entry.media, shown_min, shown_max, today);
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
function activity_progress(activity) {
    if (activity.progress == null || activity.progress === "") {
        return String(activity.status).toLowerCase() === "completed" ? 1 : 0;
    }
    const text = String(activity.progress);
    const match = text.match(/^(\d+)\s*-\s*(\d+)$/);
    return match ? Math.max(Number(match[2]) - Number(match[1]) + 1, 0) : 1;
}
function merge_activities_by_day(activities) {
    const sorted = [...activities].sort((a, b) => a.day - b.day);
    const merged = [];
    for (const activity of sorted) {
        const previous = merged[merged.length - 1];
        if (previous && previous.day === activity.day) {
            const first = String(previous.episodes || "0").split(/\s+/)[0];
            const parts = String(activity.episodes || "").split(/\s+/);
            previous.episodes = `${first} - ${parts[parts.length - 1] || Number(first) + 1}`;
            previous.progress += activity.progress;
        } else {
            merged.push({...activity});
        }
    }
    return merged;
}
export function build_title_activities(raw_activities) {
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
export function build_mixed_activities(raw_activities) {
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
    for (let day = min_day; day <= max_day; day++) smaller_units.push({title: String(day_to_date(day).day), value: 1});
    const bigger_units = [];
    let cursor = day_to_date(min_day);
    while (date_to_day(cursor) <= max_day) {
        const next = {...cursor, month: cursor.month + 1};
        if (next.month === 13) { next.month = 1; next.year++; }
        const next_day = Math.min(date_to_day(next) - 1, max_day);
        bigger_units.push({title: MONTH_TITLES[cursor.month - 1], value: next_day - date_to_day(cursor) + 1});
        cursor = next;
    }
    return {
        maxProgressValue: Math.max(...by_media.values().map(list => Math.max(...list.map(activity => activity.progress)))),
        smallerUnits: smaller_units,
        biggerUnits: bigger_units,
        activities: Array.from({length: max_day - min_day + 1}, (_, offset) =>
            united.filter(activity => activity.day === min_day + offset))
    };
}
