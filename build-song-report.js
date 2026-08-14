const fs = require("fs");

const data = JSON.parse(
  fs.readFileSync("./database/ernie-data.json", "utf8")
);

const config = require("./config");

const BUST_OUT_SHOWS =
  config.SETTINGS?.BUST_OUT_SHOWS ?? 50;

const MONSTER_GAP_SHOWS =
  config.SETTINGS?.MONSTER_GAP_SHOWS ?? 100;


// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

function parseDate(date) {
  if (!date) return null;

  let parts;

  if (date.includes("-")) {
    parts = date.split("-");

    return new Date(
      Number(parts[2]),
      Number(parts[1]) - 1,
      Number(parts[0])
    );
  }

  if (date.includes("/")) {
    parts = date.split("/");

    return new Date(
      Number(parts[2]),
      Number(parts[0]) - 1,
      Number(parts[1])
    );
  }

  return null;
}


function formatDate(date) {
  if (!date) return "";

  return (
    (date.getMonth() + 1) +
    "/" +
    date.getDate() +
    "/" +
    date.getFullYear()
  );
}


// --------------------------------------------------
// CSV HELPER
// --------------------------------------------------

function csvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/"/g, '""');
}


// --------------------------------------------------
// SHOW LIST
// --------------------------------------------------

const allShows = data
  .map((show, index) => ({
    show,
    index,
    date: parseDate(show.eventDate)
  }))
  .filter(item => item.date)
  .sort((a, b) => a.date - b.date);


// --------------------------------------------------
// SONG DATABASE
// --------------------------------------------------

const songs = {};

allShows.forEach((item, showIndex) => {

  const show = item.show;
  const showDate = item.date;

  show.sets?.set?.forEach(set => {

    set.song?.forEach(song => {

      const name = song.name.trim();

      if (!songs[name]) {

        songs[name] = {
          Song: name,

          Type: song.cover
            ? "Cover"
            : "Original",

          CoverArtist:
            song.cover?.name || "",

          TotalPlays: 0,

          FirstPlayed: showDate,
          FirstVenue:
            show.venue?.name || "",
          FirstCity:
            show.venue?.city?.name || "",

          LastPlayed: showDate,
          LastVenue:
            show.venue?.name || "",
          LastCity:
            show.venue?.city?.name || "",

          Venues: new Set(),
          Cities: new Set(),

          // Every actual performance entry
          PerformanceDates: [],

          // Each show only once
          ShowIndexes: []
        };

      }

      const entry = songs[name];

      // ------------------------------------------------
      // PERFORMANCE COUNT
      // ------------------------------------------------

      entry.TotalPlays++;

      entry.PerformanceDates.push(showDate);


      // ------------------------------------------------
      // SHOW TRACKING
      // ------------------------------------------------

      if (
        entry.ShowIndexes[
          entry.ShowIndexes.length - 1
        ] !== showIndex
      ) {

        entry.ShowIndexes.push(showIndex);

      }


      // ------------------------------------------------
      // VENUES / CITIES
      // ------------------------------------------------

      entry.Venues.add(
        show.venue?.name || ""
      );

      entry.Cities.add(
        show.venue?.city?.name || ""
      );


      // ------------------------------------------------
      // FIRST PLAYED
      // ------------------------------------------------

      if (showDate < entry.FirstPlayed) {

        entry.FirstPlayed = showDate;

        entry.FirstVenue =
          show.venue?.name || "";

        entry.FirstCity =
          show.venue?.city?.name || "";

      }


      // ------------------------------------------------
      // LAST PLAYED
      // ------------------------------------------------

      if (showDate > entry.LastPlayed) {

        entry.LastPlayed = showDate;

        entry.LastVenue =
          show.venue?.name || "";

        entry.LastCity =
          show.venue?.city?.name || "";

      }

    });

  });

});


// --------------------------------------------------
// GAP CALCULATIONS
// --------------------------------------------------

Object.values(songs).forEach(song => {

  const indexes = song.ShowIndexes;


  // -----------------------------------------------
  // CURRENT GAP
  // -----------------------------------------------

  const lastShowIndex =
    indexes[indexes.length - 1];

  song.CurrentGap =
    allShows.length - 1 - lastShowIndex;


  // -----------------------------------------------
  // HISTORICAL GAPS
  // -----------------------------------------------

  const gaps = [];

  for (let i = 1; i < indexes.length; i++) {

    const gap =
      indexes[i] - indexes[i - 1] - 1;

    gaps.push(gap);

  }


  // -----------------------------------------------
  // PREVIOUS GAP
  // -----------------------------------------------

  if (gaps.length >= 2) {

    song.PreviousGap =
      gaps[gaps.length - 2];

  } else {

    song.PreviousGap = 0;

  }


  // -----------------------------------------------
  // AVERAGE GAP
  // -----------------------------------------------

  if (gaps.length > 0) {

    const total =
      gaps.reduce(
        (sum, gap) => sum + gap,
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
    song.CurrentGap >= MONSTER_GAP_SHOWS
  ) {

    song.GapStatus = "Monster Gap";

  } else if (
    song.CurrentGap >= BUST_OUT_SHOWS
  ) {

    song.GapStatus = "Bust Out";

  } else {

    song.GapStatus = "Regular";

  }

});


// --------------------------------------------------
// CSV
// --------------------------------------------------

let csv =
  "Song,Type,Cover Artist,Total Plays," +
  "First Played,First Venue,First City," +
  "Last Played,Last Venue,Last City," +
  "Shows Since Last Play,Gap Status," +
  "Previous Gap,Average Shows Between Plays," +
  "Longest Gap,Venues Played,Cities Played\n";


Object.values(songs)

  .sort((a, b) => {

    if (b.TotalPlays !== a.TotalPlays) {
      return b.TotalPlays - a.TotalPlays;
    }

    return a.Song.localeCompare(b.Song);

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
      `${song.CurrentGap},` +
      `"${song.GapStatus}",` +
      `${song.PreviousGap},` +
      `${song.AverageGap},` +
      `${song.LongestGap},` +
      `${song.Venues.size},` +
      `${song.Cities.size}\n`;

  });


// --------------------------------------------------
// SAVE
// --------------------------------------------------

fs.mkdirSync(
  "./reports",
  { recursive: true }
);

fs.writeFileSync(
  "./reports/Songs.csv",
  csv
);

console.log(
  `✅ Created Songs.csv (${Object.keys(songs).length} songs)`
);
