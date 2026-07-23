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


function gapStatus(gap) {
  if (gap >= 50) return "Monster Gap";
  if (gap >= 25) return "Bust Out";
  return "Regular";
}


let songs = {};


const shows = data.sort((a,b) =>
  dateValue(parseDate(a.eventDate)) -
  dateValue(parseDate(b.eventDate))
);



shows.forEach((show,index)=>{

  const date = parseDate(show.eventDate);

  const venue = show.venue?.name || "";
  const city = show.venue?.city?.name || "";


  let playedThisShow = new Set();


  show.sets?.set?.forEach(set=>{

    set.song?.forEach(song=>{

      const name = song.name.trim();


      // prevents split/reprise from counting twice
      if (playedThisShow.has(name)) return;

      playedThisShow.add(name);



      if (!songs[name]) {

        songs[name] = {

          name,
          plays: 0,

          firstPlayed: date,
          firstVenue: venue,
          firstCity: city,

          lastPlayed: date,
          lastVenue: venue,
          lastCity: city,

          showNumbers: [],

          venues: new Set(),
          cities: new Set()

        };

      }


      const entry = songs[name];


      entry.plays++;

      entry.showNumbers.push(index + 1);

      entry.venues.add(venue);
      entry.cities.add(city);



      if (dateValue(date) < dateValue(entry.firstPlayed)) {

        entry.firstPlayed = date;
        entry.firstVenue = venue;
        entry.firstCity = city;

      }



      if (dateValue(date) > dateValue(entry.lastPlayed)) {

        entry.lastPlayed = date;
        entry.lastVenue = venue;
        entry.lastCity = city;

      }


    });

  });

});



let rows = [];


Object.values(songs).forEach(song=>{


  let gaps = [];


  for (let i = 1; i < song.showNumbers.length; i++) {

    gaps.push(
      song.showNumbers[i] -
      song.showNumbers[i-1]
    );

  }


  const averageGap = gaps.length
    ? (gaps.reduce((a,b)=>a+b,0) / gaps.length).toFixed(1)
    : "";


  const longestGap = gaps.length
    ? Math.max(...gaps)
    : "";


  rows.push({

    ...song,

    showsSinceLastPlay:
      shows.length -
      song.showNumbers[song.showNumbers.length - 1],

    averageGap,
    longestGap

  });


});



rows.sort((a,b)=>b.plays-a.plays);



let csv =
"Song,Total Plays,First Played,First Venue,First City,Last Played,Last Venue,Last City,Shows Since Last Play,Gap Status,Average Shows Between Plays,Longest Gap,Venues Played,Cities Played\n";



rows.forEach(song=>{


csv +=
`"${song.name}",${song.plays},"${outputDate(song.firstPlayed)}","${song.firstVenue}","${song.firstCity}","${outputDate(song.lastPlayed)}","${song.lastVenue}","${song.lastCity}",${song.showsSinceLastPlay},"${gapStatus(song.showsSinceLastPlay)}",${song.averageGap},${song.longestGap},${song.venues.size},${song.cities.size}\n`;


});



fs.mkdirSync("./reports",{recursive:true});


fs.writeFileSync(
  "./reports/Songs.csv",
  csv
);


console.log(`✅ Created Songs.csv (${rows.length} songs)`);