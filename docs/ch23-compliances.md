# Chapter 23 — Compliances

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 23. Original explanatory material.*

---

## 1. The final chapter, and why it is last

Every chapter of Part II has assumed rigid links, rigid uprights, rigid mountings and a rigid chassis. Chapter 23 removes that assumption and asks what changes.

The answer is: more than most engineers expect. Compliance is not an error term. On a road car it is a designed feature — bushings are chosen to deliver specific compliance steer characteristics. On a race car it is usually an unwanted deviation, but it is always present, and the difference between a suspension's *kinematic* behaviour (what the geometry says) and its *elastokinematic* behaviour (what actually happens under load) is routinely 20–40% on the quantities that matter.

Placing this chapter last is deliberate: you cannot understand what compliance does to a car until you understand what the car is supposed to do without it.

## 2. Sources of compliance

| Source | Typical magnitude | Effect |
|---|---|---|
| Rubber bushings | Very large (road cars) | Compliance steer, camber, longitudinal isolation |
| Spherical bearings / rod ends | Small but nonzero (clearance + deflection) | Play and lost motion |
| Control arm bending | Small if well designed | Camber and toe change under load |
| Upright / hub deflection | Moderate | Camber change under lateral load |
| Wheel bearing clearance and deflection | Moderate | Camber change, especially under braking |
| Wheel rim deflection | Small to moderate | Camber and lateral contact patch movement |
| Tire carcass lateral compliance | **Large** | Effective slip angle, relaxation length |
| Steering system (column, rack, tie rods) | **Large** | Lost steer angle (Chapter 19, Ex 19.4) |
| Chassis torsion | Large if inadequate | TLLTD dilution (Chapter 18, §4) |
| Subframe and mounting compliance | Moderate | Whole-axle steer |
| Anti-roll bar mountings and drop links | Moderate | Reduced effective bar rate |

Note that the two largest single terms on a well-built race car are usually the **tire carcass** and the **steering system** — neither of which is a suspension bushing.

## 3. Compliance as a spring in series

The unifying principle: a compliant element in the load path acts as a spring **in series** with the stiffness it is meant to transmit.

$$
\frac{1}{K_{\text{effective}}} = \frac{1}{K_{\text{intended}}} + \frac{1}{K_{\text{compliance}}}
$$

Consequences:
- The **softest element dominates.** A stiff bar on a compliant mount behaves like the mount.
- Effective stiffness is always **less** than intended, never more.
- Adding stiffness to an already-stiff element gains little if a compliant element is in series — the classic case of a team fitting a much stiffer anti-roll bar and observing almost no change, because the drop links and mounts were the limiting compliance all along.

**Worked relation for a bar in series with its mounts:**
$$
K_{\text{eff}} = \frac{K_{\text{bar}}K_{\text{mount}}}{K_{\text{bar}}+K_{\text{mount}}}
$$
With $K_{\text{bar}} = 30$ kN·m/rad and $K_{\text{mount}} = 60$ kN·m/rad, $K_{\text{eff}} = 20$ kN·m/rad — **a third of the bar's rate is lost**, and doubling the bar to 60 would give only 30, not 60.

## 4. Compliance steer

**Definition**: toe change produced by a force at the contact patch, as distinct from bump steer (toe change produced by suspension travel).

Two driving forces:

**Lateral compliance steer** — a lateral force $F_y$ at the contact patch deflects the suspension links and bushings, steering the wheel.
$$
\Delta\delta = C_{\delta F_y}F_y
$$
- **Toe-out under lateral load** at the front → increased slip angle → increased front lateral force → **oversteer contribution**.
- **Toe-in under lateral load** at the rear → increased rear slip angle in the stabilizing sense → **understeer contribution**, which is the standard and desirable design.

**Longitudinal compliance steer** — a braking or driving force steers the wheel.
- Braking force at the front with a positive scrub radius and compliant longitudinal location produces toe-out → destabilizing.
- The classic road car design uses rear bushings arranged so that a braking force produces rear toe-in, adding stability exactly when it is needed.

