# Melody Generator

`Melody Generator` is a repeatable generative music demo and final-project package. It creates short musical studies using deterministic randomness, Euclidean rhythms, Markov-style melodic motion, layered synth parts, MIDI export, and audio rendering.

The project is designed to be both submit-ready and easy to present: it includes a browser demo, a Jupyter notebook, generated MIDI files, generated audio files, written analysis, creative sketches, and a final project proposal.

## Project Concept

The central idea is to make music that feels partly mechanical and partly organic. The rhythmic layers behave like repeating machines, while the melody drifts through controlled random choices. A fixed seed makes the output repeatable, so the same settings always rebuild the same musical result.

The project includes three generated takes:

- `Slow` - slower tempo, lower register, more atmospheric.
- `Medium` - medium tempo, balanced rhythm, clear melodic contour.
- `Fast` - faster tempo, denser rhythm, and more active percussion.

## How The Demo Works

Open the browser demo:

```text
demo/index.html
```

The demo lets you choose a take, change the seed, adjust tempo, adjust density, and press play. It draws the generated music as a piano-roll grid and plays it using the browser's Web Audio API.

Repeatability is shown with the `Signature` value. If the take, seed, tempo, and density stay the same, pressing `Rebuild` produces the same signature and the same note pattern. If you change the seed or density, the signature changes because the generated event list changes.

## Generation Method

The generator creates a list of musical events. Each event stores:

```text
track, start time, duration, pitch, velocity
```

The main techniques are:

- **Seeded randomness**: makes random choices repeatable.
- **Euclidean rhythm**: distributes note attacks evenly across a step grid.
- **Markov-style melody**: chooses the next note based on the current note, usually moving by step with occasional leaps.
- **Modal pitch material**: uses D Dorian as the main scale.
- **Layered arrangement**: combines lead, bass, pad, kick, snare, and hi-hat parts.
- **Simple synthesis**: renders browser audio live and creates WAV files from Python.

## File Guide

- `demo/index.html` - interactive browser demo.
- `demo/app.js` - browser-side music generation, visualization, and playback.
- `demo/styles.css` - demo layout and visual design.
- `demo_notes.md` - short one-minute presentation flow.
- `music_generation_notebook.ipynb` - notebook version of the generation process.
- `scripts/generate_variations.py` - pure-Python generator for MIDI and WAV outputs.
- `output/midi/` - three generated MIDI files.
- `output/audio/` - three generated WAV audio renders.
- `written_analysis.md` - critique and comparison of the generated pieces.
- `final_project_proposal.md` - one-page final project proposal.
- `sketches/creative_sketches.md` - early algorithm sketches and pseudocode.

## Run The Browser Demo

No installation is required. Open this file directly in a browser:

```text
project/demo/index.html
```

Suggested presentation flow:

1. Press `Play` on `Slow`.
2. Point out the seed and signature.
3. Press `Rebuild` or `Same seed` to show that the signature stays the same.
4. Change the seed or density to show a new generated result.
5. Switch to `Medium` or `Fast` to compare musical character.

## Deploy To Render

This is a static site, so it should be deployed on Render as a `Static Site`, not a web service.

Recommended Render settings:

```text
Service Type: Static Site
Root Directory: project
Build Command: leave blank, or use echo "No build needed"
Publish Directory: .
```

After deployment, the Render URL will open `project/index.html`, which redirects to `demo/index.html`.

## Regenerate MIDI And Audio

Run this from the `project` folder:

```bash
python3 scripts/generate_variations.py
```

The script uses only the Python standard library. It writes MIDI files into `output/midi/` and WAV audio renders into `output/audio/`.

## Submission Checklist

- Music generation notebook: `music_generation_notebook.ipynb`
- Three MIDI files: `output/midi/`
- Three audio renders: `output/audio/`
- Written analysis: `written_analysis.md`
- Final project proposal: `final_project_proposal.md`
- Showable repeatable demo: `demo/index.html`

## Short Description For Presentation

`Melody Generator` is a generative music system that turns deterministic rules into repeatable musical output. A seed controls the randomness, Euclidean rhythms create the pulse, Markov-style choices shape the melody, and the browser displays the generated notes while playing them live.
