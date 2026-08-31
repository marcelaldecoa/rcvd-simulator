# Race Car Vehicle Dynamics — A Complete Study Course

**Companion study notes to Milliken & Milliken, *Race Car Vehicle Dynamics* (SAE, 1995)**

*This is original explanatory material written to accompany the text. It follows the book's chapter organization but reproduces none of its content. Each chapter document expands the concepts in independent language, adds worked mathematics in LaTeX, and provides exercises with fully worked solutions.*

---

## 1. What this course is

Twenty-three chapter documents plus this overview, covering the whole of *Race Car Vehicle Dynamics*. Each chapter document contains:

- **Expanded explanation** of the chapter's concepts, in prose, with the physics developed rather than asserted
- **Mathematics in LaTeX**, with derivations where the derivation is the point
- **Practical race-engineering interpretation** — what each result means at a race weekend
- **5–8 exercises**, numerical where possible
- **Fully worked solutions**, including the engineering interpretation of each answer

The exercises are the load-bearing part. Vehicle dynamics is a subject in which the equations are easy to read and hard to use; the solutions are written to show not just the arithmetic but what the number *means* and what you would do about it.

---

## 2. Why this book, and what makes it distinctive

*Race Car Vehicle Dynamics* is the standard reference in its field, and its character comes from a specific intellectual lineage. William F. Milliken spent decades in aircraft stability and control at Cornell Aeronautical Laboratory (later Calspan) before applying that apparatus to automobiles. The consequence is visible throughout: body-axis equations of motion, stability derivatives, neutral point and static margin, modal analysis with natural frequency and damping ratio, the V-n diagram reborn as the g-g diagram, and formal instrumented test methodology.

What did **not** transfer was the tire. An aircraft's wing operates linearly below the stall; a race tire operates permanently at its limit, is strongly nonlinear, and is load-sensitive in a way that generates most of the practical content of race car engineering. The book's original contribution — the **MRA Moment Method** of Chapter 8 — exists precisely because aeronautical linear stability theory is insufficient for a machine that never leaves the nonlinear region.

The book's pedagogical position, repeated throughout, is worth stating up front: **use the simplest model that contains the effect you are studying.** The bicycle model of Chapter 5 remains the right first tool for a handling question, and no amount of multibody simulation capability changes that.

---

## 3. Course structure

The book divides into two parts with genuinely different purposes.

**Part I (Chapters 1–13) builds a theory of the vehicle.** It treats the car as a rigid body with force generators, and develops the vocabulary and analytical machinery of handling. Suspension hardware barely appears.

**Part II (Chapters 14–23) builds the subsystems.** Each chapter takes one physical system — tires, aerodynamics, springs, geometry, steering, brakes, dampers — and develops it in engineering detail, feeding numbers back into the Part I framework.

The logic connecting them:

```
FORCE GENERATION          Ch 2  Tires          Ch 3, 15  Aerodynamics
        ↓
BOOKKEEPING               Ch 4  Axis systems
        ↓
VEHICLE RESPONSE          Ch 5  Steady state   Ch 6  Transient
        ↓
NONLINEAR LIMIT           Ch 7  Pair analysis  Ch 8  Moment Method
        ↓
PERFORMANCE               Ch 9  g-g diagram, lap simulation
        ↓
PRACTICE                  Ch 10 Design  Ch 11 Testing  Ch 12 Setup
        ↓
SUBSYSTEM DETAIL          Ch 14, 16–23
```

---

## 4. Chapter-by-chapter summary

### Part I — Fundamentals

**Chapter 1 — The Problem Imposed by Racing** *(`ch01-problem-imposed-by-racing.md`)*
States the objective function: minimize $\oint ds/V(s)$ subject to rules and reliability. Establishes that time is most sensitive to speed where speed is lowest, that longitudinal and lateral capability compete for one friction budget, and that the system under study is driver-plus-vehicle, not vehicle alone. Introduces the argument that runs through the whole book — **usable performance is capability multiplied by predictability.**

