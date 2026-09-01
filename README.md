# RCVD Simulator

An interactive study environment for **Race Car Vehicle Dynamics** (Milliken &
Milliken, SAE 1995), built around the 23-chapter course notes in `docs/`.

Every chapter renders its notes with the mathematics typeset. Chapters with a
**Lab** add an interactive model: move a parameter, watch every dependent
quantity move with it.

## Status

| Chapter | Lab | What it does |
|---|---|---|
| **Start here — How a Car Corners** | ✅ | Top-down cornering diagram: the slip angle at each axle drawn as an actual wedge, a plain-language verdict, and five guided experiments |
| **Start here — Changing Conditions** | ✅ | Fuel, wear, temperature, pressure and track grip applied to the car; A/B compare against a frozen baseline, a stint timeline, and a sensitivity ranking |
| **The Formulas** | ✅ | 15 key equations, each rendered live, substituted with your numbers, decomposed into terms, and swept on a chart |
| **Glossary · Glossário** | ✅ | 213 terms in English and Brazilian Portuguese, searchable in either language, accent-insensitive, flagging the terms Brazilian motorsport keeps in English |
| **Exercises** (every chapter) | ✅ | The notes' ~140 exercises, one at a time, solutions withheld until asked for, progress remembered |
| 2 — Tire Behavior | ✅ | **Contact-patch view** (adhesion vs sliding), Magic Formula and brush models, load sensitivity, axle capacity under load transfer, pneumatic trail collapse, friction ellipse |
| 5 — Steady-State Stability and Control | ✅ | Understeer gradient and Bundorf compliances, constant-radius skid pad, response gains vs speed, significant speeds, stability derivatives, understeer budget |
| **3 / 15 — Aerodynamics** | ✅ | Downforce and drag vs speed, altitude correction, aero balance, and the cornering limit becoming speed-dependent |
| **9 — The g-g Diagram** | ✅ | The solved performance envelope, the g-g-V surface, and capability-versus-usage with the Ch 9 §4 driving-style patterns |
| **7 — Steady-State Pair Analysis** | ✅ | Axle characteristics at real wheel loads, TLLTD sweep, corner-phase (braking/mid/power), and what load transfer costs |
| 6 — Transient Stability and Control | ✅ | **Animated step-steer path** (heading vs course), step response, modal parameters vs speed, root locus, frequency response |
| **18 — Wheel Loads** | ✅ | Four-corner load diagram, the three-way transfer split (geometric/elastic/unsprung), TLLTD, roll gradient, longitudinal transfer |
| All others | — | Notes render; labs to follow |

