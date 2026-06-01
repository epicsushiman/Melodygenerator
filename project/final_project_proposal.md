# Final Project Proposal: Melody Generator

## 1. Title, Objectives, And Motivation

**Melody Generator** is a 3-5 minute generative audio work built from repeating rhythmic cycles, slowly shifting modal harmony, and algorithmic melodic decisions. My objective is to create music that feels partly mechanical and partly organic: pulse patterns behave like clockwork, while melodies drift as if they are responding to weather, memory, or breath. I am motivated by the contrast between minimalist process music and more atmospheric electronic composition, especially the way a small rule can create a large emotional space. Creative influences include Brian Eno's generative ambient practice, Steve Reich's phase-based repetition, Laurie Spiegel's algorithmic composition work, and Aphex Twin's balance of pattern, texture, and surprise.

## 2. Creative Development Sketches

The first sketch uses Euclidean rhythm to distribute attacks across a 16-step grid, creating uneven but balanced pulse patterns. The second sketch uses a Markov-style melody generator that prefers stepwise motion but occasionally permits leaps, so the line sounds intentional without becoming predictable. The third sketch layers a slow drone/pad under bass and percussion, then varies density, tempo, and register across three generated versions: `Glass Tide`, `Clockwork Rain`, and `Low Moon`. Early materials are documented in `sketches/creative_sketches.md`, with generated MIDI files in `output/midi/` and audio renders in `output/audio/`.

## 3. Materials, Methods, And Tools

The project will use Python and Jupyter/Colab as the main development environment. The current generator uses only the Python standard library, including custom MIDI writing and a simple WAV renderer, which makes the process transparent and portable. Musical materials include selectable key and mode collections, Euclidean rhythm patterns, seeded random choices, and layered synthetic timbres. The notebook will document the algorithm and allow future edits to tempo, scale, rhythm density, seed values, and arrangement length.

## 4. References And Influences

- Brian Eno, generative ambient systems and *Music for Airports*.
- Steve Reich, phase/process composition, especially *Music for 18 Musicians*.
- Laurie Spiegel, algorithmic composition and *The Expanding Universe*.
- Godfried Toussaint, Euclidean rhythm as a model for distributed musical pulses.
- Python `wave` and MIDI file format documentation for rendering and export.

## 5. Challenges And Next Steps

The main challenge is shaping generated output so that it feels composed instead of simply randomized. I will need to refine transitions, improve timbral variety, and choose the strongest generated takes for the final 3-5 minute version. My next steps are to expand the arrangement length, add automation-like changes in density and register, test the MIDI in a DAW or notation program, and revise the audio render for clearer mix balance.
