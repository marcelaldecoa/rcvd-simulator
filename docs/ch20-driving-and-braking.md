# Chapter 20 — Driving and Braking

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 20. Original explanatory material.*

---

## 1. Longitudinal force at the vehicle level

Chapter 2 established how a single tire generates longitudinal force through slip ratio, and how that force competes with lateral force on the friction ellipse. This chapter asks the vehicle-level questions: which wheels should drive, how should torque be split between them, and how should braking be distributed.

The unifying constraint is the same one that governs everything else: **each tire has a friction budget, and longitudinal and lateral demands share it.**

## 2. Merits of front-, rear-, and four-wheel drive

### 2.1 Traction limit and load transfer

Under acceleration, load transfers rearward:

$$
F_{zr} = W_r + \frac{WA_xh}{L}, \qquad F_{zf} = W_f - \frac{WA_xh}{L}
$$

The maximum acceleration a driven axle can sustain is found by requiring the traction demand to equal the available friction at that axle. For **rear-wheel drive**:

$$
mA_x = \mu\left(W_r + \frac{WA_xh}{L}\right)
$$

Solving for $A_x$ (in g, with $W = mg$):

$$
A_x^{\max} = \frac{\mu\,a/L}{1 - \mu\,h/L}
$$

For **front-wheel drive** the load transfer works against you:

$$
A_x^{\max} = \frac{\mu\,b/L}{1 + \mu\,h/L}
$$

For **four-wheel drive**, all the load is available:

$$
A_x^{\max} = \mu
$$

Here $a$ is the distance from the front axle to the CG and $b$ from the CG to the rear axle, so the static rear load fraction is $a/L$ and the front is $b/L$. **Check this convention before using the formulas** — many texts define $a$ and $b$ the other way round, which silently swaps the two results.

The structural difference is stark. RWD's denominator makes acceleration *self-reinforcing* — accelerating adds load to the driven axle. FWD's denominator makes it *self-limiting*. This single pair of formulas explains the layout of essentially every high-performance car ever built.

### 2.2 Comparative assessment

**Rear-wheel drive**
- Traction improves with acceleration (favourable load transfer).
- Front tires are free to devote their whole friction budget to steering.
- Longitudinal and lateral demands are separated between axles.
- Cost: power-on oversteer, since the rear tires must supply both drive and cornering force; the friction ellipse penalizes the rear exactly when the car is rotating out of a corner.

**Front-wheel drive**
- Traction degrades with acceleration.
- The front tires must simultaneously steer *and* drive, so the front's lateral capability collapses under power — terminal power-on understeer.
- Torque steer if the driveshafts are unequal.
- Benefits: packaging, weight, cost, and inherent stability (the destabilizing effect of power is understeer, not oversteer). Rare in serious racing except where regulations mandate a production basis.

**Four-wheel drive**
- Best traction, particularly on low friction.
- Torque distribution becomes a handling parameter — front bias adds understeer, rear bias oversteer, and it can be varied with speed, throttle, or corner phase.
- Costs: mass, driveline losses, complexity, and the need for a centre differential (or a controlled coupling) to handle the fact that front and rear axles travel different distances in a turn.
- Dominant in rallying and in some sports-prototype hybrid layouts; banned or restricted in most circuit formulae.

## 3. Differentials

A differential allows the two driven wheels to rotate at different speeds — necessary because the outside wheel travels further in a turn. The design question is **how much speed difference to allow, and how torque is split when they differ.**

### 3.1 Open differential

Splits torque equally between the two outputs, always:

$$
T_L = T_R = \tfrac{1}{2}T_{\text{input}}
$$

Consequence: **total drive torque is limited to twice the torque the less-loaded wheel can transmit.** In a corner, the inside rear is lightly loaded, so an open diff wastes most of the available traction. If the inside wheel lifts, torque goes to zero.

Yaw effect: none — equal forces at equal moment arms produce no yaw moment.

### 3.2 Limited-slip differential (plate type)

Clutch packs are compressed by two mechanisms:

**Preload** — a constant spring force, giving a constant locking torque even at zero input torque. Governs behaviour on trailing throttle and at very low torque.