Phase 2 (iRacing telemetry) has its data model, analysis and tests in place —
see [Telemetry](#telemetry-phase-2) — but no simulator connection yet.

## The idea the app is built around

A tyre makes lateral force **only by slipping** — by pointing slightly away from
the direction it is actually travelling. Understeer and oversteer are nothing
more than *which axle is slipping more*.

**Start here** draws exactly that: the car from above, with the angle between
where each wheel points and where it is actually going shaded in. Front wedge
bigger than rear is understeer. That is the whole definition, and it takes one
look rather than a paragraph.

Real slip angles are only a few degrees, so every angle in the diagram is drawn
multiplied by an exaggeration factor — auto-scaled by default and always shown
on screen. Because every angle uses the *same* factor the construction stays
exact: the wedges still add up to `δ = L/R + (αf − αr)`.

## The three pictures

Each of the three built chapters has one diagram that carries its central idea,
so the charts have something concrete to be *about*.

**Start here — the car in a corner.** The wedge at each axle is the slip angle.
Front bigger than rear is understeer. That is the whole definition.

**Chapter 2 — inside the contact patch.** Bristles enter at the leading edge
and deflect linearly, so shear rises as a straight line; the friction available
follows the parabolic pressure distribution. Where the line meets the parabola,
rubber lets go. One picture explains three things at once: why the force curve
peaks where it does (the sliding zone has eaten the whole patch), why pneumatic
trail exists (the shear distribution is lopsided toward the rear), and why
steering torque warns of the front limit (the centroid moves forward as the
sliding zone grows). Sweeping slip angle on the default tyre:

| Slip | Patch sliding | Force | Trail | Aligning torque |
|---|---|---|---|---|
| 0.5° | 6% | 1.02 kN | 23.6 mm | 24 N·m |
| 3° | 35% | 4.49 kN | 10.7 mm | **48 N·m** |
| 7° | 82% | **6.16 kN** | 0.4 mm | 3 N·m |
| 12° | 100% | 6.20 kN | 0.0 mm | 0 N·m |

Torque peaks at 3° and has collapsed by 7° — while force is still climbing.

**Chapter 6 — where the car actually goes.** A replayable step steer with two
arrows leaving the car: where it is *pointing* and where it is *going*. They
separate immediately, because steer makes a yaw moment at once but the path
only bends once the rear axle builds slip. Above the tangent speed the gap even
changes sign partway through: the nose swings from outside the corner to inside
it during a single input.

## Changing conditions

Nothing about a car stays still, so this page moves the world and shows the car
responding. Named scenarios, each producing a genuinely different car:

| Preset | Limit Ay | Limit balance | Understeer gradient | Gives up first |
|---|---|---|---|---|
| Qualifying | 1.74 g | +0.225 | +0.174 | front |
| Optimum | 1.66 g | +0.213 | +0.174 | front |
| End of a long stint | 1.41 g | +0.031 | +0.186 | front |
| Overheated rears | 1.26 g | **−0.391** | +0.245 | **rear** |
| Out-lap, cold tyres | 1.21 g | +0.095 | +0.180 | front |
| Wet | 0.93 g | +0.103 | +0.174 | front |

**Two balance numbers are shown everywhere, on purpose.** The understeer
gradient is balance in the linear range; limit balance is how much grip the rear
has in hand over the front — which end gives up first. They are different
quantities and can move in opposite directions:

- *Wet* leaves the gradient **completely unchanged** and collapses the limit. A
  uniform grip change scales both axles alike, so the car is slower but not
  differently balanced.
- *Overheated rears* raises the gradient (more understeer at low g) while driving
  limit balance strongly negative. That is a driver reporting "it pushes into the
  corner then snaps on exit" — one car, both complaints, both true.
- Worn tyres do the same thing: less tread means less squirm and so more
  cornering stiffness, while degraded rubber means less peak grip.

Three views: **Compare** (freeze a baseline, change one thing, read the
difference — Ch 11's A-B-A protocol), **Stint** (lap-by-lap drift as fuel burns
and tyres wear, with the two effects fighting so the fastest lap lands in the
middle), and **What matters** (a sensitivity ranking that reorders when you
switch the metric: track grip tops outright grip and is near the bottom for
balance).

### What this model does and does not capture

Fuel is exact statics — mass, CG and yaw inertia by the parallel axis theorem.
Temperature, pressure and wear are **engineering parameterisations**: Ch 2 §8
states their direction and importance but supplies no curves, so the shapes here
honour the text's claims, are adjustable, and are labelled as such in the app.

Conditions are evaluated through **Ch 7 pair analysis** with real wheel loads,
so mass now costs lateral grip properly — roughly twice what it did before load
transfer existed, because heavier means more transfer and the capacity loss goes
as its square.

## Aerodynamics — Ch 3 and 15

The change that reorganises everything else: **grip stops being a property of
the car and becomes a property of the car at a speed.** Downforce adds vertical
load without adding mass, so capacity rises while demand does not, and the
cornering limit climbs with V².

The integration point is deliberately narrow — the aero module turns speed into
an extra vertical load per axle, and `wheelLoads` accepts it. Pair analysis,
limits, balance and the conditions model then all become speed-dependent without
knowing anything about aerodynamics.

Ch 3's worked exercises are reproduced: standard and altitude air density,
dynamic pressure, Exercise 3.5's 105.4 m/s corner, and Exercise 3.6's coastdown
fit of C_D A = 2.39 m².

**The singularity is an artefact, and the app shows why.** Exercise 3.5's closed
form assumes one fixed μ, so past a critical C_L A its denominator turns
negative and the answer runs away to infinity. Real tyres are load-sensitive:
each extra newton of download buys less grip than the last. The simulator
therefore always returns a finite, diminishing-return answer, and reads *below*
the closed form. The lab puts both numbers side by side.

## The g-g diagram — Ch 9

The envelope is **solved, not drawn**. Every boundary point comes from pair
analysis at that longitudinal state, with downforce at that speed, so the four
departures from a circle Ch 9 §2 lists appear on their own rather than being
sketched in: braking beats acceleration, acceleration crosses from
traction-limited to power-limited, the accelerating quadrants are narrower
because only the driven axle pays for traction, and the whole envelope grows
with speed.

The usage overlay generates the Ch 9 §4 patterns so they can be recognised
rather than described — the amateur "notch" between braking and cornering scores
9% of the envelope where a blended lap scores 70%+. The traces are synthesised
and labelled as such; the same overlay takes real telemetry unchanged.

## Load transfer — Ch 18 and Ch 7

The chapter pair that makes everything else bite.

**Ch 18 — Wheel Loads.** Total lateral transfer is *fixed* by mass, lateral
acceleration, CG height and track. Its *distribution* is free, and that is the
whole of balance tuning. The lab shows each contact patch with area proportional
to load against a static reference ring, and splits each axle's transfer into the
three paths of §5 — geometric through the links, elastic through the springs and
bars, unsprung at the wheel centre. Turning a bar visibly moves the split while
the total readout does not budge.

Exercise 18.2 is reproduced in full — every intermediate quantity, not just the
answer:

| | Geometric | Elastic | Unsprung | Total |
|---|---|---|---|---|
| Front | 117.9 N | 908.7 N | 136.7 N | **1163.3 N** |
| Rear | 252.2 N | 784.7 N | 136.7 N | **1173.6 N** |

giving TLLTD = 49.8% front, and summing to 2336.9 N — Exercise 18.3's check.

One correction to the book's form: that force sum holds only when the front and
rear tracks are **equal**. Each axle's transfer acts across its own track, so the
exact invariant is on moments —

```
dFzf·tf + dFzr·tr = W·Ay·h
```

— which holds for any pair of tracks. Both are provided; the tests use the
moment form on a car with staggered tracks and the book's force form on
Exercise 18.3's square-track car.

**Ch 7 — Pair Analysis.** Each wheel gets its own load, and an axle
characteristic is the sum of two tyres working at *different* loads. Because
force is concave in load, that asymmetry costs capacity — quadratically. The
TLLTD sweep is the centrepiece: moving the bars front to rear swings balance
across its whole range while total grip moves by one or two percent. Bars
redistribute; they do not reduce.

### What a bar cannot fix

The default car turned out to be a good lesson. Its bars move limit balance by
0.057 g across their entire range, but the rear has 0.22 g of grip in hand — so
**no bar setting makes it neutral.** That is not a modelling failure, it is
Ch 12's primary/secondary hierarchy: a grip difference between axles (compound,
size, pressure, temperature, wear) is a *primary* effect that bars cannot undo.
Bars are a secondary trim around a car that is already roughly right. The lab
says so, quantifies the gap, and has an experiment that equalises the tyres and
shows the bars reaching neutral once they can.

