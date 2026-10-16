[![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-2ea44f?logo=github)](https://bigchunguspng.github.io/anilist-visualizer/)
![Last Commit](https://img.shields.io/github/last-commit/bigchunguspng/anilist-visualizer?logo=git)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

# ![anilist](https://anilist.co/img/icons/favicon-32x32.png) [Anilist Visualizer](https://bigchunguspng.github.io/anilist-visualizer)

Visualize your [AniList](https://anilist.co) activities on a timeline.

This is NOT an official site, I just use [their public API](https://docs.anilist.co/), so don't be confused with a similar style of the app.

## Screenshots 📸

### Overview mode

![img](https://github.com/user-attachments/assets/2f790c53-d0fd-4a08-a321-514a2de3bffb)

### Last 3 months mode

![img](https://github.com/user-attachments/assets/72e29400-0639-43b2-8f9f-2be50da3661e)

## Roadmap 🔩

- [x] make it a static web app and host on github pages 📝
- [ ] make a better version (keep this one as `v1`/`legacy`):
  - [ ] dark mode 🌙
  - [ ] keyboard controls ⌨️
  - [ ] no separate page for user search 🔍
  - [ ] zoomable and scrollable timelines 📈
  - [ ] a bunch of different views 🆒

## History ⌛

| Architecture | When | Changes / Features | Branch |
| --- | ---: | --- | --- |
| ASP.NET Core MVC | 22 Aug - 16 Nov 2023 | _v1_ - animanga timeline, user search, etc. | [master](https://github.com/bigchunguspng/anilist-visualizer/tree/master) |
| ASP.NET Core API + [react app](https://github.com/bigchunguspng/anilist-visualizer-react)| 3-22 Mar 2024 | _PORT_, [wrapper fork](https://github.com/bigchunguspng/AniListNet), detailed activities. | [api*](https://github.com/bigchunguspng/anilist-visualizer/tree/161fcf80a1baf634971bc231c4229571b6db5f7f) |
| ^ | 29 Jan - 3 Feb 2025 | Last 3 months view, other improvements. | [api](https://github.com/bigchunguspng/anilist-visualizer/tree/api) |
| [static web app](https://bigchunguspng.github.io/anilist-visualizer) | 11-16 Oct 2026 | _PORT_, minor improvements. | [static](https://github.com/bigchunguspng/anilist-visualizer/tree/static) |