**Chapter 2 — Tire Behavior** *(`ch02-tire-behavior.md`)*
The most important chapter in the book. Slip angle, the brush/Fiala model and where the force curve's shape comes from, the Magic Formula, and — critically — **load sensitivity**, from which the entire practice of balance tuning follows. Pneumatic trail and its collapse near the limit, which is the driver's front-limit warning. Slip ratio, the friction ellipse, camber, relaxation length, and the SAE tire axis system.

**Chapter 3 — Aerodynamic Fundamentals** *(`ch03-aerodynamic-fundamentals.md`)*
Air properties and altitude correction, Bernoulli's equation and the conditions under which it fails, d'Alembert's paradox, pressure coefficient, Reynolds number, boundary layers and separation. Testing methods: tunnel with moving ground, CFD, track, coastdown. SAE aerodynamic axes and coefficients.

**Chapter 4 — Vehicle Axis Systems** *(`ch04-vehicle-axis-systems.md`)*
The chapter everyone skips and shouldn't. Earth versus body axes, the rotating-frame equations with their transport terms ($A_y = Vr$ is the workhorse), six-DOF form, dynamic index, sideslip angle, Euler angles, and a sustained argument for sign-convention discipline. **Most vehicle dynamics errors are frame errors, not physics errors.**

**Chapter 5 — Simplified Steady-State Stability and Control** *(`ch05-steady-state-stability-and-control.md`)*
The intellectual centre of Part I. Ackermann geometry, the steady-state cornering equation $\delta = L/R + KA_y$, the understeer gradient $K = W_f/C_f - W_r/C_r$, the **Bundorf cornering compliances and the understeer budget** that decomposes them by mechanism, characteristic, critical and tangent speeds, all response gains and their shared stability-factor denominator, stability derivatives, and the neutral steer point / static margin construction imported from aircraft. Closes with the nonlinear extension: $K$ is not a constant.

**Chapter 6 — Simplified Transient Stability and Control** *(`ch06-transient-stability-and-control.md`)*
The 2-DOF car as a second-order system. Natural frequency and damping ratio expressed in the Chapter 5 parameters, with two central results: $\omega_n \propto 1/V$ (the car responds more slowly the faster it goes), and $\omega_n \to 0$ at the critical speed — **steady-state divergence and dynamic instability are the same event.** The yaw-response numerator zero and the lag between yaw and lateral acceleration.

**Chapter 7 — Steady-State Pair Analysis** *(`ch07-steady-state-pair-analysis.md`)*
The bridge from linear theory to the nonlinear limit. Computes axle characteristics from real tire data with real wheel loads, and establishes **TLLTD as the master balance parameter** — with the key result that axle capacity loss goes as the *square* of load transfer, so the differential loss is linear in how far TLLTD departs from 50%.

**Chapter 8 — Force-Moment Analysis** *(`ch08-force-moment-analysis.md`)*
The MRA Moment Method: remove the moment-equilibrium constraint and map $N$ versus $A_y$ over the whole $(\beta, \delta)$ plane. The $N=0$ line reproduces Chapters 5 and 7; everything off it is new information about the car's behaviour out of equilibrium. Stability and control read as slopes and spacings, with **understeer as their ratio** — a decomposition that tells you *which* deficiency to fix.

**Chapter 9 — The g-g Diagram** *(`ch09-gg-diagram.md`)*
The complete performance envelope, its departures from a circle, the power-limited truncation, the speed-dependent g-g-V surface for aero cars. Vehicle capability versus driver usage as the standard data-analysis diagnostic. Quasi-steady-state lap simulation and the sensitivity derivatives ($\partial t/\partial m$, $\partial t/\partial C_LA$) that drive development priorities.

**Chapter 10 — Race Car Design** *(`ch10-race-car-design.md`)*
Constraints (regulatory, physical, practical), the specification table and its couplings, a thirteen-step design process, and a sustained argument for **designing adjustability deliberately and orthogonally** — an adjustment that changes three things at once is nearly useless at a race weekend.

