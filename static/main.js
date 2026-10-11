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
const DEFAULT_FAVICON = "https://anilist.co/img/icons/icon.svg";
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
}

function show_tooltip(target, lines, placement = "top") {
    const tooltip = tooltip_element();
    if (!tooltip || !lines.length) return;

    tooltip.innerHTML = lines.map(line => `<p>${escape_html(line)}</p>`).join("");
    tooltip.setAttribute("aria-hidden", "false");
    tooltip.classList.add("visible");

    const rect = target.getBoundingClientRect();
    const gap = 12;
    const viewport_width = document.documentElement.clientWidth;
    const viewport_height = document.documentElement.clientHeight;
    const box = tooltip.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - box.width / 2;
    left = Math.max(8, Math.min(left, viewport_width - box.width - 8));

    let top = placement === "bottom"
        ? rect.bottom + gap
        : rect.top - box.height - gap;

    if (top < 8) {
        top = Math.min(rect.bottom + gap, viewport_height - box.height - 8);
    }
    if (top + box.height > viewport_height - 8) {
        top = Math.max(8, rect.top - box.height - gap);
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function parse_tooltip_lines(element) {
    const raw = element?.dataset?.tooltip;
    return raw ? raw.split("\n").map(item => item.trim()).filter(Boolean) : [];
}

function unit_label(type, count) {
    const unit = type === "MANGA" ? "chapter" : "episode";
    return `${unit}${count === 1 ? "" : "s"}`;
}

function format_day(day) {
    return new Date(day * DAY_MS).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    });
}

function get_localized_title(titles, language) {
    if (language === LANG_JAPANESE) {
        return titles?.native || titles?.english || titles?.romaji || "Untitled";
    }
    return titles?.english || titles?.romaji || titles?.native || "Untitled";
}

function get_cover_url(cover) {
    return cover?.extraLarge || cover?.large || cover?.medium || "";
}

function get_cover_color(cover) {
    return cover?.color || "#3db4f2";
}

