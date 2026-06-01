from __future__ import annotations

import math
import random
import struct
import wave
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIDI_DIR = ROOT / "output" / "midi"
AUDIO_DIR = ROOT / "output" / "audio"
TICKS_PER_BEAT = 480
SAMPLE_RATE = 44100
KEY_ROOTS = {
    "C": 60,
    "C#": 61,
    "D": 62,
    "D#": 63,
    "E": 64,
    "F": 65,
    "F#": 66,
    "G": 67,
    "G#": 68,
    "A": 69,
    "A#": 70,
    "B": 71,
}
MODES = {
    "major": [0, 2, 4, 5, 7, 9, 11, 12],
    "minor": [0, 2, 3, 5, 7, 8, 10, 12],
    "dorian": [0, 2, 3, 5, 7, 9, 10, 12],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10, 12],
    "phrygian": [0, 1, 3, 5, 7, 8, 10, 12],
    "lydian": [0, 2, 4, 6, 7, 9, 11, 12],
}


@dataclass(frozen=True)
class VariationSpec:
    slug: str
    title: str
    seed: int
    tempo: int
    bars: int
    melody_pulses: int
    melody_steps: int
    bass_pulses: int
    bass_steps: int
    register: int
    energy: float
    key: str = "D"
    mode: str = "dorian"


VARIATIONS = [
    VariationSpec("01_glass_tide", "Glass Tide", 17, 84, 24, 5, 16, 3, 8, 0, 0.55),
    VariationSpec("02_clockwork_rain", "Clockwork Rain", 42, 104, 24, 9, 16, 5, 12, 5, 0.82),
    VariationSpec("03_low_moon", "Low Moon", 91, 72, 20, 4, 16, 2, 8, -7, 0.45),
]


def ensure_dirs() -> None:
    MIDI_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def euclidean(pulses: int, steps: int, rotate: int = 0) -> list[int]:
    pattern: list[int] = []
    bucket = 0
    for _ in range(steps):
        bucket += pulses
        if bucket >= steps:
            bucket -= steps
            pattern.append(1)
        else:
            pattern.append(0)
    if rotate:
        rotate %= steps
        pattern = pattern[-rotate:] + pattern[:-rotate]
    return pattern


def scale_pitch(degree: int, octave: int = 4, key: str = "D", mode: str = "dorian", register: int = 0) -> int:
    intervals = MODES.get(mode, MODES["dorian"])
    root = KEY_ROOTS.get(key, KEY_ROOTS["D"]) + register
    octave_offset, index = divmod(degree, len(intervals))
    return root + (octave - 4) * 12 + octave_offset * 12 + intervals[index]


def markov_next(degree: int, rng: random.Random, energy: float) -> int:
    moves = [-3, -2, -1, 0, 1, 2, 3, 5]
    weights = [
        0.04 + energy * 0.03,
        0.08,
        0.26,
        0.18,
        0.28,
        0.10 + energy * 0.05,
        0.04 + energy * 0.02,
        0.02 + energy * 0.03,
    ]
    degree += rng.choices(moves, weights=weights, k=1)[0]
    return max(0, min(14, degree))


def add_note(
    events: list[dict],
    track: str,
    start: float,
    duration: float,
    pitch: int,
    velocity: int,
    channel: int,
    program: int | None = None,
) -> None:
    events.append(
        {
            "track": track,
            "start": start,
            "duration": duration,
            "pitch": pitch,
            "velocity": max(1, min(127, velocity)),
            "channel": channel,
            "program": program,
        }
    )


