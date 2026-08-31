# RCVD Simulator

An interactive study environment for **Race Car Vehicle Dynamics** (Milliken &
Milliken, SAE 1995), built around the 23-chapter course notes in `docs/`.

Every chapter renders its notes with the mathematics typeset. Chapters with a
**Lab** add an interactive model: move a parameter, watch every dependent
quantity move with it.

## Status

| Chapter | Lab | What it does |
|---|---|---|
| 2 — Tire Behavior | ✅ | Magic Formula and brush models, load sensitivity, axle capacity under load transfer, pneumatic trail collapse, friction ellipse |
| 5 — Steady-State Stability and Control | ✅ | Understeer gradient and Bundorf compliances, constant-radius skid pad, response gains vs speed, significant speeds, stability derivatives, understeer budget |
| 6 — Transient Stability and Control | ✅ | Step steer response, modal parameters vs speed, root locus, frequency response |
| All others | — | Notes render; labs to follow |

Phase 2 (iRacing telemetry) has its data model, analysis and tests in place —
see [Telemetry](#telemetry-phase-2) — but no simulator connection yet.

## The garage

One car and one tire set are carried through every chapter, which is the study
method the course overview recommends: *"carry a specific car and a specific
problem through it ... at each chapter compute that car's numbers."* A change
made in the Ch 2 tire lab is visible in the Ch 5 understeer gradient
immediately.

The app starts self-consistent: the linear model's axle cornering stiffnesses
`Cf` and `Cr` are the ones the tire set actually produces at the car's static
loads. Edit them by hand and they will drift apart; the Ch 5 lab warns you when
they have, because at that point the linear and nonlinear curves are describing
two different cars. **Set Cf, Cr from the Ch 2 tires** re-synchronises them.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Develop the labs in a plain browser, without launching Electron:

```bash
npm run dev:web
```

Run the physics tests:

```bash
npm test
```

Smoke-test the built desktop app end to end — preload bridge, IPC, all three
labs, and the notes renderer, in a real Electron window:

```bash
npm run smoke
```

Build a Windows installer into `release/`:

```bash
npm run dist
```

## Layout

```
src/
  core/            pure physics, no UI imports, fully unit-tested
    tire/          Magic Formula, brush/Fiala, load sensitivity, size scaling
    vehicle/       bicycle model: steady state (Ch 5), transient (Ch 6)
    util/          numerics — RK4, root finding, eigenvalues
  telemetry/       Phase 2 data model, identification, synthetic source
  renderer/        React UI — labs, charts, notes viewer
  main/, preload/  Electron shell
docs/              the 23-chapter course notes
```

`src/core` has no dependency on React or Electron. It is a vehicle dynamics
library that happens to have an app attached, and can be used from a script or
a notebook on its own.

## Correctness

The physics is checked against the worked solutions in the course notes. Where
a chapter quotes a number, that number is the assertion:

- **Ex 2.1** — brush model: full-slide angle 11.8°, 2698 N at 2° of slip
- **Ex 2.2 / 2.6** — load sensitivity: 225 N axle loss at 1500 N of transfer,
  and the closed form `2cΔ²`, independent of nominal load, quadratic in transfer
- **Ex 2.3** — friction ellipse: 3600 N lateral remaining while braking at 60%
- **Ex 2.5 / 6.7** — relaxation lag: τ = 12.5 ms and t₉₅ = 3τ at 40 m/s
- **Ex 6.1** — understeer gradient K = 0.01125 rad/g
- **Ex 6.4** — 12.6% overshoot and 0.72 s settling at ζ = 0.55
- **Ex 6.5** — critical speed 44.3 m/s

The load-bearing tests are the cross-chapter ones, because they are what catch
a sign error — the failure mode Ch 4 warns is the most common in the subject:

- the Ch 6 step response settles onto the Ch 5 steady-state gains exactly
- the closed-form ω\_n and ζ agree with the eigenvalues of the state matrix
- ω\_n → 0 at the same speed the Ch 5 stability factor reaches zero
- the low-frequency limit of the frequency response equals the steady-state gain

`npm run smoke` covers what unit tests cannot: it launches the compiled main
process, checks the preload bridge and IPC (including that path traversal is
refused), walks all three labs confirming curves and readouts render without
`NaN`, and checks the notes typeset — 11 checks in a real Electron window.

## Telemetry (Phase 2)

`src/telemetry` defines the data model in RCVD's vocabulary and SI units, so
that analysis is written once and adapters translate into it. Three sources are
planned:

- **live** — iRacing shared memory (`Local\IRSDKMemMapFileName`) at 60 Hz
- **file** — `.ibt` session files, for post-session analysis
- **synthetic** — generated from the app's own vehicle model

Only `synthetic` exists, and deliberately so: it makes the analysis testable
before any simulator plumbing exists. `identifyUndersteerGradient` regresses

```
delta − L·r/V  =  K·Ay
```

over lap data — the skid-pad method of Ch 5 §4 and Ch 11, freed of the
constant-radius requirement — and recovers the exact K of a known car from
synthetic data, to within 5% with noise added. When real iRacing data arrives,
the open question will be the adapter, not the analysis.

## A note on sign conventions

Ch 2 §9: *"the single most common source of error in vehicle dynamics work is
inconsistent sign convention."* This codebase uses the practitioner convention
throughout, stated at the top of `src/core/tire/types.ts`: vertical load
positive in compression, and positive slip angle producing positive lateral
force. Strict SAE flips both.

## Source material

The `docs/` notes are original explanatory material written to accompany
Milliken & Milliken and reproduce none of the book's content. The book itself
remains the reference; this is a companion, not a substitute.