**Ramp (torque-sensing) action** — the input torque acts on ramp faces, generating axial thrust proportional to input torque. The **ramp angle** sets the proportionality, and separate ramp angles can be used on the drive and overrun sides:

$$
T_{\text{lock}} = T_{\text{preload}} + k(\theta_{\text{ramp}})\,T_{\text{input}}
$$

**Torque bias ratio (TBR)** — the maximum ratio of torque delivered to the high-grip wheel versus the low-grip wheel:

$$
TBR = \frac{T_{\text{high}}}{T_{\text{low}}}
$$

A TBR of 3.0 means the diff can send three times as much torque to the gripping wheel. Total transmissible torque becomes:

$$
T_{\text{total}} = T_{\text{low}}(1 + TBR)
$$

compared with $2T_{\text{low}}$ for an open diff.

**Yaw effect — the key handling consequence.** When the diff locks, the outside wheel (travelling faster) is held back and the inside wheel is driven forward. The resulting longitudinal force difference across the track produces a yaw moment **opposing** the turn:

$$
N_{\text{diff}} = \frac{(F_{x,\text{inside}} - F_{x,\text{outside}})\,t}{2}
$$

So: **more locking on power = more understeer on exit, but more traction.** More locking on overrun = more stability on entry, but more understeer on entry. This trade is the reason differential settings are a primary handling tool on any car with meaningful power.

### 3.3 Spool (locked)

Both wheels rigidly connected. Maximum traction; maximum understeer; severe tire scrub in slow corners. Standard on ovals and drag cars, where turns are gentle or absent.

### 3.4 Torsen / gear-type

Uses worm gear friction to produce torque bias proportional to input torque, with a fixed TBR and no preload. Smooth and progressive; but because its bias is proportional to input torque, it transmits nothing if one wheel has zero traction (a lifted wheel).

### 3.5 Viscous and electronically controlled

Viscous couplings resist speed difference (rate-sensing rather than torque-sensing) — progressive but slow to react and thermally variable. Electronically controlled clutch packs allow locking torque to be commanded as an arbitrary function of speed, throttle, steer angle, yaw rate and corner phase; where regulations permit, this is the most powerful single handling tool on the car.

### 3.6 Setting a differential in practice

| Symptom | Adjustment |
|---|---|
| Wheelspin on exit, inside wheel lighting up | More power-side locking (steeper ramp, more plates) |
| Understeer on exit | Less power-side locking |
| Instability on entry (trailing throttle) | More coast-side locking, or more preload |
| Understeer on entry | Less coast-side locking / less preload |
| Car won't rotate anywhere | Reduce preload first — it acts everywhere |

**Diagnostic rule**: preload affects all phases; ramp angles affect only their respective torque direction. If a problem exists on both entry and exit, suspect preload.

## 4. Brake systems

### 4.1 Bias and the ideal curve

The ideal front bias puts both axles at the same fraction of their available friction:

$$
\%_{\text{front, ideal}} = \frac{b}{L} + \frac{A_x h}{L}
$$

(with $A_x$ in g). As Chapter 12 showed, this is a rising function of deceleration, so a fixed bias is correct at only one deceleration level.

Actual bias is set by the ratio of front to rear braking torque:

$$
\%_{\text{front}} = \frac{(P_f A_{cf}\mu_p R_{ef}/r_f)}{(P_f A_{cf}\mu_p R_{ef}/r_f) + (P_r A_{cr}\mu_p R_{er}/r_r)}
$$

where $P$ is line pressure, $A_c$ caliper piston area, $\mu_p$ pad friction, $R_e$ effective disc radius, $r$ rolling radius. In practice, bias is adjusted by the **balance bar** ratio (which sets $P_f/P_r$), and coarsely by caliper piston sizes and disc diameters.

### 4.2 Consequences of getting it wrong

- **Too far front**: fronts lock first. The car understeers and pushes straight; stopping distance increases; steering is lost. Stable but slow, and it is the *safe* failure mode.
- **Too far rear**: rears lock first. The rear axle loses lateral capability entirely and the car spins. Unstable and the *unsafe* failure mode.

This asymmetry is why every road car and most race cars err forward of ideal.

### 4.3 Thermal design

Braking converts kinetic energy to heat:

$$
E = \tfrac{1}{2}m(V_1^2 - V_2^2)
$$

