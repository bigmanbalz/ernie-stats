const SONGS_URL = "Songs.csv";
const DATA_URL = "ernie-data.json";

let shows = [];
let songs = [];

/* ==================================================
   TEMPORARY PASSWORD GATE
================================================== */

function normalizePassword(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
}

function showPasswordGate() {

    const existing =
        document.getElementById("passwordGate");

    if (existing) return;

    document.body.insertAdjacentHTML(
        "afterbegin",
        `
        <div id="passwordGate">

            <div class="password-box">

                <h1>Life is better with a...</h1>

                <p>Enter the answer to continue.</p>

                <input
                    id="passwordInput"
                    type="text"
                    autocomplete="off"
                    onkeydown="if(event.key === 'Enter') checkPassword()"
                >

                <button onclick="checkPassword()">
                    Enter
                </button>

                <div
                    id="passwordError"
                    class="password-error"
                ></div>

            </div>

        </div>
        `
    );

    document
        .getElementById("passwordInput")
        .focus();
}

function checkPassword() {

    const input =
        document.getElementById("passwordInput");

    const answer =
        normalizePassword(input.value);

    if (answer === "bottleofwine") {

        const gate =
            document.getElementById("passwordGate");

        if (gate) {
            gate.remove();
        }

        loadData();

        return;
    }

    document
        .getElementById("passwordError")
        .textContent =
            "Not quite. Try again.";

    input.select();
}

function startApp() {
    showPasswordGate();
}

/* ==================================================
   LOAD DATA
================================================== */

async function loadData() {
    try {

        const [songsResponse, dataResponse] =
            await Promise.all([
                fetch(SONGS_URL),
                fetch(DATA_URL)
            ]);

        if (!songsResponse.ok) {
            throw new Error("Could not load Songs.csv");
        }

        if (!dataResponse.ok) {
            throw new Error("Could not load ernie-data.json");
        }

        const songsText =
            await songsResponse.text();

        const rawData =
            await dataResponse.json();

        songs = parseSongsCSV(songsText);
        shows = rawData;

        const performanceCounts = calculatePerformanceCounts();

        songs.forEach(song => {
            song.performances = performanceCounts[song.name] || 0;
        });

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
   CSV PARSER
================================================== */

function parseSongsCSV(text) {

    const rows = [];
    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            cell += '"';
            i++;
            continue;
        }

        if (char === '"') {

            insideQuotes =
                !insideQuotes;

            continue;
        }

        if (char === "," && !insideQuotes) {

            row.push(cell);
            cell = "";

            continue;
        }

        if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {
                i++;
            }

            row.push(cell);
            cell = "";

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];

            continue;
        }

        cell += char;
    }

    if (cell !== "" || row.length) {

        row.push(cell);

        if (row.some(value => value !== "")) {
            rows.push(row);
        }
    }

    if (!rows.length) {
        return [];
    }

    const headers = rows[0];

    return rows
        .slice(1)
        .map(values => {

            const song = {};

            headers.forEach((header, index) => {

                song[header] =
                    values[index] ?? "";

            });

            return normalizeSong(song);

        });
}

/* ==================================================
   SONG NORMALIZATION
================================================== */

function normalizeSong(song) {

    return {

        name: song.Song || "",

        type: song.Type || "",

        coverArtist:
            song["Cover Artist"] || "",

        performances:
            0,

        firstPlayed:
            song["First Played"] || "",

        firstVenue:
            song["First Venue"] || "",

        firstCity:
            song["First City"] || "",

        lastPlayed:
            song["Last Played"] || "",

        lastVenue:
            song["Last Venue"] || "",

        lastCity:
            song["Last City"] || "",

        showsPlayed:
            number(song["Shows Played"]),

        showsSinceLastPlay:
            number(song["Shows Since Last Play"]),

        gapStatus:
            song["Gap Status"] || "",

        previousGap:
            number(song["Previous Gap"]),

        averageGap:
            song["Average Shows Between Plays"] || "0",

        longestGap:
            number(song["Longest Gap"]),

        venuesPlayed:
            number(song["Venues Played"]),

        citiesPlayed:
            number(song["Cities Played"])

    };
}

function cityWithState(city) {

    if (!city) return "";

    const name = city.name || "";
    const state = city.stateCode || "";

    return state
        ? name + ", " + state
        : name;
}

function number(value) {

    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : 0;
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

            <button onclick="showPage('cities')">
                Cities
            </button>

            <button onclick="showPage('gaps')">
                Gaps
            </button>

            <button onclick="showPage('songbank')">
                Song Bank
            </button>

        </nav>
    `;
}

function navigateHistory(state, render) {

    history.pushState(state, "");

    render();

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

function restoreHistory(state) {

    if (!state) return;

    if (state.type === "page") {
        showPage(state.page, false);
        return;
    }

    if (state.type === "song") {
        openSong(state.name, false);
        return;
    }

    if (state.type === "show") {
        openShow(state.identifier, false);
        return;
    }

    if (state.type === "venue") {
        openVenue(state.key, false);
        return;
    }

    if (state.type === "city") {
        openCity(state.key, false);
    }
}

window.addEventListener("popstate", event => {

    restoreHistory(
        event.state
    );

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });

});

function showPage(page, addHistory = true) {

    if (addHistory) {
        history.pushState(
            {
                type: "page",
                page
            },
            ""
        );
    }

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

    if (page === "cities") {
        renderCities();
        return;
    }

    if (page === "gaps") {
        renderGaps();
        return;
    }

    if (page === "songbank") {
        renderOverallRotation();
        return;
    }
}

/* ==================================================
   DASHBOARD
================================================== */

function renderDashboard() {

    const mostPlayed =
        [...songs]
            .sort(
                (a, b) =>
                    b.performances -
                    a.performances
            )
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
                        ${getTotalPerformances()}
                    </div>

                    <div class="stat-label">
                        Total Plays
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
                        .map(show => showRow(show))
                        .join("")}

                </div>

            </section>

        </main>
    `;
}

/* ==================================================
   SONGS
================================================== */

