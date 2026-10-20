import { soundSettings, subscribeSoundSettings } from "./sound-settings";

/**
 * Sound of the trains, synthesized with WebAudio: no file to download. A
 * rolling noise follows the trains moving on the map, and a short whistle
 * marks a departure. The audio context is only created once the sound is on
 * and a train moves; the browser keeps it suspended until a gesture.
 */

/** Time constant of the rolling fades, in seconds: it starts softly. */
const ROLLING_FADE_S = 0.8;
/** Loudness of the rolling noise with every train moving, before the volume. */
const ROLLING_GAIN = 0.35;
/** Rhythm of the rails, in hertz: the clatter of the joints. */
const CLATTER_HZ = 1.7;
/** Shortest time between two whistles, in milliseconds: dense lines stay calm. */
const WHISTLE_GAP_MS = 6000;
const WHISTLE_GAIN = 0.12;
/** Two notes, a chord as on a real horn. */
const WHISTLE_NOTES_HZ = [587, 740];
/** Silence kept before suspending the audio context, in milliseconds: it then costs nothing. */
const SUSPEND_AFTER_MS = 4000;

interface Engine {
  context: AudioContext;
  master: GainNode;
  rolling: GainNode;
}

let engine: Engine | null = null;
let rolling = 0;
let lastWhistle = 0;
let suspendTimer: ReturnType<typeof setTimeout> | undefined;

function masterLevel(): number {
  const { enabled, volume } = soundSettings();
  return enabled ? volume : 0;
}

/** Brown noise: the low rumble of wheels on rails. */
function noiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    samples[i] = last * 3.5;
  }
  return buffer;
}

function resumeOnGesture(context: AudioContext): void {
  const resume = () => {
    void context.resume();
    if (context.state === "running") {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    }
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  resume();
}

function createEngine(): Engine {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = masterLevel();
  master.connect(context.destination);

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer(context);
  noise.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 420;
  // The clatter: the noise swells with each rail joint.
  const clatter = context.createGain();
  clatter.gain.value = 0.75;
  const lfo = context.createOscillator();
  lfo.frequency.value = CLATTER_HZ;
  const depth = context.createGain();
  depth.gain.value = 0.25;
  lfo.connect(depth).connect(clatter.gain);
  const rollingGain = context.createGain();
  rollingGain.gain.value = 0;
  noise.connect(lowpass).connect(clatter).connect(rollingGain).connect(master);
  noise.start();
  lfo.start();

  subscribeSoundSettings(() => {
    master.gain.setTargetAtTime(masterLevel(), context.currentTime, 0.05);
    settle();
  });
  resumeOnGesture(context);
  return { context, master, rolling: rollingGain };
}

/** Suspends the audio context after a silence, resumes it as soon as a train rolls with the sound on. */
function settle(): void {
  if (!engine) return;
  clearTimeout(suspendTimer);
  const { context } = engine;
  if (rolling > 0 && masterLevel() > 0) {
    if (context.state === "suspended") void context.resume();
    return;
  }
  suspendTimer = setTimeout(() => void context.suspend(), SUSPEND_AFTER_MS);
}

/** The engine, created on first use while the sound is on; null otherwise. */
function audio(): Engine | null {
  if (engine) return engine;
  if (masterLevel() === 0 || typeof AudioContext === "undefined") return null;
  engine = createEngine();
  return engine;
}

/** Sets how loud the trains roll, from 0 (none moving) to 1, fading to it. */
export function setTrainRolling(level: number): void {
  if (level === rolling) return;
  rolling = level;
  const sound = level > 0 ? audio() : engine;
  if (!sound) return;
  sound.rolling.gain.setTargetAtTime(level * ROLLING_GAIN, sound.context.currentTime, ROLLING_FADE_S);
  settle();
}

/** A short whistle for a train leaving a station, at most one every few seconds. */
export function whistle(): void {
  const now = Date.now();
  if (now - lastWhistle < WHISTLE_GAP_MS) return;
  const sound = audio();
  if (!sound || sound.context.state !== "running") return;
  lastWhistle = now;
  const { context, master } = sound;
  const start = context.currentTime;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(WHISTLE_GAIN, start + 0.06);
  envelope.gain.setValueAtTime(WHISTLE_GAIN, start + 0.5);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1800;
  tone.connect(envelope).connect(master);
  for (const note of WHISTLE_NOTES_HZ) {
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = note;
    oscillator.connect(tone);
    oscillator.start(start);
    oscillator.stop(start + 0.95);
  }
}
