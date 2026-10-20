import { soundSettings, subscribeSoundSettings } from "./sound-settings";

/**
 * Sound of the trains, synthesized with WebAudio: no file to download. A low
 * rumble and the clatter of the bogies over the rail joints follow the trains
 * moving on the map, the two-tone horn of the French trains marks a departure,
 * after the whistle of the guard on the platform, and a hiss of air the
 * braking into a station. The horn and the whistle never sound together. The audio context is only created once the sound
 * is on and a train moves; the browser keeps it suspended until a gesture.
 */

/** Time constant of the rolling fades, in seconds: it starts softly. */
const ROLLING_FADE_S = 0.8;
/** Loudness of the rumble and of the clatter with every train moving, before the volume. */
const RUMBLE_GAIN = 0.22;
const CLATTER_GAIN = 0.5;
/**
 * Rhythm of the clatter, in seconds: two axles of a bogie ("ta-dam"), the
 * bogie of the next car, then the length of a car. Played with a little
 * jitter, slower as fewer trains move.
 */
const AXLE_GAP_S = 0.1;
const BOGIE_GAP_S = 0.32;
const CAR_PERIOD_S = 1.15;
/** How far ahead the clatter is scheduled, in seconds, and how often, in milliseconds. */
const SCHEDULE_AHEAD_S = 0.3;
const SCHEDULE_EVERY_MS = 100;
/** Shortest time between two horns and two brakings, in milliseconds: dense lines stay calm. */
const HORN_GAP_MS = 8000;
const BRAKE_GAP_MS = 5000;
const WHISTLE_GAP_MS = 6000;
const HORN_GAIN = 0.07;
/** The two tones of the SNCF horn, high then low, in hertz, and how long each lasts, in seconds. */
const HORN_TONES = [
  [440, 0.45],
  [370, 0.6],
] as const;
const WHISTLE_GAIN = 0.035;
/** Pitch of the pea whistle of the guard, in hertz, the pea trilling it, and how long it lasts, in seconds. */
const WHISTLE_HZ = 2750;
const WHISTLE_TRILL_HZ = 28;
const WHISTLE_S = 0.65;
/** Silence kept after the horn or the whistle before the other may sound, in seconds. */
const SIGNAL_GAP_S = 0.4;
const BRAKE_GAIN = 0.05;
/** Silence kept before suspending the audio context, in milliseconds: it then costs nothing. */
const SUSPEND_AFTER_MS = 4000;
/** Time constants of the master gain, in seconds: the sound fades when turned on or off, follows the volume at once. */
const TOGGLE_FADE_S = 0.3;
const VOLUME_FADE_S = 0.05;

interface Engine {
  context: AudioContext;
  master: GainNode;
  rolling: GainNode;
  /** Where the clatter goes: through the rolling gain, it fades with it. */
  clatter: GainNode;
  /** A short echo, as off buildings and cuttings, for the horn. */
  echo: AudioNode;
  clack: AudioBuffer;
  hiss: AudioBuffer;
}

let engine: Engine | null = null;
let rolling = 0;
let lastHorn = 0;
let lastWhistle = 0;
/** Until when the horn or the whistle sounds, in seconds of the audio context: the other waits. */
let signalUntil = 0;
let lastBrake = 0;
let suspendTimer: ReturnType<typeof setTimeout> | undefined;
let clatterStopTimer: ReturnType<typeof setTimeout> | undefined;
let clatterTimer: ReturnType<typeof setInterval> | undefined;
/** Time of the next car of the clatter, in seconds of the audio context. */
let nextCar = 0;

function masterLevel(): number {
  const { enabled, volume } = soundSettings();
  return enabled ? volume : 0;
}

/** Brown noise: the low rumble of wheels on rails. */
function brownNoise(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * seconds,
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    samples[i] = last * 3.5;
  }
  return buffer;
}

