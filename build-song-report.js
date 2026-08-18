const fs = require("fs");


// ==================================================
// CONFIG
// ==================================================

const BUST_OUT_SHOWS = 25;
const MONSTER_GAP_SHOWS = 50;

const DATA_FILE = "./database/ernie-data.json";
const OUTPUT_FILE = "./reports/Songs.csv";


// ==================================================
// ONE-OFF EXCEPTION
// ==================================================
//
// Normally:
// A song counts ONLY ONCE per show.
//
// Exception:
// On July 20, 2025 at Blue Point Brewery,
// "You and Me" was genuinely performed twice.
//
// That specific song/show combination counts as 2 plays.
//
// ==================================================

const EXCEPTION_DATE = "20-07-2025";
const EXCEPTION_VENUE = "Blue Point Brewery";
const EXCEPTION_SONG = "You and Me";


// ==================================================
// LOAD DATA
// ==================================================

const data = JSON.parse(
  fs.readFileSync(DATA_FILE, "utf8")
);


// ==================================================
// DATE HELPERS
// ==================================================

function parseDate(value) {

  if (!value) return null;

  const parts = value.split("-");

  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  return new Date(year, month, day);
}


function formatDate(date) {

  if (!date) return "";

  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  const year =
    date.getFullYear();

  return `${month}/${day}/${year}`;
}


function csvValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).replace(/"/g, '""');
}


// ==================================================
// SHOW LIST
// ==================================================

const allShows = data

  .map((show, originalIndex) => ({

    show,

    originalIndex,

    date:
      parseDate(show.eventDate)

  }))

  .filter(item => item.date)

  .sort(
    (a, b) =>
      a.date - b.date
  );


// ==================================================
// SONG DATABASE
// ==================================================

const songs = {};


// ==================================================
// PROCESS EACH SHOW
// ==================================================

allShows.forEach((item, showIndex) => {

  const show = item.show;

  const showDate = item.date;

  const eventDate =
    show.eventDate;

  const venueName =
    show.venue?.name || "";

  const cityName =
    show.venue?.city?.name || "";


  // ------------------------------------------------
  // Is this the one special show?
  // ------------------------------------------------

  const isExceptionShow =
    eventDate === EXCEPTION_DATE &&
    venueName === EXCEPTION_VENUE;


  // ------------------------------------------------
  // Gather every song entry from this show
  // ------------------------------------------------

  const songEntries = [];

  show.sets?.set?.forEach(set => {

    set.song?.forEach(song => {

      const name =
        (song.name || "").trim();

      if (!name) return;

      songEntries.push({
        name,
        song
      });

    });

  });


  // ------------------------------------------------
  // Track songs already counted in this show
  // ------------------------------------------------

  const songsCountedThisShow =
    new Set();


  // ------------------------------------------------
  // PROCESS SONGS
  // ------------------------------------------------

  songEntries.forEach(({ name, song }) => {


    // ----------------------------------------------
    // NORMAL RULE
    // ----------------------------------------------
    //
    // A song appearing multiple times in one show
    // normally counts as ONE play.
    //
    // ----------------------------------------------

    if (
      songsCountedThisShow.has(name)
    ) {

      // --------------------------------------------
      // ONE-OFF EXCEPTION
      // --------------------------------------------
      //
      // Blue Point — 7/20/2025 — You and Me
      //
      // This was genuinely played twice.
      //
      // --------------------------------------------

      if (
        isExceptionShow &&
        name === EXCEPTION_SONG
      ) {

        const entry =
          songs[name];

        entry.TotalPlays++;

      }

      return;
    }


    // ----------------------------------------------
    // First occurrence of this song in this show
    // ----------------------------------------------

    songsCountedThisShow.add(name);


    // ----------------------------------------------
    // CREATE SONG RECORD
    // ----------------------------------------------

    if (!songs[name]) {

      songs[name] = {

        Song: name,

        Type:
          song.cover
            ? "Cover"
            : "Original",

        CoverArtist:
          song.cover?.name || "",

        TotalPlays: 0,

        FirstPlayed:
          showDate,

        FirstVenue:
          venueName,

        FirstCity:
          cityName,

        LastPlayed:
          showDate,

        LastVenue:
          venueName,

        LastCity:
          cityName,

        Venues:
          new Set(),

        Cities:
          new Set(),

        ShowIndexes:
          []

      };

    }


    const entry =
      songs[name];


    // ----------------------------------------------
    // COUNT PLAY
    // ----------------------------------------------

    entry.TotalPlays++;


    // ----------------------------------------------
    // COUNT SHOW
    // ----------------------------------------------

    entry.ShowIndexes.push(
      showIndex
    );


    // ----------------------------------------------
    // VENUES / CITIES
    // ----------------------------------------------

    entry.Venues.add(
      venueName
    );

    entry.Cities.add(
      cityName
    );


    // ----------------------------------------------
    // FIRST PLAYED
    // ----------------------------------------------

    if (
      showDate < entry.FirstPlayed
    ) {

      entry.FirstPlayed =
        showDate;

      entry.FirstVenue =
        venueName;

      entry.FirstCity =
        cityName;

    }


    // ----------------------------------------------
    // LAST PLAYED
    // ----------------------------------------------

    if (
      showDate > entry.LastPlayed
    ) {

      entry.LastPlayed =
        showDate;

      entry.LastVenue =
        venueName;

      entry.LastCity =
        cityName;

    }

  });

});


