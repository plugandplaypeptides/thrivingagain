import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const images = [
  {
    name: "hero-woman",
    prompt: "Professional commercial portrait of a healthy radiant woman in her early 30s, shoulder length brown hair pulled back neatly, genuine warm smile showing teeth, wearing a navy blue crew neck fitted t-shirt, photographed from waist up with ample headroom, centered in frame, soft diffused studio lighting, solid bright green chroma key screen background, fitness lifestyle brand campaign, editorial quality, sharp focus on face, natural makeup, no jewelry, no accessories, no text",
  },
  {
    name: "hero-man",
    prompt: "Professional commercial portrait of a fit healthy man in his early 40s, short neat hair with light stubble, confident warm smile, wearing a fitted heather gray crew neck t-shirt, photographed from waist up with ample headroom, centered in frame, soft diffused studio lighting, solid bright green chroma key screen background, fitness lifestyle brand campaign, editorial quality, sharp focus on face, athletic build visible, no jewelry, no accessories, no text",
  },
  {
    name: "vial-testosterone",
    prompt: "Hyper realistic 3D product render of a single premium injectable treatment vial, tall slim clear glass vial with rubber stopper and brushed silver aluminum crimp cap, filled with deep navy blue liquid, elegant gold letter K printed on the glass, the vial is floating and tilted 15 degrees to the right, dramatic top-down studio lighting creating a soft shadow below, completely solid white background, no reflections on ground, no surface, pharmaceutical luxury branding, front three-quarter view, 8K detail",
  },
  {
    name: "vial-hair",
    prompt: "Hyper realistic 3D product render of a single premium serum dropper bottle, tall slim dark emerald green glass with gold metallic dropper pipette cap, elegant gold letter K printed on the glass, the bottle is floating and tilted 15 degrees to the right, dramatic top-down studio lighting creating a soft shadow below, completely solid white background, no reflections on ground, no surface, luxury skincare branding, front three-quarter view, 8K detail",
  },
  {
    name: "vial-sexual-health",
    prompt: "Hyper realistic 3D product render of a single premium injectable treatment vial, tall slim clear glass vial with rubber stopper and brushed silver aluminum crimp cap, filled with deep crimson burgundy red liquid, elegant gold letter K printed on the glass, the vial is floating and tilted 15 degrees to the right, dramatic top-down studio lighting creating a soft shadow below, completely solid white background, no reflections on ground, no surface, pharmaceutical luxury branding, front three-quarter view, 8K detail",
  },
  {
    name: "pill-k",
    prompt: "Hyper realistic 3D product render of a single luxury cosmetic jar, small round navy blue glass jar with polished gold screw cap lid, elegant gold letter K on the front of the jar, the jar is floating and tilted slightly, dramatic top-down studio lighting creating a soft shadow below, completely solid white background, no surface, no reflections on ground, premium beauty brand aesthetic, front view, 8K detail",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImage(imageConfig) {
  const outputPath = path.join("assets", `${imageConfig.name}.png`);
  console.log(`Generating: ${imageConfig.name}...`);
  try {
    const output = await replicate.run("black-forest-labs/flux-2-pro", {
      input: {
        prompt: imageConfig.prompt,
        width: 1024,
        height: 1024,
        steps: 30,
        guidance: 3.5,
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
    console.error(`  ✗ Error: ${err.message}`);
    // Fallback to flux-1.1-pro if flux-2-pro fails
    console.log(`  Retrying with flux-1.1-pro...`);
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
      if (typeof output === "string") imageUrl = output;
      else if (Array.isArray(output)) imageUrl = output[0];
      else imageUrl = output.url ? output.url() : String(output);

      const response = await fetch(typeof imageUrl === "string" ? imageUrl : String(imageUrl));
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      console.log(`  ✓ Saved (fallback): ${outputPath}`);
    } catch (err2) {
      console.error(`  ✗ Fallback also failed: ${err2.message}`);
    }
  }
}

async function main() {
  console.log("Regenerating ALL images at highest quality...\n");
  for (let i = 0; i < images.length; i++) {
    if (i > 0) {
      console.log("  Waiting 5 seconds...");
      await sleep(5000);
    }
    await generateImage(images[i]);
  }
  console.log("\nAll images generated! Now removing backgrounds...\n");
}

main();