**Chapter 11 — Testing and Development** *(`ch11-testing-and-development.md`)*
The driver as a bandwidth-limited adaptive controller. Desirable vehicle characteristics. A-B-A protocol and the control of confounders. The standard manoeuvres — constant radius, constant speed, step steer, frequency response, braking, aero verification — with the skid pad treated in detail as the highest information-per-effort test in the field.

**Chapter 12 — Chassis Set-Up** *(`ch12-chassis-setup.md`)*
The primary/secondary hierarchy. Tire pressures and the temperature-spread diagnostic table. Corner weights and cross-weight, ride frequencies, bars as the orthogonal balance tool, aero balance, alignment, brake bias. Dampers and differentials as secondary. Closes with a full **complaint-to-adjustment diagnostic table** organized by corner phase, and the governing rule: entry problems are brake bias and damping; mid-corner is bars and aero; exit is differential and traction.

**Chapter 13 — Historical Note** *(`ch13-historical-note.md`)*
Olley and the independent-suspension era, the aeronautical transfer mapped concept by concept, instrumented vehicle research, the aerodynamic era, and the computational era. Extracts recurring patterns: analysis follows measurement; borrowing across fields produces the leaps; regulation drives innovation by defining the boundary; the tire remains the bottleneck.

### Part II — Applied Subsystems

**Chapter 14 — Tire Data Treatment** *(`ch14-tire-data-treatment.md`)*
Radt nondimensionalization: normalize force by $\mu_yF_z$ and slip by $\bar\alpha = C_\alpha\tan\alpha/(\mu_yF_z)$, and data across a 9:1 load range collapses onto one master curve — which the book represents with a **normalized Magic Formula** fit. Moments are normalized using pneumatic trail and overturning trail. Enables interpolation, comparison and compression. **The friction ellipse falls out as a theorem rather than an assumption.** The brush-model cubic is included as an analytically tractable alternative, clearly flagged as *not* the book's fit.