## The formulas, made playable

The animations build intuition; this is where it lands as mathematics.
Each of 15 equations is shown three ways at once —

1. **the formula**, typeset;
2. **the same formula with your numbers written in**, e.g.
   `K = 3318/143564 − 3548/157500`;
3. **the answer**.

Then a chart sweeps one variable, so you see the *shape* of the relationship
rather than a single point on it. Click any symbol to move it onto the x-axis.
Where a formula is naturally a sum or a difference its terms are broken out,
because "why is it this value" usually means "which term is winning" — the
understeer gradient makes the point on its own: **K = 0.0335 is the difference
of 1.3242 and 1.2907**, two large numbers nearly cancelling. That is why balance
is delicate.

A sensitivity bar answers the other question — of these variables, at *these*
values, which one is actually driving the answer.

**It cannot drift from the simulator.** Restating an equation in a playground
creates a second implementation, so every formula that has a counterpart in the
models is tested against it: the catalogue's understeer gradient must equal
`summarise()`, its natural frequency must equal `modal()`, its load transfer
must equal `totalLateralTransfer()`. If a model changes and the playground does
not, the suite goes red rather than quietly teaching the wrong thing.

## Glossary — English ⇄ Português (BR)

[`docs/glossary.md`](docs/glossary.md) carries 213 terms across ten topic
sections, with the book's symbols and short notes. The app parses that same
file — the markdown stays the single source of truth — and puts search in front
of it: type in either language, accents optional, so `angulo de deriva` and
`slip angle` find the same row.

Two things it does that a plain word list would not:

- **Flags the terms Brazilian motorsport keeps in English.** *Setup*, *grip*,
  *downforce*, *bump steer*, *stint* and about forty others are marked **EN**.
  The Portuguese is given anyway, because that is what written engineering work
  needs even when nobody says it in the paddock.
- **Calls out the false friends.** *Slip angle* and *sideslip angle* both
  collapse to "ângulo de deriva" if you are careless — the glossary keeps them
  apart as *do pneu* (α) and *do veículo* (β). Likewise roll vs rolling, scrub
  radius vs roll centre, spring **rate** vs installation **ratio**, and damper
  "speed" which is the damper's, not the car's.

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
    vehicle/       bicycle model (Ch 5, 6), wheel loads (Ch 18), pair analysis (Ch 7)
    conditions/    fuel, wear, temperature, pressure, track grip
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
- **Ex 18.2** — the full three-mass chain: sprung split 3105/3795 N, roll axis at
  0.0565 m, H = 0.2585 m, all six transfer contributions, TLLTD 49.8%
- **Ex 18.3** — the contributions sum to the static total, 2336.9 N

The contact-patch model is integrated with Simpson's rule, which is exact for
its piecewise-linear-and-quadratic integrand, so it reproduces the closed-form
brush force and aligning torque to round-off rather than to grid resolution.
Exercise parsing is tested against all 23 real chapter documents rather than a
fixture — every exercise must pair with its solution.

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