function renderSongs() {

    const sortedSongs =
        [...songs]
            .sort(
                (a, b) =>
                    b.performances -
                    a.performances
            );

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

                <div class="song-filters">

                    <select
                        id="songTypeFilter"
                        onchange="filterSongs()"
                    >

                        <option value="all">
                            All Songs
                        </option>

                        <option value="originals">
                            Originals
                        </option>

                        <option value="covers">
                            Covers
                        </option>

                    </select>

                    <select
                        id="songSort"
                        onchange="filterSongs()"
                    >

                        <option value="plays">
                            Most Played
                        </option>

                        <option value="least">
                            Least Played
                        </option>

                        <option value="recent">
                            Most Recently Played
                        </option>

                        <option value="gap">
                            Longest Current Gap
                        </option>

                        <option value="alpha">
                            Alphabetical
                        </option>

                    </select>

                </div>

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

    const type =
        document
            .getElementById("songTypeFilter")
            .value;

    const sort =
        document
            .getElementById("songSort")
            .value;

    let filtered =
        songs.filter(song => {

            const matchesSearch =
                song.name
                    .toLowerCase()
                    .includes(query);

            const matchesType =
                type === "all" ||
                (type === "covers" &&
                    song.type === "Cover") ||
                (type === "originals" &&
                    song.type !== "Cover");

            return matchesSearch &&
                   matchesType;
        });

    filtered.sort((a, b) => {

        if (sort === "least") {
            return (
                a.performances -
                b.performances
            );
        }

        if (sort === "recent") {
            return (
                parseDate(b.lastPlayed) -
                parseDate(a.lastPlayed)
            );
        }

        if (sort === "gap") {
            return (
                b.showsSinceLastPlay -
                a.showsSinceLastPlay
            );
        }

        if (sort === "alpha") {
            return a.name.localeCompare(
                b.name
            );
        }

        return (
            b.performances -
            a.performances
        );
    });

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

                ${song.showsPlayed}
                ${song.showsPlayed === 1
                    ? "show"
                    : "shows"}

            </div>

            <div class="song-count">

                ${song.performances}

            </div>

        </div>
    `;
}

/* ==================================================
   SONG DETAIL
================================================== */

function openSong(name, addHistory = true) {

    const song =
        songs.find(
            item => item.name?.trim() === name?.trim()
        );

    if (!song) return;

    if (addHistory) {
        history.pushState(
            {
                type: "song",
                name
            },
            ""
        );
    }

    renderSongDetail(song);

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

function renderSongDetail(song) {

    const appearances =
        getSongAppearances(song.name);

    const venueCounts = {};

    appearances.forEach(appearance => {

        const key =
            `${appearance.venue} — ${appearance.city}`;

        venueCounts[key] =
            (venueCounts[key] || 0) + 1;
    });

    const venues =
        Object.entries(venueCounts)
            .sort((a, b) => b[1] - a[1]);

    document.getElementById("app").innerHTML = `

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

                        ${song.type === "Cover"
                            ? `Cover${
                                song.coverArtist
                                    ? " · " +
                                      escapeHtml(
                                        song.coverArtist
                                      )
                                    : ""
                              }`
                            : "Original"}

                    </div>

                </div>

                <button onclick="showPage('songs')">
                    ← Songs
                </button>

            </div>

            <div class="stats-grid detail-stats">

                <div class="stat-card">

                    <div class="stat-number">
                        ${song.performances}
                    </div>

                    <div class="stat-label">
                        Total Plays
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${song.showsPlayed}
                    </div>

                    <div class="stat-label">
                        Shows Played
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${song.showsSinceLastPlay}
                    </div>

                    <div class="stat-label">
                        Current Gap
                    </div>

                </div>

            </div>

            <div class="detail-info">

                <div class="detail-info-grid">

                    <div>

                        <div class="detail-label">
                            FIRST PLAYED
                        </div>

                        <strong>
                            ${escapeHtml(
                                song.firstPlayed
                            )}
                        </strong>

                        <div style="
                            color:#777;
                            font-size:11px;
                            margin-top:4px;
                        ">

                            ${escapeHtml(
                                song.firstVenue
                            )}

                            ${
                                song.firstCity
                                    ? " · " +
                                      escapeHtml(
                                        song.firstCity
                                      )
                                    : ""
                            }

                        </div>

                    </div>

                    <div>

                        <div class="detail-label">
                            LAST PLAYED
                        </div>

                        <strong>
                            ${escapeHtml(
                                song.lastPlayed
                            )}
                        </strong>

                        <div style="
                            color:#777;
                            font-size:11px;
                            margin-top:4px;
                        ">

                            ${escapeHtml(
                                song.lastVenue
                            )}

                            ${
                                song.lastCity
                                    ? " · " +
                                      escapeHtml(
                                        song.lastCity
                                      )
                                    : ""
                            }

                        </div>

                    </div>

                    <div>

                        <div class="detail-label">
                            AVERAGE GAP
                        </div>

                        <strong>
                            ${escapeHtml(
                                String(
                                    song.averageGap
                                )
                            )}

                            shows
                        </strong>

                    </div>

                    <div>

                        <div class="detail-label">
                            LONGEST GAP
                        </div>

                        <strong>
                            ${song.longestGap}
                            shows
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

                ${
                    appearances.length
                        ? appearances
                            .map(
                                appearance =>
                                    songAppearanceRow(
                                        appearance
                                    )
                            )
                            .join("")
                        : `
                            <div class="detail-info">
                                No appearance data found.
                            </div>
                          `
                }

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>Venues</h2>

            </div>

            <div class="song-list">

                ${venues
                    .map(([venue, count]) => {

                        const parts =
                            venue.split(" — ");

                        const venueName =
                            parts[0];

                        const city =
                            parts.slice(1).join(" — ");

                        return `

                            <div
                                class="song-row"
                                onclick="openVenue(
                                    '${escapeJs(venue)}'
                                )"
                                style="cursor:pointer"
                            >

                                <div class="song-name">

                                    ${escapeHtml(
                                        venueName
                                    )}

                                    <div class="song-meta">

                                        ${escapeHtml(
                                            city
                                        )}

                                    </div>

                                </div>

                                <div class="song-count">

                                    ${count}

                                </div>

                            </div>
                        `;
                    })
                    .join("")}

            </div>

        </section>
    `;
}

/* ==================================================
   SONG APPEARANCES
================================================== */

function getSongAppearances(songName) {

    const appearances = [];

    shows.forEach(show => {

        const sets =
            show.sets?.set || [];

        let found = false;

        let performanceCount = 0;

        sets.forEach(set => {

            (set.song || [])
                .forEach(song => {

                    if (
                        song.name?.trim() ===
                        songName
                    ) {

                        found = true;
                        performanceCount++;

                    }
                });
        });

        if (found) {

            appearances.push({

                showId:
                    show.id ||
                    show.eventDate,

                date:
                    parseDate(
                        show.eventDate
                    ),

                venue:
                    show.venue?.name ||
                    "Unknown Venue",

                city:
                    cityWithState(show.venue?.city) ||
                    "",

                performanceCount

            });
        }
    });

    return appearances.sort(
        (a, b) =>
            b.date - a.date
    );
}

function songAppearanceRow(appearance) {

    return `

        <div
            class="show-row"
            onclick="openShow('${escapeJs(
                appearance.showId
            )}')"
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

    const months = [...new Set(
        sortedShows.map(show => {

            const date =
                parseDate(show.eventDate);

            if (isNaN(date.getTime())) {
                return null;
            }

            return `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;

        }).filter(Boolean)
    )];

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <h2>Shows</h2>

                <button onclick="showPage('dashboard')">
                    ← Dashboard
                </button>

            </div>

            <div class="search-box">

                <select
                    id="showDateFilter"
                    onchange="filterShowsByDate()"
                >

                    <option value="all">
                        Jump to date
                    </option>

                    ${months
                        .map(month => {

                            const parts =
                                month.split("-");

                            const year =
                                Number(parts[0]);

                            const monthNumber =
                                Number(parts[1]);

                            const label =
                                new Date(
                                    year,
                                    monthNumber - 1,
                                    1
                                ).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "long",
                                        year: "numeric"
                                    }
                                );

                            return `
                                <option value="${month}">
                                    ${label}
                                </option>
                            `;

                        })
                        .join("")}

                </select>

            </div>

            <div
                id="showResults"
                class="show-list"
            >

                ${sortedShows
                    .map(show => showRow(show))
                    .join("")}

            </div>

        </section>
    `;
}

function filterShowsByDate() {

    const selected =
        document
            .getElementById("showDateFilter")
            .value;

    let filtered = [...shows]
        .sort(
            (a, b) =>
                parseDate(b.eventDate) -
                parseDate(a.eventDate)
        );

    if (selected !== "all") {

        filtered =
            filtered.filter(show => {

                const date =
                    parseDate(
                        show.eventDate
                    );

                if (isNaN(date.getTime())) {
                    return false;
                }

                const key =
                    `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                    ).padStart(2, "0")}`;

                return key === selected;
            });
    }

    document.getElementById("showResults")
        .innerHTML =
            filtered
                .map(show => showRow(show))
                .join("");
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
                        cityWithState(show.venue?.city) ||
                        ""
                    )}

                </span>

                ${show.eventName ? `
                    <div class="show-event">
                        ${escapeHtml(show.eventName)}
                    </div>
                ` : ""}

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

function openShow(identifier, addHistory = true) {

    const show =
        shows.find(
            item =>
                String(
                    item.id ||
                    item.eventDate
                ) === String(identifier)
        );

    if (!show) return;

    if (addHistory) {
        history.pushState(
            {
                type: "show",
                identifier
            },
            ""
        );
    }

    renderShowDetail(show);

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

function renderShowDetail(show) {

    const sets =
        show.sets?.set || [];

    let totalPerformances = 0;

    sets.forEach(set => {

        totalPerformances +=
            (set.song || []).length;

    });

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <div>

                    <h2
                        onclick="openVenue(
                            (this.dataset.venueKey)
                        )"
                        data-venue-key="${escapeHtml(
                            (show.venue?.name || "Unknown Venue") +
                            " — " +
                            (cityWithState(show.venue?.city) || "")
                        )}"
                        style="
                            cursor:pointer;
                            text-decoration:underline;
                            text-underline-offset:3px;
                        "
                    >
                        ${escapeHtml(
                            show.venue?.name ||
                            "Unknown Venue"
                        )}
                    </h2>

                    <div class="detail-subtitle">

                        <span
                            onclick="openCity(
                                this.dataset.cityKey
                            )"
                            data-city-key="${escapeHtml(
                                cityWithState(show.venue?.city) || ""
                            )}"
                            style="
                                cursor:pointer;
                                text-decoration:underline;
                                text-underline-offset:3px;
                            "
                        >
                            ${escapeHtml(
                                cityWithState(show.venue?.city) ||
                                ""
                            )}
                        </span>

                        ·

                        ${formatDate(
                            parseDate(
                                show.eventDate
                            )
                        )}

                    </div>

                    ${show.eventName ? `
                        <div class="detail-event">
                            ${escapeHtml(show.eventName)}
                        </div>
                    ` : ""}

                    ${show.info ? `
                        <div class="detail-notes">
                            ${escapeHtml(show.info)}
                        </div>
                    ` : ""}

                </div>

                <button onclick="showPage('shows')">
                    ← Shows
                </button>

            </div>

            <div class="detail-meta">

                ${sets.length}
                ${sets.length === 1
                    ? "set"
                    : "sets"}


            </div>

            ${sets
                .map(
                    (set, index) =>
                        renderSet(
                            set,
                            index
                        )
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
                .map(
                    (song, songIndex) => `

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

                    `
                )
                .join("")}

        </div>
    `;
}

function getSetTitle(set, index) {

    if (set.encore) {
        return `Encore ${set.encore > 1 ? set.encore : ""}`.trim();
    }

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
            cityWithState(show.venue?.city) ||
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
                    .map(
                        venue => `

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

                        `
                    )
                    .join("")}

            </div>

        </section>
    `;
}

