const fs = require("fs");
const XLSX = require("xlsx");


function readCSV(file) {

  const text = fs.readFileSync(file,"utf8").trim();

  const lines = text.split("\n");

  const headers = lines[0].split(",");

  return lines.slice(1).map(line=>{

    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
      .map(v=>v.replace(/^"|"$/g,""));

    let obj={};

    headers.forEach((h,i)=>{
      obj[h]=values[i];
    });

    return obj;

  });

}



function convertNumber(value){

  return isNaN(Number(value))
    ? value
    : Number(value);

}



function csvToSheet(file){

  const rows = readCSV(file);

  const data=[
    Object.keys(rows[0]),
    ...rows.map(r=>
      Object.values(r).map(convertNumber)
    )
  ];

  const sheet=XLSX.utils.aoa_to_sheet(data);


  sheet["!autofilter"]={
    ref:XLSX.utils.encode_range({
      s:{r:0,c:0},
      e:{
        r:data.length-1,
        c:data[0].length-1
      }
    })
  };


  sheet["!freeze"]={
    xSplit:0,
    ySplit:1
  };


  return sheet;

}



const songs = readCSV("./reports/Songs.csv");
const shows = readCSV("./reports/Shows.csv");
const venues = readCSV("./reports/Venues.csv");
const cities = readCSV("./reports/Cities.csv");



const dashboard=[];



dashboard.push(
["ERNIE & THE BAND"],
["All-Time Stats"],
[]
);


dashboard.push(
["SHOWS"],
["Total Shows", shows.length],
["First Show", shows[0]["Date"]],
["Last Show", shows[shows.length-1]["Date"]],
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
["Total Song Performances",
 songs.reduce((a,b)=>a+Number(b["Total Plays"]),0)],
[]
);



dashboard.push(
["MOST PLAYED SONGS"],
["Song","Plays"]
);


songs
.sort((a,b)=>Number(b["Total Plays"])-Number(a["Total Plays"]))
.slice(0,10)
.forEach(song=>{

 dashboard.push([
   song.Song,
   Number(song["Total Plays"])
 ]);

});


dashboard.push([]);

dashboard.push(
["MOST PLAYED VENUES"],
["Venue","Shows"]
);


venues
.sort((a,b)=>Number(b["Shows Played"])-Number(a["Shows Played"]))
.slice(0,10)
.forEach(v=>{

 dashboard.push([
   v.Venue,
   Number(v["Shows Played"])
 ]);

});



const workbook=XLSX.utils.book_new();



const dashSheet=XLSX.utils.aoa_to_sheet(dashboard);


dashSheet["!cols"]=[
 {width:28},
 {width:15}
];


XLSX.utils.book_append_sheet(
 workbook,
 dashSheet,
 "Dashboard"
);



[
 ["Songs","./reports/Songs.csv"],
 ["Shows","./reports/Shows.csv"],
 ["Venues","./reports/Venues.csv"],
 ["Cities","./reports/Cities.csv"]
].forEach(([name,file])=>{

 XLSX.utils.book_append_sheet(
   workbook,
   csvToSheet(file),
   name
 );

});



XLSX.writeFile(
 workbook,
 "./reports/Ernie-Stats.xlsx"
);


console.log("✅ Created Ernie-Stats.xlsx");