import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const images = [
  {
    name: "hero-woman",
    prompt: "Professional studio portrait photograph of a fit, healthy woman in her 30s, athletic build, radiant warm smile, wearing a clean white fitted top, soft studio lighting, clean white background, upper body shot, premium healthcare brand aesthetic, high-end commercial photography, sharp focus, natural skin texture, no text, no logos",
  },
  {
    name: "vial-testosterone",
    prompt: "Product photography of a sleek premium medical vial bottle, dark navy blue glass with a metallic gold label that reads 'KLL', gold cap, clean minimal design, soft studio lighting, white background, pharmaceutical product shot, ultra realistic, 3D render quality, no hands, single product centered",
  },
  {
    name: "vial-hair",
    prompt: "Product photography of a sleek premium medical dropper bottle, dark green glass with a metallic gold label that reads 'KLL', gold dropper cap, clean minimal design, soft studio lighting, white background, pharmaceutical product shot, ultra realistic, 3D render quality, no hands, single product centered",
  },
  {
    name: "vial-sexual-health",
    prompt: "Product photography of a sleek premium medical vial bottle, deep burgundy red glass with a metallic gold label that reads 'KLL', gold cap, clean minimal design, soft studio lighting, white background, pharmaceutical product shot, ultra realistic, 3D render quality, no hands, single product centered",
  },
  {
    name: "pill-k",
    prompt: "3D rendered premium pharmaceutical capsule pill, half navy blue and half gold, with the letter K embossed in gold on the navy side, floating at a slight angle with soft shadow beneath, clean white background, ultra realistic 3D product rendering, soft studio lighting, premium healthcare aesthetic, single pill centered, no text except the K",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImage(imageConfig) {
  const outputPath = path.join("assets", `${imageConfig.name}.png`);

  // Skip if already generated
  if (fs.existsSync(outputPath)) {
    console.log(`Skipping ${imageConfig.name} — already exists`);
    return;
  }

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
  console.log("Generating remaining images (with 12s delays for rate limits)...\n");

  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 12 seconds for rate limit...");
      await sleep(12000);
    }
    await generateImage(images[i]);
  }

  console.log("\nDone! Check the assets/ folder.");
}

main();
