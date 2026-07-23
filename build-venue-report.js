const fs = require("fs");

const data = JSON.parse(
  fs.readFileSync("./database/ernie-data.json", "utf8")
);

function parseDate(date) {
  const [day, month, year] = date.split("-");

  return {
    day: Number(day),
    month: Number(month),
    year: Number(year)
  };
}

function dateValue(date) {
  return (
    date.year * 10000 +
    date.month * 100 +
    date.day
  );
}

function outputDate(date) {
  return `${date.month}/${date.day}/${date.year}`;
}

let venues = {};

data.forEach(show => {

  const venue = show.venue?.name || "Unknown Venue";
  const city = show.venue?.city?.name || "";
  const state = show.venue?.city?.state || "";

  const date = parseDate(show.eventDate);

  if (!venues[venue]) {
    venues[venue] = {
      venue,
      city,
      state,
      shows: 0,
      firstPlayed: date,
      lastPlayed: date,
      songs: new Set(),
      songCount: 0
    };
  }

  const v = venues[venue];

  v.shows++;

  if (dateValue(date) < dateValue(v.firstPlayed)) {
    v.firstPlayed = date;
  }

  if (dateValue(date) > dateValue(v.lastPlayed)) {
    v.lastPlayed = date;
  }

  show.sets?.set?.forEach(set => {

    set.song?.forEach(song => {

      v.songs.add(song.name.trim());
      v.songCount++;

    });

  });

});


let rows = Object.values(venues)
.sort((a,b) => b.shows - a.shows);


let csv =
"Venue,City,State,Shows Played,First Played,Last Played,Unique Songs Played,Total Song Performances\n";


rows.forEach(v => {

  csv +=
  `"${v.venue}","${v.city}","${v.state}",${v.shows},"${outputDate(v.firstPlayed)}","${outputDate(v.lastPlayed)}",${v.songs.size},${v.songCount}\n`;

});


fs.mkdirSync("./reports",{recursive:true});

fs.writeFileSync(
  "./reports/Venues.csv",
  csv
);

console.log(`✅ Created Venues.csv (${rows.length} unique venues)`);
