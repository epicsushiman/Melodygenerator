# Creative Development Sketches

## Sketch 1: Euclidean Pulse Grid

Goal: create rhythms that are repetitive but slightly asymmetrical.

```text
steps = 16
pulses = 5
pattern = distribute 5 hits as evenly as possible across 16 slots
result example = x..x..x...x..x..
```

This sketch becomes the basis for the melody and percussion layers. By changing `pulses`, the same grid can feel sparse, flowing, or busy.

## Sketch 2: Markov Melody

Goal: make a melody that tends to move by step, with occasional wider intervals.

```text
current_degree = 4
possible_moves = [-3, -2, -1, 0, +1, +2, +3, +5]
weights favor -1, 0, and +1
next_degree = clamp(current_degree + weighted_choice(possible_moves))
pitch = selected_mode[next_degree] + selected_key
```

This sketch helps avoid fully random note selection. The melody has a memory of where it was, which gives each line a contour.

## Sketch 3: Three Takes From One System

Goal: generate three related but distinct versions from the same algorithm.

```text
Glass Tide       tempo 84,  balanced rhythm, middle register
Clockwork Rain   tempo 104, denser rhythm, higher register
Low Moon         tempo 72,  sparse rhythm, lower register
```

The final project can compare these takes and then combine the strongest features into a longer 3-5 minute version.
