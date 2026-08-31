# Chapter 10 — Race Car Design

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 10. Original explanatory material.*

---

## 1. Where analysis meets a blank sheet

Chapters 1–9 gave the tools. Chapter 10 asks how you get from tools to a car. It is short because design is not a formula, but its structure is worth internalizing: **constraints and specification first, then a design process, then iteration against the analysis of the preceding chapters.**

## 2. Constraints

### 2.1 Regulatory

The rulebook is the dominant constraint and, historically, the dominant source of design innovation. Typical constrained quantities:

- Minimum mass (with or without driver), and ballast placement rules
- Dimensional boxes: overall length, width, height, wheelbase limits, bodywork reference planes
- Aerodynamic constraints: wing dimensions and positions, floor geometry, skirt bans, ride-height rules
- Tire specification (often a control tire — which removes the single largest performance variable from the designer's hands and makes everything else matter more)
- Engine formula: capacity, aspiration, fuel flow, rev limit, homologation freeze
- Safety structures: survival cell, roll structures, impact attenuation, load-case tests
- Cost caps and homologation freezes (increasingly dominant in modern series)

The engineering discipline: **write the rulebook constraints as an explicit list of inequalities before designing anything.** Nearly every famous race car innovation — the Chaparral 2J, the Brabham BT46B, the Lotus 78, the Tyrrell P34, the six-wheeled and the fan-driven — is the discovery that a quantity everyone assumed was constrained was in fact not mentioned.

### 2.2 Physical and practical

- Package: driver, fuel, engine, cooling, and their consequences for CG position and yaw inertia
- Structural stiffness: chassis torsional stiffness must be high relative to the roll stiffness of the suspension, or setup changes lose their meaning (see Chapter 18.3)
- Serviceability: setup changes achievable in a pit stop, component replacement times
- Reliability and the finite budget of testing and development
- Manufacturability and cost

## 3. Specification — deciding the targets

The specification is the set of numbers the design must hit. A workable list:

| Parameter | Typical decision driver |
|---|---|
| Mass and distribution | Rules minimum; distribution set by desired balance and tire sizes |
| Wheelbase | Trade agility (short) against stability and aero platform (long) |
| Track width | Load transfer reduction versus rules and drag |
| CG height | As low as packaging allows — reduces load transfer everywhere |
| Yaw inertia / dynamic index | Mass centralization for response |
| Downforce level and balance | Circuit mix; balance target usually 40–46% front |
| Ride frequencies | 1.5–2.5 Hz for low-downforce cars; 3–5+ Hz for high downforce |
| Roll gradient | 0.3–1.5 deg/g depending on class |
| Suspension travel | Set by ride frequency, aero ride-height sensitivity, kerb use |
| Brake capacity and bias range | Peak deceleration plus thermal duty cycle |
| Steering ratio and effort | Response requirement plus driver feedback |

**Key coupling to remember**: these are not independent. Choosing a high downforce level forces stiff springs to control ride height, which forces high ride frequencies, which reduces mechanical compliance, which changes the tire's ability to follow the road, which changes the useful CG height and the roll gradient. Race car design is a constraint-satisfaction problem, not a sequence of independent choices.

## 4. A design process

A workable sequence, roughly the one the chapter outlines:

1. **Define the objective and constraints.** Circuit mix, regulations, budget, timescale.
2. **Concept layout.** Engine position, driver position, fuel location, general architecture. This step sets CG height, weight distribution and yaw inertia, and is nearly irreversible.
3. **Preliminary mass and inertia estimate.** Build a component-level mass model early and maintain it obsessively; it is the input to everything.
4. **Tire selection / characterization.** With a control tire, obtain or measure the data. All handling targets are downstream of the tire.
5. **First-order handling design.** Use pair analysis (Ch. 7): choose weight distribution, tire sizes, and target TLLTD to achieve the desired balance at the target $A_y$.
6. **Aerodynamic concept.** Target $C_LA$, $C_DA$ and balance; verify balance stability across the ride-height and pitch envelope.
7. **Suspension kinematics.** Roll centres, camber curves, anti-features, motion ratios — designed to deliver the TLLTD and camber targets from step 5 (Ch. 16, 17).
8. **Spring, bar and damper specification.** From ride frequency and roll gradient targets, corrected by installation ratios (Ch. 16, 21, 22).
9. **Structural design.** Load cases from the g-g envelope plus kerb and impact cases; torsional stiffness target.
10. **Verify with the Moment Method** (Ch. 8). Generate the MMM diagram from the design's own data; check stability, control, trimmed limit and margin.
11. **Lap simulate** (Ch. 9). Check the design against the objective function.
12. **Iterate.** Steps 5–11 are a loop.
13. **Build in adjustability.** No design is right first time; the car that can be tuned wins over the car that was theoretically better.

## 5. The role of adjustability

The Millikens stress this and race engineers repeat it: **design the adjustment ranges as deliberately as the nominal values.** A car whose front bar has three positions spanning a 6% TLLTD range is a car that cannot be balanced across a season. Typical required ranges:

- TLLTD: ±8–10% about nominal
- Aero balance: ±4–6% front
- Ride heights: ±15 mm
- Camber: 0 to −4°
- Toe: ±0.3° per wheel
- Brake bias: 55–70% front
- Differential preload/ramp: several settings

And critically: **each adjustment should be as orthogonal as possible.** An adjustment that changes balance *and* ride height *and* camber simultaneously is nearly useless at a race weekend, because the engineer cannot attribute the result.

## 6. Common design errors

- Designing the suspension geometry before knowing the tire data.
- Optimizing a subsystem in isolation (a beautiful lightweight upright that raises unsprung mass distribution unfavourably, or a wing with high $C_L$ but a stall that arrives inside the operating ride-height range).
- Chasing peak numbers instead of usable, stable numbers (Chapter 8's lesson).
- Insufficient chassis torsional stiffness, which makes the whole roll-stiffness-distribution design fictional.
- Insufficient adjustment range or non-orthogonal adjustments.
- Neglecting the thermal domain: tires, brakes, engine, driver.

---

## Exercises

**10.1** A regulation specifies minimum mass 700 kg including driver, and permits ballast placement anywhere below a specified height. The bare car weighs 665 kg with 44% front. Where should the 35 kg of ballast be placed to achieve 46% front on a 2.9 m wheelbase, and what is the effect on yaw inertia?

**10.2** A designer must choose between a 2.6 m and a 3.0 m wheelbase for a car of fixed mass. Discuss the effects on understeer gradient, yaw natural frequency, load transfer, and aerodynamics.

**10.3** A car has a target roll gradient of 0.8 deg/g and a roll moment arm (CG to roll axis) of 0.28 m, mass 750 kg. Compute the required total roll stiffness.

**10.4** A team's front anti-roll bar has settings giving front roll stiffness of 18, 22 and 26 kN·m/rad, with rear fixed at 20 kN·m/rad. Compute the TLLTD range achievable (ignoring geometric transfer and unsprung effects) and comment on adequacy.

**10.5** State the design consequences of choosing a downforce level of $C_LA = 4.0$ m² rather than 2.0 m² for an otherwise identical car.

---

## Solutions

**10.1**
Bare car: 665 kg, 44% front → 292.6 kg front, 372.4 kg rear.
Target: 700 kg at 46% front → 322 kg front, 378 kg rear.

Ballast needed at front: $322 - 292.6 = 29.4$ kg; at rear: $378 - 372.4 = 5.6$ kg. Total 35 kg ✓.

So place **29.4 kg forward and 5.6 kg rearward**. To find the equivalent single location, take moments about the front axle. Let $x$ be the distance of the ballast CG from the front axle:
$$
35x = 29.4(0) + 5.6(2.9) \Rightarrow x = \frac{16.24}{35} = 0.464\ \text{m}
$$
i.e. the ballast package's centroid must sit 464 mm behind the front axle — well forward of the car's CG at $0.54 \times 2.9 = 1.566$ m.

**Effect on yaw inertia**: ballast placed at $\pm$ distances from the CG adds $\sum m_i d_i^2$. The 29.4 kg at the front axle is $1.566$ m from the CG: $29.4 \times 1.566^2 = 72.1$ kg·m². The 5.6 kg at the rear axle is $1.334$ m away: $5.6 \times 1.334^2 = 10.0$ kg·m². Total added: **82 kg·m²**, perhaps 8–10% of a typical $I_{zz}$.

This is the ballast designer's dilemma in a sentence: ballast placed at the extremities is the most efficient way to move the CG, and the worst thing you can do to yaw response. If the same 35 kg were distributed to achieve the same CG shift with mass spread inboard where possible, $I_{zz}$ would rise less. The best practice is to place ballast as low and as close to the required longitudinal station as packaging allows, rather than simply "as far forward as possible."

**10.2**
**Understeer gradient**: $K = W_f/C_f - W_r/C_r$ is not directly a function of $L$ — but the required steer angle for a given radius is $L/R + KA_y$, so the long car needs more steer for the same corner. If weight distribution and tire sizes are held, $K$ is unchanged; the *geometric* portion grows.

**Yaw natural frequency**: $\omega_n^2 \propto C_fC_rL^2/(mI_{zz}V^2)$. Longer $L$ raises $\omega_n$ through $L^2$ — but $I_{zz}$ typically rises faster than $L$ in a real design (mass moves to the extremities), so the practical result is a *lower* $\omega_n$ and a slower-responding car. The 3.0 m car will feel more inert.

**Load transfer**: longitudinal load transfer under braking/acceleration is $mA_xh/L$ — inversely proportional to wheelbase. The **long car transfers less load longitudinally**, which is a real benefit: less rear unloading on entry (better stability), less front unloading on exit (better traction and less wheelie tendency). Lateral load transfer is unaffected by $L$ (it depends on track).

**Aerodynamics**: the long car has more floor area (more downforce for a given $C_p$), a longer diffuser ramp, and — critically — is less sensitive in aero balance to pitch, because a given pitch angle produces smaller relative ride-height changes at the extremities relative to the wheelbase. This is a large part of why modern formula cars have grown steadily longer.

**Verdict**: 3.0 m for high-speed circuits and aero-dependent cars; 2.6 m for tight, low-speed circuits where agility dominates. In series with a fixed calendar, the aero platform argument has generally won.

**10.3**
Roll gradient $\phi/A_y = 0.8$ deg/g.

Roll moment per g: $M_\phi = m g h_{arm} = 750 \times 9.81 \times 0.28 = 2060$ N·m per g.

Required roll stiffness:
$$
K_\phi = \frac{M_\phi}{\phi} = \frac{2060\ \text{N·m/g}}{0.8\ \text{deg/g}} = 2575\ \text{N·m/deg} = 147{,}540\ \text{N·m/rad}
$$

i.e. **147.5 kN·m/rad total**. Note this must be provided by springs plus anti-roll bars at both ends, after accounting for installation ratios (Chapter 16) — and that the chassis torsional stiffness should be several times this value (a common target is 5–10×) or the two axles' roll stiffnesses stop acting as designed.

**10.4**
Elastic TLLTD (ignoring geometric and unsprung contributions):
$$
\text{TLLTD} = \frac{K_{\phi f}}{K_{\phi f} + K_{\phi r}}
$$

| Front setting | TLLTD |
|---|---|
| 18 kN·m/rad | $18/38 = 0.474$ |
| 22 | $22/42 = 0.524$ |
| 26 | $26/46 = 0.565$ |

Range: 47.4% to 56.5%, a span of **9.1 percentage points** in three steps of about 4.5 points each.

**Comment on adequacy**: the total range is reasonable — Exercise 7.4 showed that the balance effect is linear in $(2x-1)$, so ±4.5 points about centre is a meaningful authority. The problem is the **step size**. A 4.5-point TLLTD change is a large balance change; race engineers typically want to make adjustments of 1–2 points to fine-tune. Three positions is too coarse. Practical remedies: a blade-type bar with continuous adjustment, more holes in the drop link, or complementary fine adjustment at the rear so that combinations of front and rear settings give a finer effective grid.

Also note the ranges overlap poorly with typical targets: if the car needs 58% front, this bar cannot reach it at all, and the engineer will be forced to use spring rates or ride heights — changes that are *not* orthogonal, because they also alter ride frequency and aero platform. This is precisely the design error warned about in section 5.

**10.5**
Doubling $C_LA$ from 2.0 to 4.0 m² has consequences throughout the car:

**Downforce and loads.** At 60 m/s, downforce goes from $\frac{1}{2}(1.225)(3600)(2.0) = 4410$ N to 8820 N. On a 750 kg car (7360 N static), that is a change from 60% to 120% of static weight. Suspension, upright, wheel bearing and chassis load cases roughly double at high speed.

**Springs and ride frequency.** To hold ride-height change to the same value, spring rates must roughly double, raising ride frequencies by $\sqrt{2} = 1.41$ — say from 2.5 Hz to 3.5 Hz. The car becomes much stiffer, loses mechanical compliance over bumps and kerbs, and depends more on the tire carcass for compliance.

**Ride-height sensitivity and platform control.** Higher downforce almost always means greater sensitivity of both $C_L$ and aero balance to ride height and pitch. Platform control becomes the dominant setup problem, driving damper design (Chapter 22.6), heave springs, and third elements.

**Drag and gearing.** Drag will rise substantially; top speed falls; gearing must be reoptimized; engine cooling and fuel consumption change.

**Brakes and thermal duty.** Deceleration capability rises with downforce, so peak braking energy rate rises; brake sizing and cooling must follow.

**Handling character and driver workload.** The car becomes strongly speed-dependent: benign and low-grip in slow corners, enormous grip in fast ones. Balance now shifts with speed as well as with lateral acceleration, so a setup that is neutral in a slow corner may be far from it in a fast one. This is why aero balance versus ride height is charted as carefully as any mechanical parameter.

**The general lesson**: aerodynamic downforce is not a bolt-on. Choosing its level is a whole-vehicle architectural decision made at concept stage, and it propagates into every subsystem in Part II of the book.