function whiteNoise(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    context.sampleRate * seconds,
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A wheel over a rail joint: a dull thump, a short knock and a faint metallic ring, rendered once. */
function clackBuffer(context: AudioContext): AudioBuffer {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.round(rate * 0.18), rate);
  const samples = buffer.getChannelData(0);
  let knock = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    // Low-passed noise for the knock, a falling sine for the thump.
    knock += 0.25 * (Math.random() * 2 - 1 - knock);
    const thump =
      Math.sin(2 * Math.PI * (95 - 120 * t) * t) * Math.exp(-t / 0.035);
    const ring =
      (Math.sin(2 * Math.PI * 2350 * t) +
        0.6 * Math.sin(2 * Math.PI * 3170 * t)) *
      Math.exp(-t / 0.05);
    samples[i] = 0.9 * thump + 1.4 * knock * Math.exp(-t / 0.018) + 0.04 * ring;
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

  const rollingGain = context.createGain();
  rollingGain.gain.value = 0;
  rollingGain.connect(master);
  // The rumble: low, steady, beneath the clatter.
  const noise = context.createBufferSource();
  noise.buffer = brownNoise(context, 3);
  noise.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 180;
  const rumble = context.createGain();
  rumble.gain.value = RUMBLE_GAIN;
  noise.connect(lowpass).connect(rumble).connect(rollingGain);
  noise.start();
  // The clatter: brighter, from the side of the track.
  const clatter = context.createGain();
  clatter.gain.value = CLATTER_GAIN;
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2200;
  clatter.connect(tone).connect(rollingGain);

  const echoIn = context.createGain();
  const delay = context.createDelay(1);
  delay.delayTime.value = 0.19;
  const feedback = context.createGain();
  feedback.gain.value = 0.28;
  const damping = context.createBiquadFilter();
  damping.type = "lowpass";
  damping.frequency.value = 1400;
  echoIn.connect(master);
  echoIn.connect(delay).connect(damping).connect(feedback).connect(delay);
  damping.connect(master);

  let enabled = soundSettings().enabled;
  subscribeSoundSettings(() => {
    const toggled = soundSettings().enabled !== enabled;
    enabled = soundSettings().enabled;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(
      masterLevel(),
      context.currentTime,
      toggled ? TOGGLE_FADE_S : VOLUME_FADE_S,
    );
    settle();
  });
  resumeOnGesture(context);
  return {
    context,
    master,
    rolling: rollingGain,
    clatter,
    echo: echoIn,
    clack: clackBuffer(context),
    hiss: whiteNoise(context, 1),
  };
}

function playClack(sound: Engine, at: number, gain: number): void {
  const source = sound.context.createBufferSource();
  source.buffer = sound.clack;
  // Each wheel sounds a little different.
  source.playbackRate.value = 0.92 + Math.random() * 0.16;
  const level = sound.context.createGain();
  level.gain.value = gain;
  source.connect(level).connect(sound.clatter);
  source.start(at);
}

/** Schedules the clatter a little ahead: the timers of the page are not precise enough to play it on time. */
function scheduleClatter(): void {
  if (!engine || engine.context.state !== "running") return;
  const { context } = engine;
  const now = context.currentTime;
  if (nextCar < now) nextCar = now + 0.05;
  // Fewer trains moving, slower and softer.
  const pace = 0.75 + 0.5 * rolling;
  while (nextCar < now + SCHEDULE_AHEAD_S) {
    const jitter = () => 1 + (Math.random() - 0.5) * 0.08;
    const gain = 0.7 + Math.random() * 0.3;
    const bogie = nextCar + (BOGIE_GAP_S / pace) * jitter();
    playClack(engine, nextCar, gain);
    playClack(engine, nextCar + (AXLE_GAP_S / pace) * jitter(), gain * 0.85);
    playClack(engine, bogie, gain * 0.9);
    playClack(engine, bogie + (AXLE_GAP_S / pace) * jitter(), gain * 0.8);
    nextCar += (CAR_PERIOD_S / pace) * jitter();
  }
}

/** Suspends the audio context after a silence, resumes it as soon as a train rolls with the sound on. */
function settle(): void {
  if (!engine) return;
  clearTimeout(suspendTimer);
  clearTimeout(clatterStopTimer);
  const { context } = engine;
  if (rolling > 0 && masterLevel() > 0) {
    if (context.state === "suspended") void context.resume();
    clatterTimer ??= setInterval(scheduleClatter, SCHEDULE_EVERY_MS);
    return;
  }
  // Turned off while trains roll, the clatter goes on through the fade.
  const stopClatter = () => {
    clearInterval(clatterTimer);
    clatterTimer = undefined;
  };
  if (rolling > 0)
    clatterStopTimer = setTimeout(stopClatter, TOGGLE_FADE_S * 4000);
  else stopClatter();
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
  const starting = rolling === 0 || level === 0;
  rolling = level;
  const sound = level > 0 ? audio() : engine;
  if (!sound) return;
  sound.rolling.gain.setTargetAtTime(
    level,
    sound.context.currentTime,
    ROLLING_FADE_S,
  );
  if (starting) settle();
}

