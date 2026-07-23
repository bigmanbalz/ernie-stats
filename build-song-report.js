const fs = require("fs");

const data = JSON.parse(
  fs.readFileSync("./database/ernie-data.json", "utf8")
);

let songs = {};

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

function gapStatus(gap) {
  if (gap >= 50) return "Monster Gap";
  if (gap >= 25) return "Bust Out";
  return "Regular";
}


// newest first
const shows = data.sort((a,b) =>
  dateValue(parseDate(b.eventDate)) -
  dateValue(parseDate(a.eventDate))
);


shows.forEach((show, showIndex) => {

  const date = parseDate(show.eventDate);

  const venue = show.venue?.name || "";
  const city = show.venue?.city?.name || "";


  show.sets?.set?.forEach(set => {

    set.song?.forEach(song => {

      const name = song.name.trim();


      if (!songs[name]) {
        songs[name] = {
          name,
          plays: 0,
          firstPlayed: date,
          lastPlayed: date,
          lastShowIndex: showIndex,
          venue,
          city
        };
      }


      songs[name].plays++;


      if (dateValue(date) < dateValue(songs[name].firstPlayed)) {
        songs[name].firstPlayed = date;
      }


      if (dateValue(date) > dateValue(songs[name].lastPlayed)) {
        songs[name].lastPlayed = date;
        songs[name].lastShowIndex = showIndex;
        songs[name].venue = venue;
        songs[name].city = city;
      }


    });

  });

});


const sortedSongs = Object.values(songs)
.sort((a,b)=>b.plays-a.plays);


let csv =
"Song,Total Plays,First Played,Last Played,Shows Since Last Play,Gap Status,Most Recent Venue,Most Recent City\n";


sortedSongs.forEach(song => {

  csv += `"${song.name}",${song.plays},"${outputDate(song.firstPlayed)}","${outputDate(song.lastPlayed)}",${song.lastShowIndex},"${gapStatus(song.lastShowIndex)}","${song.venue}","${song.city}"\n`;

});


fs.mkdirSync("./reports",{recursive:true});

fs.writeFileSync(
"./reports/Songs.csv",
csv
);


console.log(`✅ Created Songs.csv (${sortedSongs.length} songs)`);