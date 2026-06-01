# Demo Notes: Melody Generator

## One-Minute Flow

1. Open `demo/index.html`.
2. Press `Play` on `Glass Tide`.
3. Point to the signature value and seed number.
4. Press `Same seed` or `Rebuild`; the signature stays the same.
5. Change the key, mode, seed, or density; the signature, note grid, and sound change.
6. Press `Export WAV` to download the current generated result.
7. Switch to `Clockwork Rain` or `Low Moon` to show that the same system can create different musical characters.

## Talking Points

- The demo is repeatable because the generator uses fixed seed values.
- The visible grid is a piano-roll view of notes and drum events.
- The pulse row shows the Euclidean rhythm pattern used by the melody.
- The generated WAV files are available in the right panel as backup audio renders.
- The Python notebook and browser demo use the same musical idea: deterministic rules plus controlled randomness.
