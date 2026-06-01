const KEY_ROOTS = {
  C: 60,
  "C#": 61,
  D: 62,
  "D#": 63,
  E: 64,
  F: 65,
  "F#": 66,
  G: 67,
  "G#": 68,
  A: 69,
  "A#": 70,
  B: 71,
};

const MODES = {
  major: { label: "Major", intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  minor: { label: "Minor", intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  dorian: { label: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10, 12] },
  mixolydian: { label: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10, 12] },
  phrygian: { label: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10, 12] },
  lydian: { label: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11, 12] },
};

const ROOTS = [0, 3, 5, 2, 0, 6, 3, 5];
const TRACK_COLORS = {
  lead: "#00a896",
  bass: "#d45d4c",
  pad: "#6d72c3",
  drums: "#d99b21",
};

const SPECS = [
  {
    slug: "01_glass_tide",
    title: "Glass Tide",
    seed: 17,
    tempo: 84,
    bars: 8,
    melodyPulses: 5,
    melodySteps: 16,
    bassPulses: 3,
    bassSteps: 8,
    register: 0,
    energy: 0.55,
    key: "D",
    mode: "dorian",
  },
  {
    slug: "02_clockwork_rain",
    title: "Clockwork Rain",
    seed: 42,
    tempo: 104,
    bars: 8,
    melodyPulses: 9,
    melodySteps: 16,
    bassPulses: 5,
    bassSteps: 12,
    register: 5,
    energy: 0.82,
    key: "D",
    mode: "dorian",
  },
  {
    slug: "03_low_moon",
    title: "Low Moon",
    seed: 91,
    tempo: 72,
    bars: 8,
    melodyPulses: 4,
    melodySteps: 16,
    bassPulses: 2,
    bassSteps: 8,
    register: -7,
    energy: 0.45,
    key: "D",
    mode: "dorian",
  },
];

const state = {
  spec: { ...SPECS[0] },
  events: [],
  signature: "00000000",
  playing: false,
  startedAt: 0,
  durationMs: 0,
  animationFrame: 0,
  audioContext: null,
  stopTimer: 0,
  exporting: false,
};

const els = {
  variationSelect: document.querySelector("#variationSelect"),
  seedInput: document.querySelector("#seedInput"),
  keySelect: document.querySelector("#keySelect"),
  modeSelect: document.querySelector("#modeSelect"),
  tempoInput: document.querySelector("#tempoInput"),
  tempoOutput: document.querySelector("#tempoOutput"),
  densityInput: document.querySelector("#densityInput"),
  densityOutput: document.querySelector("#densityOutput"),
  playButton: document.querySelector("#playButton"),
  stopButton: document.querySelector("#stopButton"),
  rebuildButton: document.querySelector("#rebuildButton"),
  exportButton: document.querySelector("#exportButton"),
  repeatButton: document.querySelector("#repeatButton"),
  newSeedButton: document.querySelector("#newSeedButton"),
  rollCanvas: document.querySelector("#rollCanvas"),
  signatureText: document.querySelector("#signatureText"),
  keyText: document.querySelector("#keyText"),
  barsText: document.querySelector("#barsText"),
  eventsText: document.querySelector("#eventsText"),
  stateText: document.querySelector("#stateText"),
  trackList: document.querySelector("#trackList"),
  pulseGrid: document.querySelector("#pulseGrid"),
  renderList: document.querySelector("#renderList"),
};

function makeRng(seed) {
  let value = seed >>> 0;
  return function rng() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedChoice(values, weights, rng) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng() * total;
  for (let index = 0; index < values.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) {
      return values[index];
    }
  }
  return values[values.length - 1];
}

function pick(values, rng) {
  return values[Math.floor(rng() * values.length)];
}

function euclidean(pulses, steps, rotate = 0) {
  const pattern = [];
  let bucket = 0;
  for (let index = 0; index < steps; index += 1) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(1);
    } else {
      pattern.push(0);
    }
  }
  if (!rotate) {
    return pattern;
  }
  const offset = rotate % steps;
  return pattern.slice(-offset).concat(pattern.slice(0, -offset));
}