**Aligning torque compliance steer** — the tire's own $M_z$, acting through the steering system's compliance, steers the wheel. Since $M_z$ falls near the limit (Chapter 2), this effect is nonlinear and contributes to the shape of $K(A_y)$.

## 5. Compliance camber

Lateral force at the contact patch acts at ground level, a distance $r$ below the wheel centre, generating a moment that tries to camber the wheel positively (leaning out at the top):

$$
M_{\text{camber}} = F_y \times r
$$

At $F_y = 5000$ N and $r = 0.33$ m, that is 1650 N·m — a very large moment applied to the upright, bearings and arms.

Typical outcomes: 0.3–1.0° of positive camber gain at the loaded outside wheel under high lateral load, in a car with a nominally rigid suspension. That is comparable to a deliberate static camber setting, and it always acts in the unfavourable direction.

**Design responses:**
- Stiff uprights and large-diameter, widely-spaced wheel bearings.
- Wide-based control arms to react the camber moment as a couple rather than in bending.
- Deliberate static camber allowance for the expected compliance camber (measured, not guessed).
- Stiff wheels — wheel rim compliance is a real contributor and is often overlooked.

## 6. Compliance as a design tool

On road cars, compliance is engineered deliberately:

- **Longitudinal compliance** at the front for impact harshness isolation — the wheel is allowed to move rearward over a sharp bump. Requires a bushing arrangement that is soft longitudinally and stiff laterally, which is why road car bushings are often voided or hydraulically damped.
- **Rear compliance understeer** — bushing geometry that produces rear toe-in under lateral and braking loads, adding stability without any kinematic cost.
- **Noise and vibration isolation** at subframe mounts.

On race cars, the philosophy is nearly the opposite: **eliminate compliance so that the kinematics designed in Chapter 17 are the kinematics the car actually has.** Spherical bearings replace bushings everywhere, arms are made stiff, and the remaining compliance (tire, steering, chassis) is measured and accounted for.

The exception: some race cars deliberately retain a small, controlled compliance — for instance in a rear subframe or a steering rack mount — to filter high-frequency inputs that would otherwise reach the driver or excite a resonance.

## 7. Measuring compliance

Compliance is measured on a **kinematics and compliance (K&C) rig**: the car is held by its chassis and forces and moments are applied at the contact patches while wheel position and orientation are measured.

Standard outputs:
- Toe and camber per unit lateral force (deg/kN)
- Toe and camber per unit longitudinal force (deg/kN)
- Toe per unit aligning torque (deg/kN·m)
- Lateral and longitudinal contact patch displacement per unit force (mm/kN)
- Steering system compliance (deg at road wheel per kN·m)

Typical race car targets: under 0.05 deg/kN lateral compliance steer; road cars often run 0.2–0.5 deg/kN by design.

**These numbers then feed back into the models**: a compliance steer coefficient is added to the cornering compliance of Chapter 5, changing $K$; the effective bar rates of Chapter 16 are reduced; the TLLTD of Chapter 18 is diluted by chassis twist. Compliance does not require a new theory — it modifies the parameters of the theory already built.

## 8. Closing the loop

This chapter completes the book's structure. Part I built a theory of the vehicle as a rigid body with idealized force generators. Part II built each subsystem in engineering detail. Chapter 23 acknowledges that the subsystems are not rigid, and shows how to fold that reality back into the Part I parameters.

The practical discipline that results:

1. Design the kinematics (Chapter 17).
2. Compute the rates (Chapters 16, 21) and the load transfers (Chapter 18).
3. Predict the balance (Chapters 7, 8).
4. **Measure** the compliances (this chapter) and the chassis stiffness (Chapter 18).
5. Correct the model parameters.
6. Re-predict, and validate against track measurement (Chapter 11).

Skipping step 4 is why so many well-calculated cars do not behave as calculated.

---

## Exercises

**23.1** An anti-roll bar has a nominal rate of 28 kN·m/rad. Its drop links and mounts together have a rate of 45 kN·m/rad. Compute the effective rate and the percentage loss. If the bar is replaced with a 40 kN·m/rad unit, compute the new effective rate and the realized fraction of the intended increase.

