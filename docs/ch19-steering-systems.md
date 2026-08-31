# Chapter 19 — Steering Systems

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 19. Original explanatory material.*

---

## 1. The steering system's two jobs

The steering system does two things, and they are in tension:

1. **Command** — convert the driver's hand motion into front wheel steer angles, with a ratio and a geometry that place each front tire at a useful slip angle.
2. **Feedback** — return to the driver, as torque at the rim, information about what the front tires are doing.

The second job is the one most easily destroyed and the hardest to recover. Chapter 2 established the mechanism: pneumatic trail collapses as the tire approaches its lateral force peak, so steering torque eases *before* grip is lost. That is the driver's front-limit sensor, and every design decision in this chapter either preserves it or buries it.

## 2. Steering geometry

The steering axis (kingpin axis) is defined by the upper and lower ball joints. Four angles and lengths characterize it.

**Caster angle** $\tau$ — inclination of the steering axis in side view, positive when the axis leans rearward at the top. Caster produces:
- **Mechanical trail** $t_m = r_{\text{wheel}}\tan\tau$ (modified by any longitudinal offset of the axis at the ground). This adds to pneumatic trail to give total trail and hence steering torque.
- **Camber gain with steer**: the outside wheel gains negative camber and the inside wheel positive camber as the wheel is steered. This is a genuinely useful effect — it delivers camber where it is wanted, at the loaded outside wheel, in proportion to steer angle.
- **Steering self-centring** even on a zero-friction surface.

Typical race values: 3–8°, sometimes more on cars that rely on caster-induced camber.

**Kingpin inclination (KPI)** $\sigma$ — inclination of the steering axis in front view, positive when the axis leans inboard at the top. KPI produces:
- **Steering axis rise**: steering the wheel lifts the car slightly, which creates a self-centring torque proportional to vertical load and to $\sin\sigma\sin\delta$. This centring is load-dependent, not slip-angle-dependent, so it is *noise* in the feedback channel.
- **Positive camber gain with steer** at both wheels (opposing the caster effect).
- Reduction of scrub radius for a given wheel offset.

Typical: 5–15°. Race cars keep KPI as low as packaging allows, precisely because its centring torque dilutes the pneumatic trail signal.

**Scrub radius** (kingpin offset at ground) — the lateral distance at ground level between the steering axis and the tire centreline.
- **Positive** (axis intersects ground inboard of the tire centre): braking force generates a toe-out moment.
- **Zero**: no braking-force steering moment — "centre point steering".
- **Negative**: braking force generates toe-in; used on road cars for split-friction braking stability.

Large scrub radius makes the steering communicative about longitudinal forces (useful for detecting lockup) but transmits every bump and brake torque variation to the driver's hands. Race practice is usually small positive or near zero.

**Spindle length / steering offset** — the offset of the wheel centre from the steering axis, which sets the leverage of longitudinal forces about the axis.

## 3. Ackermann steering geometry

In a low-speed turn with no slip angles, the inside wheel traverses a smaller radius and must be steered more than the outside wheel. The exact condition:

$$
\cot\delta_o - \cot\delta_i = \frac{t}{L}
$$

This is **100% Ackermann**, achieved geometrically by angling the steering arms so they point at the centre of the rear axle.

**Why race cars usually don't use it.** At racing lateral acceleration, the inside front tire is very lightly loaded (Chapter 18) — sometimes nearly airborne. Meanwhile:
- Peak slip angle **increases with vertical load** (Chapter 14, Exercise 14.3). So the heavily loaded outside tire wants a *larger* slip angle than the lightly loaded inside one.
- Ackermann gives the inside tire *more* steer, i.e. more slip angle, which is exactly backwards.
- The over-steered inside tire is past its peak, generating little lateral force and a lot of drag and heat.

Hence the alternatives:

| Geometry | Description | Application |
|---|---|---|
| **Pro-Ackermann (100%+)** | Inside wheel steers more | Low speed, low $A_y$, autocross, road cars, wet |
| **Parallel steer (0%)** | Both wheels steer equally | Common compromise for circuit racing |
| **Anti-Ackermann (negative)** | Outside wheel steers more | High downforce, high $A_y$, ovals |

