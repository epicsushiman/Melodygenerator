# Melody Generator Presentation Script

## Opening

Hi everyone, my project is called **Melody Generator**. It is a web-based generative music demo that creates short musical patterns using a combination of rules and controlled randomness.

The main goal of the project is to make something that is both creative and repeatable. Instead of generating a completely random melody every time, the app uses a seed number. That means the same settings will always produce the same musical result.

## What The App Does

On the left side, there are controls for the generated piece. I can choose between `Slow`, `Medium`, and `Fast`, change the seed, adjust the tempo, and increase or decrease the density.

In the center, the app shows a piano-roll style visualization. Each colored block represents a musical event, such as a melody note, bass note, pad note, or drum hit.

On the bottom, there is a signature value. This signature is important because it proves repeatability. If I keep the same settings and rebuild the pattern, the signature stays the same.

## Demo Step 1: Play A Preset

First, I will play the `Slow` version.

**Demo cue:** Press `Play`.

This version is slower and lower in register, so it has a more atmospheric feeling. The melody has space between notes, and the bass and pad sounds create a slower texture.

## Demo Step 2: Show Repeatability

Now I will press `Rebuild` without changing the seed or settings.

**Demo cue:** Press `Rebuild`.

The visual pattern stays the same, and the signature stays the same. This shows that the app is not just randomly changing every time. It is using deterministic randomness, meaning the random choices are controlled by the seed.

## Demo Step 3: Change The Seed

Next, I will change the seed.

**Demo cue:** Press `New seed`.

Now the signature changes, and the note pattern changes too. The overall style is still connected to the selected preset, but the exact melody and rhythm choices are different.

## Demo Step 4: Compare Slow, Medium, And Fast

Now I will switch between the three versions.

**Demo cue:** Select `Medium`, then press `Play`.

The `Medium` version is more balanced. It has a clearer pulse and a melody that feels more centered.

**Demo cue:** Select `Fast`, then press `Play`.

The `Fast` version is denser and more energetic. More notes happen in a shorter amount of time, and the percussion feels more active.

## How It Works

The app uses several generative techniques. First, it uses **Euclidean rhythm**, which distributes notes across a beat grid. This creates patterns that feel organized but not completely predictable.

Second, it uses a **Markov-style melody system**. The melody usually moves to nearby notes, but sometimes it jumps. This makes the melody feel more musical than choosing random pitches with no memory.

Third, it uses **seeded randomness**. The seed controls the random choices, so the same seed always creates the same result.

The app is built with plain HTML, CSS, and JavaScript. The visual grid uses the browser canvas, and the sound is played live using the Web Audio API. The project also includes Python code that generates MIDI files and WAV audio renders.

## Closing

Overall, Melody Generator explores how a small set of rules can create different musical outcomes. The `Slow`, `Medium`, and `Fast` versions show how changes in tempo, density, and register can make the same system feel atmospheric, balanced, or energetic.

My next step would be to expand the generator into a longer 3-5 minute piece with a clearer musical form, so the system can move from an opening texture to a more developed climax.
