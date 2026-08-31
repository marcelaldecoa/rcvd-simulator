# Chapter 22 — Dampers (Shock Absorbers)

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 22. Original explanatory material.*

---

## 1. Approach

The damper is the least understood and most over-adjusted component on a race car. The reason is structural: springs and bars have effects that can be computed in closed form (Chapters 16, 21), while damper effects depend on **velocity**, which depends on the road, the driver and the car's own motion — so a damper change alters behaviour in some conditions and not others.

The disciplined approach the Millikens advocate:

1. Understand damping as a modal property first (what $\zeta$ does to body motions).
2. Separate **low-speed** damping (body control) from **high-speed** damping (wheel and road control).
3. Recognize that dampers are the **transient** balance tool, not the steady-state one.
4. For aero cars, recognize that damping is primarily a **platform control** problem, not a ride problem.

## 2. Technical literature and the state of knowledge

Damper theory is well developed for the linear, single-degree-of-freedom case and poorly developed for the real case: a nonlinear, hysteretic, temperature-dependent, four-corner-coupled system excited by a non-stationary random road plus driver inputs plus aerodynamic loads. The gap between the textbook quarter-car model and a race damper programme is large, and it is filled by rig testing (7-post and 4-post shakers), track data, and driver feedback.

This is worth stating plainly because it is the honest position: **damper settings are found empirically, guided by theory, not derived from it.**

## 3. Damping fundamentals

### 3.1 The single-degree-of-freedom baseline

$$
m\ddot z + c\dot z + kz = F(t)
$$
$$
\omega_n = \sqrt{k/m}, \qquad c_{\text{crit}} = 2\sqrt{km} = 2m\omega_n, \qquad \zeta = \frac{c}{c_{\text{crit}}}
$$

Behaviour by $\zeta$:
- $\zeta < 0.3$: oscillatory, poor body control, the car "floats" and "wallows"
- $\zeta \approx 0.3$–0.5: good ride isolation, some overshoot
- $\zeta \approx 0.6$–0.8: typical race compromise — quick settling, minimal overshoot
- $\zeta \approx 1.0$: critically damped, no overshoot, slowest possible non-oscillatory settling
- $\zeta > 1$: overdamped; the suspension cannot follow the road and the car rides on its tire stiffness

### 3.2 Referring damper rate to the wheel

Exactly as with springs (Chapter 16), the damper's rate transforms through the installation ratio **squared**:

$$
c_{\text{wheel}} = c_{\text{damper}}\, IR^2
$$

But the **velocity** transforms linearly:

$$
v_{\text{damper}} = IR \times v_{\text{wheel}}
$$

This matters enormously in practice. A damper dyno plot is in damper velocity; the car experiences wheel velocity. With $IR = 0.6$, a 100 mm/s wheel velocity is only 60 mm/s at the damper — so the region of the damper curve that matters for body control on this car is not the same region as on a car with $IR = 0.9$. **Always convert the dyno curve to wheel-referred force versus wheel velocity before comparing cars or interpreting data.**

### 3.3 The two damped masses

A quarter car has two modes:

**Sprung mass (body) mode** — typically 1.5–5 Hz on a race car, involving body heave, pitch and roll. Excited by driver inputs, load transfer, aerodynamic changes and long-wavelength road features. Wheel velocities are low: **0–50 mm/s**.

**Unsprung mass (wheel hop) mode** — typically 12–20 Hz, the wheel bouncing on the tire spring:
$$
\omega_{\text{hop}} = \sqrt{\frac{K_T + K_w}{m_u}}
$$
Excited by bumps and kerbs. Wheel velocities are high: **100–500+ mm/s**.

**This separation is why dampers have distinct low-speed and high-speed characteristics.** Low-speed damping controls the body; high-speed damping controls the wheel and protects the contact patch.

### 3.4 Force–velocity curves

A damper is characterized by its force-velocity curve, usually with four adjustable regions:

| Region | Controls |
|---|---|
| Low-speed bump | Body motion into bump: dive, roll, squat, heave under aero load |
| Low-speed rebound | Body motion out of bump: how quickly the body returns and settles |
| High-speed bump | Wheel response to sharp inputs — kerbs, bumps |
| High-speed rebound | Wheel extension after a bump; keeping the tire on the road |