def compose(spec: VariationSpec) -> list[dict]:
    rng = random.Random(spec.seed)
    events: list[dict] = []
    melody_rhythm = euclidean(spec.melody_pulses, spec.melody_steps, rotate=3)
    bass_rhythm = euclidean(spec.bass_pulses, spec.bass_steps, rotate=1)
    hats = euclidean(7 if spec.energy > 0.6 else 5, 16, rotate=2)
    roots = [0, 3, 5, 2, 0, 6, 3, 5]
    degree = 4

    for bar in range(spec.bars):
        bar_start = bar * 4.0
        root_degree = roots[bar % len(roots)]

        for step, hit in enumerate(bass_rhythm):
            if hit:
                start = bar_start + step * (4.0 / spec.bass_steps)
                pitch = scale_pitch(root_degree, octave=2, key=spec.key, mode=spec.mode, register=spec.register)
                add_note(events, "bass", start, 0.75, pitch, 72, channel=1, program=32)

        for step, hit in enumerate(melody_rhythm):
            if not hit:
                continue
            start = bar_start + step * (4.0 / spec.melody_steps)
            degree = markov_next(degree, rng, spec.energy)
            if rng.random() < 0.35:
                degree = (degree + root_degree) // 2
            pitch = scale_pitch(degree, octave=4, key=spec.key, mode=spec.mode, register=spec.register)
            duration = rng.choice([0.25, 0.375, 0.5, 0.75])
            velocity = int(rng.uniform(62, 92) * (0.85 + spec.energy * 0.2))
            add_note(events, "lead", start, duration, pitch, velocity, channel=0, program=4)

            if rng.random() < 0.28 + spec.energy * 0.2:
                harmony = scale_pitch(
                    max(0, degree - rng.choice([2, 3, 4])),
                    octave=4,
                    key=spec.key,
                    mode=spec.mode,
                    register=spec.register,
                )
                add_note(events, "pad", start, duration * 1.5, harmony, velocity - 18, channel=2, program=88)

        pad_root = scale_pitch(root_degree, octave=3, key=spec.key, mode=spec.mode, register=spec.register)
        for interval in [0, 7, 14]:
            add_note(events, "pad", bar_start, 3.75, pad_root + interval, 44, channel=2, program=88)

        for beat in range(4):
            add_note(events, "drums", bar_start + beat, 0.12, 36, int(80 + spec.energy * 25), channel=9)
            if beat in [1, 3]:
                add_note(events, "drums", bar_start + beat, 0.08, 38, int(58 + spec.energy * 28), channel=9)

        for step, hit in enumerate(hats):
            if hit:
                add_note(events, "drums", bar_start + step * 0.25, 0.04, 42, int(35 + spec.energy * 35), channel=9)

    return events


def varlen(value: int) -> bytes:
    buffer = value & 0x7F
    value >>= 7
    while value:
        buffer <<= 8
        buffer |= ((value & 0x7F) | 0x80)
        value >>= 7
    out = bytearray()
    while True:
        out.append(buffer & 0xFF)
        if buffer & 0x80:
            buffer >>= 8
        else:
            break
    return bytes(out)


def midi_track(chunks: list[tuple[int, int, bytes]]) -> bytes:
    chunks.sort(key=lambda item: (item[0], item[1]))
    data = bytearray()
    last_tick = 0
    for tick, _, payload in chunks:
        data.extend(varlen(max(0, tick - last_tick)))
        data.extend(payload)
        last_tick = tick
    data.extend(varlen(0))
    data.extend(b"\xff\x2f\x00")
    return b"MTrk" + struct.pack(">I", len(data)) + bytes(data)


def write_midi(events: list[dict], tempo: int, path: Path) -> None:
    tempo_us = int(60_000_000 / tempo)
    tracks: list[bytes] = []
    tempo_events = [
        (0, 0, b"\xff\x51\x03" + tempo_us.to_bytes(3, "big")),
        (0, 1, b"\xff\x58\x04\x04\x02\x18\x08"),
    ]
    tracks.append(midi_track(tempo_events))

    track_names = ["lead", "bass", "pad", "drums"]
    for track_name in track_names:
        chunks: list[tuple[int, int, bytes]] = []
        channel_programs: dict[int, int] = {}
        for event in events:
            if event["track"] == track_name and event.get("program") is not None:
                channel_programs[event["channel"]] = event["program"]
        for channel, program in channel_programs.items():
            chunks.append((0, 0, bytes([0xC0 | channel, program])))
        for event in events:
            if event["track"] != track_name:
                continue
            start_tick = round(event["start"] * TICKS_PER_BEAT)
            end_tick = round((event["start"] + event["duration"]) * TICKS_PER_BEAT)
            channel = event["channel"]
            pitch = event["pitch"]
            velocity = event["velocity"]
            chunks.append((start_tick, 2, bytes([0x90 | channel, pitch, velocity])))
            chunks.append((end_tick, 1, bytes([0x80 | channel, pitch, 0])))
        tracks.append(midi_track(chunks))

    header = b"MThd" + struct.pack(">IHHH", 6, 1, len(tracks), TICKS_PER_BEAT)
    path.write_bytes(header + b"".join(tracks))