and the power dissipated is $E/\Delta t$. Peak powers of 500 kW–1.5 MW are routine in a heavy braking zone. Design considerations: disc mass and specific heat set the temperature rise per stop; cooling airflow sets the equilibrium over a lap; pad and fluid temperature limits set the failure boundaries (pad fade, fluid vaporization producing a long pedal).

$$
\Delta T = \frac{E}{m_{\text{disc}}c_p}
$$

### 4.4 Pedal feel and modulation

The driver modulates braking near the lock-up boundary, which requires a pedal whose force is proportional to deceleration with minimal hysteresis and travel. Requirements: stiff pedal box and lines, adequate master cylinder sizing, no air, and consistent pad $\mu$ with temperature. A pad whose friction rises sharply with temperature makes the brake pedal a moving target, which is a bigger performance loss than a few percent of peak $\mu$.

### 4.5 Brake-induced handling

Braking is not just a longitudinal event:
- Longitudinal load transfer unloads the rear, reducing rear lateral capability (Chapter 7, Exercise 7.5).
- Aerodynamic pitch changes shift aero balance forward (Chapter 15, Exercise 15.3).
- Anti-dive geometry changes how the pitch develops (Chapter 17).
- Scrub radius converts braking-force asymmetry into steering torque (Chapter 19, Exercise 19.7).

All four act on corner entry, simultaneously. Corner-entry stability is therefore rarely a single-cause problem, and the discipline of Chapter 12 — identify the phase, then choose an orthogonal tool — applies with full force.

---

## Exercises

**20.1** A car has $W = 8000$ N, $a = 1.30$ m, $b = 1.40$ m, $h = 0.30$ m, $\mu = 1.4$. Compute the maximum acceleration for RWD, FWD and 4WD layouts.

**20.2** For the same car, compute the fraction of total weight on the driven axle at maximum acceleration in each case, and comment.

**20.3** A limited-slip differential has 60 N·m preload and a drive ramp giving a locking torque of 0.35 times the input torque. At an input torque of 900 N·m, compute the locking torque and the torque bias ratio.

**20.4** With the diff of 20.3, the inside rear tire can transmit 1100 N·m before spinning. Compute the maximum total drive torque for (a) an open diff, (b) this LSD, (c) a spool with an outside-wheel limit of 2600 N·m.

**20.5** Compute the yaw moment produced by a differential that delivers 2400 N·m to the inside wheel and 1200 N·m to the outside, with rolling radius 0.33 m and track 1.55 m. Compare with the yaw moment from a 2° steer input given $N_\delta = 3000$ N·m/deg.

**20.6** A car with $b/L = 0.55$, $h/L = 0.11$ decelerates at 1.5 g. Compute the ideal front bias, and the front and rear axle loads given $W = 7500$ N.

**20.7** A 780 kg car brakes from 78 m/s to 32 m/s. Compute the energy dissipated and the temperature rise of four 5.2 kg steel discs ($c_p = 480$ J/kg·K), assuming 90% of the energy goes into the discs and 55% of the braking is at the front.

---

## Solutions

**20.1**
$L = 2.70$ m. $b/L = 1.40/2.70 = 0.5185$ (rear static fraction is $a/L = 0.4815$ — careful with which is which: $a$ is front-axle-to-CG, so rear static load fraction is $a/L$).

Let me be explicit: $W_f = W b/L = 8000(0.5185) = 4148$ N (51.9% front); $W_r = W a/L = 8000(0.4815) = 3852$ N.

$h/L = 0.30/2.70 = 0.1111$.

**RWD** (driven axle is rear, static fraction $a/L = 0.4815$):
$$
A_x^{\max} = \frac{\mu\,a/L}{1 - \mu\,h/L} = \frac{1.4 \times 0.4815}{1 - 1.4 \times 0.1111} = \frac{0.6741}{1 - 0.1556} = \frac{0.6741}{0.8444} = 0.798\ g
$$

**FWD** (driven axle is front, static fraction $b/L = 0.5185$):
$$
A_x^{\max} = \frac{\mu\,b/L}{1 + \mu\,h/L} = \frac{1.4 \times 0.5185}{1.1556} = \frac{0.7259}{1.1556} = 0.628\ g
$$

