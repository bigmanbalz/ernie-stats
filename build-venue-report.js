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


// Oldest to newest
const shows = data.sort((a,b) =>
  dateValue(parseDate(a.eventDate)) -
  dateValue(parseDate(b.eventDate))
);


let csv =
"Show #,Date,Venue,City,State,Country,Unique Songs,Song List\n";


shows.forEach((show,index)=>{

  let uniqueSongs = new Set();


  show.sets?.set?.forEach(set=>{

    set.song?.forEach(song=>{

      uniqueSongs.add(song.name.trim());

    });

  });


  const venue = show.venue?.name || "";
  const city = show.venue?.city?.name || "";
  const state = show.venue?.city?.state || "";
  const country = show.venue?.city?.country?.name || "";


  const songList = Array.from(uniqueSongs).join("; ");


  csv +=
  `"${index + 1}","${outputDate(parseDate(show.eventDate))}","${venue}","${city}","${state}","${country}",${uniqueSongs.size},"${songList}"\n`;

});


fs.mkdirSync("./reports",{recursive:true});


fs.writeFileSync(
  "./reports/Venues.csv",
  csv
);


console.log(`✅ Created Venues.csv (${shows.length} venue appearances)`);