function scalePitch(degree, octave = 4, spec) {
  const mode = MODES[spec.mode] || MODES.dorian;
  const root = (KEY_ROOTS[spec.key] || KEY_ROOTS.D) + spec.register;
  const octaveOffset = Math.floor(degree / mode.intervals.length);
  const index = ((degree % mode.intervals.length) + mode.intervals.length) % mode.intervals.length;
  return root + (octave - 4) * 12 + octaveOffset * 12 + mode.intervals[index];
}

function markovNext(degree, rng, energy) {
  const moves = [-3, -2, -1, 0, 1, 2, 3, 5];
  const weights = [
    0.04 + energy * 0.03,
    0.08,
    0.26,
    0.18,
    0.28,
    0.1 + energy * 0.05,
    0.04 + energy * 0.02,
    0.02 + energy * 0.03,
  ];
  const next = degree + weightedChoice(moves, weights, rng);
  return Math.max(0, Math.min(14, next));
}

function addNote(events, track, start, duration, pitch, velocity) {
  events.push({
    track,
    start,
    duration,
    pitch,
    velocity: Math.max(1, Math.min(127, Math.round(velocity))),
  });
}

function compose(spec) {
  const rng = makeRng(spec.seed);
  const events = [];
  const melodyPulses = Math.max(1, Math.min(15, spec.melodyPulses + spec.density));
  const bassPulses = Math.max(1, Math.min(spec.bassSteps - 1, spec.bassPulses + Math.floor(spec.density / 2)));
  const melodyRhythm = euclidean(melodyPulses, spec.melodySteps, 3);
  const bassRhythm = euclidean(bassPulses, spec.bassSteps, 1);
  const hats = euclidean(spec.energy > 0.6 ? 7 + spec.density : 5 + spec.density, 16, 2);
  let degree = 4;

  for (let bar = 0; bar < spec.bars; bar += 1) {
    const barStart = bar * 4;
    const rootDegree = ROOTS[bar % ROOTS.length];

    bassRhythm.forEach((hit, step) => {
      if (!hit) {
        return;
      }
      const start = barStart + step * (4 / spec.bassSteps);
      const pitch = scalePitch(rootDegree, 2, spec);
      addNote(events, "bass", start, 0.75, pitch, 72);
    });

    melodyRhythm.forEach((hit, step) => {
      if (!hit) {
        return;
      }
      const start = barStart + step * (4 / spec.melodySteps);
      degree = markovNext(degree, rng, spec.energy);
      if (rng() < 0.35) {
        degree = Math.floor((degree + rootDegree) / 2);
      }
      const pitch = scalePitch(degree, 4, spec);
      const duration = pick([0.25, 0.375, 0.5, 0.75], rng);
      const velocity = (62 + rng() * 30) * (0.85 + spec.energy * 0.2);
      addNote(events, "lead", start, duration, pitch, velocity);

      if (rng() < 0.28 + spec.energy * 0.2) {
        const harmonyDegree = Math.max(0, degree - pick([2, 3, 4], rng));
        const harmony = scalePitch(harmonyDegree, 4, spec);
        addNote(events, "pad", start, duration * 1.5, harmony, velocity - 18);
      }
    });

    const padRoot = scalePitch(rootDegree, 3, spec);
    [0, 7, 14].forEach((interval) => addNote(events, "pad", barStart, 3.75, padRoot + interval, 44));

    for (let beat = 0; beat < 4; beat += 1) {
      addNote(events, "drums", barStart + beat, 0.12, 36, 80 + spec.energy * 25);
      if (beat === 1 || beat === 3) {
        addNote(events, "drums", barStart + beat, 0.08, 38, 58 + spec.energy * 28);
      }
    }

    hats.forEach((hit, step) => {
      if (hit) {
        addNote(events, "drums", barStart + step * 0.25, 0.04, 42, 35 + spec.energy * 35);
      }
    });
  }

  return events.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}

