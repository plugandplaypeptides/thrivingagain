import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const images = [
  {
    name: "tc-marcus",
    prompt: "Professional portrait photo of a fit Black man in his late 30s, short hair, confident warm smile, wearing a fitted navy blue athletic t-shirt, shot from chest up, clean white studio background, soft natural lighting, high resolution, editorial fitness magazine style",
  },
  {
    name: "tc-david",
    prompt: "Professional portrait photo of a fit white man in his mid 40s, short brown hair with grey at temples, strong jaw, warm genuine smile, wearing a heather grey henley shirt, shot from chest up, clean white studio background, soft natural lighting, high resolution, editorial fitness magazine style",
  },
  {
    name: "tc-sarah",
    prompt: "Professional portrait photo of a fit woman in her early 30s, long dark brown hair, natural makeup, radiant healthy smile, wearing a white tank top, shot from chest up, clean white studio background, soft natural lighting, high resolution, editorial fitness magazine style",
  },
  {
    name: "tc-thomas",
    prompt: "Professional portrait photo of an athletic Asian man in his late 30s, black hair neatly styled, clean shaven, confident expression, wearing a dark olive green polo shirt, shot from chest up, clean white studio background, soft natural lighting, high resolution, editorial fitness magazine style",
  },
  {
    name: "tc-amanda",
    prompt: "Professional portrait photo of a fit Latina woman in her mid 40s, shoulder length wavy dark hair, warm smile, wearing a soft blue v-neck top, shot from chest up, clean white studio background, soft natural lighting, high resolution, editorial fitness magazine style",
  },
  {
    name: "tc-kevin",
    prompt: "Professional portrait photo of a fit white man in his early 50s, salt and pepper hair, trimmed beard, friendly confident expression, wearing a navy blue crew neck sweater, shot from chest up, clean white studio background, soft natural lighting, high resolution, editorial fitness magazine style",
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
        width: 768,
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
        input: { image: dataUri },
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
  console.log("Generating testimonial portraits...\n");
  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 15s for rate limit...");
      await sleep(15000);
    }
    await generateImage(images[i]);
  }

  console.log("\nRemoving backgrounds...\n");
  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 15s for rate limit...");
      await sleep(15000);
    }
    await removeBg(path.join("assets", `${images[i].name}.png`));
  }

  console.log("\nDone!");
}

main();