function openVenue(key, addHistory = true) {

    const venue =
        buildVenueData()
            .find(
                item =>
                    item.key === key
            );

    if (!venue) return;

    if (addHistory) {
        history.pushState(
            {
                type: "venue",
                key
            },
            ""
        );
    }

    renderVenueDetail(venue);

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
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
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );

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

                    <div class="detail-subtitle">

                        ${escapeHtml(
                            venue.city
                        )}

                    </div>

                </div>

                <button onclick="showPage('venues')">
                    ← Venues
                </button>

            </div>

            <div class="stats-grid detail-stats">

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
                    .map(
                        ([name, count]) => `

                            <div
                                class="song-row"
                                onclick="openSong('${escapeJs(
                                    name
                                )}')"
                                style="cursor:pointer"
                            >

                                <div class="song-name">

                                    ${escapeHtml(
                                        name
                                    )}

                                </div>

                                <div class="song-count">

                                    ${count}

                                </div>

                            </div>

                        `
                    )
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
   CITIES
================================================== */

function buildCityData() {

    const cityMap = {};

    shows.forEach(show => {

        const city =
            cityWithState(show.venue?.city) ||
            "Unknown City";

        const state =
            show.venue?.city?.stateCode ||
            "";

        const key =
            city;

        if (!cityMap[key]) {

            cityMap[key] = {
                key,
                city,
                state,
                shows: [],
                venues: new Set(),
                songs: new Set()
            };
        }

        cityMap[key].shows.push(show);

        const venue =
            show.venue?.name ||
            "Unknown Venue";

        cityMap[key].venues.add(venue);

        const sets =
            show.sets?.set || [];

        sets.forEach(set => {

            (set.song || []).forEach(song => {

                const name =
                    song.name?.trim();

                if (name) {
                    cityMap[key].songs.add(name);
                }

            });

        });

    });

    return Object.values(cityMap);
}

