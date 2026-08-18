const DATA_URL = "ernie-data.json";

let shows = [];
let songs = [];

/* ==================================================
   LOAD DATA
================================================== */

async function loadData() {

    try {

        const response = await fetch(DATA_URL);

        if (!response.ok) {
            throw new Error(`Could not load ${DATA_URL}`);
        }

        shows = await response.json();

        songs = buildSongStats(shows);

        renderDashboard();

    } catch (error) {

        console.error(error);

        document.getElementById("app").innerHTML = `
            <div class="error">
                <h2>Couldn't load Ernie's data</h2>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/* ==================================================
   SONG STATS
================================================== */

function buildSongStats(data) {

    const songMap = {};

    data.forEach(show => {

        const date = parseDate(show.eventDate);
        const venue = show.venue?.name || "Unknown Venue";
        const city = show.venue?.city?.name || "";

        const sets = show.sets?.set || [];

        sets.forEach((set, setIndex) => {

            const songList = set.song || [];

            songList.forEach((song, songIndex) => {

                const name = song.name?.trim();

                if (!name) return;

                if (!songMap[name]) {

                    songMap[name] = {
                        name,
                        plays: 0,
                        showIds: [],
                        appearances: [],
                        dates: [],
                        venues: {},
                        cities: {},
                        cover: !!song.cover
                    };
                }

                songMap[name].plays++;

                const showId =
                    show.id ||
                    show.eventDate;

                songMap[name].showIds.push(showId);

                songMap[name].dates.push(date);

                const venueKey =
                    `${venue} — ${city}`;

                songMap[name].venues[venueKey] =
                    (songMap[name].venues[venueKey] || 0) + 1;

                songMap[name].cities[city] =
                    (songMap[name].cities[city] || 0) + 1;

                songMap[name].appearances.push({
                    showId,
                    date,
                    venue,
                    city,
                    setIndex,
                    songIndex,
                    info: song.info || "",
                    cover: song.cover?.name || ""
                });

            });
        });
    });

    return Object.values(songMap)
        .map(song => {

            song.showCount =
                new Set(song.showIds).size;

            song.appearances.sort(
                (a, b) => b.date - a.date
            );

            song.dates.sort(
                (a, b) => b - a
            );

            song.lastPlayed =
                song.dates[0] || null;

            song.firstPlayed =
                song.dates[song.dates.length - 1] || null;

            song.currentGap =
                calculateCurrentGap(song);

            song.averageGap =
                calculateAverageGap(song);

            song.longestGap =
                calculateLongestGap(song);

            return song;

        })
        .sort(
            (a, b) => b.plays - a.plays
        );
}

/* ==================================================
   DASHBOARD
================================================== */

function renderDashboard() {

    const mostPlayed =
        [...songs]
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 10);

    const recentShows =
        [...shows]
            .sort(
                (a, b) =>
                    parseDate(b.eventDate) -
                    parseDate(a.eventDate)
            )
            .slice(0, 5);

    document.getElementById("app").innerHTML = `

        <header class="hero">

            <div class="hero-logo">

                <img
                    src="images/ernie_clam.png"
                    class="clam"
                    alt="Ernie & The Band"
                >

            </div>

            <div class="hero-text">

                <h1>ERNIE &amp; THE BAND</h1>

                <p>
                    Setlist &amp; Show Statistics
                </p>

            </div>

        </header>

        ${navigation()}

        <main id="content">

            <section class="stats-grid">

                <div
                    class="stat-card"
                    onclick="showPage('shows')"
                    style="cursor:pointer"
                >

                    <div class="stat-number">
                        ${shows.length}
                    </div>

                    <div class="stat-label">
                        Shows
                    </div>

                </div>

                <div
                    class="stat-card"
                    onclick="showPage('songs')"
                    style="cursor:pointer"
                >

                    <div class="stat-number">
                        ${songs.length}
                    </div>

                    <div class="stat-label">
                        Songs
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${getTotalPlays()}
                    </div>

                    <div class="stat-label">
                        Song Plays
                    </div>

                </div>

            </section>

            <section class="panel">

                <div class="panel-header">

                    <h2>Most Played</h2>

                    <button onclick="showPage('songs')">
                        View All
                    </button>

                </div>

                <div class="song-list">

                    ${mostPlayed
                        .map(song => songRow(song))
                        .join("")}

                </div>

            </section>

            <section class="panel">

                <div class="panel-header">

                    <h2>Recent Shows</h2>

                    <button onclick="showPage('shows')">
                        View All
                    </button>

                </div>

                <div class="show-list">

                    ${recentShows
                        .map(show => recentShowRow(show))
                        .join("")}

                </div>

            </section>

        </main>
    `;
}

/* ==================================================
   NAVIGATION
================================================== */

function navigation() {

    return `

        <nav class="nav">

            <button onclick="showPage('dashboard')">
                Dashboard
            </button>

            <button onclick="showPage('songs')">
                Songs
            </button>

            <button onclick="showPage('shows')">
                Shows
            </button>

            <button onclick="showPage('venues')">
                Venues
            </button>

            <button onclick="showPage('gaps')">
                Gaps
            </button>

        </nav>
    `;
}

function showPage(page) {

    if (page === "dashboard") {
        renderDashboard();
        return;
    }

    if (page === "songs") {
        renderSongs();
        return;
    }

    if (page === "shows") {
        renderShows();
        return;
    }

    if (page === "venues") {
        renderVenues();
        return;
    }

    if (page === "gaps") {
        renderGaps();
        return;
    }
}

/* ==================================================
   SONG LIST
================================================== */

function renderSongs() {

    const sortedSongs =
        [...songs]
            .sort((a, b) => b.plays - a.plays);

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <h2>All Songs</h2>

                <button onclick="showPage('dashboard')">
                    ← Dashboard
                </button>

            </div>

            <div class="search-box">

                <input
                    id="songSearch"
                    type="text"
                    placeholder="Search songs..."
                    oninput="filterSongs()"
                >

            </div>

            <div id="songResults">

                ${sortedSongs
                    .map(song => songRow(song))
                    .join("")}

            </div>

        </section>
    `;
}

function filterSongs() {

    const query =
        document
            .getElementById("songSearch")
            .value
            .toLowerCase();

    const filtered =
        songs.filter(song =>
            song.name
                .toLowerCase()
                .includes(query)
        );

    document.getElementById("songResults")
        .innerHTML =
            filtered
                .map(song => songRow(song))
                .join("");
}

function songRow(song) {

    return `

        <div
            class="song-row"
            onclick="openSong('${escapeJs(song.name)}')"
            style="cursor:pointer"
        >

            <div class="song-name">

                ${escapeHtml(song.name)}

            </div>

            <div class="song-meta">

                ${song.showCount}
                ${song.showCount === 1 ? "show" : "shows"}

            </div>

            <div class="song-count">

                ${song.plays}

            </div>

        </div>
    `;
}

/* ==================================================
   SONG DETAIL
================================================== */

function openSong(name) {

    const song =
        songs.find(
            item => item.name === name
        );

    if (!song) return;

    renderSongDetail(song);
}

function renderSongDetail(song) {

    const venues =
        Object.entries(song.venues)
            .sort((a, b) => b[1] - a[1]);

    const recent =
        song.appearances
            .slice(0, 25);

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <div>

                    <h2>
                        ${escapeHtml(song.name)}
                    </h2>

                    <div style="
                        color:#999;
                        margin-top:6px;
                        font-size:12px;
                    ">

                        ${song.cover
                            ? "Cover"
                            : "Ernie & The Band"}

                    </div>

                </div>

                <button onclick="showPage('songs')">
                    ← Songs
                </button>

            </div>

            <div class="stats-grid"
                 style="padding:20px;margin:0">

                <div class="stat-card">

                    <div class="stat-number">
                        ${song.plays}
                    </div>

                    <div class="stat-label">
                        Total Plays
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${song.showCount}
                    </div>

                    <div class="stat-label">
                        Shows
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${song.currentGap}
                    </div>

                    <div class="stat-label">
                        Current Gap
                    </div>

                </div>

            </div>

            <div style="
                padding:20px;
                border-top:1px solid #303030;
            ">

                <div style="
                    display:grid;
                    grid-template-columns:
                        repeat(auto-fit,minmax(180px,1fr));
                    gap:20px;
                ">

                    <div>
                        <div class="song-meta">
                            FIRST PLAYED
                        </div>

                        <strong>
                            ${formatDate(song.firstPlayed)}
                        </strong>
                    </div>

                    <div>
                        <div class="song-meta">
                            LAST PLAYED
                        </div>

                        <strong>
                            ${formatDate(song.lastPlayed)}
                        </strong>
                    </div>

                    <div>
                        <div class="song-meta">
                            AVERAGE GAP
                        </div>

                        <strong>
                            ${song.averageGap} shows
                        </strong>
                    </div>

                    <div>
                        <div class="song-meta">
                            LONGEST GAP
                        </div>

                        <strong>
                            ${song.longestGap} shows
                        </strong>
                    </div>

                </div>

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>Play History</h2>

            </div>

            <div class="show-list">

                ${recent
                    .map(appearance =>
                        songAppearanceRow(
                            appearance
                        )
                    )
                    .join("")}

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>Venues</h2>

            </div>

            <div class="song-list">

                ${venues
                    .map(([venue, count]) => `

                        <div
                            class="song-row"
                            onclick="openVenue('${escapeJs(venue)}')"
                            style="cursor:pointer"
                        >

                            <div class="song-name">
                                ${escapeHtml(venue)}
                            </div>

                            <div class="song-count">
                                ${count}
                            </div>

                        </div>

                    `)
                    .join("")}

            </div>

        </section>
    `;
}

function songAppearanceRow(appearance) {

    return `

        <div
            class="show-row"
            onclick="openShow('${escapeJs(appearance.showId)}')"
            style="cursor:pointer"
        >

            <div>

                <strong>
                    ${escapeHtml(
                        appearance.venue
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        appearance.city
                    )}
                </span>

            </div>

            <div class="show-date">

                ${formatDate(
                    appearance.date
                )}

            </div>

        </div>
    `;
}

/* ==================================================
   SHOWS
================================================== */

function renderShows() {

    const sortedShows =
        [...shows]
            .sort(
                (a, b) =>
                    parseDate(b.eventDate) -
                    parseDate(a.eventDate)
            );

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <h2>Shows</h2>

                <button onclick="showPage('dashboard')">
                    ← Dashboard
                </button>

            </div>

            <div class="show-list">

                ${sortedShows
                    .map(show => showRow(show))
                    .join("")}

            </div>

        </section>
    `;
}

function recentShowRow(show) {

    return showRow(show);
}

function showRow(show) {

    return `

        <div
            class="show-row"
            onclick="openShow('${escapeJs(
                show.id ||
                show.eventDate
            )}')"
            style="cursor:pointer"
        >

            <div>

                <strong>
                    ${escapeHtml(
                        show.venue?.name ||
                        "Unknown Venue"
                    )}
                </strong>

                <span>

                    ${escapeHtml(
                        show.venue?.city?.name ||
                        ""
                    )}

                </span>

            </div>

            <div class="show-date">

                ${formatDate(
                    parseDate(
                        show.eventDate
                    )
                )}

            </div>

        </div>
    `;
}

/* ==================================================
   SHOW DETAIL
================================================== */

function openShow(identifier) {

    const show =
        shows.find(
            item =>
                String(
                    item.id ||
                    item.eventDate
                ) === String(identifier)
        );

    if (!show) return;

    renderShowDetail(show);
}

function renderShowDetail(show) {

    const sets =
        show.sets?.set || [];

    let totalSongs = 0;

    sets.forEach(set => {
        totalSongs +=
            (set.song || []).length;
    });

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <div>

                    <h2>
                        ${escapeHtml(
                            show.venue?.name ||
                            "Unknown Venue"
                        )}
                    </h2>

                    <div style="
                        color:#999;
                        margin-top:6px;
                        font-size:13px;
                    ">

                        ${escapeHtml(
                            show.venue?.city?.name ||
                            ""
                        )}

                        ·

                        ${formatDate(
                            parseDate(
                                show.eventDate
                            )
                        )}

                    </div>

                </div>

                <button onclick="showPage('shows')">
                    ← Shows
                </button>

            </div>

            <div style="
                padding:18px 20px;
                color:#999;
                font-size:13px;
                border-bottom:1px solid #303030;
            ">

                ${sets.length}
                ${sets.length === 1 ? "set" : "sets"}

                ·

                ${totalSongs}
                ${totalSongs === 1 ? "song" : "songs"}

            </div>

            ${sets
                .map((set, index) =>
                    renderSet(set, index)
                )
                .join("")}

        </section>
    `;
}

function renderSet(set, index) {

    const songsInSet =
        set.song || [];

    return `

        <div>

            <div style="
                padding:15px 20px;
                background:#202020;
                border-bottom:1px solid #303030;
                color:#d58b45;
                font-family:Georgia,serif;
                font-size:18px;
                font-weight:bold;
            ">

                ${getSetTitle(
                    set,
                    index
                )}

            </div>

            ${songsInSet
                .map((song, songIndex) => `

                    <div
                        class="song-row"
                        onclick="openSong('${escapeJs(
                            song.name || ""
                        )}')"
                        style="cursor:pointer"
                    >

                        <div class="song-rank">
                            ${songIndex + 1}
                        </div>

                        <div class="song-name">

                            ${escapeHtml(
                                song.name || ""
                            )}

                            ${
                                song.cover
                                    ? `
                                        <span style="
                                            color:#999;
                                            font-size:11px;
                                            margin-left:7px;
                                        ">
                                            ${escapeHtml(
                                                song.cover.name ||
                                                "Cover"
                                            )}
                                        </span>
                                      `
                                    : ""
                            }

                            ${
                                song.info
                                    ? `
                                        <div style="
                                            color:#777;
                                            font-size:11px;
                                            margin-top:4px;
                                        ">
                                            ${escapeHtml(
                                                song.info
                                            )}
                                        </div>
                                      `
                                    : ""
                            }

                        </div>

                    </div>

                `)
                .join("")}

        </div>
    `;
}

function getSetTitle(set, index) {

    if (set.name) {
        return escapeHtml(set.name);
    }

    return `Set ${index + 1}`;
}

/* ==================================================
   VENUES
================================================== */

function buildVenueData() {

    const venueMap = {};

    shows.forEach(show => {

        const name =
            show.venue?.name ||
            "Unknown Venue";

        const city =
            show.venue?.city?.name ||
            "";

        const key =
            `${name} — ${city}`;

        if (!venueMap[key]) {

            venueMap[key] = {
                key,
                name,
                city,
                shows: []
            };
        }

        venueMap[key].shows.push(show);
    });

    return Object.values(venueMap);
}

function renderVenues() {

    const venues =
        buildVenueData()
            .sort(
                (a, b) =>
                    b.shows.length -
                    a.shows.length
            );

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <h2>Venues</h2>

                <button onclick="showPage('dashboard')">
                    ← Dashboard
                </button>

            </div>

            <div class="venue-list">

                ${venues
                    .map(venue => `

                        <div
                            class="song-row"
                            onclick="openVenue('${escapeJs(
                                venue.key
                            )}')"
                            style="cursor:pointer"
                        >

                            <div class="song-name">

                                ${escapeHtml(
                                    venue.name
                                )}

                                <div class="song-meta">
                                    ${escapeHtml(
                                        venue.city
                                    )}
                                </div>

                            </div>

                            <div class="song-count">

                                ${venue.shows.length}

                            </div>

                        </div>

                    `)
                    .join("")}

            </div>

        </section>
    `;
}