**4WD**:
$$
A_x^{\max} = \mu = 1.40\ g
$$

**Summary**: RWD 0.80 g, FWD 0.63 g, 4WD 1.40 g. Note that the FWD car has *more* static weight on its driven axle (51.9% vs 48.1%) and still accelerates 21% worse, entirely because of the sign of the load transfer term. 4WD is 75% better than RWD.

**20.2**
Load transfer at maximum acceleration: $\Delta = W A_x h/L$.

**RWD** at 0.798 g: $\Delta = 8000(0.798)(0.1111) = 709$ N.
Rear axle load: $3852 + 709 = 4561$ N → **57.0% of total weight**.

**FWD** at 0.628 g: $\Delta = 8000(0.628)(0.1111) = 558$ N.
Front axle load: $4148 - 558 = 3590$ N → **44.9% of total weight**.

**4WD**: 100% by definition.

**Comment.** The RWD car ends up with 57% of its weight on the driven axle at the traction limit, having started with 48% — the acceleration has recruited 9 percentage points of extra load. The FWD car has *lost* 7 points, ending at 44.9%.

The design implication for RWD is worth extracting: because load transfer helps, a **rearward static weight bias and a high CG both improve straight-line traction**. This is why drag cars are extremely rear-biased with high CGs, and why dragsters are the shape they are. It is also why the same features are terrible for cornering (Chapter 18: lateral load transfer scales with $h$) — the two objectives point in opposite directions, and circuit racing resolves the conflict firmly in favour of cornering.

**20.3**
$$
T_{\text{lock}} = T_{\text{preload}} + 0.35\,T_{\text{input}} = 60 + 0.35(900) = 60 + 315 = 375\ \text{N·m}
$$

The locking torque is the *difference* the diff can sustain between the two outputs. With input $T$ split as $T_{\text{high}}$ and $T_{\text{low}}$:
$$
T_{\text{high}} + T_{\text{low}} = 900, \qquad T_{\text{high}} - T_{\text{low}} = 375
$$
$$
T_{\text{high}} = 637.5\ \text{N·m}, \qquad T_{\text{low}} = 262.5\ \text{N·m}
$$
$$
TBR = \frac{637.5}{262.5} = 2.43
$$

Note that TBR here is not a constant of the diff — it depends on the input torque, because the preload contributes a fixed component. At low input torque the preload dominates and the effective TBR is very high (at 100 N·m input, $T_{\text{lock}} = 95$ N·m, giving $TBR = 97.5/2.5 = 39$); at high input torque the TBR asymptotes toward $(1+0.35)/(1-0.35) = 2.08$. **Preload makes the diff behave nearly like a spool at low torque** — which is exactly why excessive preload makes a car refuse to rotate on trailing throttle and in slow corners.

**20.4**
**(a) Open diff.** Torque is split equally, so the total is limited by twice the weaker wheel:
$$
T_{\text{total}} = 2 \times 1100 = 2200\ \text{N·m}
$$

**(b) LSD.** The inside wheel is the low-torque side. From the relations above, with $T_{\text{low}} = 1100$ and $T_{\text{high}} - T_{\text{low}} = 60 + 0.35\,T_{\text{total}}$, and $T_{\text{high}} + T_{\text{low}} = T_{\text{total}}$:
$$
T_{\text{high}} = T_{\text{total}} - 1100
$$
$$
(T_{\text{total}} - 1100) - 1100 = 60 + 0.35\,T_{\text{total}}
$$
$$
0.65\,T_{\text{total}} = 2260 \Rightarrow T_{\text{total}} = 3477\ \text{N·m}
$$
Check: $T_{\text{high}} = 2377$ N·m, which is below the spool's 2600 N·m outside-wheel limit, so this is valid.

**(c) Spool.** Both wheels are rigidly locked, so total torque is limited only by the sum of what each can transmit:
$$
T_{\text{total}} = 1100 + 2600 = 3700\ \text{N·m}
$$

**Summary**: open 2200 N·m, LSD 3477 N·m (+58%), spool 3700 N·m (+68%).

The LSD recovers 86% of the spool's traction advantage while retaining the ability to differentiate in slow corners — which is precisely why plate LSDs, not spools, are used on road circuits. The remaining 6% gap is the price of drivability.