function format_status(status) {
    return status_labels[status] || status || "Unknown";
}

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
        <main class="home">
            <img class="home-logo" draggable="false"
                src="https://i.imgur.com/tgGcE0v.png"
                alt="AniList Visualizer">
            <form class="search-bar" data-search-form>
                <label class="sr-only" for="user_search">AniList username</label>
                <input id="user_search" class="search" type="search"
                    name="username" autocomplete="off" placeholder="Enter your username">
            </form>
            <div id="search_results" aria-live="polite"></div>
            <p class="home-help">Go to <a href="https://anilist.co" target="_blank" rel="noreferrer">AniList</a> if you don't get it.</p>
        </main>`;
}

function render_not_found() {
    set_title("Nothing here...");
    set_favicon();
    return `
        <main class="not-found">
            <img class="not-found-logo" src="https://i.imgur.com/CdcGFjA.png"
                alt="Akko staring at the monitor">
            <h1>Page Not Found</h1>
            <p>You picked the wrong URL baka!</p>
            <p><a href="#" data-home-link>Return home</a></p>
        </main>`;
}

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
            selectedMediaId: null
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

function get_display_entries(page, model) {
    const visible = model.visibleEntries.filter(entry => entry.timelineItem !== null);
    return page.prefs.grouping === GROUP_GROUPED ? group_entries(visible) : visible;
}

function overview_heading(page) {
    if (page.filter.mode === "last_year") return "Last year";
    if (page.filter.mode === "range" && page.filter.from != null && page.filter.to != null) {
        return `${page.filter.from} – ${page.filter.to}`;
    }
    return "All";
}

function timeline_sections_html(sections, timeframe, text) {
    return Object.entries(sections).map(([label, value]) => `
        <div class="timeline-year${text ? " text" : ""}" style="width:${(value / timeframe) * 100}%;">
            ${text ? escape_html(label) : ""}
        </div>`).join("");
}

function entry_tooltip_lines(entry) {
    const tip = entry.timelineItem?.tip;
    if (!tip) return [];
    const lines = [entry.timelineItem.tip.dateRange];
    if (tip.episodes != null) {
        lines.push(`${tip.episodes} ${unit_label(entry.media.type, tip.episodes)}`);
    }
    if (tip.averageSpeed) lines.push(tip.averageSpeed);
    if ((entry.repeat || 0) > 0) lines.push(`+ ${entry.repeat} repeat${entry.repeat === 1 ? "" : "s"}`);
    return lines;
}

function title_activity_lines(activity, media_type) {
    const lines = [format_day(activity.day)];
    if (activity.episodes) lines.push(`Progress: ${activity.episodes}`);
    lines.push(`${activity.progress} ${unit_label(media_type, activity.progress)}`);
    return lines;
}

function render_activity_overlay(entry, min_day) {
    const activities = entry.timelineItem?.activities?.activities || [];
    if (!activities.length) return "";
    const start_day = min_day + entry.timelineItem.offset;
    const width = Math.max(entry.timelineItem.length, 1);
    return activities.map(activity => {
        const left = Math.max(0, Math.min(100, ((activity.day - start_day) / width) * 100));
        const height = Math.max(12.5, Math.min(100, (activity.progress / 8) * 100));
        return `
            <span
                class="timeline-activity"
                style="left:${left}%;height:${height}%;"
                data-tooltip="${escape_html(title_activity_lines(activity, entry.media.type).join("\n"))}">
            </span>`;
    }).join("");
}

function render_entry(entry, page, model) {
    const media_id = entry.media.id;
    const timeframe = model.maxDay - model.minDay + 1;
    const title = get_localized_title(entry.media.title, page.prefs.language);
    const item = entry.timelineItem;
    const cover_url = get_cover_url(entry.media.coverImage);
    const cover_color = get_cover_color(entry.media.coverImage);
    const tooltip = entry_tooltip_lines(entry).join("\n");
    const is_selected = page.selectedMediaId === media_id;
    const is_loading = page.loadingMediaId === media_id;
    const progress_style = `margin-left:${(item.offset / timeframe) * 100}%;width:${(item.length / timeframe) * 100}%;`;
    const airing = entry.media.airing;

    return `
        <div class="entry-card${is_selected ? " selected" : ""}${is_loading ? " loading" : ""}">
            <div class="entry-cover">
                <div class="entry-thumb" style="--cover-image:url('${escape_html(cover_url)}');--cover-color:${cover_color};"></div>
                <a class="entry-link" href="${escape_html(entry.media.siteUrl || "#")}" target="_blank" rel="noreferrer"
                    aria-label="Open ${escape_html(title)} on AniList">AniList</a>
            </div>
            <button
                type="button"
                class="entry-main"
                data-action="select-entry"
                data-media-id="${media_id}"
                data-tooltip="${escape_html(tooltip)}">
                <span class="entry-title ${escape_html(entry.status)}">${escape_html(title)}</span>
                <span class="entry-timeline">
                    <span class="timeline-row">${timeline_sections_html(model.timelineSections, timeframe, false)}</span>
                    ${airing ? `
                        <span class="timeline-item timeline-airing stripes"
                            style="margin-left:${(airing.offset / timeframe) * 100}%;width:${(airing.length / timeframe) * 100}%;">
                            <span class="timeline-season">${escape_html(airing.season)}</span>
                        </span>` : ""}
                    <span class="timeline-item" style="${progress_style}">
                        <span class="timeline-range${item.stripes ? " stripes" : ""}" style="--cover-color:${cover_color};">
                            ${render_activity_overlay(entry, model.minDay)}
                        </span>
                    </span>
                    <span class="timeline-row text">${timeline_sections_html(model.timelineSections, timeframe, true)}</span>
                </span>
            </button>
            <span class="status-pill status-${escape_html(entry.status.toLowerCase())}">
                ${escape_html(format_status(entry.status))}
            </span>
        </div>`;
}

function render_selected_entry(page, model) {
    const entry = model.visibleEntries.find(item => item.media.id === page.selectedMediaId);
    if (!entry) {
        return `
            <section class="preview-card panel">
                <h3>Title details</h3>
                <p class="preview-empty">Tap or click a row to load title activities and preview the selected title.</p>
            </section>`;
    }

    const title = get_localized_title(entry.media.title, page.prefs.language);
    const activities = page.activityCache.get(entry.media.id);
    const error = page.activityErrors.get(entry.media.id);
    const cover_url = get_cover_url(entry.media.coverImage);

    return `
        <section class="preview-card panel">
            <div class="preview-body">
                <div class="preview-cover" style="background-image:url('${escape_html(cover_url)}');"></div>
                <div class="preview-copy">
                    <p class="preview-eyebrow">${escape_html(format_status(entry.status))}</p>
                    <h3>${escape_html(title)}</h3>
                    <p>${escape_html(entry.timelineItem.tip.dateRange)}</p>
                    ${entry.timelineItem.tip.episodes != null
                        ? `<p>${escape_html(`${entry.timelineItem.tip.episodes} ${unit_label(entry.media.type, entry.timelineItem.tip.episodes)}`)}</p>`
                        : ""}
                    ${entry.timelineItem.tip.averageSpeed
                        ? `<p>${escape_html(entry.timelineItem.tip.averageSpeed)}</p>`
                        : ""}
                    ${(entry.repeat || 0) > 0
                        ? `<p>+ ${entry.repeat} repeat${entry.repeat === 1 ? "" : "s"}</p>`
                        : ""}
                    <p class="preview-muted">
                        ${page.loadingMediaId === entry.media.id
                            ? "Loading title activities..."
                            : error
                                ? escape_html(error)
                                : activities
                                    ? `${activities.activities.length} activity day${activities.activities.length === 1 ? "" : "s"} loaded.`
                                    : "Select the row again later if AniList has no matching activity records."}
                    </p>
                    <p><a href="${escape_html(entry.media.siteUrl || "#")}" target="_blank" rel="noreferrer">Open on AniList</a></p>
                </div>
            </div>
        </section>`;
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
            <div class="control-panel panel">
                <div class="section-name">
                    <h2>${escape_html(overview_heading(page))}</h2>
                    <div>${escape_html(header)}</div>
                </div>
                <div class="actions-grid">
                    <button type="button" class="action-button" data-action="set-filter" data-filter="all"
                        aria-pressed="${page.filter.mode === "all"}">All</button>
                    <button type="button" class="action-button" data-action="set-filter" data-filter="last_year"
                        aria-pressed="${page.filter.mode === "last_year"}">Last year</button>
                    <button type="button" class="action-button" data-action="toggle-pref" data-pref="language"
                        aria-pressed="${page.prefs.language === LANG_JAPANESE}">
                        ${page.prefs.language === LANG_JAPANESE ? "English" : "日本語"}
                    </button>
                    <button type="button" class="action-button" data-action="toggle-pref" data-pref="grouping"
                        aria-pressed="${page.prefs.grouping === GROUP_GROUPED}">
                        ${page.prefs.grouping === GROUP_GROUPED ? "Restore" : "Group"}
                    </button>
                    <button type="button" class="action-button" data-action="toggle-pref" data-pref="ordering"
                        aria-pressed="${page.prefs.ordering === ORDER_REVERSE}">
                        Reverse
                    </button>
                    <label class="year-field">
                        <span>From</span>
                        <select data-filter-year="from">
                            ${years.map(year => `<option value="${year}"${year === page.filter.from ? " selected" : ""}>${year}</option>`).join("")}
                        </select>
                    </label>
                    <label class="year-field">
                        <span>To</span>
                        <select data-filter-year="to">
                            ${years.map(year => `<option value="${year}"${year === page.filter.to ? " selected" : ""}>${year}</option>`).join("")}
                        </select>
                    </label>
                </div>
            </div>
            ${render_selected_entry(page, model)}
            <div class="hint-message-div">
                <span class="hint-message">
                    J = language · G = grouping · R = reverse order.<br>
                    Tap or click a row to load title activities. Activity overlay height = 8 episodes / chapters.
                </span>
            </div>
            <div class="overview-list panel${page.prefs.ordering === ORDER_REVERSE ? " reverse" : ""}">
                ${list_html}
            </div>
        </section>`;
}

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

