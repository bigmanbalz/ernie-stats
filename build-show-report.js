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


// oldest first
const shows = data.sort((a,b) =>
  dateValue(parseDate(a.eventDate)) -
  dateValue(parseDate(b.eventDate))
);


let csv =
"Show #,Date,Venue,City,State,Country,Unique Songs,Song Entries\n";


shows.forEach((show,index)=>{

  let uniqueSongs = new Set();
  let songEntries = 0;


  show.sets?.set?.forEach(set=>{

    set.song?.forEach(song=>{

      uniqueSongs.add(song.name.trim());
      songEntries++;

    });

  });


  const venue = show.venue?.name || "";
  const city = show.venue?.city?.name || "";
  const state = show.venue?.city?.state || "";
  const country = show.venue?.city?.country?.name || "";


  csv += `"${index+1}","${outputDate(parseDate(show.eventDate))}","${venue}","${city}","${state}","${country}",${uniqueSongs.size},${songEntries}\n`;

});


fs.mkdirSync("./reports",{recursive:true});


fs.writeFileSync(
"./reports/Shows.csv",
csv
);


console.log(`✅ Created Shows.csv (${shows.length} shows)`);
