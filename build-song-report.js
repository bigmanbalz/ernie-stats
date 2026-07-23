const fs = require("fs");

const data = JSON.parse(
  fs.readFileSync("./database/ernie-data.json", "utf8")
);

let songs = {};

function parseDate(date) {
  const [day, month, year] = date.split("-");
  return new Date(`${year}-${month}-${day}`);
}

function outputDate(date) {
  return `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
}

data.forEach(show => {

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
          venue,
          city
        };
      }

      songs[name].plays++;

      if (date < songs[name].firstPlayed) {
        songs[name].firstPlayed = date;
      }

      if (date > songs[name].lastPlayed) {
        songs[name].lastPlayed = date;
        songs[name].venue = venue;
        songs[name].city = city;
      }

    });

  });

});


const sortedSongs = Object.values(songs)
.sort((a,b)=>b.plays-a.plays);


let csv =
"Song,Total Plays,First Played,Last Played,Most Recent Venue,Most Recent City\n";


sortedSongs.forEach(song => {

csv += `"${song.name}",${song.plays},"${outputDate(song.firstPlayed)}","${outputDate(song.lastPlayed)}","${song.venue}","${song.city}"\n`;

});


fs.mkdirSync("./reports",{recursive:true});

fs.writeFileSync(
"./reports/Songs.csv",
csv
);


console.log(`✅ Created Songs.csv (${sortedSongs.length} songs)`);