**Curve shapes:**
- **Linear** — force proportional to velocity throughout. Simple; rarely optimal.
- **Digressive** — steep at low velocity, flattening above a "knee". Gives strong body control without harshness over bumps. The most common race shape.
- **Progressive** — shallow then steepening. Used where high-velocity events must be strongly resisted (bottoming protection).
- **Blow-off** — a valve opens above a threshold pressure, sharply limiting force. Protects the tire from spikes over kerbs.

**Bump/rebound asymmetry.** Almost all dampers have more rebound than bump force, typically 2:1 to 4:1. The reason: bump forces act to lift the sprung mass (harsh, and they add to the load the tire sees), while rebound forces act to control the release of stored spring energy. Excessive rebound, however, causes **jacking down** — over a series of bumps the wheel cannot re-extend fast enough, and the ride height progressively falls, which on an aero car is potentially catastrophic.

### 3.5 Damping and tire contact load

The often-overlooked function: a damper's job is not primarily comfort or body control but **keeping the vertical tire load as constant as possible**. Load variation is bad twice over — the load-sensitivity relation (Chapter 2) means the gain in force when load rises is less than the loss when it falls, so any fluctuation in load reduces the *average* lateral force available.

$$
\overline{F_y} < F_y(\overline{F_z}) \quad\text{for a concave } F_y(F_z)
$$

This is the same Jensen's inequality argument as load transfer, applied in time rather than across a track. The metric used on a 7-post rig is the **RMS of contact patch load variation**, and minimizing it is a legitimate objective function for damper optimization.

## 4. Racing application

### 4.1 Dampers as the transient balance tool

At steady state, a damper produces zero force (no velocity). Therefore **dampers cannot change steady-state balance.** What they change is the balance *during transients* — turn-in, direction change, throttle application, braking.

Mechanism: during roll onset, the roll velocity is nonzero, so the dampers at each end contribute to roll resistance. The transient load transfer distribution is:

$$
\text{TLLTD}_{\text{transient}} \approx \frac{K_{\phi f} + c_{\phi f}\dot\phi/\phi}{(K_{\phi f}+K_{\phi r}) + (c_{\phi f}+c_{\phi r})\dot\phi/\phi}
$$

So stiffer front low-speed damping moves transient TLLTD forward → **understeer on turn-in only**.

**Diagnostic rule**: if a handling complaint exists only during the transient and disappears once the car is settled, it is a damper problem. If it persists at steady state, it is a spring/bar/geometry/aero problem. Using dampers to fix a steady-state problem is the single most common setup error.

### 4.2 Practical damper adjustment guide

| Symptom | Adjustment |
|---|---|
| Understeer on turn-in only | Reduce front low-speed bump, or increase rear low-speed bump |
| Oversteer on turn-in only | Increase front low-speed bump, or reduce rear low-speed rebound |
| Car unsettled over kerbs | Reduce high-speed bump; check blow-off |
| Car skitters on a bumpy surface | Reduce high-speed damping both ways |
| Slow to settle after a direction change | Increase low-speed damping (both ends) |
| Ride height falling over a bumpy section | Reduce rebound (jacking down) |
| Poor traction on exit over bumps | Reduce rear high-speed damping |

### 4.3 Rig testing

A **7-post rig** applies vertical inputs at each of the four contact patches plus heave, pitch and roll forces at the body, reproducing both road and aerodynamic/inertial inputs. Outputs: contact patch load variation, body motions, damper velocity histograms.

**Damper velocity histograms** from track data are the essential diagnostic: they show what fraction of time is spent in each velocity band, and hence which part of the force-velocity curve actually matters on that circuit. A team adjusting the high-speed knee on a smooth circuit where 90% of the time is below 50 mm/s is wasting its session.

## 5. Race cars with modest aerodynamic downforce

Here the damper's classical objectives apply:

- **Control body modes** at $\zeta \approx 0.6$–0.8 for heave, roll and pitch.
- **Minimize contact patch load variation** over the road surface.
- **Manage transient balance** as above.
- Ride frequencies of 2–3.5 Hz, moderate suspension travel, and a genuine trade between body control and mechanical compliance.

The design freedom is real: springs can be chosen for mechanical grip, and dampers tuned for control, with the two decisions relatively separable.

## 6. Race cars whose aerodynamics are critically affected by ride height and pitch