// ==================================================
// GAP CALCULATIONS
// ==================================================

Object.values(songs).forEach(song => {

  const indexes =
    song.ShowIndexes;


  // -----------------------------------------------
  // CURRENT GAP
  // -----------------------------------------------

  const lastShowIndex =
    indexes[indexes.length - 1];

  song.CurrentGap =
    allShows.length -
    1 -
    lastShowIndex;


  // -----------------------------------------------
  // HISTORICAL GAPS
  // -----------------------------------------------

  const gaps = [];


  for (
    let i = 1;
    i < indexes.length;
    i++
  ) {

    const gap =
      indexes[i] -
      indexes[i - 1] -
      1;

    gaps.push(gap);

  }


  // -----------------------------------------------
  // PREVIOUS GAP
  // -----------------------------------------------

  if (
    gaps.length >= 2
  ) {

    song.PreviousGap =
      gaps[gaps.length - 2];

  } else {

    song.PreviousGap = 0;

  }


  // -----------------------------------------------
  // AVERAGE GAP
  // -----------------------------------------------

  if (
    gaps.length > 0
  ) {

    const total =
      gaps.reduce(
        (sum, gap) =>
          sum + gap,
        0
      );

    song.AverageGap =
      Math.round(
        (total / gaps.length) * 10
      ) / 10;

  } else {

    song.AverageGap = 0;

  }


  // -----------------------------------------------
  // LONGEST GAP
  // -----------------------------------------------

  song.LongestGap =
    gaps.length > 0
      ? Math.max(...gaps)
      : 0;


  // -----------------------------------------------
  // GAP STATUS
  // -----------------------------------------------

  if (
    song.CurrentGap >=
    MONSTER_GAP_SHOWS
  ) {

    song.GapStatus =
      "Monster Gap";

  } else if (
    song.CurrentGap >=
    BUST_OUT_SHOWS
  ) {

    song.GapStatus =
      "Bust Out";

  } else {

    song.GapStatus =
      "Regular";

  }

});


// ==================================================
// CSV HEADER
// ==================================================

let csv =
  "Song,Type,Cover Artist,Total Plays," +
  "First Played,First Venue,First City," +
  "Last Played,Last Venue,Last City," +
  "Shows Played,Shows Since Last Play,Gap Status," +
  "Previous Gap,Average Shows Between Plays," +
  "Longest Gap,Venues Played,Cities Played\n";


// ==================================================
// SORT + WRITE CSV
// ==================================================

Object.values(songs)

  .sort((a, b) => {

    if (
      b.TotalPlays !==
      a.TotalPlays
    ) {

      return (
        b.TotalPlays -
        a.TotalPlays
      );

    }

    return a.Song.localeCompare(
      b.Song
    );

  })

  .forEach(song => {

    csv +=

      `"${csvValue(song.Song)}",` +

      `"${csvValue(song.Type)}",` +

      `"${csvValue(song.CoverArtist)}",` +

      `${song.TotalPlays},` +

      `"${formatDate(song.FirstPlayed)}",` +

      `"${csvValue(song.FirstVenue)}",` +

      `"${csvValue(song.FirstCity)}",` +

      `"${formatDate(song.LastPlayed)}",` +

      `"${csvValue(song.LastVenue)}",` +

      `"${csvValue(song.LastCity)}",` +

      `${song.ShowIndexes.length},` +

      `${song.CurrentGap},` +

      `"${song.GapStatus}",` +

      `${song.PreviousGap},` +

      `${song.AverageGap},` +

      `${song.LongestGap},` +

      `${song.Venues.size},` +

      `${song.Cities.size}\n`;

  });


// ==================================================
// SAVE
// ==================================================

fs.mkdirSync(
  "./reports",
  { recursive: true }
);

fs.writeFileSync(
  OUTPUT_FILE,
  csv
);


// ==================================================
// VERIFY THE EXCEPTION
// ==================================================

const youAndMe =
  songs["You and Me"];

console.log("");
console.log("========================================");
console.log(" SONG REPORT V2");
console.log("========================================");

console.log(
  `Shows processed: ${allShows.length}`
);

console.log(
  `Songs found: ${Object.keys(songs).length}`
);

console.log(
  `Output: ${OUTPUT_FILE}`
);

console.log("");

if (youAndMe) {

  console.log(
    `"You and Me" total plays: ${youAndMe.TotalPlays}`
  );

  console.log(
    `"You and Me" shows played: ${youAndMe.ShowIndexes.length}`
  );

}

console.log("");

console.log(
  "Exception: Blue Point Brewery — 7/20/2025 — You and Me = 2 plays"
);

console.log("========================================");
console.log("");