**23.2** A front suspension has a lateral compliance steer coefficient of 0.12 deg/kN (toe-out). At 1.5 g the front axle generates 6200 N. Compute the compliance steer angle and its contribution to the understeer gradient.

**23.3** A rear suspension has 0.09 deg/kN of toe-in under lateral load. At the same 1.5 g the rear axle generates 6900 N. Compute the rear compliance steer and the net effect on $K$ combined with Exercise 23.2.

**23.4** An upright and bearing assembly deflects to give 0.55° of positive camber at 5000 N of lateral force. If the target dynamic camber is −2.0°, what static camber is required, given 1.2° of camber loss from body roll and 0.8° of camber gain from suspension geometry?

**23.5** A tire's carcass lateral compliance is 380 N/mm. At 5500 N of lateral force, compute the contact patch lateral displacement and estimate the additional effective slip angle if the contact patch length is 180 mm.

**23.6** A chassis with 3800 N·m/deg torsional stiffness is used with axle roll stiffnesses of 46 and 40 kN·m/rad. Estimate the fraction of intended TLLTD change realized, and state the design target for chassis stiffness.

**23.7** Explain why compliance is designed *into* road cars and designed *out of* race cars, and identify one race application where deliberate compliance is retained.

---

## Solutions

**23.1**
Series combination:
$$
K_{\text{eff}} = \frac{28 \times 45}{28+45} = \frac{1260}{73} = 17.26\ \text{kN·m/rad}
$$
Loss: $1 - 17.26/28 = 38.4\%$.

With a 40 kN·m/rad bar:
$$
K_{\text{eff}}' = \frac{40 \times 45}{85} = \frac{1800}{85} = 21.18\ \text{kN·m/rad}
$$

Intended increase: $40 - 28 = 12$ kN·m/rad.
Realized increase: $21.18 - 17.26 = 3.92$ kN·m/rad.
$$
\text{Realized fraction} = \frac{3.92}{12} = 32.7\%
$$

**Only a third of the intended stiffness increase is realized.** The engineer, expecting a 43% increase in bar rate, gets 23% — and the balance change is correspondingly smaller than predicted.

This is the single most common cause of the complaint "the bar change didn't do anything." The remedy is not a bigger bar (which yields ever less, as the series relation asymptotes toward $K_{\text{mount}} = 45$) but **stiffer mounts and drop links.** Note the asymptote: even an infinitely stiff bar would only give 45 kN·m/rad. The mounting compliance sets a hard ceiling on what the bar can ever achieve.

**23.2**
$$
\Delta\delta_f = 0.12\ \text{deg/kN} \times 6.2\ \text{kN} = 0.744°\ \text{toe-out}
$$

Toe-out at the front increases the front slip angle magnitude in the direction of the turn... more precisely, front toe-out under lateral load means the wheels steer *further into* the turn than commanded, so **less driver steer is required** for the same path — an oversteer contribution.

Contribution to $K$:
$$
\Delta K = -\frac{0.744°}{1.5\ \text{g}} = -0.496\ \text{deg/g}
$$

**Half a degree per g of oversteer contribution from front compliance alone** — a very large number. For comparison, the whole understeer gradient of a well-set-up race car might be 1–2 deg/g. This level of compliance (0.12 deg/kN) would be normal for a road car and unacceptable for a race car.

**23.3**
$$
\Delta\delta_r = 0.09 \times 6.9 = 0.621°\ \text{toe-in}
$$

Rear toe-in under lateral load steers the rear wheels *out of* the turn, which increases the rear slip angle required... in the stabilizing sense: the rear axle generates more lateral force for the same body sideslip, resisting yaw. This is an understeer contribution.

$$
\Delta K_r = +\frac{0.621}{1.5} = +0.414\ \text{deg/g}
$$

**Net effect:**
$$
\Delta K_{\text{total}} = -0.496 + 0.414 = -0.082\ \text{deg/g}
$$

The two compliances very nearly cancel, leaving a small net oversteer contribution of 0.08 deg/g.