This is the modern high-downforce case, and it inverts the priorities.

**The problem.** Downforce varies steeply with ride height and rake (Chapter 15). Downforce also *causes* ride height change. So the aerodynamic platform is a closed loop, and any body motion — heave from a bump, pitch under braking, roll in a corner — moves the car on its aero map, changing both the level and the balance of downforce.

**The objective** is therefore no longer ride quality or even contact patch load variation in isolation. It is **holding the aerodynamic platform within a narrow window across the whole operating envelope.**

**Consequences:**

1. **Very high heave stiffness.** Ride frequencies of 5–7 Hz or more, achieved with stiff springs, heave springs (third elements) and bump rubbers.

2. **Decoupled heave and roll stiffness.** A third spring acting only in heave allows very high heave stiffness (for platform control) with lower roll stiffness (for mechanical grip and balance). This is the single most important suspension architecture development of the modern aero era.

3. **Heavy reliance on bump rubbers/packers** as load-bearing elements at high speed, giving a deliberately bilinear or progressive heave rate.

4. **Damping tuned to the aero loading frequency**, not just the road. Aerodynamic load changes with speed and with the car's own motion, so the damper must control a mode driven by aerodynamics rather than by the road.

5. **Rebound control becomes critical.** Jacking down under repeated bumps risks driving the floor into the ground, stalling the diffuser, and losing all downforce at once — the most dangerous failure mode in the whole book.

6. **The mechanical grip trade is accepted.** These cars have poor mechanical compliance and ride badly over bumps and kerbs. That penalty is paid deliberately, because the aerodynamic gain is larger.

**The design tension in one sentence**: a suspension stiff enough to control the aero platform is too stiff to follow the road, and the resolution is to decouple the modes so that each can be tuned separately.

---

## Exercises

**22.1** A corner has sprung mass 160 kg and wheel rate 65 N/mm (tire rate 300 N/mm). Compute the ride rate, ride frequency, and the wheel-referred critical damping coefficient.

**22.2** For the corner in 22.1 with $IR = 0.60$, compute the damper-referred damping coefficient required for $\zeta = 0.7$.

**22.3** Compute the wheel hop frequency for the corner in 22.1 with unsprung mass 38 kg.

**22.4** A damper dyno gives 900 N at 50 mm/s damper velocity. With $IR = 0.62$, compute the wheel-referred force and the wheel velocity, and the equivalent wheel-referred damping coefficient.

**22.5** A car rolls 1.6° in 0.30 s during turn-in. With front roll stiffness 45 kN·m/rad, rear 38 kN·m/rad, front roll damping 3.5 kN·m·s/rad and rear 1.8 kN·m·s/rad, compute the steady-state and peak-transient TLLTD.

**22.6** Explain why excessive rebound damping causes jacking down, and why this is more dangerous on a high-downforce car than on a road car.

**22.7** A tire has $F_y = 1.7F_z - 6\times10^{-5}F_z^2$. Compare the mean lateral force for a tire held at a steady 3000 N with one oscillating between 2000 N and 4000 N (equal time at each). Relate the result to damper design objectives.

---

## Solutions

**22.1**
Ride rate:
$$
K_R = \frac{65 \times 300}{65+300} = \frac{19500}{365} = 53.42\ \text{N/mm} = 53{,}420\ \text{N/m}
$$
Ride frequency:
$$
f = \frac{1}{2\pi}\sqrt{\frac{53420}{160}} = \frac{1}{2\pi}\sqrt{333.9} = \frac{18.27}{6.283} = 2.91\ \text{Hz}
$$
Critical damping, wheel-referred:
$$
c_{\text{crit}} = 2\sqrt{K_R m_s} = 2\sqrt{53420 \times 160} = 2\sqrt{8.547\times10^6} = 2(2923.6) = 5847\ \text{N·s/m}
$$

**22.2**
Required wheel-referred coefficient:
$$
c_{\text{wheel}} = \zeta\,c_{\text{crit}} = 0.7 \times 5847 = 4093\ \text{N·s/m}
$$
Damper-referred:
$$
c_{\text{damper}} = \frac{c_{\text{wheel}}}{IR^2} = \frac{4093}{0.36} = 11{,}369\ \text{N·s/m}
$$

