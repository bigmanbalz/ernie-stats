const fs = require("fs");
const XLSX = require("xlsx");


// ==================================================
// CSV READER
// ==================================================

function readCSV(file) {

  const text = fs.readFileSync(file, "utf8").trim();

  const lines = text.split("\n");

  const headers = lines[0]
    .split(",")
    .map(h => h.trim());

  return lines.slice(1).map(line => {

    const values = line
      .match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
      .map(v =>
        v
          .replace(/^"|"$/g, "")
          .replace(/""/g, '"')
      );

    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });

    return obj;

  });

}


// ==================================================
// NUMBER HELPER
// ==================================================

function num(value) {

  const n = Number(value);

  return isNaN(n) ? 0 : n;

}


// ==================================================
// LOAD DATA
// ==================================================

const songs =
  readCSV("./reports/Songs.csv");

const shows =
  readCSV("./reports/Shows.csv");

const venues =
  readCSV("./reports/Venues.csv");

const cities =
  readCSV("./reports/Cities.csv");


// ==================================================
// DASHBOARD
// ==================================================

const dashboard = [];

dashboard.push(
  ["ERNIE & THE BAND"],
  ["All-Time Stats"],
  []
);


dashboard.push(
  ["SHOWS"],
  ["Total Shows", shows.length],
  ["First Show", shows[0]?.Date || ""],
  ["Last Show", shows[shows.length - 1]?.Date || ""],
  []
);


dashboard.push(
  ["LOCATIONS"],
  ["Venues Played", venues.length],
  ["Cities Played", cities.length],
  []
);


dashboard.push(
  ["SONGS"],
  ["Unique Songs", songs.length],
  [
    "Total Song Performances",
    songs.reduce(
      (total, song) =>
        total + num(song["Total Plays"]),
      0
    )
  ],
  []
);


dashboard.push(
  ["MOST PLAYED SONGS"],
  ["Song", "Plays"]
);


songs
  .slice()
  .sort(
    (a, b) =>
      num(b["Total Plays"]) -
      num(a["Total Plays"])
  )
  .slice(0, 10)
  .forEach(song => {

    dashboard.push([
      song.Song,
      num(song["Total Plays"])
    ]);

  });


dashboard.push([]);

dashboard.push(
  ["MOST PLAYED VENUES"],
  ["Venue", "Shows"]
);


venues
  .slice()
  .sort(
    (a, b) =>
      num(b["Shows Played"]) -
      num(a["Shows Played"])
  )
  .slice(0, 10)
  .forEach(venue => {

    dashboard.push([
      venue.Venue,
      num(venue["Shows Played"])
    ]);

  });


// ==================================================
// WORKBOOK
// ==================================================

const workbook =
  XLSX.utils.book_new();


// ==================================================
// ADD SHEET HELPER
// ==================================================

function addSheet(name, data, widths = []) {

  const sheet =
    XLSX.utils.aoa_to_sheet(data);

  if (data.length > 0) {

    sheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: {
          r: data.length - 1,
          c: data[0].length - 1
        }
      })
    };

    sheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1
    };

  }

  if (widths.length) {
    sheet["!cols"] =
      widths.map(width => ({ width }));
  }

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    name
  );

}


// ==================================================
// DASHBOARD
// ==================================================

addSheet(
  "Dashboard",
  dashboard,
  [28, 18]
);


// ==================================================
// EXISTING RAW DATA TABS
// ==================================================

function csvToSheet(file) {

  const rows = readCSV(file);

  const data = [
    Object.keys(rows[0]),
    ...rows.map(row =>
      Object.values(row).map(value => {

        return isNaN(Number(value))
          ? value
          : Number(value);

      })
    )
  ];

  return data;

}


addSheet(
  "Songs",
  csvToSheet("./reports/Songs.csv")
);


addSheet(
  "Shows",
  csvToSheet("./reports/Shows.csv")
);


addSheet(
  "Venues",
  csvToSheet("./reports/Venues.csv")
);


addSheet(
  "Cities",
  csvToSheet("./reports/Cities.csv")
);


// ==================================================
// STANDARD SONG VIEW
// ==================================================

const songHeaders = [
  "Song",
  "Type",
  "Cover Artist",
  "Total Plays",
  "Last Played",
  "Shows Since Last Play",
  "Gap Status",
  "Previous Gap",
  "Average Shows Between Plays",
  "Longest Gap"
];


function songRow(song) {

  return [
    song["Song"],
    song["Type"],
    song["Cover Artist"],
    num(song["Total Plays"]),
    song["Last Played"],
    num(song["Shows Since Last Play"]),
    song["Gap Status"],
    num(song["Previous Gap"]),
    num(song["Average Shows Between Plays"]),
    num(song["Longest Gap"])
  ];

}


function makeSongView(list) {

  return [
    songHeaders,
    ...list.map(songRow)
  ];

}


