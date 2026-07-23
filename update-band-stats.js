const fs = require("fs");
const fetch = require("node-fetch");
const config = require("./config");

const BASE_URL = "https://api.setlist.fm/docs/1.0/index.html";

async function fetchSetlists() {
  let allShows = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    console.log(`Fetching page ${page}...`);

    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/artist/${config.ARTIST_ID}/setlists?p=${page}`,
      {
        headers: {
          "Accept": "application/json",
          "x-api-key": config.API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `API error ${response.status}: ${await response.text()}`
      );
    }

    const data = await response.json();

    allShows.push(...data.setlist);

    totalPages = data.total > 0
      ? Math.ceil(data.total / 20)
      : 1;

    console.log(
      `Fetched page ${page} (${allShows.length} shows so far)`
    );

    page++;

    // Slow down requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return allShows;
}

async function main() {
  try {
    const shows = await fetchSetlists();

    fs.writeFileSync(
      "./database/ernie-data.json",
      JSON.stringify(shows, null, 2)
    );

    console.log("\n✅ Complete!");
    console.log(`Saved ${shows.length} shows.`);
  } catch (error) {
    console.error("\nFAILED:");
    console.error(error.message);
  }
}

main();