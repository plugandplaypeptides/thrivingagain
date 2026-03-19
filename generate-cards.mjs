import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const images = [
  {
    name: "glp1-pen",
    prompt:
      "3D render of a modern Ozempic-style GLP-1 semaglutide injection pen floating in empty white space, cylindrical click pen injector with dose window and dial cap, premium navy blue body with gold accent ring near the cap, clean minimal pharmaceutical design, dramatic studio lighting from above, hyper realistic 3D product rendering, completely plain white background, no hands, no surface, no table, floating in air, front three-quarter view, high detail, 8k",
  },
  {
    name: "dna-helix",
    prompt:
      "3D render of a beautiful glowing DNA double helix strand floating in empty white space, translucent glass-like structure with navy blue backbone strands and gold metallic base pair rungs connecting them, soft volumetric inner glow, about 3 full elegant spiral turns, dramatic soft studio lighting, hyper realistic 3D scientific rendering, completely plain white background, no surface, no table, floating in air, vertical orientation, cinematic quality, 8k",
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
    console.log(`  ✓ Background removed: ${filePath}`);
  } catch (err) {
    console.error(`  ✗ Error removing bg: ${err.message}`);
  }
}

async function main() {
  console.log("Generating card images...\n");
  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 15 seconds for rate limit...");
      await sleep(15000);
    }
    await generateImage(images[i]);
  }

  console.log("\nRemoving backgrounds...\n");
  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 15 seconds for rate limit...");
      await sleep(15000);
    }
    await removeBg(path.join("assets", `${images[i].name}.png`));
  }

  console.log("\nDone!");
}

main();
