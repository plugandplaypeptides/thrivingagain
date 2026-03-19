import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const files = [
  "assets/vial-testosterone.png",
  "assets/vial-hair.png",
  "assets/vial-sexual-health.png",
  "assets/pill-k.png",
  "assets/hero-man.png",
  "assets/hero-woman.png",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeBg(filePath) {
  console.log(`Removing background: ${filePath}...`);
  try {
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString("base64");
    const dataUri = `data:image/png;base64,${base64}`;

    const output = await replicate.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      {
        input: {
          image: dataUri,
        },
      }
    );

    let imageUrl;
    if (typeof output === "string") {
      imageUrl = output;
    } else if (output && typeof output === "object") {
      imageUrl = output.url ? output.url() : String(output);
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`  ✓ Saved: ${filePath} (transparent)`);
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
  }
}

async function main() {
  console.log("Removing backgrounds from all images...\n");
  for (let i = 0; i < files.length; i++) {
    if (i > 0) {
      console.log("  Waiting 12 seconds for rate limit...");
      await sleep(12000);
    }
    await removeBg(files[i]);
  }
  console.log("\nDone!");
}

main();