**Two lessons.** First, this near-cancellation is exactly how road car suspension engineers use compliance deliberately — front compliance oversteer (which improves turn-in feel and steering response) balanced against rear compliance understeer (which provides stability). The net is tuned to a small, controlled value.

Second, and more cautionary for a race engineer: the *net* being small does not mean the compliance is harmless. Each term is large individually, so:
- The cancellation holds only at this specific lateral acceleration and load distribution. Under braking, under power, or at a different $A_y$, the two terms scale differently and the cancellation fails.
- Manufacturing variation, bushing ageing, and temperature change the two coefficients independently, so the balance drifts.
- The compliance introduces phase lag in transient response that no amount of steady-state cancellation removes.

A race car should have both coefficients small, not two large ones that happen to cancel.

**23.4**
Camber budget at the loaded outside wheel, with negative = favourable:
$$
\gamma_{\text{dynamic}} = \gamma_{\text{static}} + (\text{roll loss}) + (\text{geometry gain}) + (\text{compliance loss})
$$
$$
-2.0 = \gamma_{\text{static}} + 1.2 - 0.8 + 0.55
$$
$$
\gamma_{\text{static}} = -2.0 - 1.2 + 0.8 - 0.55 = -2.95°
$$

**Static camber of −2.95°** is required, of which 0.55° — nearly 19% of the total — exists purely to compensate for structural deflection.

Two observations. First, if the compliance were not measured and were instead assumed zero, the engineer would set −2.4° static, run 0.55° short of target dynamically, and spend the session chasing the resulting front grip deficit with bars and pressures. Second, compliance camber is **load-dependent**, so it is not a fixed offset: at 0.8 g it might be 0.29°, at 2.0 g it might be 0.73°. A static camber chosen to be correct at one lateral acceleration is wrong at others, which contributes to the nonlinearity of $K(A_y)$ (Chapter 5) in a way that no kinematic model predicts.

The engineering priority follows directly: **stiffening the upright and bearing assembly is worth more than any amount of camber adjustment**, because it removes a load-dependent error rather than compensating for it at one point.

**23.5**
Lateral deflection of the contact patch relative to the wheel:
$$
\delta_y = \frac{F_y}{K_{\text{carcass}}} = \frac{5500}{380} = 14.5\ \text{mm}
$$

Estimating the additional effective slip angle: the carcass deflection means the contact patch is displaced laterally relative to the wheel plane. Treating the deflection as occurring over the contact patch length as an effective yaw of the patch:
$$
\Delta\alpha \approx \arctan\left(\frac{\delta_y}{a}\right)\quad\text{using a characteristic length}
$$

The more physically meaningful treatment uses the relaxation length. The carcass compliance and the tread stiffness together define $\sigma_r$, and the deflection $\delta_y$ is the steady-state lateral distortion. Using the contact patch length as the relevant scale:
$$
\Delta\alpha \approx \frac{14.5}{180} = 0.0806\ \text{rad} = 4.6°
$$

This is an overestimate of the *additional* slip angle (the carcass deflection is not entirely additive to the tread slip; much of it is already embedded in the measured $C_\alpha$), but it illustrates the essential point: **carcass compliance is comparable in magnitude to the entire tread slip mechanism.**

The correct interpretation is that a tire's measured cornering stiffness $C_\alpha$ **already includes** carcass compliance — it is the series combination of tread stiffness and carcass stiffness. This is why the brush model's $C_\alpha = 2c_pa^2$ underpredicts real tires, and why $C_\alpha$ is always measured rather than calculated. The carcass is not a correction to the tire model; it is one of the two springs in series that constitute the tire model.

The practical consequence for a race engineer: tire pressure changes carcass stiffness, and therefore changes $C_\alpha$ and the peak slip angle, and therefore changes the balance — which is why pressure is such a high-leverage adjustment (Chapter 12).

**23.6**
Chassis: $3800 \times 57.3 = 217{,}740$ N·m/rad $= 217.7$ kN·m/rad.
Axle total: $46 + 40 = 86$ kN·m/rad.
Ratio: $217.7/86 = 2.53$.

Estimating the realized TLLTD change, using the approximation from Chapter 18:
$$
\text{effectiveness} \approx \frac{K_c}{K_c + K_f + K_r} = \frac{217.7}{217.7 + 86} = \frac{217.7}{303.7} = 0.717
$$