function renderCities() {

    const cities =
        buildCityData()
            .sort(
                (a, b) =>
                    b.shows.length -
                    a.shows.length
            );

    document.getElementById("content").innerHTML = `

        <section class="panel">

            <div class="panel-header">

                <h2>Cities</h2>

                <button onclick="showPage('dashboard')">
                    ← Dashboard
                </button>

            </div>

            <div class="venue-list">

                ${cities
                    .map(
                        city => `

                            <div
                                class="song-row"
                                onclick="openCity('${escapeJs(city.key)}')"
                                style="cursor:pointer"
                            >

                                <div class="song-name">

                                    ${escapeHtml(
                                        city.city
                                    )}

                                    <div class="song-meta">

                                        ${city.venues.size}
                                        ${city.venues.size === 1
                                            ? "venue"
                                            : "venues"}

                                        ·

                                        ${city.songs.size}
                                        ${city.songs.size === 1
                                            ? "song"
                                            : "songs"}

                                    </div>

                                </div>

                                <div class="song-count">

                                    ${city.shows.length}

                                </div>

                            </div>

                        `
                    )
                    .join("")}

            </div>

        </section>
    `;
}

/* ==================================================
   CITY DETAIL
================================================== */

function openCity(key, addHistory = true) {

    const city =
        buildCityData()
            .find(
                item =>
                    item.key === key
            );

    if (!city) return;

    if (addHistory) {
        history.pushState(
            {
                type: "city",
                key
            },
            ""
        );
    }

    renderCityDetail(city);

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

function renderCityDetail(city) {

    const songCounts = {};
    const venueMap = {};

    city.shows.forEach(show => {

        const venueName =
            show.venue?.name ||
            "Unknown Venue";

        if (!venueMap[venueName]) {
            venueMap[venueName] = [];
        }

        venueMap[venueName].push(show);

        const sets =
            show.sets?.set || [];

        sets.forEach(set => {

            (set.song || []).forEach(song => {

                const name =
                    song.name?.trim();

                if (!name) return;

                songCounts[name] =
                    (songCounts[name] || 0) + 1;

            });

        });

    });

    const rankedSongs =
        Object.entries(songCounts)
            .sort(
                (a, b) =>
                    b[1] - a[1] ||
                    a[0].localeCompare(b[0])
            );

    const venues =
        Object.entries(venueMap)
            .sort(
                (a, b) =>
                    b[1].length -
                    a[1].length
            );

    const recentShows =
        [...city.shows]
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
                        ${escapeHtml(city.city)}
                    </h2>

                    <div class="detail-subtitle">
                        City Statistics
                    </div>

                </div>

                <button onclick="showPage('cities')">
                    ← Cities
                </button>

            </div>

            <div class="stats-grid detail-stats">

                <div class="stat-card">

                    <div class="stat-number">
                        ${city.shows.length}
                    </div>

                    <div class="stat-label">
                        Shows
                    </div>

                </div>

                <div class="stat-card">

                    <div class="stat-number">
                        ${venues.length}
                    </div>

                    <div class="stat-label">
                        Venues
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
                    .map(
                        ([name, count]) => `

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

                        `
                    )
                    .join("")}

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>
                    Venues
                </h2>

            </div>

            <div class="song-list">

                ${venues
                    .map(
                        ([name, venueShows]) => {

                            const key =
                                `${name} — ${city.city}`;

                            return `

                                <div
                                    class="song-row"
                                    onclick="openVenue('${escapeJs(key)}')"
                                    style="cursor:pointer"
                                >

                                    <div class="song-name">

                                        ${escapeHtml(name)}

                                    </div>

                                    <div class="song-meta">

                                        ${venueShows.length}
                                        ${venueShows.length === 1
                                            ? "show"
                                            : "shows"}

                                    </div>

                                    <div class="song-count">

                                        ${venueShows.length}

                                    </div>

                                </div>

                            `;

                        }
                    )
                    .join("")}

            </div>

        </section>

        <section class="panel">

            <div class="panel-header">

                <h2>
                    Shows
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
   SONG BANK
================================================== */


/* ==================================================
   OVERALL ROTATION
================================================== */

function renderOverallRotation() {

    /*
       The raw Setlist.fm data stores songs inside:
       show.sets.set[].song[]

       Shows are already stored newest -> oldest.
    */

    const recentShows = shows;

    const last5Shows = recentShows.slice(0, 5);
    const last20Shows = recentShows.slice(0, 20);
    const shows6to20 = recentShows.slice(5, 20);

    function getShowSongs(show) {

        const result = [];

        (show.sets?.set || []).forEach(set => {

            (set.song || []).forEach(song => {

                const name = song.name?.trim();

                if (name) {
                    result.push(song);
                }

            });

        });

        return result;
    }

    const last5 = new Set();

    last5Shows.forEach(show => {

        getShowSongs(show).forEach(song => {
            last5.add(song.name.trim());
        });

    });

    const last20Counts = {};
    const fallingOutCounts = {};

    last20Shows.forEach(show => {

        getShowSongs(show).forEach(song => {

            const name = song.name.trim();

            last20Counts[name] =
                (last20Counts[name] || 0) + 1;
        });

    });

    shows6to20.forEach(show => {

        getShowSongs(show).forEach(song => {

            const name = song.name.trim();

            fallingOutCounts[name] =
                (fallingOutCounts[name] || 0) + 1;
        });

    });

    function isCover(name) {

        const song =
            songs.find(song => song.name === name);

        return song?.type === "Cover";
    }

    function splitAndLimit(items) {

        const originals = [];
        const covers = [];

        items.forEach(item => {

            if (isCover(item.name)) {

                if (covers.length < 5) {
                    covers.push(item);
                }

            } else {

                if (originals.length < 5) {
                    originals.push(item);
                }
            }

        });

        return {
            originals,
            covers
        };
    }

    function rank(items) {

        return items.sort((a, b) =>
            b.score - a.score ||
            a.name.localeCompare(b.name)
        );
    }

    /*
       1. Most Played — Not Played in Last 5 Shows

       Lifetime play count, excluding anything
       appearing in the most recent five shows.
    */

    const mostPlayedNot5 =
        splitAndLimit(
            rank(
                songs
                    .filter(song =>
                        song.performances > 0 &&
                        !last5.has(song.name)
                    )
                    .map(song => ({
                        name: song.name,
                        score: song.performances,
                        meta:
                            song.performances +
                            (song.performances === 1
                                ? " overall play"
                                : " overall plays")
                    }))
            )
        );

    /*
       2. Recently Falling Out of Rotation

       Songs played at least twice in shows 6–20,
       but not in the most recent five.
    */

    const fallingOut =
        splitAndLimit(
            rank(
                Object.entries(fallingOutCounts)
                    .filter(([name, count]) =>
                        count >= 2 &&
                        !last5.has(name)
                    )
                    .map(([name, count]) => {

                        const song =
                            songs.find(song =>
                                song.name === name
                            );

                        return {
                            name,
                            score: count,
                            meta:
                                count +
                                (count === 1
                                    ? " play in shows 6–20"
                                    : " plays in shows 6–20") +
                                (song
                                    ? " · " +
                                      song.performances +
                                      " overall"
                                    : "")
                        };
                    })
            )
        );

    /*
       3. Most Played in Last 20 Shows
    */

    const mostPlayed20 =
        splitAndLimit(
            rank(
                Object.entries(last20Counts)
                    .map(([name, count]) => {

                        const song =
                            songs.find(song =>
                                song.name === name
                            );

                        return {
                            name,
                            score: count,
                            meta:
                                count +
                                (count === 1
                                    ? " play in last 20"
                                    : " plays in last 20") +
                                (song
                                    ? " · " +
                                      song.performances +
                                      " overall"
                                    : "")
                        };
                    })
            )
        );

    /*
       4. Top Songs We've Neglected

       KEEPING THE WORKING VERSION:
       lifetime importance × existing site gap.
    */

    const neglected =
        splitAndLimit(
            rank(
                songs
                    .filter(song =>
                        song.performances >= 5 &&
                        song.showsSinceLastPlay > 0 &&
                        !last5.has(song.name)
                    )
                    .map(song => ({
                        name: song.name,
                        score:
                            song.performances *
                            song.showsSinceLastPlay,
                        meta:
                            song.performances +
                            " overall plays · " +
                            song.showsSinceLastPlay +
                            " show gap"
                    }))
            )
        );

    function rows(items) {

        if (!items.length) {
            return '<div class="song-bank-empty">None currently qualify</div>';
        }

        return items.map(item =>
            '<div class="song-bank-song" data-song-name="' +
                escapeHtml(item.name) +
            '">' +
                '<span>' +
                    escapeHtml(item.name) +
                '</span>' +
                '<small> (' +
                    escapeHtml(item.meta) +
                ')</small>' +
            '</div>'
        ).join("");
    }

    function section(title, description, data) {

        return (
            '<section class="panel song-bank-panel">' +

                '<div class="panel-header">' +
                    '<h2>' +
                        escapeHtml(title) +
                    '</h2>' +
                    '<p>' +
                        escapeHtml(description) +
                    '</p>' +
                '</div>' +

                '<div class="song-bank-columns">' +

                    '<div class="song-bank-column">' +
                        '<h3>ORIGINALS</h3>' +
                        rows(data.originals) +
                    '</div>' +

                    '<div class="song-bank-column">' +
                        '<h3>COVERS</h3>' +
                        rows(data.covers) +
                    '</div>' +

                '</div>' +

            '</section>'
        );
    }

    const venueMap = {};

    shows.forEach(show => {

        const venueName =
            show.venue?.name?.trim();

        const cityName =
            show.venue?.city?.name?.trim() || "";

        const stateName =
            show.venue?.city?.stateCode?.trim() || "";

        if (!venueName) return;

        const key =
            venueName +
            "|" +
            cityName +
            "|" +
            stateName;

        if (!venueMap[key]) {

            venueMap[key] = {
                key,
                name: venueName,
                city: cityName,
                state: stateName,
                shows: []
            };
        }

        venueMap[key].shows.push(show);
    });

    const venues =
        Object.values(venueMap)
            .sort((a, b) =>
                a.name.localeCompare(b.name) ||
                a.city.localeCompare(b.city)
            );

    const venueOptions =
        venues.map(item => {

            const label =
                item.name +
                " — " +
                item.city +
                (item.state
                    ? ", " + item.state
                    : "") +
                " (" +
                item.shows.length +
                (item.shows.length === 1
                    ? " show"
                    : " shows") +
                ")";

            return (
                '<option value="' +
                    escapeHtml(item.key) +
                '">' +
                    escapeHtml(label) +
                '</option>'
            );

        }).join("");

    document.getElementById("app").innerHTML =

        '<section class="panel song-bank-location">' +

            '<div class="panel-header">' +
                '<h1>SONG BANK</h1>' +
                '<p>Overall rotation and song ideas for the band</p>' +
            '</div>' +

            '<div class="song-bank-overall-link">' +
                '<span>Looking for venue-specific ideas?</span>' +

                '<select ' +
                    'id="song-bank-venue"' +
                    'class="gap-select"' +
                    'onchange="' +
                        'window.songBankVenue=this.value;' +
                        'renderSongBank()' +
                    '"' +
                '>' +

                    '<option value="">Select a venue...</option>' +
                    venueOptions +

                '</select>' +

            '</div>' +

        '</section>' +

        section(
            "Most Played — Not Played in Last 5 Shows",
            "Our most-played songs that haven't appeared in the last 5 shows",
            mostPlayedNot5
        ) +

        section(
            "Recently Falling Out of Rotation",
            "Songs that were active in shows 6–20 but have disappeared from the last 5",
            fallingOut
        ) +

        section(
            "Most Played in Last 20 Shows",
            "The band's current active vocabulary",
            mostPlayed20
        ) +

        section(
            "Top Songs We've Neglected",
            "Well-established songs with the strongest combination of play history and current gap",
            neglected
        );

    document
        .querySelectorAll(".song-bank-song[data-song-name]")
        .forEach(row => {
            row.addEventListener("click", () => {
                openSong(row.dataset.songName);
            });
        });
}

/* ==================================================
   VENUE SONG BANK
================================================== */

function renderSongBank() {

    const venueMap = {};

    shows.forEach(show => {

        const venueName = show.venue?.name?.trim();
        const cityName = show.venue?.city?.name?.trim() || "";
        const stateName = show.venue?.city?.stateCode?.trim() || "";

        if (!venueName) return;

        const key = venueName + "|" + cityName + "|" + stateName;

        if (!venueMap[key]) {
            venueMap[key] = {
                key: key,
                name: venueName,
                city: cityName,
                state: stateName,
                shows: []
            };
        }

        venueMap[key].shows.push(show);
    });

    const venues = Object.values(venueMap).sort((a, b) =>
        a.name.localeCompare(b.name) ||
        a.city.localeCompare(b.city)
    );

    if (!venues.length) {
        document.getElementById("app").innerHTML =
            '<section class="panel"><div class="panel-header"><h2>Song Bank</h2><p>No venue data available.</p></div></section>';
        return;
    }

    let selectedKey = window.songBankVenue;

    if (!selectedKey || !venues.some(v => v.key === selectedKey)) {
        selectedKey = venues[0].key;
    }

    window.songBankVenue = selectedKey;

    const venue = venues.find(v => v.key === selectedKey);
    const venueShows = venue.shows.slice().sort((a, b) =>
        parseDate(a.eventDate) - parseDate(b.eventDate)
    );

    const venueSongCounts = {};
    const venueSongDates = {};
    const allSongHistory = {};

    shows.forEach(show => {

        const showVenue = show.venue?.name?.trim() || "";
        const showCity = show.venue?.city?.name?.trim() || "";
        const showState = show.venue?.city?.stateCode?.trim() || "";

        const showKey =
            showVenue + "|" + showCity + "|" + showState;

        const date = parseDate(show.eventDate);
        const uniqueSongs = new Map();

        (show.sets?.set || []).forEach(set => {

            (set.song || []).forEach(song => {

                const name = song.name?.trim();

                if (!name) return;

                uniqueSongs.set(name, song);

                if (!allSongHistory[name]) {
                    allSongHistory[name] = [];
                }

                allSongHistory[name].push({
                    date: date,
                    venueKey: showKey,
                    cover: !!song.cover
                });
            });
        });

        if (showKey === venue.key) {

            uniqueSongs.forEach((song, name) => {

                venueSongCounts[name] =
                    (venueSongCounts[name] || 0) + 1;

                if (!venueSongDates[name]) {
                    venueSongDates[name] = [];
                }

                venueSongDates[name].push(date);
            });
        }
    });

    function isCover(name) {

        const history = allSongHistory[name] || [];

        return history.some(item => item.cover);
    }

    function splitAndLimit(list) {

        return {
            originals: list
                .filter(item => !isCover(item.name))
                .slice(0, 5),

            covers: list
                .filter(item => isCover(item.name))
                .slice(0, 5)
        };
    }

    const alwaysRanked =
        Object.keys(venueSongCounts)
            .map(name => ({
                name: name,
                count: venueSongCounts[name]
            }))
            .sort((a, b) =>
                b.count - a.count ||
                a.name.localeCompare(b.name)
            );

    const regularRanked =
        songs
            .filter(song =>
                song.performances >= 10 &&
                !venueSongCounts[song.name]
            )
            .map(song => ({
                name: song.name,
                count: song.performances
            }))
            .sort((a, b) =>
                b.count - a.count ||
                a.name.localeCompare(b.name)
            );

    const onceRanked =
        Object.keys(venueSongCounts)
            .filter(name => venueSongCounts[name] === 1)
            .map(name => ({
                name: name,
                count: (songs.find(song => song.name === name)?.performances || 0)
            }))
            .sort((a, b) =>
                b.count - a.count ||
                a.name.localeCompare(b.name)
            );

    const overdueRanked =
        Object.keys(venueSongCounts)
            .filter(name => venueSongCounts[name] >= 2)
            .map(name => {

                const dates =
                    venueSongDates[name]
                        .slice()
                        .sort((a, b) => a - b);

                const lastDate =
                    dates[dates.length - 1];

                const showsSince =
                    venueShows.filter(show =>
                        parseDate(show.eventDate) > lastDate
                    ).length;

                return {
                    name: name,
                    count: venueSongCounts[name],
                    showsSince: showsSince
                };
            })
            .sort((a, b) =>
                b.showsSince - a.showsSince ||
                b.count - a.count ||
                a.name.localeCompare(b.name)
            );

    const debuts = {
        originals: [],
        covers: []
    };

    Object.keys(allSongHistory).forEach(name => {

        const history =
            allSongHistory[name]
                .slice()
                .sort((a, b) => a.date - b.date);

        if (!history.length) return;

        if (history[0].venueKey !== venue.key) {
            return;
        }

        const item = {
            name: name,
            date: history[0].date
        };

        if (isCover(name)) {
            debuts.covers.push(item);
        } else {
            debuts.originals.push(item);
        }
    });

    debuts.originals.sort((a, b) =>
        a.date - b.date ||
        a.name.localeCompare(b.name)
    );

    debuts.covers.sort((a, b) =>
        a.date - b.date ||
        a.name.localeCompare(b.name)
    );

    const songBankData = {
        always: splitAndLimit(alwaysRanked),
        regular: splitAndLimit(regularRanked),
        once: splitAndLimit(onceRanked),
        overdue: splitAndLimit(overdueRanked),
        debuts: debuts,
        venue: venue,
        venues: venues
    };

    renderSongBankPage(songBankData);
}


function renderSongBankPage(data) {

    const venue = data.venue;
    const venues = data.venues;

    function escape(value) {
        return escapeHtml(value);
    }

    function songRows(items, type) {

        if (!items.length) {
            return '<div class="song-bank-empty">None currently qualify</div>';
        }

        return items.map(item => {

            let meta = "";

            if (type === "always") {
                meta =
                    item.count +
                    (item.count === 1 ? " play" : " plays");
            }

            if (type === "regular") {
                meta =
                    item.count + " overall plays";
            }

            if (type === "overdue") {
                meta =
                    item.showsSince +
                    (item.showsSince === 1
                        ? " show ago"
                        : " shows ago");
            }

            return (
                '<div class="song-bank-song" data-song-name="' + escape(item.name) + '">' +
                    '<span>' + escape(item.name) + '</span>' +
                    (meta
                        ? '<small> (' + escape(meta) + ')</small>'
                        : '') +
                '</div>'
            );

        }).join("");
    }

    function section(
        title,
        description,
        sectionData,
        type
    ) {

        return (
            '<section class="panel song-bank-panel">' +

                '<div class="panel-header">' +
                    '<h2>' + escape(title) + '</h2>' +
                    '<p>' + escape(description) + '</p>' +
                '</div>' +

                '<div class="song-bank-columns">' +

                    '<div class="song-bank-column">' +
                        '<h3>ORIGINALS</h3>' +
                        songRows(sectionData.originals, type) +
                    '</div>' +

                    '<div class="song-bank-column">' +
                        '<h3>COVERS</h3>' +
                        songRows(sectionData.covers, type) +
                    '</div>' +

                '</div>' +

            '</section>'
        );
    }

    function debutRows(items) {

        if (!items.length) {
            return '<div class="song-bank-empty">None</div>';
        }

        return items.map(item => {

            return (
                '<div class="song-bank-song">' +
                    '<span>' + escape(item.name) + '</span>' +
                    '<small>' + escape(formatDate(item.date)) + '</small>' +
                '</div>'
            );

        }).join("");
    }

    const options = venues.map(item => {

        const label =
            item.name +
            " — " +
            item.city +
            (item.state ? ", " + item.state : "") +
            " (" +
            item.shows.length +
            (item.shows.length === 1 ? " show" : " shows") +
            ")";

        return (
            '<option value="' +
            escape(item.key) +
            '"' +
            (item.key === venue.key ? " selected" : "") +
            '>' +
            escape(label) +
            '</option>'
        );

    }).join("");

    const debutSection =
        '<section class="panel song-bank-panel">' +

            '<div class="panel-header">' +
                '<h2>Songs Debuted Here</h2>' +
                '<p>Every song whose first recorded appearance was at this venue</p>' +
            '</div>' +

            '<div class="song-bank-columns">' +

                '<div class="song-bank-column">' +
                    '<h3>ORIGINALS</h3>' +
                    debutRows(data.debuts.originals) +
                '</div>' +

                '<div class="song-bank-column">' +
                    '<h3>COVERS</h3>' +
                    debutRows(data.debuts.covers) +
                '</div>' +

            '</div>' +

        '</section>';

    document.getElementById("app").innerHTML =

        '<section class="panel song-bank-location">' +

            '<div class="panel-header">' +
                '<h1>SONG BANK</h1>' +
                '<p>Venue-specific song ideas for the band</p>' +
            '</div>' +

            '<label for="song-bank-venue">Location</label>' +

            '<select ' +
                'id="song-bank-venue" ' +
                'class="gap-select" ' +
                'onchange="window.songBankVenue=this.value;renderSongBank()"' +
            '>' +

                options +

            '</select>' +

        '</section>' +

        section(
            "Songs We Always Play Here",
            "Top 5 songs played at this venue",
            data.always,
            "always"
        ) +

        section(
            "Regular Rotation — Never Played Here",
            "10+ overall performances · 0 at this venue",
            data.regular,
            "regular"
        ) +

        section(
            "Only Played Here Once",
            "Exactly one appearance at this venue",
            data.once,
            "once"
        ) +

        section(
            "Overdue Songs We've Played Here",
            "Played here 2+ times · biggest venue-specific gaps",
            data.overdue,
            "overdue"
        ) +

        debutSection;

    document
        .querySelectorAll(".song-bank-song[data-song-name]")
        .forEach(row => {
            row.addEventListener("click", () => {
                openSong(row.dataset.songName);
            });
        });
}

/* ==================================================
   GAPS
================================================== */

function renderGaps() {

    const GAP_BUSTOUT = 50;
    const GAP_MONSTER = 100;

    const gapModes = {

        longest: {
            title: "Longest Current Gaps",
            description: "Songs with the most shows since last played",

            songs: [...songs]
                .sort(
                    (a, b) =>
                        b.showsSinceLastPlay -
                        a.showsSinceLastPlay
                )
                .slice(0, 50)
        },

        bustoutEligible: {
            title: "All Songs Eligible for Bustout",
            description: "50+ shows since last played · 3+ total plays",

            songs: [...songs]
                .filter(
                    song =>
                        song.showsSinceLastPlay >= GAP_BUSTOUT &&
                        song.performances >= 3
                )
                .sort(
                    (a, b) =>
                        b.showsSinceLastPlay -
                        a.showsSinceLastPlay
                )
        },

        bustoutWatch: {
            title: "Bustout Watch",
            description: "40–49 shows since last played",

            songs: [...songs]
                .filter(
                    song =>
                        song.showsSinceLastPlay >= 40 &&
                        song.showsSinceLastPlay < GAP_BUSTOUT
                )
                .sort(
                    (a, b) =>
                        b.showsSinceLastPlay -
                        a.showsSinceLastPlay
                )
        },

        monsterEligible: {
            title: "All Songs Eligible for Monster Gap",
            description: "100+ shows since last played · 3+ total plays",

            songs: [...songs]
                .filter(
                    song =>
                        song.showsSinceLastPlay >= GAP_MONSTER &&
                        song.performances >= 3
                )
                .sort(
                    (a, b) =>
                        b.showsSinceLastPlay -
                        a.showsSinceLastPlay
                )
        },

        monsterWatch: {
            title: "Monster Gap Watch",
            description: "90–99 shows since last played",

            songs: [...songs]
                .filter(
                    song =>
                        song.showsSinceLastPlay >= 90 &&
                        song.showsSinceLastPlay < GAP_MONSTER
                )
                .sort(
                    (a, b) =>
                        b.showsSinceLastPlay -
                        a.showsSinceLastPlay
                )
        },

        recent: {
            title: "Most Recently Played",
            description: "Songs ordered by most recent performance",

            songs: [...songs]
                .sort(
                    (a, b) =>
                        parseDate(b.lastPlayed) -
                        parseDate(a.lastPlayed)
                )
        },

        mostPlayed: {
            title: "Most Played",
            description: "Songs ordered by total performances",

            songs: [...songs]
                .sort(
                    (a, b) =>
                        b.performances -
                        a.performances
                )
        },

        neverOne: {
            title: "Never / One-Time Played",
            description: "Songs with one or fewer total performances",

            songs: [...songs]
                .filter(
                    song =>
                        song.performances <= 1
                )
                .sort(
                    (a, b) =>
                        a.name.localeCompare(b.name)
                )
        }

    };

    let currentMode = "longest";

    let sortColumn = "gap";
    let sortDirection = "desc";

    function getSortedSongs(songList) {

        const sorted = [...songList];

        sorted.sort((a, b) => {

            let result = 0;

            if (sortColumn === "song") {

                result =
                    a.name.localeCompare(b.name);

            }

            if (sortColumn === "lastPlayed") {

                result =
                    parseDate(a.lastPlayed) -
                    parseDate(b.lastPlayed);

            }

            if (sortColumn === "gap") {

                result =
                    a.showsSinceLastPlay -
                    b.showsSinceLastPlay;

            }

            if (result === 0) {

                result =
                    a.name.localeCompare(b.name);

            }

            return sortDirection === "asc"
                ? result
                : -result;

        });

        return sorted;
    }

    function sortIndicator(column) {

        if (sortColumn !== column) {
            return "";
        }

        return sortDirection === "asc"
            ? " ↑"
            : " ↓";
    }

    function renderGapList(songList) {

        const sortedSongs =
            getSortedSongs(songList);

        if (!sortedSongs.length) {

            return `
                <div class="gap-empty">
                    Nothing currently in this category.
                </div>
            `;

        }

        return sortedSongs
            .map(
                song => `

                    <div
                        class="gap-row"
                        onclick="openSong('${escapeJs(song.name)}')"
                    >

                        <div class="gap-song">
                            ${escapeHtml(song.name)}
                        </div>

                        <div class="gap-last">

                            <span class="gap-label">
                                Last Played
                            </span>

                            <span>
                                ${escapeHtml(song.lastPlayed)}
                            </span>

                        </div>

                        <div class="gap-count">
                            ${song.showsSinceLastPlay}
                        </div>

                    </div>

                `
            )
            .join("");

    }

    function renderMode(mode) {

        currentMode =
            gapModes[mode]
                ? mode
                : "longest";

        const selected =
            gapModes[currentMode];

        document.getElementById("gap-results")
            .innerHTML =
                renderGapList(selected.songs);

        document.getElementById("gap-title")
            .textContent =
                selected.title;

        document.getElementById("gap-description")
            .textContent =
                selected.description;

        document.getElementById("gap-sort-song")
            .innerHTML =
                "Song" +
                sortIndicator("song");

        document.getElementById("gap-sort-last")
            .innerHTML =
                "Last Played" +
                sortIndicator("lastPlayed");

        document.getElementById("gap-sort-gap")
            .innerHTML =
                "Gap" +
                sortIndicator("gap");

    }

    function handleSort(column) {

        if (sortColumn === column) {

            sortDirection =
                sortDirection === "asc"
                    ? "desc"
                    : "asc";

        } else {

            sortColumn = column;

            sortDirection =
                column === "song"
                    ? "asc"
                    : "desc";

        }

        renderMode(currentMode);

    }

    document.getElementById("content").innerHTML = `

        <section class="panel gap-panel">

            <div class="panel-header gap-header">

                <div class="gap-heading">

                    <h2 id="gap-title">
                        Longest Current Gaps
                    </h2>

                    <div
                        id="gap-description"
                        class="song-meta"
                    >
                        Songs with the most shows since last played
                    </div>

                </div>

                <div class="gap-controls">

                    <label for="gap-mode">
                        View
                    </label>

                    <select
                        id="gap-mode"
                        class="gap-select"
                    >

                        <option value="longest">
                            Longest Current Gaps
                        </option>

                        <option value="bustoutEligible">
                            All Songs Eligible for Bustout
                        </option>

                        <option value="bustoutWatch">
                            Bustout Watch — 40–49
                        </option>

                        <option value="monsterEligible">
                            All Songs Eligible for Monster Gap
                        </option>

                        <option value="monsterWatch">
                            Monster Gap Watch — 90–99
                        </option>

                        <option value="recent">
                            Most Recently Played
                        </option>

                        <option value="mostPlayed">
                            Most Played
                        </option>

                        <option value="neverOne">
                            Never / One-Time Played
                        </option>

                    </select>

                </div>

            </div>

            <div class="gap-column-head">

                <div
                    id="gap-sort-song"
                    class="gap-sortable"
                    role="button"
                    tabindex="0"
                    title="Sort by song"
                >
                    Song
                </div>

                <div
                    id="gap-sort-last"
                    class="gap-sortable"
                    role="button"
                    tabindex="0"
                    title="Sort by last played"
                >
                    Last Played
                </div>

                <div
                    id="gap-sort-gap"
                    class="gap-sortable"
                    role="button"
                    tabindex="0"
                    title="Sort by gap"
                >
                    Gap
                </div>

            </div>

            <div
                id="gap-results"
                class="gap-list"
            ></div>

        </section>

        <div class="gap-back">

            <button onclick="showPage('dashboard')">
                ← Dashboard
            </button>

        </div>

    `;

    document
        .getElementById("gap-mode")
        .addEventListener(
            "change",
            event => {
                renderMode(event.target.value);
            }
        );

    document
        .getElementById("gap-sort-song")
        .addEventListener(
            "click",
            () => handleSort("song")
        );

    document
        .getElementById("gap-sort-last")
        .addEventListener(
            "click",
            () => handleSort("lastPlayed")
        );

    document
        .getElementById("gap-sort-gap")
        .addEventListener(
            "click",
            () => handleSort("gap")
        );

    document
        .getElementById("gap-sort-song")
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    handleSort("song");
                }

            }
        );

    document
        .getElementById("gap-sort-last")
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    handleSort("lastPlayed");
                }

            }
        );

    document
        .getElementById("gap-sort-gap")
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    handleSort("gap");
                }

            }
        );

    renderMode("longest");

}
/* ==================================================
   HELPERS
================================================== */

function calculatePerformanceCounts() {

    const counts = {};

    shows.forEach(show => {

        const sets = show.sets?.set || [];

        sets.forEach(set => {

            (set.song || []).forEach(song => {

                const name = song.name?.trim();

                if (!name) return;

                counts[name] = (counts[name] || 0) + 1;
            });
        });
    });

    return counts;
}

function getTotalPerformances() {

    return songs.reduce(
        (total, song) =>
            total +
            song.performances,
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

startApp();
