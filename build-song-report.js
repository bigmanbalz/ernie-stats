const fs = require("fs");
const config = require("./config");

const data = JSON.parse(
  fs.readFileSync("./database/ernie-data.json", "utf8")
);

function parseDate(date) {
  if (!date) return null;

  if (date.includes("-")) {
    const parts = date.split("-");
    return new Date(
      Number(parts[2]),
      Number(parts[1]) - 1,
      Number(parts[0])
    );
  }

  if (date.includes("/")) {
    const parts = date.split("/");
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


// Normalize split songs / jammed song entries
function cleanSongName(name) {
  return name
    .replace(/\s*>+.*$/, "")
    .replace(/\s+\(.*?\)$/, "")
    .trim();
}


// All shows, sorted chronologically
const allShows = data
  .map(show => parseDate(show.eventDate))
  .filter(date => date)
  .sort((a, b) => a - b);


// Count the number of complete shows between two dates
function showsBetween(firstDate, secondDate) {
  return allShows.filter(
    show => show > firstDate && show < secondDate
  ).length;
}


// Number of shows since a song was last played
function showsSince(date) {
  return allShows.filter(show => show > date).length;
}


let songs = {};


// Process every show
data.forEach(show => {

  const showDate = parseDate(show.eventDate);

  if (!showDate) return;


  // Keep each song only once per show.
  // This preserves the correct count when a song is split into
  // multiple setlist entries during the same show.
  const songsThisShow = {};


  show.sets?.set?.forEach(set => {

    set.song?.forEach(song => {

      const name = cleanSongName(song.name);

      if (!name) return;


      if (!songsThisShow[name]) {
        songsThisShow[name] = {
          cover: song.cover
        };
      }

    });

  });


  Object.entries(songsThisShow).forEach(([name, info]) => {

    if (!songs[name]) {

      songs[name] = {
        Song: name,
        Type: info.cover ? "Cover" : "Original",

        TotalPlays: 0,

        FirstPlayed: showDate,
        FirstVenue: show.venue?.name || "",
        FirstCity: show.venue?.city?.name || "",

        LastPlayed: showDate,
        LastVenue: show.venue?.name || "",
        LastCity: show.venue?.city?.name || "",

        Venues: new Set(),
        Cities: new Set(),

        Dates: []
      };

    }


    const entry = songs[name];

    entry.TotalPlays++;
    entry.Dates.push(showDate);

    entry.Venues.add(show.venue?.name || "");
    entry.Cities.add(show.venue?.city?.name || "");


    if (showDate < entry.FirstPlayed) {

      entry.FirstPlayed = showDate;
      entry.FirstVenue = show.venue?.name || "";
      entry.FirstCity = show.venue?.city?.name || "";

    }


    if (showDate > entry.LastPlayed) {

      entry.LastPlayed = showDate;
      entry.LastVenue = show.venue?.name || "";
      entry.LastCity = show.venue?.city?.name || "";

    }

  });

});


// Calculate gap statistics for a song
function calculateGaps(dates) {

  if (dates.length < 2) {
    return {
      average: 0,
      longest: 0
    };
  }


  const sortedDates = dates
    .slice()
    .sort((a, b) => a - b);


  const gaps = [];


  for (let i = 1; i < sortedDates.length; i++) {

    const gap = showsBetween(
      sortedDates[i - 1],
      sortedDates[i]
    );

    gaps.push(gap);

  }


  const total = gaps.reduce(
    (sum, gap) => sum + gap,
    0
  );


  return {
    average:
      Math.round((total / gaps.length) * 10) / 10,

    longest:
      Math.max(...gaps)
  };

}


// Determine bust-out status
function gapStatus(longestGap) {

  if (
    longestGap >=
    config.SETTINGS.MONSTER_GAP_SHOWS
  ) {
    return "Monster Gap";
  }


  if (
    longestGap >=
    config.SETTINGS.BUST_OUT_SHOWS
  ) {
    return "Bust Out";
  }


  return "Regular";

}


// CSV header
let csv =
  "Song,Type,Total Plays,First Played,First Venue,First City,Last Played,Last Venue,Last City,Shows Since Last Play,Gap Status,Average Shows Between Plays,Longest Gap,Venues Played,Cities Played\n";


// Build rows
Object.values(songs)
  .sort((a, b) => b.TotalPlays - a.TotalPlays)
  .forEach(song => {

    const gaps = calculateGaps(song.Dates);

    csv +=
      `"${song.Song}","${song.Type}",${song.TotalPlays},"${formatDate(song.FirstPlayed)}","${song.FirstVenue}","${song.FirstCity}","${formatDate(song.LastPlayed)}","${song.LastVenue}","${song.LastCity}",${showsSince(song.LastPlayed)},"${gapStatus(gaps.longest)}",${gaps.average},${gaps.longest},${song.Venues.size},${song.Cities.size}\n`;

  });


fs.mkdirSync("./reports", {
  recursive: true
});


fs.writeFileSync(
  "./reports/Songs.csv",
  csv
);


console.log(
  `✅ Created Songs.csv (${Object.keys(songs).length} songs)`
);