**Chapter 15 — Applied Aerodynamics** *(`ch15-applied-aerodynamics.md`)*
Spoilers and dams, wings (aspect ratio, induced drag — typically 80%+ of a race wing's drag, multi-element, gurney flaps), ground effect with and without skirts, diffusers and rake, drag components, flow control, internal airflow. Closes with **aerodynamics and balance** — the seven sources of balance variation, and the argument that the objective is not maximum downforce but maximum downforce subject to platform stability.

**Chapter 16 — Ride and Roll Rates** *(`ch16-ride-and-roll-rates.md`)*
Careful definitions (spring rate, wheel rate, ride rate, roll rate), installation ratio and the $K_w = K_s\,IR^2$ relation, ride frequency targets by class, roll rate $K_\phi = K_Rt^2/2$, roll gradient, and the elastic TLLTD that links back to Chapter 7. The tire in series matters far more on stiff race cars than on road cars.

**Chapter 17 — Suspension Geometry** *(`ch17-suspension-geometry.md`)*
Motion path, instant centres, FVSA and SVSA, roll centres (kinematic and force definitions), the geometric/elastic load transfer split, jacking, roll centre migration, camber curves and the roll-gradient trade-off, anti-dive and anti-squat percentages, and the suspension types from double wishbone to twist axle.

**Chapter 18 — Wheel Loads** *(`ch18-wheel-loads.md`)*
The pivotal chapter of Part II. CG location measurement (with the traps in the tilt method), **chassis torsional stiffness** — the book's criterion being that the chassis must resist roughly the *difference* between front and rear roll rates — and the complete lateral load transfer derivation for the three-mass system in its three contributions (geometric, elastic, unsprung), about the Neutral Roll Axis. Then longitudinal transfer, banking, terrain, aerodynamic loads, and engine torque reaction, which is often larger than the load transfers everyone worries about.

**Chapter 19 — Steering Systems** *(`ch19-steering-systems.md`)*
Caster, KPI, scrub radius and trail. Ackermann geometry and why race cars usually run parallel or anti-Ackermann (peak slip angle rises with load, so the lightly-loaded inside wheel should be steered *less*). Steering ratios and system compliance. Bump and roll steer, which on a downforce car becomes a speed-dependent alignment change. Steering torque, and the design tension between caster-induced camber and preserving the trail-collapse warning.

**Chapter 20 — Driving and Braking** *(`ch20-driving-and-braking.md`)*
The traction-limit formulas for FWD, RWD and 4WD, whose denominators explain the layout of every performance car ever built. Differentials: open, plate LSD (preload versus ramp, torque bias ratio), spool, Torsen, electronic — with the yaw moment they generate treated as a primary handling parameter. Brake bias, the ideal curve versus deceleration, thermal design, and the four simultaneous mechanisms that make corner-entry stability a multi-cause problem.

**Chapter 21 — Suspension Springs** *(`ch21-suspension-springs.md`)*
Torsion bars ($K \propto d^4$), coil springs as wound torsion bars ($K = Gd^4/8D^3N$), Wahl stress correction, series and parallel combinations and where each occurs on a car, tender springs versus helper springs, leaf springs and the genuine handling problem of interleaf friction, installation, and fatigue via the Goodman criterion.

**Chapter 22 — Dampers** *(`ch22-dampers.md`)*
Damping fundamentals and the two damped modes (body at 1.5–5 Hz, wheel hop at 12–20 Hz) that justify separate low- and high-speed valving. Force-velocity curve shapes. The rate transforms as $IR^2$ while velocity transforms as $IR$ — so a dyno sheet means nothing until it is wheel-referred. **Dampers are the transient balance tool and cannot change steady-state balance.** Contact-patch load variation as the proper objective function. Closes with the aero-critical case, where damping becomes platform control and jacking-down becomes a genuine safety issue.

**Chapter 23 — Compliances** *(`ch23-compliances.md`)*
Removes the rigid-link assumption. Compliance as a spring in series (the softest element dominates, so a stiffer bar on soft mounts gains almost nothing). Compliance steer and compliance camber, both routinely comparable to deliberate setup adjustments. Why road cars design compliance in and race cars design it out. K&C rig measurement, and the discipline of folding measured compliances back into the Part I parameters.

---

## 5. Suggested study sequence

**A first pass (theory) — Chapters 1, 2, 4, 5, 6, 9.**
This is the minimum coherent path. Chapter 2 for the force generator, Chapter 4 for the bookkeeping, Chapters 5 and 6 for the vehicle's steady and transient response, Chapter 9 for the performance synthesis. Work every exercise in Chapters 2 and 5 — they carry the most weight.

**A second pass (the limit) — Chapters 7, 8, 14, 18.**
This is where linear theory gives way to what actually happens at 1.5–3 g. Chapter 14 belongs here despite being in Part II, because pair analysis (7) and the Moment Method (8) both consume nondimensionalized tire data, and Chapter 18 supplies the wheel loads they need.

**A third pass (hardware) — Chapters 16, 17, 21, 22, 23.**
The suspension chapters form a tight cluster: geometry (17) sets roll centres and camber curves, rates (16) convert springs (21) into ride and roll stiffness, dampers (22) handle the transients, and compliances (23) explain why none of it works quite as calculated.

**A fourth pass (the rest) — Chapters 3, 15, 19, 20.**
Aerodynamics and the remaining subsystems, each largely self-contained.

**Throughout — Chapters 10, 11, 12, 13.**
Design, testing, setup and history are best read alongside the technical material rather than in sequence. Chapter 12 in particular is worth revisiting after every other chapter, because it is where each new piece of theory acquires a practical consequence.

### Dependency map

| To understand… | You first need… |
|---|---|
| Ch 5 (understeer gradient) | Ch 2 (cornering stiffness), Ch 4 (axes) |
| Ch 6 (transient) | Ch 5 |
| Ch 7 (pair analysis) | Ch 2 (load sensitivity), Ch 18 (wheel loads) |
| Ch 8 (Moment Method) | Ch 5, Ch 7 |
| Ch 9 (g-g) | Ch 2, Ch 3 |
| Ch 12 (setup) | Ch 7, Ch 16, Ch 17, Ch 18 |
| Ch 14 (tire data) | Ch 2 |
| Ch 16 (rates) | Ch 17 (installation geometry) |
| Ch 18 (wheel loads) | Ch 16, Ch 17 |
| Ch 22 (dampers) | Ch 6, Ch 16 |
| Ch 23 (compliances) | essentially all of Part II |

---

## 6. Mathematical prerequisites

Nothing beyond a first engineering degree, but the following should be comfortable rather than merely familiar:

- **Vector statics and dynamics** — free-body diagrams, moment balance, rigid-body motion.
- **Rotating reference frames** — the transport terms in $\vec a = \dot{\vec v} + \vec\omega\times\vec v$. This is the one piece of mechanics that trips people up (Chapter 4).
- **Linear second-order systems** — $\omega_n$, $\zeta$, step and frequency response, eigenvalues of a $2\times2$ matrix (Chapter 6).
- **Basic Laplace transforms and transfer functions** — enough to read $r(s)/\delta(s)$ (Chapter 6).
- **Elementary fluid mechanics** — Bernoulli, dynamic pressure, Reynolds number, boundary layers (Chapters 3, 15).
- **Mechanics of materials** — torsion of circular sections, bending, fatigue (Chapter 21).
- **Numerical comfort** — most real problems in this subject are solved by iteration in a spreadsheet, not in closed form. Chapter 7's pair analysis is the clearest example.

---

## 7. How the exercises build

The exercises are sequenced deliberately across the course:

- **Chapters 1–4** establish quantitative intuition: how big is a dynamic pressure, a yaw rate, a load transfer, a slip angle. Getting a feel for magnitudes prevents most later errors.
- **Chapters 5–6** are the analytical core. The understeer gradient, the significant speeds, the stability derivatives and the modal parameters are all computed from the same small parameter set, repeatedly, until the relationships between them are automatic.
- **Chapters 7–9** move to the nonlinear limit and introduce iteration. Several solutions deliberately show a closed-form attempt failing or needing care, because that is the honest state of the subject.
- **Chapters 10–13** are more discursive: design trades, test design, diagnostic reasoning. The "solutions" are arguments, not arithmetic.
- **Chapters 14–23** are engineering calculations with numbers a race engineer would actually meet — spring rates, bar diameters, damper coefficients, brake energies, compliance coefficients — and each solution closes by stating what the number implies for the car.

Several results recur across chapters and are worth watching for, because they are the course's connective tissue:

1. **The quadratic load-sensitivity loss $2c\Delta^2$** (Ch 2) reappears as the mechanism of balance (Ch 7), as the justification for low CG and wide track (Ch 18), and as the objective function for damper tuning (Ch 22).
2. **The stability factor $1 + KV^2/(gL)$** (Ch 5) reappears in every steady-state gain and again in the transient natural frequency (Ch 6).
3. **The $IR^2$ rate transformation** (Ch 16) governs springs (Ch 21), bars (Ch 16, 23) and dampers (Ch 22) identically.
4. **The series-spring relation** governs the tire-plus-wheel-rate (Ch 16), tender springs (Ch 21), chassis-plus-suspension roll stiffness (Ch 18), and every compliance in the car (Ch 23).
5. **Orthogonality of adjustments** (Ch 10, 12, 20, 22) — the recurring practical argument that a tool acting on one thing beats a better tool acting on three.

---

## 8. File index

| File | Chapter |
|---|---|
| `00-course-overview.md` | This document |
| `ch01-problem-imposed-by-racing.md` | 1 — The Problem Imposed by Racing |
| `ch02-tire-behavior.md` | 2 — Tire Behavior |
| `ch03-aerodynamic-fundamentals.md` | 3 — Aerodynamic Fundamentals |
| `ch04-vehicle-axis-systems.md` | 4 — Vehicle Axis Systems |
| `ch05-steady-state-stability-and-control.md` | 5 — Simplified Steady-State Stability and Control |
| `ch06-transient-stability-and-control.md` | 6 — Simplified Transient Stability and Control |
| `ch07-steady-state-pair-analysis.md` | 7 — Steady-State Pair Analysis |
| `ch08-force-moment-analysis.md` | 8 — Force-Moment Analysis |
| `ch09-gg-diagram.md` | 9 — The "g-g" Diagram |
| `ch10-race-car-design.md` | 10 — Race Car Design |
| `ch11-testing-and-development.md` | 11 — Testing and Development |
| `ch12-chassis-setup.md` | 12 — Chassis Set-Up |
| `ch13-historical-note.md` | 13 — Historical Note on Vehicle Dynamics Development |
| `ch14-tire-data-treatment.md` | 14 — Tire Data Treatment |
| `ch15-applied-aerodynamics.md` | 15 — Applied Aerodynamics |
| `ch16-ride-and-roll-rates.md` | 16 — Ride and Roll Rates |
| `ch17-suspension-geometry.md` | 17 — Suspension Geometry |
| `ch18-wheel-loads.md` | 18 — Wheel Loads |
| `ch19-steering-systems.md` | 19 — Steering Systems |
| `ch20-driving-and-braking.md` | 20 — Driving and Braking |
| `ch21-suspension-springs.md` | 21 — Suspension Springs |
| `ch22-dampers.md` | 22 — Dampers (Shock Absorbers) |
| `ch23-compliances.md` | 23 — Compliances |

---

## 9. Validation status

The technical content has been spot-checked against the source text page by page (the PDF is a scan with no text layer, so pages were rasterized and read directly). Confirmed as matching the book: the Bundorf cornering compliance and understeer gradient formulation; tangent speed, both in its derivative form and its reduction; the $N_\beta$ / $Y_\beta$ nomenclature as static directional stability and lateral damping; the statics/constrained-testing framing of the Moment Method; the Radt normalized slip angle $\bar\alpha = C\tan\alpha/(\mu_y Z)$; the installation ratio defined as device length change over wheel centre movement; roll rate and roll gradient; and the three-mass lateral load transfer structure with its geometric and elastic mechanisms.

Corrections made after checking:

- **Chapter 14** originally asserted the master curve was the brush-model cubic peaking at $\bar\alpha = 3$. The book fits the collapsed data with a normalized Magic Formula. Corrected, with the cubic retained and flagged as a theoretical alternative.
- **Chapter 20** had $a$ and $b$ transposed in the FWD/RWD traction-limit formulas relative to the convention used everywhere else in the course. The worked exercise was already correct; the theory section is now consistent with it.
- **Chapters 18 and 23** stated a "5–10× total roll stiffness" chassis criterion that is a common heuristic but not the book's. Replaced with the book's actual criterion and its quoted figures, with the heuristic retained and labelled as such.
- **Chapter 5** was missing the understeer budget entirely, and contained a garbled intermediate step in the tangent speed expression. Both fixed.

Known remaining gaps: the treatment is a study companion, not a substitute, and does not reproduce the book's worked numerical examples, its tire and aerodynamic data sets, or the detail of Chapters 15 and 17, which are far longer in the original than these notes convey.

---

## 10. A closing note on how to use this

The temptation with a book of this size is to read it. The better approach is to **carry a specific car and a specific problem through it.** Take a car you know — a real one, a simulation, a Formula Student design, a game model with plausible physics — and at each chapter compute that car's numbers. Its understeer gradient. Its yaw natural frequency at three speeds. Its TLLTD. Its ideal brake bias at 0.6 and 1.6 g. Its ride frequencies with the tire in series.

By Chapter 18 you will have a complete parameter set, and by Chapter 23 you will know which of those parameters you actually believe. That last judgement — knowing which of your own numbers are trustworthy — is the real output of the course, and it is what separates an engineer who can calculate from one who can decide.