Formula cars commonly run parallel to modestly anti-Ackermann. The correct choice depends on the operating lateral acceleration, which is why it is a circuit-and-class decision rather than a universal rule.

**The rack position determines the sense.** With the steering arms angled inboard and the rack **ahead** of the axle, you get one sense; behind the axle, the opposite. Ackermann percentage is tuned by the steering arm angle and length and by the rack's fore/aft and vertical position.

## 4. Steering gears and ratios

**Overall steering ratio** $G$ = steering wheel angle / average road wheel angle. Typical values:

| Vehicle | Ratio |
|---|---|
| Passenger car | 15–20:1 |
| Sports car | 13–16:1 |
| Formula car | 8–12:1 |
| Kart | direct (~1:1) |

Lower ratio = quicker steering = higher gain, but also higher steering torque at the rim (torque scales as $1/G$) and less resolution for fine corrections.

**Types:**
- **Rack and pinion** — universal in racing. Direct, light, stiff, low friction, easily geometry-tuned. Ratio can be varied along the rack travel (variable-ratio racks).
- **Recirculating ball / worm and sector** — used on heavy vehicles and older designs. Higher friction, more compliance, but tolerant of shock loads and packages with a beam axle.

**Steering system compliance** is a real and often dominant term. Column, U-joints, rack mounts, tie rods and steering arms all deflect under load. At 1.5 g a race car can lose several tenths of a degree of front steer to compliance, which:
- Reduces the effective steering ratio (making the car feel lazy),
- Adds an apparent understeer contribution that varies with load,
- Introduces phase lag in transient response.

Chapter 11's warning applies: understeer gradient measured from steering wheel angle without a compliance correction is systematically wrong.

## 5. Ride and roll steer (bump steer)

**Bump steer** is toe change with suspension travel. It arises when the tie rod's arc of motion does not match the arc of the outer ball joint through travel.

The kinematic condition for zero bump steer: the tie rod must lie on a line that passes through the front-view instant centre, and its inner and outer ends must be positioned so that the tie rod's effective swing arm matches the suspension's. In practice it is set by shimming the rack height and adjusting tie rod length, then measured by jacking the wheel through travel with a bump-steer gauge.

**Why it matters more on race cars:**
- A downforce car's ride height changes substantially with speed, so a bump steer curve produces a **speed-dependent toe change** — the car steers itself as it accelerates down a straight.
- Over kerbs and bumps, bump steer produces uncommanded steer inputs.
- Asymmetric bump steer left to right produces a pull.

**Roll steer** is the axle-level toe change in roll, i.e. the net steer effect when one wheel rises and the other falls. It is a powerful and legitimate tuning tool, especially at the rear:
- **Rear roll understeer** (rear axle steers toward the outside of the turn in roll) is stabilizing.
- **Rear roll oversteer** is destabilizing and should be designed out.

Some race cars deliberately run a small amount of front bump steer (toe-out in bump) to sharpen turn-in as the outside wheel compresses. This is a fine-tuning choice, not a default.

## 6. Alignment

**Toe.** Static toe is measured as total toe (sum of both wheels) or per wheel; be explicit.
- **Front toe-out**: quicker turn-in, more initial response, more straight-line wander, more tire scrub and heat.
- **Front toe-in**: straight-line stability, lazier turn-in.
- **Rear toe-in**: strongly stabilizing — as the car yaws, the rear axle generates a restoring slip angle. The standard first fix for corner-entry oversteer.
- **Rear toe-out**: almost never wanted.

Typical race values: front 0 to 2 mm total toe-out; rear 1–3 mm total toe-in.

**Camber.** Covered in Chapters 12 and 17; set by tire temperature spread in the cornering attitude, not by the static number.

**Caster split** left to right creates a pull, sometimes used deliberately on ovals or to compensate for road crown.

## 7. Steering torque

Total torque at the road wheel:

$$
M_{\text{steer}} \approx F_y(t_p + t_m) + F_z\,(\text{KPI and caster jacking terms}) + F_x\,(\text{scrub radius}) + M_{\text{friction}}
$$

At the steering wheel, divide by the ratio $G$ and by the mechanical efficiency.

The design objective: make the $F_y(t_p + t_m)$ term dominate, because that is the term carrying the information. Specifically:

