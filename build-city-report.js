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


let cities = {};


data.forEach(show => {

  const city = show.venue?.city?.name || "Unknown";
  const state = show.venue?.city?.state || "";
  const country = show.venue?.city?.country?.name || "";

  const venue = show.venue?.name || "";

  const date = parseDate(show.eventDate);


  const cityKey = `${city}|${state}|${country}`;


  if (!cities[cityKey]) {

    cities[cityKey] = {
      city,
      state,
      country,
      shows: 0,
      firstPlayed: date,
      lastPlayed: date,
      venues: new Set(),
      songs: new Set(),
      songEntries: 0
    };

  }


  const entry = cities[cityKey];


  entry.shows++;

  entry.venues.add(venue);


  if (dateValue(date) < dateValue(entry.firstPlayed)) {
    entry.firstPlayed = date;
  }


  if (dateValue(date) > dateValue(entry.lastPlayed)) {
    entry.lastPlayed = date;
  }


  show.sets?.set?.forEach(set => {

    set.song?.forEach(song => {

      entry.songs.add(song.name.trim());

      entry.songEntries++;

    });

  });


});


let rows = Object.values(cities);


// most shows first
rows.sort((a,b)=>b.shows-a.shows);


let csv =
"City,State,Country,Shows Played,First Played,Last Played,Venues Played,Unique Songs,Total Song Entries\n";


rows.forEach(city=>{

  csv +=
  `"${city.city}","${city.state}","${city.country}",${city.shows},"${outputDate(city.firstPlayed)}","${outputDate(city.lastPlayed)}","${Array.from(city.venues).join("; ")}",${city.songs.size},${city.songEntries}\n`;

});


fs.mkdirSync("./reports",{recursive:true});


fs.writeFileSync(
  "./reports/Cities.csv",
  csv
);


console.log(`✅ Created Cities.csv (${rows.length} cities)`);