function openVenue(key) {

    const venue =
        buildVenueData()
            .find(item => item.key === key);

    if (!venue) return;

    renderVenueDetail(venue);
}

function renderVenueDetail(venue) {

    const venueSongs = {};

    venue.shows.forEach(show => {

        const sets =
            show.sets?.set || [];

        sets.forEach(set => {

            (set.song || [])
                .forEach(song => {

                    const name =
                        song.name?.trim();

                    if (!name) return;

                    venueSongs[name] =
                        (venueSongs[name] || 0) + 1;
                });
        });
    });

    const rankedSongs =
        Object.entries(venueSongs)
            .sort((a, b) => b[1] - a[1]);

    const recentShows =
        [...venue.shows]
            .sort(
                (a, b) =>
                    parseDate(b.eventDate) -
                    parseDate(a.eventDate)
            );

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <div>

                    <h2>
                        ${escapeHtml(
                            venue.name
                        )}
                    </h2>

                    <div style="
                        color:#999;
                        margin-top:6px;
                        font-size:13px;
                    ">

                        ${escapeHtml(
                            venue.city
                        )}

                    </div>

                </div>

                <button onclick="showPage('venues')">
                    ← Venues
                </button>

            </div>

            <div class="stats-grid"
                 style="padding:20px;margin:0">

                <div class="stat-card">

                    <div class="stat-number">
                        ${venue.shows.length}
                    </div>

                    <div class="stat-label">
                        Shows
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${rankedSongs.length}
                    </div>

                    <div class="stat-label">
                        Songs Played
                    </div>

                </div>

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>
                    Most Played Here
                </h2>

            </div>

            <div class="song-list">

                ${rankedSongs
                    .slice(0, 50)
                    .map(([name, count]) => `

                        <div
                            class="song-row"
                            onclick="openSong('${escapeJs(name)}')"
                            style="cursor:pointer"
                        >

                            <div class="song-name">

                                ${escapeHtml(name)}

                            </div>

                            <div class="song-count">

                                ${count}

                            </div>

                        </div>

                    `)
                    .join("")}

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>
                    Shows Here
                </h2>

            </div>

            <div class="show-list">

                ${recentShows
                    .map(show => showRow(show))
                    .join("")}

            </div>

        </section>
    `;
}

/* ==================================================
   GAPS
================================================== */

function renderGaps() {

    const gapSongs =
        [...songs]
            .sort(
                (a, b) =>
                    b.currentGap -
                    a.currentGap
            )
            .slice(0, 50);

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <h2>Longest Current Gaps</h2>

                <button onclick="showPage('dashboard')">
                    ← Dashboard
                </button>

            </div>

            <div class="song-list">

                ${gapSongs
                    .map(song => `

                        <div
                            class="song-row"
                            onclick="openSong('${escapeJs(
                                song.name
                            )}')"
                            style="cursor:pointer"
                        >

                            <div class="song-name">

                                ${escapeHtml(
                                    song.name
                                )}

                            </div>

                            <div class="song-meta">

                                Last:
                                ${formatDate(
                                    song.lastPlayed
                                )}

                            </div>

                            <div class="song-count">

                                ${song.currentGap}

                            </div>

                        </div>

                    `)
                    .join("")}

            </div>

        </section>
    `;
}