def envelope(t: float, duration: float, release: float = 0.12) -> float:
    attack = 0.012
    decay = 0.08
    sustain = 0.62
    if t < attack:
        return t / attack
    if t < attack + decay:
        return 1.0 - (1.0 - sustain) * ((t - attack) / decay)
    if t < duration:
        return sustain
    tail = max(0.0, 1.0 - ((t - duration) / release))
    return sustain * tail


def midi_frequency(pitch: int) -> float:
    return 440.0 * (2.0 ** ((pitch - 69) / 12.0))


def synth_note(buffer: list[float], event: dict, tempo: int, gain: float) -> None:
    seconds_per_beat = 60.0 / tempo
    start = int(event["start"] * seconds_per_beat * SAMPLE_RATE)
    duration = event["duration"] * seconds_per_beat
    total = int((duration + 0.14) * SAMPLE_RATE)
    amplitude = (event["velocity"] / 127.0) * gain
    freq = midi_frequency(event["pitch"])
    track = event["track"]
    for i in range(total):
        index = start + i
        if index >= len(buffer):
            break
        t = i / SAMPLE_RATE
        env = envelope(t, duration)
        if track == "bass":
            sample = math.sin(2 * math.pi * freq * t) * 0.75
            sample += math.sin(2 * math.pi * freq * 2 * t) * 0.18
        elif track == "pad":
            sample = math.sin(2 * math.pi * freq * t) * 0.45
            sample += math.sin(2 * math.pi * (freq * 1.005) * t) * 0.35
        else:
            sample = math.sin(2 * math.pi * freq * t)
            sample += 0.28 * math.sin(2 * math.pi * freq * 2.01 * t)
        buffer[index] += sample * env * amplitude


def synth_drum(buffer: list[float], event: dict, tempo: int, rng: random.Random) -> None:
    seconds_per_beat = 60.0 / tempo
    start = int(event["start"] * seconds_per_beat * SAMPLE_RATE)
    pitch = event["pitch"]
    duration = 0.18 if pitch == 36 else 0.11
    total = int(duration * SAMPLE_RATE)
    amp = event["velocity"] / 127.0
    for i in range(total):
        index = start + i
        if index >= len(buffer):
            break
        t = i / SAMPLE_RATE
        env = math.exp(-t * (18 if pitch == 36 else 32))
        if pitch == 36:
            freq = 78 - 32 * min(1, t / duration)
            sample = math.sin(2 * math.pi * freq * t)
        elif pitch == 38:
            sample = (rng.random() * 2 - 1) * 0.8 + math.sin(2 * math.pi * 180 * t) * 0.25
        else:
            sample = rng.random() * 2 - 1
            env = math.exp(-t * 85)
        buffer[index] += sample * env * amp * 0.55


def render_wav(events: list[dict], tempo: int, path: Path) -> None:
    end_beat = max(event["start"] + event["duration"] for event in events) + 2
    total_samples = int(end_beat * (60.0 / tempo) * SAMPLE_RATE)
    buffer = [0.0 for _ in range(total_samples)]
    rng = random.Random(999)
    gains = {"lead": 0.24, "bass": 0.30, "pad": 0.13}

    for event in events:
        if event["track"] == "drums":
            synth_drum(buffer, event, tempo, rng)
        else:
            synth_note(buffer, event, tempo, gains.get(event["track"], 0.18))

    delay_samples = int(0.23 * SAMPLE_RATE)
    for i in range(delay_samples, len(buffer)):
        buffer[i] += buffer[i - delay_samples] * 0.16

    peak = max(0.001, max(abs(sample) for sample in buffer))
    scale = 0.88 / peak
    pcm = bytearray()
    for sample in buffer:
        value = int(max(-1.0, min(1.0, sample * scale)) * 32767)
        pcm.extend(struct.pack("<h", value))

    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(bytes(pcm))


def generate_all() -> list[tuple[Path, Path]]:
    ensure_dirs()
    outputs: list[tuple[Path, Path]] = []
    for spec in VARIATIONS:
        events = compose(spec)
        midi_path = MIDI_DIR / f"{spec.slug}.mid"
        wav_path = AUDIO_DIR / f"{spec.slug}.wav"
        write_midi(events, spec.tempo, midi_path)
        render_wav(events, spec.tempo, wav_path)
        outputs.append((midi_path, wav_path))
    return outputs


def main() -> None:
    outputs = generate_all()
    for midi_path, wav_path in outputs:
        print(f"created {midi_path.relative_to(ROOT)}")
        print(f"created {wav_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