**20.5**
Longitudinal forces at the contact patches:
$$
F_{x,\text{in}} = \frac{2400}{0.33} = 7273\ \text{N}, \qquad F_{x,\text{out}} = \frac{1200}{0.33} = 3636\ \text{N}
$$

Yaw moment (the inside wheel pushing harder tends to rotate the car *out* of the turn):
$$
N = (F_{x,\text{in}} - F_{x,\text{out}})\times\frac{t}{2} = (7273 - 3636)\times 0.775 = 3637 \times 0.775 = 2819\ \text{N·m}
$$

Equivalent steer input:
$$
\Delta\delta = \frac{N}{N_\delta} = \frac{2819}{3000} = 0.94°
$$

**Interpretation.** This differential state is producing an anti-turn yaw moment equivalent to nearly a full degree of *opposite* steer lock. On a car whose total steer angle in a fast corner might be 3–5°, that is an enormous effect — roughly 20–30% of the driver's entire steering authority, working against them.

This is why "the car won't rotate on exit" is so often a differential problem rather than a mechanical balance problem, and why chasing it with anti-roll bars is a mistake: the bars move steady-state balance, but the diff moment appears only under power, at the exit phase. It is the orthogonality argument of Chapter 12 in its most concrete form.

It also explains why electronically controlled differentials are so valuable where permitted: being able to release locking torque during the rotation phase and reapply it during the traction phase removes the trade entirely.

**20.6**
$$
\%_{\text{front, ideal}} = \frac{b}{L} + \frac{A_x h}{L} = 0.55 + 1.5(0.11) = 0.55 + 0.165 = 0.715
$$
**71.5% front bias.**

Axle loads at 1.5 g deceleration:
$$
\Delta F_z = W\,A_x\,\frac{h}{L} = 7500 \times 1.5 \times 0.11 = 1238\ \text{N}
$$
$$
F_{zf} = 0.55(7500) + 1238 = 4125 + 1238 = 5363\ \text{N} \quad (71.5\%)
$$
$$
F_{zr} = 3375 - 1238 = 2137\ \text{N} \quad (28.5\%)
$$

The ideal bias equals the instantaneous load distribution, as it must — that is the definition of putting both axles at the same friction utilization. Note the rear axle has lost 37% of its static load. Combined with the Chapter 7 result that lateral capability falls sharply with vertical load, this is why trail-braking into a corner is the most delicate phase of a lap.

**20.7**
$$
E = \tfrac{1}{2}m(V_1^2 - V_2^2) = \tfrac{1}{2}(780)(78^2 - 32^2) = 390(6084 - 1024) = 390 \times 5060 = 1.973\times10^6\ \text{J}
$$

Energy into the discs: $0.90 \times 1.973\times10^6 = 1.776\times10^6$ J.

Front share (55%): $0.55 \times 1.776\times10^6 = 9.77\times10^5$ J, split between two front discs: $4.885\times10^5$ J each.
Rear share (45%): $7.99\times10^5$ J, split between two rear discs: $3.996\times10^5$ J each.

Temperature rise:
$$
\Delta T_f = \frac{4.885\times10^5}{5.2 \times 480} = \frac{4.885\times10^5}{2496} = 196\ \text{K}
$$
$$
\Delta T_r = \frac{3.996\times10^5}{2496} = 160\ \text{K}
$$

**A single braking event raises the front discs by nearly 200 °C.**

Two important observations. First, from a warm baseline of 300 °C the fronts reach 496 °C in one stop — and if the lap has three such zones and the cooling between them removes only part of that, the discs climb toward the 700–800 °C region where cast iron begins to suffer and organic pads fade. Steady-state disc temperature over a lap is a balance between this per-stop rise and the convective and radiative cooling in between, which is why brake duct sizing is a genuine lap-time parameter and not just a durability one.

Second, note that this calculation assumed 90% of the energy goes into the discs. The remainder goes into the pads, calipers, hubs, wheels and tires — and into the brake fluid via the caliper, which is why fluid boiling (producing a long, soft pedal) is a failure mode that appears late in a stint rather than on the first lap. The design margin is set by the *cumulative* thermal state, not the single stop.
