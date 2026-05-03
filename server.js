const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const BP_LIST_PATH = path.join(__dirname, "ranked.bplist");
const TMP_JSON_PATH = path.join(__dirname, "ranked.tmp.json");

let isGenerating = false;

app.use(express.static("public"));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function generateBplist(songs) {
  return JSON.stringify({
    playlistTitle: "ScoreSaber Ranked",
    playlistAuthor: "EvanBlokEnder",
    customData: {
      "image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAACXBIWXMAAC4jAAAuIwF4pT92AAAJg0lEQVR4nO3dQWpTUQCG0TzJJoKB0CBuwInrcWFdjxN3IA2FSueOhefEgYgKJi+5z37nzB/8aULux82g0zzPGwCg5dXoAQDA7QkAAAgSAAAQJAAAIEgAAECQAACAIAEAAEECAACCBAAABAkAAAgSAAAQJAAAIEgAAECQAACAoO0lD0/TtNQOfnE87P2fZuBFeHh8clhcyTyff1S4AQCAIAEAAEECAACCBAAABAkAAAgSAAAQJAAAIEgAAECQAACAIAEAAEECAACCBAAABAkAAAgSAAAQJAAAIEgAAECQAACAIAEAAEECAACCBAAABAkAAAgSAAAQJAAAIEgAAECQAACAIAEAAEECAACCBAAABAkAAAgSAAAQJAAAIEgAAECQAACAIAEAAEECAACCBAAABAkAAAgSAAAQJAAAIEgAAECQAACAIAEAAEECAACCBAAABAkAAAgSAAAQtB094FqOh/08esMlPn86jp4AsIg37zb/9ffxw+PTNHrDNbgBAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgaHvJw8fDfl5qyNI+3n8ZPeEi09dvoycALOLzp7ejJ1zkzbvNas+6zWYznfugGwAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgaHvJw8fDfl5qyNI+3n8ZPeEi09dvoycALOLzp7ejJ1zkzbvNas+6zWYznfugGwAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQQIAAIIEAAAECQAACBIAABAkAAAgSAAAQJAAAIAgAQAAQdM8z+c/PE0LTuFnx8P+/DcGYEUeHp8cFldyyRnuBgAAggQAAAQJAAAIEgAAECQAACBIAABAkAAAgCABAABBAgAAggQAAAQJAAAIEgAAECQAACBIAABAkAAAgCABAABBAgAAggQAAAQJAAAIEgAAECQAACBIAABAkAAAgCABAABBAgAAggQAAAQJAAAIEgAAECQAACBIAABAkAAAgCABAABBAgAAggQAAAQJAAAIEgAAECQAACBIAABA0DTP8+gNAMCNuQEAgCABAABBAgAAggQAAAQJAAAIEgAAECQAACBIAABAkAAAgCABAABBAgAAggQAAAQJAAAIEgAAEPQdRxFJ5MUsCjMAAAAASUVORK5CYII=",
      "syncURL": "https://scoresaber.evanblokender.org/ranked.bplist"
    },
    songs
  }, null, 2);
}


async function loadTempSongs() {
  if (fs.existsSync(TMP_JSON_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(TMP_JSON_PATH));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  return [];
}


async function fetchAllRankedSongs(existing = []) {
  const seen = new Set(existing.map(s => s.hash));
  const songs = [...existing];
  let page = Math.floor(songs.length / 20) + 1;

  console.log("fucking scoresaber servers");

  while (true) {
    const res = await fetch(`https://scoresaber.com/api/leaderboards?ranked=true&page=${page}`);
    if (!res.ok) {
      console.error(`Page ${page} failed: ${res.status}`);
      break;
    }

    const data = await res.json();
    if (!data.leaderboards || data.leaderboards.length === 0) break;

    let added = 0;
    for (const lb of data.leaderboards) {
      const hash = lb.songHash.toUpperCase();
      if (!seen.has(hash)) {
        songs.push({
          hash,
          songName: lb.songName,
          difficulties: []
        });
        seen.add(hash);
        added++;
      }
    }

    console.log(`Page ${page}: Added ${added} new songs.`);
    page++;

    await sleep(500);
  }

  return songs;
}


async function updateBplist() {
  if (isGenerating) return;
  isGenerating = true;

  try {
    const existing = await loadTempSongs();
    const allSongs = await fetchAllRankedSongs(existing);

    fs.writeFileSync(TMP_JSON_PATH, JSON.stringify(allSongs, null, 2));
    fs.writeFileSync(BP_LIST_PATH, generateBplist(allSongs));

    console.log(`✅ ranked.bplist updated with ${allSongs.length} songs.`);
  } catch (e) {
    console.error("❌ Error generating playlist:", e);
  } finally {
    isGenerating = false;
  }
}


app.get("/status", (req, res) => {
  res.json({ generating: isGenerating });
});


app.get("/generate", async (req, res) => {
  if (isGenerating) return res.status(202).send("Already generating...");
  res.send("Generating playlist...");
  updateBplist();
});


app.get("/ranked.bplist", (req, res) => {
  if (isGenerating) {
    return res.status(202).send("Playlist is still generating. Please wait.");
  }

  if (fs.existsSync(BP_LIST_PATH)) {
    res.download(BP_LIST_PATH, "ranked.bplist");
  } else {
    res.status(404).send("Playlist not found.");
  }
});


app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);

  updateBplist();

  setInterval(updateBplist, 6 * 60 * 60 * 1000);
});
