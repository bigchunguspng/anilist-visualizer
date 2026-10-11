import {AniListApiError, get_media_lists, get_user_by_name, search_users} from "./api.js";
import {build_animanga} from "./domain.js";

const CONTENT_ID = "app_content";

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

function render_footer_safe_link(event) {
    if (event.target.matches("[data-home-link]")) {
        event.preventDefault();
        window.location.hash = "";
    }
}

function render_home() {
    set_title("AniList Visualizer");
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

function render_user(username) {
    const safe_username = escape_html(username);
    set_title(`${username} · AniList Visualizer`);
    return `
        <header class="site-header">
            <div class="nav-mini">
                <a class="nav-logo" href="#" data-home-link>
                    <img src="https://anilist.co/img/icons/icon.svg" alt="AniList">
                    <span>Visualizer</span>
                </a>
            </div>
            <div class="user-info">
                <div class="user-loading">
                    <h1 class="user-name">${safe_username}</h1>
                    <p class="user-count">Loading...</p>
                </div>
            </div>
        </header>
        <main class="placeholder-panel" aria-live="polite">
            <p class="message">Loading timeline...</p>
        </main>`;
}

function render_not_found() {
    set_title("Nothing here...");
    return `
        <main class="not-found">
            <img class="not-found-logo" src="https://i.imgur.com/CdcGFjA.png"
                alt="Akko staring at the monitor">
            <h1>Page Not Found</h1>
            <p>You picked the wrong URL baka!</p>
            <p><a href="#" data-home-link>Return home</a></p>
        </main>`;
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

function render_search_state(message, is_error = false) {
    const results = document.querySelector("#search_results");
    if (!results) {
        return;
    }
    results.innerHTML = `<div class="search-results"><p class="message${is_error ? " error" : ""}">${message}</p></div>`;
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
                    <img class="avatar" src="${escape_html(user.avatar?.medium || "")}"
                        alt="" loading="lazy">
                    <span class="search-result-name">${escape_html(user.name)}</span>
                    <span class="search-result-meta">View profile</span>
                </a>`).join("")}
        </div>`;
}

function render_api_error(error) {
    if (!(error instanceof AniListApiError)) return "Could not load data from AniList.";
    return error.message;
}

function bind_home() {
    const form = document.querySelector("[data-search-form]");
    if (!form) {
        return;
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        const input = form.querySelector("input");
        const username = input.value.trim();
        if (!username) {
            render_search_state("Enter an AniList username to search.", true);
            return;
        }
        render_search_state("Searching...");
        search_users(username)
            .then(render_search_results)
            .catch(error => render_search_state(render_api_error(error), true));
    });
}

function bind_user(username) {
    const user_name = document.querySelector(".user-name");
    const user_count = document.querySelector(".user-count");
    if (!user_name || !user_count) return;
    get_user_by_name(username)
        .then(user => {
            if (!user) {
                user_count.className = "user-count error";
                user_count.textContent = "User not found.";
                return;
            }
            user_name.textContent = user.name;
            get_media_lists(user.id)
                .then(entries => {
                    const animanga = build_animanga(entries);
                    user_count.textContent = `${animanga.visibleEntries.length} titles · ${animanga.seriesShown} series`;
                    document.querySelector(".placeholder-panel .message").textContent =
                        animanga.visibleEntries.length ? "Timeline data ready." :
                            "This user has no drawable titles.";
                })
                .catch(error => {
                    user_count.className = "user-count error";
                    user_count.textContent = render_api_error(error);
                    document.querySelector(".placeholder-panel .message").textContent =
                        render_api_error(error);
                });
            set_title(`${user.name} · AniList Visualizer`);
        })
        .catch(error => {
            user_count.className = "user-count error";
            user_count.textContent = render_api_error(error);
        });
}

function render() {
    const route = parse_route();
    const content = document.getElementById(CONTENT_ID);
    if (route.name === "home") {
        content.innerHTML = render_home();
        bind_home();
    } else if (route.name === "user") {
        content.innerHTML = render_user(route.username);
        bind_user(route.username);
    } else {
        content.innerHTML = render_not_found();
    }
}

document.addEventListener("click", render_footer_safe_link);
window.addEventListener("hashchange", render);
render();
