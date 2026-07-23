const fs = require("fs");
const XLSX = require("xlsx");


function csvToSheet(file) {

  const rows = fs.readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map(row => row.split(","));

  return XLSX.utils.aoa_to_sheet(rows);

}


const workbook = XLSX.utils.book_new();


const reports = [
  ["Songs", "./reports/Songs.csv"],
  ["Shows", "./reports/Shows.csv"],
  ["Venues", "./reports/Venues.csv"],
  ["Cities", "./reports/Cities.csv"]
];


reports.forEach(([name,file]) => {

  const sheet = csvToSheet(file);

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    name
  );

});


XLSX.writeFile(
  workbook,
  "./reports/Ernie-Stats.xlsx"
);


console.log("✅ Created Ernie-Stats.xlsx");