- Keep $t_m$ (caster trail) **comparable to or smaller than** $t_p$ at moderate slip angles, so that the collapse of $t_p$ near the limit produces a clearly perceptible torque drop. If $t_m \gg t_p$, total trail barely changes and the warning disappears.
- Minimize KPI-driven and friction terms.
- Minimize system friction and hysteresis — a sticky rack destroys small-signal feel.
- If power assistance is used, make it torque-proportional rather than torque-limiting, so the shape of the torque curve survives.

**Design tension**: more caster gives useful camber with steer (section 2) but degrades the trail signal. This is a real trade with no universal answer; teams resolve it by measuring, and by giving the driver the choice.

---

## Exercises

**19.1** A car has wheelbase 2.75 m, front track 1.60 m, and is turning with an outside front steer angle of 6.0°. Compute the inside wheel steer angle for 100% Ackermann, and the difference from parallel steer.

**19.2** A wheel has rolling radius 0.33 m and 6° of caster, with the steering axis passing through the wheel centre in side view. Compute the mechanical trail. If pneumatic trail is 28 mm at 3° slip angle and 6 mm at the lateral force peak, compute the ratio of total trail in the two conditions and comment on the feedback quality.

**19.3** For the same wheel, repeat with 12° of caster and compare.

**19.4** A steering system has a ratio of 11:1 and total system compliance equivalent to 0.9 deg of steering wheel rotation per 100 N·m of rack-referred torque. At 1.4 g the front axle generates 6800 N of lateral force with 45 mm of total trail. Estimate the lost road-wheel steer angle and the resulting error in a measured understeer gradient.

**19.5** A downforce car's front ride height falls 18 mm from 40 m/s to 80 m/s. Its bump steer curve gives 0.06° of toe-out per 10 mm of bump per wheel. Compute the toe change and discuss the consequence.

**19.6** Explain, using the load-dependence of peak slip angle, why anti-Ackermann suits a high-downforce car and pro-Ackermann suits an autocross car.

**19.7** A car has 8° KPI, 0.33 m rolling radius, and 25 mm scrub radius. Under braking, one front tire generates 4200 N and the other, on a wet patch, 1400 N. Compute the steering torque disturbance at the road wheels.

---

## Solutions

**19.1**
100% Ackermann condition:
$$
\cot\delta_o - \cot\delta_i = \frac{t}{L} = \frac{1.60}{2.75} = 0.5818
$$
With $\delta_o = 6.0°$: $\cot 6.0° = 9.514$.
$$
\cot\delta_i = 9.514 - 0.5818 = 8.932 \Rightarrow \delta_i = \arctan(1/8.932) = 6.39°
$$

**Inside wheel: 6.39°**, i.e. 0.39° more than the outside — a difference of 6.5%.

Under parallel steer both wheels would be at 6.0°, so the inside wheel is under-steered by 0.39° relative to Ackermann.

Note how small the Ackermann difference is at modest steer angles. It grows rapidly at large angles: at $\delta_o = 20°$, $\cot 20° = 2.747$, $\cot\delta_i = 2.165$, $\delta_i = 24.8°$ — a 4.8° difference. **Ackermann matters in hairpins and parking, and is nearly irrelevant in fast corners.** That is itself an argument for choosing the geometry to suit the fast corners, where the slip-angle mismatch penalty is real, and accepting the compromise in slow ones.

**19.2**
$$
t_m = r\tan\tau = 0.33 \times \tan 6° = 0.33 \times 0.1051 = 0.0347\ \text{m} = 34.7\ \text{mm}
$$

At 3° slip angle: total trail $= 28 + 34.7 = 62.7$ mm.
At the lateral force peak: total trail $= 6 + 34.7 = 40.7$ mm.

Ratio: $40.7/62.7 = 0.649$ — **total trail falls by 35%** as the tire goes from 3° to its peak.

Meanwhile lateral force is *rising* over that range (say from 55% to 100% of peak, a factor of 1.82). Net steering torque, $\propto F_y \times t_{\text{total}}$:
- At 3°: $0.55 F_{\max} \times 62.7 = 34.5$ (arbitrary units)
- At peak: $1.00 F_{\max} \times 40.7 = 40.7$

