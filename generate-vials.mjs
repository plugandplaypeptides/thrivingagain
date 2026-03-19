import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const images = [
  {
    name: "vial-testosterone",
    prompt: "3D render of a single sleek modern injectable treatment vial floating in empty white space, tall slim glass vial with rubber stopper and aluminum crimp cap, dark navy blue liquid inside, small elegant gold K logo on front, dramatic soft lighting from above, strong drop shadow below, hyper realistic 3D product rendering, completely plain white background, no surface, no table, floating in air, pharmaceutical aesthetic, front view",
  },
  {
    name: "vial-hair",
    prompt: "3D render of a single sleek modern serum dropper bottle floating in empty white space, tall slim dark green glass bottle with gold pipette dropper cap, small elegant gold K logo on front, dramatic soft lighting from above, strong drop shadow below, hyper realistic 3D product rendering, completely plain white background, no surface, no table, floating in air, premium skincare aesthetic, front view",
  },
  {
    name: "vial-sexual-health",
    prompt: "3D render of a single sleek modern injectable treatment vial floating in empty white space, tall slim glass vial with rubber stopper and aluminum crimp cap, deep burgundy red liquid inside, small elegant gold K logo on front, dramatic soft lighting from above, strong drop shadow below, hyper realistic 3D product rendering, completely plain white background, no surface, no table, floating in air, pharmaceutical aesthetic, front view",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImage(imageConfig) {
  const outputPath = path.join("assets", `${imageConfig.name}.png`);
  console.log(`Generating: ${imageConfig.name}...`);
  try {
    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt: imageConfig.prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 25,
        guidance_scale: 3.5,
      },
    });

    let imageUrl;
    if (typeof output === "string") {
      imageUrl = output;
    } else if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output && typeof output === "object") {
      imageUrl = output.url ? output.url() : output;
    }

    let buffer;
    if (typeof imageUrl === "string") {
      const response = await fetch(imageUrl);
      buffer = Buffer.from(await response.arrayBuffer());
    } else if (imageUrl && typeof imageUrl.getReader === "function") {
      const reader = imageUrl.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      buffer = Buffer.concat(chunks);
    } else {
      const response = await fetch(String(output));
      buffer = Buffer.from(await response.arrayBuffer());
    }

    fs.writeFileSync(outputPath, buffer);
    console.log(`  ✓ Saved: ${outputPath}`);
  } catch (err) {
    console.error(`  ✗ Error generating ${imageConfig.name}:`, err.message);
  }
}

async function main() {
  console.log("Regenerating vials (3D floating, no background)...\n");
  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 12 seconds for rate limit...");
      await sleep(12000);
    }
    await generateImage(images[i]);
  }
  console.log("\nDone!");
}

main();
