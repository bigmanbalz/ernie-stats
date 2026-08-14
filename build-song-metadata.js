const fs = require("fs");

const lines = fs
  .readFileSync("./reports/Songs.csv", "utf8")
  .trim()
  .split("\n")
  .slice(1);

let metadata = {};

const metadataFile = "./database/song-metadata.json";

if (fs.existsSync(metadataFile)) {
  metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
}

lines.forEach(row => {
  const parts = row.split(",");

  const song = parts[0]
    .replace(/^"/, "")
    .replace(/"$/, "")
    .trim();

  if (song && !metadata[song]) {
    metadata[song] = {
      type: "cover"
    };
  }
});

fs.mkdirSync("./database", { recursive: true });

fs.writeFileSync(
  metadataFile,
  JSON.stringify(metadata, null, 2)
);

console.log(`✅ Metadata file contains ${Object.keys(metadata).length} songs.`);