Torque still rises, by 18%, but far less than force does (82%). The driver feels the steering "go light relative to the cornering", which is a usable but not emphatic cue. Beyond the peak, force falls and trail stays low, so torque drops clearly.

**Assessment: acceptable feedback.** The pneumatic component (28 mm) is comparable to the mechanical (34.7 mm), so trail collapse is visible in the torque.

**19.3**
$$
t_m = 0.33 \times \tan 12° = 0.33 \times 0.2126 = 0.0702\ \text{m} = 70.2\ \text{mm}
$$

At 3°: total trail $= 28 + 70.2 = 98.2$ mm.
At peak: $6 + 70.2 = 76.2$ mm.

Ratio: $76.2/98.2 = 0.776$ — trail falls only 22%.

Net torque:
- At 3°: $0.55 \times 98.2 = 54.0$
- At peak: $1.00 \times 76.2 = 76.2$

Torque now rises 41% between 3° and the peak — much closer to tracking the force. **The trail-collapse cue has been substantially buried.**

**Comparison and interpretation.** Doubling caster from 6° to 12°:
- Roughly doubles steering effort (total trail up 57% at moderate slip).
- Roughly doubles caster-induced camber gain with steer — genuinely useful for the outside tire.
- **Halves the visibility of the front-limit warning.**

There is no universally right answer, but the direction of the trade is clear and it is why race cars trend toward moderate caster (4–7°) rather than the large values sometimes used to chase camber. If camber is the objective, it is better obtained from the suspension geometry (Chapter 17), where it costs no feedback.

Note also that this analysis assumes the same pneumatic trail values; in practice a heavily cambered tire has a somewhat different $t_p$ curve, so the real comparison requires tire data.

**19.4**
Rack-referred torque from the tires: the front axle generates 6800 N over 45 mm of trail. Per axle, the aligning moment about the steering axes is:
$$
M = 6800 \times 0.045 = 306\ \text{N·m at the road wheels}
$$

Compliance: 0.9° of steering wheel rotation per 100 N·m (rack-referred). Assuming the quoted compliance is referred to this same moment:
$$
\Delta\theta_{SW} = 0.9 \times \frac{306}{100} = 2.75°\ \text{at the steering wheel}
$$
$$
\Delta\delta_{\text{road wheel}} = \frac{2.75}{11} = 0.25°
$$

**A quarter-degree of road-wheel steer is lost to compliance at 1.4 g.**

Effect on a measured understeer gradient: if $K$ is computed from steering wheel angle divided by ratio, the compliance appears as extra required steer, inflating $K$ by:
$$
\Delta K = \frac{0.25°}{1.4\ \text{g}} = 0.18\ \text{deg/g}
$$

On a car with a true $K$ of, say, 1.5 deg/g, that is a **12% overestimate**, and it is not a constant offset — it grows with lateral acceleration, so it also corrupts the *shape* of the $K(A_y)$ curve, making the car appear to develop more terminal understeer than it has.

**Practical remedy**: measure steer at the road wheel (string pots or rotary sensors on the uprights), or measure the compliance separately on a rig and correct. This is exactly the caveat raised in Chapter 11, Exercise 11.6, and it is one of the most common quiet errors in vehicle dynamics measurement.

**19.5**
Ride height falls 18 mm, i.e. 18 mm of bump at each front wheel (in pure heave).
$$
\Delta\text{toe per wheel} = 0.06° \times \frac{18}{10} = 0.108°\ \text{toe-out}
$$
Total front toe change: **0.216° toe-out** (both wheels).

**Consequences.**

At 40 m/s the car has its static alignment; at 80 m/s it has gained 0.22° of total toe-out. That is a significant alignment change — comparable to a deliberate setup adjustment — and it is happening automatically as a function of speed.

Effects:
- **Straight-line instability at high speed.** Toe-out is destabilizing; the car will feel nervous exactly where nervousness is least welcome.
- **Increased tire scrub and heat on the straights**, where the tires should be cooling.
- **Speed-dependent turn-in character**: the car will feel sharper on entry to fast corners than slow ones, beyond what the aerodynamics alone would produce.
- **Balance shift with speed**, confounded with the aero balance shift, making diagnosis difficult.

