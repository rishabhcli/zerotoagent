import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import process from "node:process";
import demoScript from "../remotion/demo-script.json" with { type: "json" };

const execFileAsync = promisify(execFile);
const AUDIO_DIR = path.join(process.cwd(), "public", "demo-video", "audio");
const OUTPUT_JSON = path.join(
  process.cwd(),
  "remotion",
  "generated-scene-data.json"
);

const VOICE_ID =
  process.env.DEMO_VIDEO_VOICE_ID ?? "WkVhWA2EqSfUAWAZG7La";
const MODEL_ID = "eleven_multilingual_v2";
const FRAME_PADDING = 18;
const FPS = 30;
const PLAYBACK_RATE = 1.32;

async function synthesize(text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.82,
          style: 0.24,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `ElevenLabs narration request failed with ${response.status}: ${await response.text()}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function getDurationInFrames(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  const durationInSeconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(durationInSeconds)) {
    throw new Error(`Could not determine audio duration for ${filePath}`);
  }

  return Math.ceil((durationInSeconds * FPS) / PLAYBACK_RATE) + FRAME_PADDING;
}

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error(
      "ELEVENLABS_API_KEY is required. Load .env.local before generating narration."
    );
  }

  await mkdir(AUDIO_DIR, { recursive: true });

  const generated = [];

  for (const [index, scene] of demoScript.entries()) {
    const audioFile = `${String(index + 1).padStart(2, "0")}-${scene.id}.mp3`;
    const absoluteAudioPath = path.join(AUDIO_DIR, audioFile);
    const audioBuffer = await synthesize(scene.narration);
    await writeFile(absoluteAudioPath, audioBuffer);

    const durationInFrames = await getDurationInFrames(absoluteAudioPath);
    generated.push({
      id: scene.id,
      kicker: scene.kicker,
      title: scene.title,
      body: scene.body,
      bullets: scene.bullets,
      screenshot: scene.screenshot,
      audioSrc: `demo-video/audio/${audioFile}`,
      durationInFrames,
      accentFrom: scene.accentFrom,
      accentTo: scene.accentTo,
    });

    console.log(
      `generated narration for ${scene.id} (${durationInFrames} frames)`
    );
  }

  await writeFile(OUTPUT_JSON, `${JSON.stringify(generated, null, 2)}\n`);
  const totalFrames = generated.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0
  );
  console.log(
    `updated generated-scene-data.json (${totalFrames} total frames, ${(totalFrames / FPS).toFixed(2)} seconds)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