/** The sound when it can play now: on, and the context running. */
function playing(): Engine | null {
  const sound = audio();
  return sound && sound.context.state === "running" ? sound : null;
}

/** Whether the horn or the whistle sounds now: the other one then keeps silent. */
function signalling(sound: Engine): boolean {
  return sound.context.currentTime < signalUntil;
}

/** The two-tone horn of a train leaving a station, at most one every few seconds, never over the whistle. */
export function horn(): void {
  const now = Date.now();
  if (now - lastHorn < HORN_GAP_MS) return;
  const sound = playing();
  if (!sound || signalling(sound)) return;
  lastHorn = now;
  const { context, echo } = sound;
  // A reed horn: a bright tone through the formant of its bell.
  const bell = context.createBiquadFilter();
  bell.type = "peaking";
  bell.frequency.value = 900;
  bell.Q.value = 1.2;
  bell.gain.value = 8;
  const soften = context.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 2400;
  bell.connect(soften).connect(echo);
  let start = context.currentTime + 0.02;
  for (const [frequency, duration] of HORN_TONES) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(HORN_GAIN, start + 0.05);
    envelope.gain.setValueAtTime(HORN_GAIN, start + duration - 0.08);
    envelope.gain.linearRampToValueAtTime(0, start + duration);
    envelope.connect(bell);
    // Two reeds slightly apart, sliding up to their note as the air comes.
    for (const [type, detune] of [
      ["sawtooth", -6],
      ["square", 7],
    ] as const) {
      const reed = context.createOscillator();
      reed.type = type;
      reed.detune.value = detune;
      reed.frequency.setValueAtTime(frequency * 0.97, start);
      reed.frequency.exponentialRampToValueAtTime(frequency, start + 0.06);
      const mix = context.createGain();
      mix.gain.value = type === "square" ? 0.5 : 1;
      reed.connect(mix).connect(envelope);
      reed.start(start);
      reed.stop(start + duration + 0.02);
    }
    start += duration + 0.06;
  }
  signalUntil = start + SIGNAL_GAP_S;
}

/** The pea whistle of the guard as a train is about to leave, at most one every few seconds, never over the horn. */
export function guardWhistle(): void {
  const now = Date.now();
  if (now - lastWhistle < WHISTLE_GAP_MS) return;
  const sound = playing();
  if (!sound || signalling(sound)) return;
  lastWhistle = now;
  const { context, master } = sound;
  const start = context.currentTime + 0.02;
  const end = start + WHISTLE_S;
  const tone = context.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(WHISTLE_HZ * 0.96, start);
  tone.frequency.exponentialRampToValueAtTime(WHISTLE_HZ, start + 0.05);
  // The pea rattling in the whistle: a fast flutter of the loudness and of the pitch.
  const trill = context.createOscillator();
  trill.frequency.value = WHISTLE_TRILL_HZ;
  const depth = context.createGain();
  depth.gain.value = 0.45;
  const wobble = context.createGain();
  wobble.gain.value = 60;
  trill.connect(wobble).connect(tone.frequency);
  const level = context.createGain();
  level.gain.value = 0.55;
  trill.connect(depth).connect(level.gain);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(WHISTLE_GAIN, start + 0.03);
  envelope.gain.setValueAtTime(WHISTLE_GAIN, end - 0.08);
  envelope.gain.linearRampToValueAtTime(0, end);
  // A breath of air around the tone.
  const air = context.createBufferSource();
  air.buffer = sound.hiss;
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = WHISTLE_HZ;
  band.Q.value = 3;
  const breath = context.createGain();
  breath.gain.value = 0.25;
  air.connect(band).connect(breath).connect(envelope);
  tone.connect(level).connect(envelope).connect(master);
  for (const node of [tone, trill, air]) {
    node.start(start);
    node.stop(end + 0.02);
  }
  signalUntil = end + SIGNAL_GAP_S;
}

/** A hiss of air as a train brakes into a station, at most one every few seconds. */
export function brake(): void {
  const now = Date.now();
  if (now - lastBrake < BRAKE_GAP_MS) return;
  const sound = playing();
  if (!sound) return;
  lastBrake = now;
  const { context, master, hiss } = sound;
  const start = context.currentTime;
  const source = context.createBufferSource();
  source.buffer = hiss;
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(3500, start);
  band.frequency.exponentialRampToValueAtTime(1800, start + 0.9);
  band.Q.value = 0.8;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(BRAKE_GAIN, start + 0.03);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.95);
  source.connect(band).connect(envelope).connect(master);
  source.start(start);
  source.stop(start + 1);
}