The general point: on a low-downforce car, bump steer matters mainly over bumps and kerbs — transient, occasional. **On a high-downforce car, bump steer is a continuous, speed-dependent alignment change**, because the suspension is always somewhere different in its travel depending on speed. This is why aero cars are checked for bump steer far more rigorously, and why the target is typically under 0.02°/10 mm across the working travel rather than merely "small at static ride height."

**19.6**
The governing fact (Chapter 14, Exercise 14.3): **peak slip angle increases with vertical load**. A tire at 5000 N might peak at 7°; the same tire at 1500 N might peak at 5°.

Both front tires on an axle share a common average slip angle set by the car's motion, modified by the steer difference between them. Ackermann percentage is precisely the tool that sets that difference.

**High-downforce car (anti-Ackermann).** At 2.5–3.5 g, lateral load transfer is enormous: the outside front might carry 5500 N while the inside front carries 800 N or lifts entirely. The outside tire is doing nearly all the work and wants a large slip angle (its peak is at a high value because it is heavily loaded). The inside tire is nearly irrelevant and, if given extra steer, will be far past its own low-load peak — producing drag, heat and no useful force.

So: give the **outside** wheel more steer. That is anti-Ackermann. The lightly loaded inside wheel is steered less, kept nearer its (low) peak slip angle, and stays cooler.

**Autocross car (pro-Ackermann).** Here the corners are tight (large steer angles, where the geometric Ackermann difference is large — see Exercise 19.1) and the lateral accelerations are lower, so load transfer is less extreme and both tires carry meaningful load. At large steer angles, the *geometric* requirement dominates: without Ackermann, the inside wheel is dragged at a large slip angle mismatch relative to its actual path, scrubbing badly and adding drag right where the car is slowest and most drag-sensitive. Ackermann keeps both tires near their kinematically correct angles.

**The general principle**: Ackermann geometry should be chosen so that both front tires operate as near as possible to their own load-appropriate peak slip angles, at the lateral acceleration and steer angle where the car actually spends its critical time. High $A_y$ plus small steer angles → anti-Ackermann. Low $A_y$ plus large steer angles → pro-Ackermann. Most circuit racing sits between, hence parallel steer as the common default.

**19.7**
Two disturbance mechanisms act.

**Scrub radius term.** A longitudinal (braking) force acting at the contact patch, offset from the steering axis by the scrub radius, produces a moment about the steering axis:
$$
M = F_x \times r_{\text{scrub}}
$$
Left wheel: $4200 \times 0.025 = 105$ N·m.
Right wheel: $1400 \times 0.025 = 35$ N·m.

The two moments act in opposite senses about the vehicle centreline (each tries to toe *out* its own wheel with positive scrub radius), so they partially cancel. The **net disturbance** is the difference:
$$
\Delta M = 105 - 35 = 70\ \text{N·m at the road wheels}
$$

This is a genuine steering pull toward the higher-friction side, and the driver must hold it. Through an 11:1 ratio it is about 6.4 N·m at the steering wheel — substantial, roughly the effort of a moderate corner.

**KPI term.** Kingpin inclination causes the car to rise as the wheel is steered from centre, giving a returnability torque proportional to $F_z\sin\sigma\sin\delta$ (approximately, and dependent on scrub radius too). At $\delta = 0$ this term vanishes, so at the instant of straight-line braking it contributes nothing to the split-friction pull — but as the car begins to deviate and the driver applies correction, it adds a load-dependent centring torque that is asymmetric between the two wheels because their vertical loads differ. Its contribution here is second-order compared with the 70 N·m scrub term.

**Design implication.** This is exactly the scenario that motivates **negative scrub radius** on road cars: with the steering axis intersecting the ground outboard of the tire centreline, a braking force generates a toe-*in* moment on the high-friction wheel, which steers the car back toward the straight — the geometry self-corrects a split-friction braking event without driver input.

Race cars generally do not adopt negative scrub radius, for two reasons: race surfaces have uniform friction so the scenario is rare, and negative scrub degrades the steering's ability to communicate longitudinal events (like the onset of front lockup), which drivers use. The race compromise is a small positive scrub radius — enough for feel, small enough that a disturbance like this one stays manageable. Reducing the 25 mm scrub to 10 mm here would cut the net disturbance from 70 to 28 N·m.