Sanity check on what this means at the damper: at 50 mm/s damper velocity, force $= 11369 \times 0.05 = 568$ N. That is a plausible low-speed damper force for a race car — confirming the numbers are in a sensible range. Note the $1/IR^2$ amplification: a low installation ratio demands a much stiffer damper, and also means the damper sees low velocities, pushing its operating range into the region where valving is hardest to control precisely. This is one of the practical arguments against very low installation ratios.

**22.3**
$$
f_{\text{hop}} = \frac{1}{2\pi}\sqrt{\frac{K_T + K_w}{m_u}} = \frac{1}{2\pi}\sqrt{\frac{300000 + 65000}{38}} = \frac{1}{2\pi}\sqrt{\frac{365000}{38}}
$$
$$
= \frac{1}{2\pi}\sqrt{9605} = \frac{98.0}{6.283} = 15.6\ \text{Hz}
$$

**The separation matters.** The body mode is at 2.91 Hz and the wheel hop mode at 15.6 Hz — a ratio of 5.4:1. That separation is what makes independent low-speed and high-speed damper tuning possible: inputs near 3 Hz excite the body and produce low wheel velocities; inputs near 15 Hz excite the wheel and produce high wheel velocities.

The separation narrows as the car gets stiffer. A high-downforce car at 6 Hz body frequency with the same wheel hop mode has a ratio of only 2.6:1, and the two modes begin to interact — one more reason damper tuning on such cars is harder.

**22.4**
$$
F_{\text{wheel}} = F_{\text{damper}} \times IR = 900 \times 0.62 = 558\ \text{N}
$$
$$
v_{\text{wheel}} = \frac{v_{\text{damper}}}{IR} = \frac{50}{0.62} = 80.6\ \text{mm/s}
$$
$$
c_{\text{wheel}} = \frac{558}{0.0806} = 6923\ \text{N·s/m}
$$
Check via the squared relation: $c_{\text{damper}} = 900/0.05 = 18{,}000$ N·s/m; $c_{\text{wheel}} = 18000 \times 0.62^2 = 18000 \times 0.3844 = 6919$ N·s/m ✓ (rounding).

**The practical point**: a dyno sheet reading "900 N at 50 mm/s" tells you almost nothing until you know the installation ratio. On this car it means 558 N at 80.6 mm/s of wheel velocity. On a car with $IR = 0.85$, the same damper would give 765 N at 58.8 mm/s — a completely different point on the car's operating map. Comparing damper settings between cars, or between front and rear on the same car with different ratios, requires wheel-referred conversion first.

**22.5**
**Steady state** (dampers contribute nothing):
$$
\text{TLLTD}_{ss} = \frac{45}{45+38} = \frac{45}{83} = 0.542 \quad (54.2\%\ \text{front})
$$

**Transient.** Roll velocity: $\dot\phi = 1.6°/0.30\ \text{s} = 5.33°/\text{s} = 0.0931$ rad/s.
Roll angle at that instant (take the peak-velocity point, roughly mid-transient, $\phi \approx 0.8° = 0.01396$ rad).

Damping moments:
$$
M_{\phi f}^{\text{damp}} = 3500 \times 0.0931 = 326\ \text{N·m}
$$
$$
M_{\phi r}^{\text{damp}} = 1800 \times 0.0931 = 168\ \text{N·m}
$$
Spring moments at $\phi = 0.01396$ rad:
$$
M_{\phi f}^{\text{spring}} = 45000 \times 0.01396 = 628\ \text{N·m}
$$
$$
M_{\phi r}^{\text{spring}} = 38000 \times 0.01396 = 531\ \text{N·m}
$$

Total front: $628 + 326 = 954$ N·m. Total rear: $531 + 168 = 699$ N·m.
$$
\text{TLLTD}_{\text{transient}} = \frac{954}{954+699} = \frac{954}{1653} = 0.577 \quad (57.7\%\ \text{front})
$$

**The transient TLLTD is 3.5 points further forward than the steady-state value** — a substantial understeer contribution that exists only during turn-in and vanishes once the car is settled.

This is exactly the mechanism behind "the car pushes on entry but is fine mid-corner." The fix is to reduce front low-speed bump damping or increase rear, not to touch the bars — which would move the mid-corner balance that was already correct. It is the clearest possible illustration of why diagnosing the *phase* of a complaint precedes choosing a tool.