function sequenceSignature(events, spec) {
  const data = [
    spec.title,
    spec.seed,
    spec.tempo,
    spec.density,
    spec.key,
    spec.mode,
    ...events.map((event) => `${event.track[0]}:${Math.round(event.start * 100)}:${event.pitch}:${event.velocity}`),
  ].join("|");
  let hash = 2166136261;
  for (let index = 0; index < data.length; index += 1) {
    hash ^= data.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function rebuild() {
  state.events = compose(state.spec);
  state.signature = sequenceSignature(state.events, state.spec);
  updateReadout();
  drawRoll();
}

function updateControlsFromSpec() {
  els.seedInput.value = state.spec.seed;
  els.keySelect.value = state.spec.key;
  els.modeSelect.value = state.spec.mode;
  els.tempoInput.value = state.spec.tempo;
  els.tempoOutput.value = `${state.spec.tempo} bpm`;
  els.densityInput.value = state.spec.density;
  els.densityOutput.value = `+${state.spec.density}`;
}

function updateReadout() {
  const counts = { lead: 0, bass: 0, pad: 0, drums: 0 };
  state.events.forEach((event) => {
    counts[event.track] += 1;
  });

  els.signatureText.textContent = state.signature;
  const mode = MODES[state.spec.mode] || MODES.dorian;
  els.keyText.textContent = `${state.spec.key} ${mode.label}`;
  els.barsText.textContent = state.spec.bars;
  els.eventsText.textContent = state.events.length;
  els.trackList.innerHTML = Object.entries(counts)
    .map(([track, count]) => (
      `<div class="track-row">
        <span class="swatch" style="background:${TRACK_COLORS[track]}"></span>
        <span>${track}</span>
        <span class="track-count">${count}</span>
      </div>`
    ))
    .join("");

  const pattern = euclidean(
    Math.max(1, Math.min(15, state.spec.melodyPulses + state.spec.density)),
    16,
    3,
  );
  els.pulseGrid.innerHTML = pattern
    .map((hit) => `<span class="pulse-cell${hit ? " is-on" : ""}"></span>`)
    .join("");
}

function populateRenders() {
  els.renderList.innerHTML = SPECS.map((spec) => (
    `<div class="render-item">
      <strong>${spec.title}</strong>
      <audio controls preload="metadata" src="../output/audio/${spec.slug}.wav"></audio>
    </div>`
  )).join("");
}

function resizeCanvas() {
  const canvas = els.rollCanvas;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  drawRoll();
}

function drawRoll() {
  const canvas = els.rollCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const ratio = window.devicePixelRatio || 1;
  const padding = {
    top: 30 * ratio,
    right: 24 * ratio,
    bottom: 58 * ratio,
    left: 48 * ratio,
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const totalBeats = state.spec.bars * 4;
  const pitches = state.events
    .filter((event) => event.track !== "drums")
    .map((event) => event.pitch);
  const pitchMin = Math.min(30, ...pitches) - 2;
  const pitchMax = Math.max(84, ...pitches) + 2;
  const drumLaneTop = padding.top + plotHeight * 0.82;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#171a1f";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1 * ratio;
  for (let beat = 0; beat <= totalBeats; beat += 1) {
    const x = padding.left + (beat / totalBeats) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  for (let bar = 0; bar <= state.spec.bars; bar += 1) {
    const x = padding.left + ((bar * 4) / totalBeats) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }

  for (let row = 0; row <= 8; row += 1) {
    const y = padding.top + (row / 8) * plotHeight;
    ctx.strokeStyle = row === 7 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
  }

  state.events.forEach((event) => {
    const x = padding.left + (event.start / totalBeats) * plotWidth;
    const w = Math.max(2 * ratio, (event.duration / totalBeats) * plotWidth);
    let y;
    let h;
    if (event.track === "drums") {
      const lane = event.pitch === 36 ? 0 : event.pitch === 38 ? 1 : 2;
      h = 10 * ratio;
      y = drumLaneTop + lane * 15 * ratio;
    } else {
      const normalized = (event.pitch - pitchMin) / (pitchMax - pitchMin);
      y = padding.top + (1 - normalized) * (plotHeight * 0.76);
      h = event.track === "pad" ? 8 * ratio : 12 * ratio;
    }
    ctx.fillStyle = TRACK_COLORS[event.track];
    ctx.globalAlpha = event.track === "pad" ? 0.42 : 0.9;
    ctx.fillRect(x, y, w, h);
  });
  ctx.globalAlpha = 1;

  if (state.playing) {
    const progress = Math.min(1, (performance.now() - state.startedAt) / state.durationMs);
    const x = padding.left + progress * plotWidth;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2 * ratio;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `${12 * ratio}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("lead / pad / bass", padding.left, padding.top - 10 * ratio);
  ctx.fillText("drums", padding.left, drumLaneTop - 8 * ratio);
}

function animate() {
  drawRoll();
  if (state.playing) {
    state.animationFrame = requestAnimationFrame(animate);
  }
}

function midiToFrequency(pitch) {
  return 440 * (2 ** ((pitch - 69) / 12));
}

function totalDurationSeconds(spec) {
  return spec.bars * 4 * (60 / spec.tempo);
}

function makeGain(context, start, duration, peak, release = 0.12) {
  const gain = context.createGain();
  const end = start + duration;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.62), start + Math.min(0.12, duration * 0.6));
  gain.gain.setValueAtTime(Math.max(0.0001, peak * 0.62), end);
  gain.gain.exponentialRampToValueAtTime(0.0001, end + release);
  return gain;
}

function scheduleTone(context, event, startTime, secondsPerBeat) {
  const start = startTime + event.start * secondsPerBeat;
  const duration = event.duration * secondsPerBeat;
  const frequency = midiToFrequency(event.pitch);
  const peak = (event.velocity / 127) * (event.track === "bass" ? 0.25 : event.track === "pad" ? 0.08 : 0.16);
  const gain = makeGain(context, start, duration, peak, event.track === "pad" ? 0.35 : 0.12);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(event.track === "pad" ? 1600 : 4200, start);
  filter.Q.setValueAtTime(0.5, start);
  gain.connect(filter);
  filter.connect(context.destination);

  const osc = context.createOscillator();
  osc.type = event.track === "bass" ? "triangle" : event.track === "pad" ? "sine" : "sawtooth";
  osc.frequency.setValueAtTime(frequency, start);
  osc.connect(gain);
  osc.start(start);
  osc.stop(start + duration + 0.45);

  if (event.track === "pad") {
    const second = context.createOscillator();
    second.type = "sine";
    second.frequency.setValueAtTime(frequency * 1.005, start);
    second.connect(gain);
    second.start(start);
    second.stop(start + duration + 0.45);
  }
}

function noiseBuffer(context, duration, rng) {
  const length = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = rng() * 2 - 1;
  }
  return buffer;
}

function scheduleDrum(context, event, eventIndex, startTime, secondsPerBeat) {
  const start = startTime + event.start * secondsPerBeat;
  const peak = (event.velocity / 127) * 0.36;
  if (event.pitch === 36) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + 0.16);
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + 0.24);
    return;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const seed = state.spec.seed * 131 + event.pitch * 17 + Math.round(event.start * 100) + eventIndex * 7919;
  source.buffer = noiseBuffer(context, event.pitch === 38 ? 0.12 : 0.055, makeRng(seed));
  filter.type = event.pitch === 38 ? "bandpass" : "highpass";
  filter.frequency.setValueAtTime(event.pitch === 38 ? 1800 : 7200, start);
  gain.gain.setValueAtTime(peak * (event.pitch === 38 ? 0.55 : 0.28), start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + (event.pitch === 38 ? 0.13 : 0.055));
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
}

function scheduleEvents(context, startTime, secondsPerBeat) {
  state.events.forEach((event, index) => {
    if (event.track === "drums") {
      scheduleDrum(context, event, index, startTime, secondsPerBeat);
    } else {
      scheduleTone(context, event, startTime, secondsPerBeat);
    }
  });
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function audioBufferToWav(buffer) {
  const samples = buffer.getChannelData(0);
  const output = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(output);
  const sampleRate = buffer.sampleRate;

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([output], { type: "audio/wav" });
}

function exportFileName() {
  const take = state.spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const key = state.spec.key.replace("#", "sharp").toLowerCase();
  return `melody_generator_${take}_${key}_${state.spec.mode}_${state.signature}.wav`;
}

async function exportWav() {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) {
    els.stateText.textContent = "no export";
    return;
  }

  syncSpecFromControls();
  state.exporting = true;
  els.exportButton.disabled = true;
  els.stateText.textContent = "exporting";

  try {
    const sampleRate = 44100;
    const secondsPerBeat = 60 / state.spec.tempo;
    const renderSeconds = totalDurationSeconds(state.spec) + 1.0;
    const context = new OfflineContext(1, Math.ceil(renderSeconds * sampleRate), sampleRate);
    scheduleEvents(context, 0.08, secondsPerBeat);
    const rendered = await context.startRendering();
    const blob = audioBufferToWav(rendered);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    els.stateText.textContent = "exported";
  } catch (error) {
    console.error(error);
    els.stateText.textContent = "export failed";
  } finally {
    state.exporting = false;
    els.exportButton.disabled = false;
  }
}

async function play() {
  stop(false);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    els.stateText.textContent = "no audio";
    return;
  }

  const context = new AudioContextClass();
  state.audioContext = context;
  await context.resume();

  const secondsPerBeat = 60 / state.spec.tempo;
  const startTime = context.currentTime + 0.08;
  state.durationMs = totalDurationSeconds(state.spec) * 1000;
  state.startedAt = performance.now();
  state.playing = true;
  els.stateText.textContent = "playing";
  els.playButton.disabled = true;

  scheduleEvents(context, startTime, secondsPerBeat);

  cancelAnimationFrame(state.animationFrame);
  state.animationFrame = requestAnimationFrame(animate);
  state.stopTimer = window.setTimeout(() => stop(false), state.durationMs + 500);
}

function stop(updateCanvas = true) {
  window.clearTimeout(state.stopTimer);
  cancelAnimationFrame(state.animationFrame);
  if (state.audioContext) {
    state.audioContext.close();
    state.audioContext = null;
  }
  state.playing = false;
  els.playButton.disabled = false;
  els.stateText.textContent = "ready";
  if (updateCanvas) {
    drawRoll();
  }
}

function applySelectedVariation() {
  const selected = SPECS[Number(els.variationSelect.value)];
  state.spec = {
    ...selected,
    density: Number(els.densityInput.value || 0),
    key: els.keySelect.value || selected.key,
    mode: els.modeSelect.value || selected.mode,
  };
  updateControlsFromSpec();
  rebuild();
}

function syncSpecFromControls() {
  state.spec.seed = Math.max(1, Math.min(9999, Number(els.seedInput.value) || 1));
  state.spec.key = els.keySelect.value;
  state.spec.mode = els.modeSelect.value;
  state.spec.tempo = Number(els.tempoInput.value);
  state.spec.density = Number(els.densityInput.value);
  els.tempoOutput.value = `${state.spec.tempo} bpm`;
  els.densityOutput.value = `+${state.spec.density}`;
  rebuild();
}

function wireEvents() {
  els.playButton.addEventListener("click", play);
  els.stopButton.addEventListener("click", () => stop(true));
  els.rebuildButton.addEventListener("click", syncSpecFromControls);
  els.exportButton.addEventListener("click", exportWav);
  els.repeatButton.addEventListener("click", syncSpecFromControls);
  els.newSeedButton.addEventListener("click", () => {
    els.seedInput.value = Math.floor(100 + Math.random() * 9900);
    syncSpecFromControls();
  });
  els.variationSelect.addEventListener("change", applySelectedVariation);
  els.seedInput.addEventListener("change", syncSpecFromControls);
  els.keySelect.addEventListener("change", syncSpecFromControls);
  els.modeSelect.addEventListener("change", syncSpecFromControls);
  els.tempoInput.addEventListener("input", syncSpecFromControls);
  els.densityInput.addEventListener("input", syncSpecFromControls);
  window.addEventListener("resize", resizeCanvas);
}

function init() {
  state.spec.density = 0;
  updateControlsFromSpec();
  populateRenders();
  wireEvents();
  rebuild();
  requestAnimationFrame(resizeCanvas);
}

init();