function get_chart_selection(page) {
    if (!page.chart.data || !page.chart.selectedMediaId) return null;
    const activities = page.chart.data.activities.flat().filter(activity => activity.media?.id === page.chart.selectedMediaId);
    if (!activities.length) return null;
    const sample = activities[0];
    return {
        media: sample.media,
        activityDays: activities.length,
        totalProgress: activities.reduce((sum, activity) => sum + activity.progress, 0)
    };
}

function chart_activity_lines(activity, language) {
    const title = get_localized_title(activity.media?.title, language);
    const lines = [title, format_day(activity.day)];
    if (activity.episodes) lines.push(`Progress: ${activity.episodes}`);
    lines.push(`${activity.progress} ${unit_label(activity.media?.type, activity.progress)}`);
    return lines;
}

function render_chart(page) {
    if (page.chart.status === "loading" || page.chart.status === "idle") {
        return `<section class="panel chart-panel"><p class="message">Loading the last 3 months...</p></section>`;
    }
    if (page.chart.status === "error") {
        return `<section class="panel chart-panel"><p class="message error">${escape_html(page.chart.error)}</p></section>`;
    }

    const chart = page.chart.data;
    if (!chart || chart.activities.length === 0) {
        return `<section class="panel chart-panel"><p class="message">No title activities were recorded in the last 3 months.</p></section>`;
    }

    const selection = get_chart_selection(page);
    const preview_title = selection
        ? get_localized_title(selection.media.title, page.prefs.language)
        : "Select a title";
    const preview_cover = selection ? get_cover_url(selection.media.coverImage) : "";

    return `
        <section class="chart-layout">
            <section class="preview-card panel">
                <div class="preview-body">
                    <div class="preview-cover${selection ? "" : " empty"}"
                        style="${selection ? `background-image:url('${escape_html(preview_cover)}');` : ""}"></div>
                    <div class="preview-copy">
                        <p class="preview-eyebrow">Last 3 months</p>
                        <h3>${escape_html(preview_title)}</h3>
                        <p class="preview-muted">
                            ${selection
                                ? `${selection.activityDays} activity day${selection.activityDays === 1 ? "" : "s"} · ${selection.totalProgress} total ${unit_label(selection.media.type, selection.totalProgress)}`
                                : "Tap or click a bar to highlight a title and show its cover."}
                        </p>
                        ${selection
                            ? `<p><a href="${escape_html(selection.media.siteUrl || "#")}" target="_blank" rel="noreferrer">Open on AniList</a></p>`
                            : ""}
                        <p class="preview-muted">Use the Clear highlight button to restore every title.</p>
                    </div>
                </div>
            </section>
            <section class="panel chart-panel">
                <div class="chart-topline">
                    <h2>Last 3 months</h2>
                    <button type="button" class="action-button" data-action="clear-chart-highlight">Clear highlight</button>
                </div>
                <div class="chart-days" aria-label="AniList activity chart">
                    ${chart.smallerUnits.map((unit, index) => `
                        <div class="chart-day" style="width:${(unit.value / chart.smallerUnits.length) * 100}%;">
                            <div class="chart-day-bars">
                                ${(chart.activities[index] || []).map(activity => `
                                    <button
                                        type="button"
                                        class="chart-activity${page.chart.selectedMediaId && page.chart.selectedMediaId !== activity.media.id ? " dimmed" : ""}"
                                        data-action="select-chart-media"
                                        data-media-id="${activity.media.id}"
                                        data-tooltip="${escape_html(chart_activity_lines(activity, page.prefs.language).join("\n"))}"
                                        style="height:${Math.max(12.5, (activity.progress / chart.maxProgressValue) * 100)}%;--cover-color:${get_cover_color(activity.media.coverImage)};">
                                    </button>`).join("")}
                            </div>
                            <div class="chart-day-title">${escape_html(unit.title)}</div>
                        </div>`).join("")}
                </div>
                <div class="chart-months">
                    ${chart.biggerUnits.map(unit => `
                        <div class="chart-month" style="width:${(unit.value / chart.smallerUnits.length) * 100}%;">
                            ${escape_html(unit.title)}
                        </div>`).join("")}
                </div>
                <div class="hint-message-div">
                    <span class="hint-message">Tap or click a bar to isolate one title. Hover and focus still show tooltips on desktop and keyboard.</span>
                </div>
            </section>
        </section>`;
}

function render_user_page(page) {
    const display_name = page.user?.name || page.username;
    set_title(`${display_name} · AniList Visualizer`);

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
        <header class="site-header">
            <div class="nav-mini">
                <a class="nav-logo" href="#" data-home-link>
                    <img src="https://anilist.co/img/icons/icon.svg" alt="AniList">
                    <span>Visualizer</span>
                </a>
            </div>
            <div class="user-info">
                ${user ? `
                    <a href="${escape_html(user.siteUrl || "#")}" target="_blank" rel="noreferrer">
                        <img class="avatar-large" src="${escape_html(avatar)}" alt="${escape_html(user.name)} avatar">
                    </a>` : ""}
                <div class="user-text${user ? "" : " user-loading"}">
                    <h1 class="user-name">${escape_html(display_name)}</h1>
                    <p class="user-count${page.phase === "error" ? " error" : ""}">${escape_html(header_text)}</p>
                </div>
            </div>
        </header>
        <main class="visualizer-shell" aria-live="polite">
            ${user ? `
                <div class="nav-wrap">
                    <div class="tab-nav" role="tablist" aria-label="Visualization view">
                        <button
                            type="button"
                            class="tab-button${page.currentView === VIEW_OVERVIEW ? " active" : ""}"
                            data-action="switch-view"
                            data-view="${VIEW_OVERVIEW}"
                            role="tab"
                            aria-selected="${page.currentView === VIEW_OVERVIEW}">
                            Overview
                        </button>
                        <button
                            type="button"
                            class="tab-button${page.currentView === VIEW_THREE_MONTHS ? " active" : ""}"
                            data-action="switch-view"
                            data-view="${VIEW_THREE_MONTHS}"
                            role="tab"
                            aria-selected="${page.currentView === VIEW_THREE_MONTHS}">
                            Last 3 months
                        </button>
                    </div>
                </div>` : ""}
            <div class="visualizer-content">
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
    results.innerHTML = `<div class="search-results"><p class="message${is_error ? " error" : ""}">${escape_html(message)}</p></div>`;
}

function render_search_results(users) {
    const results = document.querySelector("#search_results");
    if (!results) return;
    if (users.length === 0) {
        render_search_state("No AniList users found.", true);
        return;
    }
    results.innerHTML = `
        <div class="search-results">
            ${users.map(user => `
                <a class="search-result" href="#/user/${encodeURIComponent(user.name)}">
                    <img class="avatar" src="${escape_html(user.avatar?.medium || "")}" alt="" loading="lazy">
                    <span class="search-result-name">${escape_html(user.name)}</span>
                    <span class="search-result-meta">View profile</span>
                </a>`).join("")}
        </div>`;
}

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

async function load_entry_activities(page, media_id) {
    if (!page?.user || page.activityCache.has(media_id) || page.loadingMediaId === media_id) return;
    page.loadingMediaId = media_id;
    page.activityErrors.delete(media_id);
    update_user_render();
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

function set_filter_mode(page, mode) {
    page.filter.mode = mode;
    if (mode === "all") {
        page.filter.from = page.allYears[0];
        page.filter.to = page.allYears[page.allYears.length - 1];
    }
    update_user_render();
}

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

    const select_entry = event.target.closest("[data-action='select-entry']");
    if (select_entry) {
        const media_id = Number(select_entry.dataset.mediaId);
        page.selectedMediaId = media_id;
        update_user_render();
        load_entry_activities(page, media_id);
        if (window.matchMedia("(hover: none)").matches) {
            show_tooltip(select_entry, parse_tooltip_lines(select_entry));
        }
        return;
    }

    const select_chart = event.target.closest("[data-action='select-chart-media']");
    if (select_chart) {
        page.chart.selectedMediaId = Number(select_chart.dataset.mediaId);
        update_user_render();
        if (window.matchMedia("(hover: none)").matches) {
            show_tooltip(select_chart, parse_tooltip_lines(select_chart), "bottom");
        }
        return;
    }

    if (event.target.closest("[data-action='clear-chart-highlight']")) {
        page.chart.selectedMediaId = null;
        update_user_render();
    }
});

document.addEventListener("change", event => {
    const page = get_user_page();
    if (!page || page.phase !== "ready") return;
    const select = event.target.closest("[data-filter-year]");
    if (!select) return;
    update_year_filter(page, select.dataset.filterYear, select.value);
});

document.addEventListener("keydown", event => {
    const page = get_user_page();
    if (!page || page.phase !== "ready") return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target.isContentEditable) return;

    const key = event.key.toLowerCase();
    if (key === "j") {
        toggle_preference(page, "language");
    } else if (key === "g") {
        toggle_preference(page, "grouping");
    } else if (key === "r") {
        toggle_preference(page, "ordering");
    }
});

document.addEventListener("mouseover", event => {
    const target = event.target.closest("[data-tooltip]");
    if (!target || target.contains(event.relatedTarget)) return;
    const lines = parse_tooltip_lines(target);
    if (lines.length) show_tooltip(target, lines, target.classList.contains("chart-activity") ? "bottom" : "top");
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
    if (lines.length) show_tooltip(target, lines, target.classList.contains("chart-activity") ? "bottom" : "top");
});

document.addEventListener("focusout", event => {
    const target = event.target.closest("[data-tooltip]");
    if (!target || target.contains(event.relatedTarget)) return;
    hide_tooltip();
});

window.addEventListener("scroll", hide_tooltip, {passive: true});
window.addEventListener("resize", hide_tooltip);
window.addEventListener("hashchange", render_route);

render_route();
