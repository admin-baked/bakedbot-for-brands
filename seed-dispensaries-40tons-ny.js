const fs = require("fs");
const csv = require("csv-parser");
const { Firestore } = require("@google-cloud/firestore");
const firestore = new Firestore();

function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "store";
}

function parseAddress(addr) {
  const parts = String(addr).split(",").map(p => p.trim());
  const street = parts[0] || null;
  const city = parts[1] || null;

  let state = "NY";
  let postal = null;
  if (parts[2]) {
    const tokens = parts[2].split(/\s+/);
    if (tokens[0]) state = tokens[0];
    if (tokens[1]) postal = tokens[1];
  }
  const country = parts[3] || "US";

  return { street, city, state, postal, country };
}

async function run() {
  const rows = [];
  fs.createReadStream("data/40-tons-ny-dispensaries.csv")
    .pipe(csv())
    .on("data", row => rows.push(row))
    .on("end", async () => {
      for (const row of rows) {
        const name = row["Store 40 Tons is in New York"];
        const addr = row["Address"];

        const { street, city, state, postal, country } = parseAddress(addr);
        const id = `disp-ny-${slugify(name)}`;

        const docRef = firestore.collection("dispensaries").doc(id);
        await docRef.set(
          {
            name,
            state,
            city,
            postal_code: postal,
            country,
            street_address: street,
            homepage_url: null,
            menu_url: null,
            menu_discovery_status: "pending",
            is_priority: true,
            platform_guess: "unknown",
            updated_at: new Date().toISOString()
          },
          { merge: true }
        );

        console.log("Upserted dispensary:", id, name);
      }
      console.log("Done seeding 40 Tons NY dispensaries.");
    });
}

run().catch(console.error);