Note that this transient effect scales with roll velocity, so it is larger for aggressive turn-in and on quick direction changes, and smaller in long sweeping corners. A driver who changes their turn-in style changes the car's transient balance without anyone touching the car.

**22.6**
**The mechanism.** Consider a wheel that hits a bump. The wheel moves up rapidly, compressing the suspension. When the bump passes, the spring pushes the wheel back down — but the rebound damper resists that extension. If the rebound damping is high and the next bump arrives before the wheel has fully re-extended, the suspension starts the next compression from a partially compressed position.

Over a series of bumps this ratchets: each bump compresses fully, each recovery is incomplete, and the average suspension position migrates toward bump. The body sits progressively lower. This is **jacking down** (or "packing down").

Formally, it occurs when the rebound time constant is long compared with the bump repetition interval:
$$
\frac{c_{\text{rebound}}}{K_R} \gtrsim \frac{1}{f_{\text{bump}}}
$$

**Why it is worse on a high-downforce car.**

On a **road car**, jacking down over a rough section costs some suspension travel, produces a harsh ride, and may cause bottoming on a large input. Unpleasant, but bounded — the car simply rides lower until the surface smooths out.

On a **high-downforce car** the consequences compound:

1. **The aero map is steep near the ground.** A 15 mm reduction in ride height may be the difference between peak downforce and a stalled floor. The car does not gradually lose performance; it falls off a cliff (Chapter 15, Exercise 15.6).

2. **The loss is front-biased and therefore a balance event.** The front of the floor runs closest to the ground, so it stalls first, producing sudden severe understeer at high speed.

3. **The suspension is already running very close to its limits.** With 5–7 Hz ride frequencies and minimal travel, there is no reserve to absorb the migration.

4. **The failure is self-reinforcing in the opposite direction.** If instead the car loses downforce, it rises — but the transition through the stall is abrupt and can produce an oscillation (porpoising), where the car repeatedly stalls and recovers its floor at a few Hz. This is a genuine and well-documented failure mode of ground-effect cars.

5. **It happens exactly where it is most dangerous**: on a bumpy section taken at high speed, where downforce is maximal and the consequences of losing it are greatest.

**Design responses**: limit rebound damping (and use blow-off valving so that high-velocity rebound is not over-resisted), use bump rubbers to define a hard floor for ride height, use heave springs to give high heave stiffness without excessive damping demand, and check ride-height traces from track data for downward drift over rough sections.

**22.7**
Steady at 3000 N:
$$
F_y = 1.7(3000) - 6\times10^{-5}(3000)^2 = 5100 - 540 = 4560\ \text{N}
$$

Oscillating between 2000 and 4000 N, equal time:
$$
F_y(2000) = 3400 - 240 = 3160\ \text{N}
$$
$$
F_y(4000) = 6800 - 960 = 5840\ \text{N}
$$
$$
\overline{F_y} = \frac{3160 + 5840}{2} = 4500\ \text{N}
$$

**Loss: 60 N, or 1.32%.**

The loss equals $c\,\Delta^2 = 6\times10^{-5}(1000)^2 = 60$ N exactly — the same quadratic relation as lateral load transfer (Chapter 2, Exercise 2.6), now applied to load variation in *time* rather than across a track.

**Relation to damper design.** This is the analytical justification for treating **contact patch load variation as the damper's primary objective function**:

1. Any oscillation in vertical load reduces the average lateral force available, regardless of whether the mean load is unchanged. The tire's concavity guarantees it.

2. The penalty scales with the **square** of the load fluctuation, so large excursions are disproportionately costly. Suppressing the worst 20% of the load variation matters more than trimming the rest.

3. It applies to *every* source of load variation: road bumps, wheel hop, body oscillation, aerodynamic fluctuation, and driveline torque variation.

4. It gives a measurable, physically-grounded metric — RMS contact patch load variation on a 7-post rig — that can be optimized without reference to subjective ride quality or lap time, and which correlates well with both.

The magnitude here (1.3% for a ±33% load swing) may look small, but real wheel-hop excursions on a bumpy circuit can approach ±60–80% of static load momentarily, where the loss becomes 5–8% of available grip. Over a lap, and across four tires, that is easily several tenths of a second — and it is grip that costs nothing to recover except correct damping.