const widths = [
  28,
  12,
  22,
  13,
  14,
  22,
  15,
  14,
  27,
  15
];


// ==================================================
// MOST PLAYED
// 10+ PLAYS
// ==================================================

const mostPlayed =
  songs
    .filter(song =>
      num(song["Total Plays"]) >= 10
    )
    .sort((a, b) =>
      num(b["Total Plays"]) -
      num(a["Total Plays"])
    );


addSheet(
  "Most Played",
  makeSongView(mostPlayed),
  widths
);


// ==================================================
// MOST RECENT
// 5+ PLAYS
// ==================================================

const mostRecent =
  songs
    .filter(song =>
      num(song["Total Plays"]) >= 5
    )
    .sort((a, b) =>
      String(b["Last Played"])
        .localeCompare(
          String(a["Last Played"])
        )
    );


addSheet(
  "Most Recent",
  makeSongView(mostRecent),
  widths
);


// ==================================================
// CURRENT GAPS
// 3+ PLAYS
// ==================================================

const currentGaps =
  songs
    .filter(song =>
      num(song["Total Plays"]) >= 3
    )
    .sort((a, b) =>
      num(b["Shows Since Last Play"]) -
      num(a["Shows Since Last Play"])
    );


addSheet(
  "Current Gaps",
  makeSongView(currentGaps),
  widths
);


// ==================================================
// LONGEST GAPS
// 1+ PLAY
// ==================================================

const longestGaps =
  songs
    .filter(song =>
      num(song["Total Plays"]) >= 1
    )
    .sort((a, b) =>
      num(b["Longest Gap"]) -
      num(a["Longest Gap"])
    );


addSheet(
  "Longest Gaps",
  makeSongView(longestGaps),
  widths
);


// ==================================================
// BUST OUTS
// CURRENT GAP 50+
// ==================================================

const bustOuts =
  songs
    .filter(song =>
      num(song["Shows Since Last Play"]) >= 50
    )
    .sort((a, b) =>
      num(b["Shows Since Last Play"]) -
      num(a["Shows Since Last Play"])
    );


addSheet(
  "Bust Outs",
  makeSongView(bustOuts),
  widths
);


// ==================================================
// MONSTER GAPS
// CURRENT GAP 100+
// ==================================================

const monsterGaps =
  songs
    .filter(song =>
      num(song["Shows Since Last Play"]) >= 100
    )
    .sort((a, b) =>
      num(b["Shows Since Last Play"]) -
      num(a["Shows Since Last Play"])
    );


addSheet(
  "Monster Gaps",
  makeSongView(monsterGaps),
  widths
);


// ==================================================
// COVERS
// 3+ COVER PERFORMANCES
// ==================================================

const covers =
  songs
    .filter(song =>
      song["Type"] === "Cover" &&
      num(song["Total Plays"]) >= 3
    )
    .sort((a, b) =>
      num(b["Total Plays"]) -
      num(a["Total Plays"])
    );


addSheet(
  "Covers",
  makeSongView(covers),
  widths
);


// ==================================================
// ORIGINALS
// 3+ ORIGINAL PERFORMANCES
// ==================================================

const originals =
  songs
    .filter(song =>
      song["Type"] === "Original" &&
      num(song["Total Plays"]) >= 3
    )
    .sort((a, b) =>
      num(b["Total Plays"]) -
      num(a["Total Plays"])
    );


addSheet(
  "Originals",
  makeSongView(originals),
  widths
);


// ==================================================
// NEW / ONE-OFFS
// 1–2 PLAYS
// ==================================================

const newOneOffs =
  songs
    .filter(song => {

      const plays =
        num(song["Total Plays"]);

      return plays >= 1 && plays <= 2;

    })
    .sort((a, b) =>
      String(b["Last Played"])
        .localeCompare(
          String(a["Last Played"])
        )
    );


addSheet(
  "New-One-Offs",
  makeSongView(newOneOffs),
  widths
);


// ==================================================
// WRITE FILE
// ==================================================

XLSX.writeFile(
  workbook,
  "./reports/Ernie-Stats.xlsx"
);


console.log(
  "✅ Created Ernie-Stats.xlsx"
);

console.log(
  `   Most Played: ${mostPlayed.length}`
);

console.log(
  `   Most Recent: ${mostRecent.length}`
);

console.log(
  `   Current Gaps: ${currentGaps.length}`
);

console.log(
  `   Longest Gaps: ${longestGaps.length}`
);

console.log(
  `   Bust Outs: ${bustOuts.length}`
);

console.log(
  `   Monster Gaps: ${monsterGaps.length}`
);

console.log(
  `   Covers: ${covers.length}`
);

console.log(
  `   Originals: ${originals.length}`
);

console.log(
  `   New / One-Offs: ${newOneOffs.length}`
);