/* ==================================================
   GAP CALCULATIONS
================================================== */

function calculateCurrentGap(song) {

    if (!song.lastPlayed) {
        return 0;
    }

    const sortedShows =
        [...shows]
            .sort(
                (a, b) =>
                    parseDate(a.eventDate) -
                    parseDate(b.eventDate)
            );

    let gap = 0;

    for (
        let i = sortedShows.length - 1;
        i >= 0;
        i--
    ) {

        const show =
            sortedShows[i];

        const date =
            parseDate(show.eventDate);

        if (date <= song.lastPlayed) {
            break;
        }

        gap++;
    }

    return gap;
}

function calculateAverageGap(song) {

    const appearances =
        song.appearances
            .map(a => a.date)
            .sort((a, b) => a - b);

    if (appearances.length < 2) {
        return 0;
    }

    const gaps = [];

    for (
        let i = 1;
        i < appearances.length;
        i++
    ) {

        let count = 0;

        shows.forEach(show => {

            const date =
                parseDate(
                    show.eventDate
                );

            if (
                date > appearances[i - 1] &&
                date < appearances[i]
            ) {
                count++;
            }
        });

        gaps.push(count);
    }

    if (!gaps.length) {
        return 0;
    }

    return (
        gaps.reduce(
            (a, b) => a + b,
            0
        ) / gaps.length
    ).toFixed(1);
}

function calculateLongestGap(song) {

    const appearances =
        song.appearances
            .map(a => a.date)
            .sort((a, b) => a - b);

    if (appearances.length < 2) {
        return 0;
    }

    let longest = 0;

    for (
        let i = 1;
        i < appearances.length;
        i++
    ) {

        let count = 0;

        shows.forEach(show => {

            const date =
                parseDate(
                    show.eventDate
                );

            if (
                date > appearances[i - 1] &&
                date < appearances[i]
            ) {
                count++;
            }
        });

        longest =
            Math.max(
                longest,
                count
            );
    }

    return longest;
}

/* ==================================================
   HELPERS
================================================== */

function getTotalPlays() {

    return songs.reduce(
        (total, song) =>
            total + song.plays,
        0
    );
}

function parseDate(value) {

    if (!value) {
        return new Date(0);
    }

    const parts =
        value.split("-");

    if (parts.length === 3) {

        return new Date(
            Number(parts[2]),
            Number(parts[1]) - 1,
            Number(parts[0])
        );
    }

    return new Date(value);
}

function formatDate(date) {

    if (
        !date ||
        date.getTime() === 0
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(value) {

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}

/* ==================================================
   START
================================================== */

loadData();