**Roughly 70–72% of the intended TLLTD change is realized**; nearly 30% is absorbed by chassis twist.

**Design target.** The book's criterion (Ch. 18) is that the chassis must resist approximately the *difference* between the front and rear roll rates. Here that difference is $|46-40| = 6$ kN·m/rad against 217.7 kN·m/rad of chassis — a 36:1 ratio, comfortably met. Judged instead against the widely-used heuristic of 5–10× the *total* roll stiffness (430–860 kN·m/rad, or 7,500–15,000 N·m/deg), the measured 3,800 N·m/deg falls short.

The book's own reference figures put small formula cars near 3,000 lb·ft/deg (4,100 N·m/deg), so 3,800 N·m/deg is typical rather than unusually poor. The estimate above is a heuristic, not a book result, and the honest conclusion is that this chassis transmits the front/rear differential torque adequately while still diluting setup changes enough to be worth measuring.

The practical implication is severe and worth stating plainly: on this car, the entire apparatus of Chapters 7, 16 and 18 — computing roll stiffnesses, predicting TLLTD, choosing bars to hit a balance target — is being applied to a car that only partly obeys it. Every setup change is attenuated by an unknown and possibly nonlinear factor, correlation between simulation and track degrades, and the engineer slowly loses trust in the model. Fixing chassis stiffness is not a refinement; it is what makes the rest of the book applicable.

**23.7**
**Why road cars design compliance in.**

Road cars must satisfy objectives that race cars ignore entirely:
- **Impact harshness and NVH.** A sharp bump or an expansion joint must not transmit a bang into the cabin. Longitudinal compliance at the front wheel lets the wheel move rearward, converting a sharp vertical-and-longitudinal impulse into a softer, longer event. This is impossible with rigid links.
- **Road noise isolation.** Rubber and hydraulic bushings break the structure-borne noise path from tire to body.
- **Stability with wide manufacturing tolerances and long service life.** Compliance understeer at the rear provides a stability margin that survives worn components, mismatched tires, uneven loading and inexpert drivers.
- **Cost and durability.** Bushings are cheap, sealed, maintenance-free and tolerant of misalignment. Spherical bearings are expensive, require maintenance, and transmit noise.
- **Deliberate handling shaping.** Compliance steer coefficients are a design variable, tuned to give a desired steering feel and stability signature without changing the kinematics.

**Why race cars design compliance out.**

- **Predictability.** A race car is set up by making small, calculated changes and measuring the result. Compliance makes the response to a change load-dependent, temperature-dependent and time-varying — destroying the correlation between change and effect.
- **The kinematics must be real.** The camber curves, roll centres and anti-features designed in Chapter 17 only exist if the links hold their geometry under load.
- **Response speed.** Compliance adds phase lag between driver input and tire force, reducing yaw natural frequency and adding delay exactly where the driver is closing a high-gain loop (Chapter 6).
- **NVH is irrelevant.** Nobody cares about road noise in a race car.
- **Service life is short and maintenance is available.** Spherical bearings can be inspected and replaced between events.

**A race application where compliance is deliberately retained.**

The clearest example is the **steering rack mounting and column** on some cars, where a small, controlled compliance (or a damper in the steering system) is retained to filter high-frequency kickback from kerbs and bumps that would otherwise fatigue the driver's hands and mask the low-frequency torque signal that carries the front-limit information (Chapter 19). The design intent is a low-pass filter: keep the 0–3 Hz content the driver uses, attenuate the 20+ Hz content they do not.

Two other legitimate cases:
- **Rear subframe or differential mounts** on cars where driveline torque reaction would otherwise transmit harshly into the chassis and excite a structural mode.
- **Tire carcass compliance itself**, which is not designed out because it cannot be — and which, as Exercise 23.5 showed, is a first-order part of how the tire generates force. On very stiffly-sprung cars the carcass becomes the primary compliance in the whole vertical load path (Chapter 16, Exercise 16.7), and is tuned via pressure rather than eliminated.
