# Chapter 17 — Suspension Geometry

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 17. Original explanatory material.*

---

## 1. What suspension geometry decides

The suspension's job is to control the position and orientation of the contact patch through wheel travel and body motion, and to define the load paths between wheel and chassis. Geometry sets:

- **Camber** versus bump, droop and roll (which sets the tire's inclination when it matters most)
- **Track change (scrub)** versus travel
- **Toe change (bump steer)** versus travel
- **Roll centre height** and therefore the geometric portion of lateral load transfer
- **Anti-dive, anti-squat, anti-lift** — the geometric reaction of longitudinal forces
- **Caster, kingpin inclination, scrub radius** and therefore steering feel and torque
- **Installation ratio** and therefore effective spring and damper rates

Almost every one of these interacts with the others. Suspension geometry design is the most heavily constrained sub-problem in race car design.

## 2. Degrees of freedom and the motion path

An independent wheel station has **one degree of freedom** in suspension travel (plus steer at the front). Every link removes a DOF; a double-wishbone corner with a tie rod has the correct count. The wheel's motion is therefore a one-parameter curve in space — the **motion path** — and everything else (camber, track, toe) is a function of position along it.

Design consists of shaping that path. The tools are the link lengths, the pickup point positions, and their inclinations.

## 3. The instant centre

For planar motion (viewing the front elevation), the wheel assembly rotates about an **instant centre (IC)** — the point where the upper and lower control arm axes intersect. The IC is instantaneous: it moves as the suspension moves.

**Consequences:**
- The wheel's velocity at any instant is perpendicular to the line from the IC to the point in question.
- **Camber change rate** is set by the distance from the IC to the wheel centre: a *close* IC gives rapid camber change; a *distant* IC gives slow camber change (approaching pure translation, i.e. a strut sliding vertically).
- The **front-view swing arm (FVSA) length** is the horizontal distance from the IC to the tire contact patch, and it is the standard design parameter:
  $$
  \frac{d\gamma}{dz} \approx \frac{1}{\text{FVSA length}} \quad \text{(rad per unit travel)}
  $$

**Side-view swing arm (SVSA)** is the equivalent construction in side elevation, and it governs anti-dive/anti-squat and caster change.

## 4. Roll centre

**Definition (kinematic)**: the roll centre is the point in the transverse vertical plane through the wheel centres about which the sprung mass instantaneously rolls, found by drawing a line from each side's IC through that side's contact patch; the intersection is the roll centre.

**Definition (force-based)**: the point at which a lateral force applied to the sprung mass produces no roll. This is the more useful definition physically and the two coincide only for symmetric, small-displacement cases.

**Why it matters — the geometric load transfer split.** Lateral force at the contact patch is reacted partly through the links (geometrically) and partly through the springs (elastically). The split is set by the roll centre height $h_{RC}$:

$$
\Delta F_z^{\text{geometric}} = \frac{F_y\, h_{RC}}{t}, \qquad \Delta F_z^{\text{elastic}} = \frac{K_\phi}{\sum K_\phi}\cdot\frac{W_s\,H\,A_y}{t}
$$

where $H$ is the distance from sprung CG to the roll axis. The geometric part is **instantaneous** (it travels through rigid links) while the elastic part must wait for the body to roll. This distinction matters in transients: a high roll centre transfers load immediately, a low one transfers it as the body rolls.

**Jacking.** A roll centre above ground level means the lateral force at the contact patch has a component that pushes the sprung mass **up**. In a corner, the outside wheel jacks the body upward. Excessive roll centre height causes the car to rise in corners, raising the CG, increasing load transfer, and creating a positive feedback that can be genuinely dangerous (the swing-axle rear suspensions of the 1950s–60s are the historical cautionary tale).

**Roll centre migration.** The roll centre is not fixed. As the car rolls and heaves, the ICs move and the roll centre moves — often laterally by a large amount and sometimes discontinuously. A geometry whose roll centre wanders 300 mm sideways in 2° of roll is producing setup behaviour the engineer did not design. Minimizing migration is a primary design criterion.

**The roll axis** is the line joining the front and rear roll centres. Its inclination affects the coupling between roll and yaw.

## 5. Camber control

The requirement: keep the loaded outside tire near its optimum camber (usually 1–4° negative) *in the cornering attitude*.

In a corner, the body rolls by $\phi$. If the suspension provided no camber change, the outside wheel would gain $+\phi$ of camber (positive, leaning out — bad). So the geometry must provide **camber gain in bump** to compensate:

$$
\gamma_{\text{outside}} = \gamma_{\text{static}} - \phi + \left(\frac{d\gamma}{dz}\right)\Delta z
$$

**The trade-off**: a short FVSA gives lots of camber gain (good for roll compensation) but also large camber change in pure bump/heave (bad — the wheel cambers over bumps and under aerodynamic loading) and large track scrub. A long FVSA gives the opposite.

Typical FVSA lengths: 1.5–4 m for a race car — much longer than the physical arm lengths, achieved by angling the arms so their ICs fall far outboard.

**Design consequence**: a stiffly-sprung, low-roll car (formula car, 0.3 deg/g) needs very little camber gain and can use a long FVSA, keeping camber stable in heave. A softly-sprung, high-roll car (sedan, 4 deg/g) needs substantial camber gain and must accept the associated heave sensitivity. **Roll gradient and camber curve are designed together, not separately.**

## 6. Anti-features (anti-dive, anti-squat, anti-lift)

Longitudinal forces at the contact patch, reacted through inclined side-view links, produce a vertical force component that opposes the pitch the load transfer would otherwise cause.

**Percent anti-dive** at the front under braking:

$$
\%\text{anti-dive} = \frac{\tan\theta_{\text{SVSA}}}{h/L}\times 100
$$

where $\theta_{\text{SVSA}}$ is the angle of the line from the contact patch to the side-view instant centre, and $h/L$ is the CG height over wheelbase.

100% anti-dive means the front does not compress at all under braking. This sounds desirable and is generally a mistake:

- The forces are reacted through the links rather than the springs, so **the ride harshness under braking increases dramatically** — the suspension effectively locks.
- Compliance and geometry changes under braking produce unwanted steer and camber effects.
- The driver loses the pitch cue that communicates deceleration.

Typical race practice: **10–30% anti-dive**, 0–20% anti-squat. Enough to control pitch attitude (important on an aero car) without stiffening the suspension in the longitudinal direction.

**Anti-squat** at the rear under acceleration is the analogous construction, with the important caveat that for an inboard-mounted differential the force line runs from the contact patch to the SVSA differently than for an outboard (hub-mounted) drive — the geometry depends on where the drive torque is reacted.

## 7. Independent suspension types

**Double wishbone (SLA — short-long arm).** The reference design for race cars. Full control over IC location, camber curve, roll centre, and anti-features through eight pickup points. Requires space and mass.

**MacPherson strut.** The strut axis replaces the upper arm; the effective upper "arm" is perpendicular to the strut. Compact, cheap, packages well with transverse engines. Limitations: long FVSA is hard to achieve so camber gain is limited; the strut carries bending loads and has friction; roll centre tends to be low and migrates.

**Multi-link (4- and 5-link).** More pickup points allow toe, camber and longitudinal compliance to be tuned semi-independently, including deliberate compliance steer. Standard on modern performance road cars; heavier and more complex than a wishbone.

**Swing axle.** Historically important, kinematically poor: very short FVSA gives huge camber change, and a very high roll centre gives severe jacking. Responsible for a generation of accidents and, indirectly, for modern vehicle safety regulation.

**Trailing and semi-trailing arm.** Pure trailing arm gives zero camber change relative to the body (so full camber loss in roll) and zero track change; semi-trailing compromises between trailing and swing-axle behaviour.

## 8. Beam and twist axles

**Beam (live or dead) axle.** Both wheels rigidly connected. Properties:
- Camber relative to the road is unaffected by body roll — the wheels stay perpendicular to the axle. Excellent for camber-sensitive tires on smooth surfaces.
- No camber change on single-wheel bumps either, but the bump *does* affect the other wheel.
- High unsprung mass, including the differential for a live axle.
- Roll steer and lateral location must be provided by links (Panhard rod, Watt's linkage, or trailing arms).

Beam axles remain competitive in oval racing and in classes where the surface is smooth and the regulations favour simplicity. The Watt's linkage is preferred over a Panhard rod because it produces near-vertical axle motion (a Panhard rod moves the axle laterally as it rises, which is a form of roll steer).

**Twist axle (torsion beam).** A compliant beam that acts as a trailing arm in bump and as an anti-roll bar in roll. Compact and cheap; behaviour is dominated by the beam's torsional and bending compliance, so it is a compliance design rather than a kinematic one.

## 9. Front and rear applications

**Front suspensions** must additionally accommodate steering: caster, kingpin inclination, scrub radius, bump steer, and steering-axis camber effects (Chapter 19).

**Rear suspensions** must react drive torque and, for a live axle, contain the differential. Rear toe control is critical: rear toe-out is destabilizing and rear toe-in under load is a standard stability aid. Rear roll steer (toe change with roll) is a powerful and often-overlooked balance tool.

---

## Exercises

**17.1** A double-wishbone front suspension has upper arm inclined 8° up toward the chassis and lower arm inclined 3° down toward the chassis, with upper ball joint 0.30 m and lower ball joint 0.42 m from the wheel centreline. Sketch the construction and estimate the FVSA length and camber gain per mm of bump.

**17.2** A car has a front roll centre 45 mm above ground, rear 85 mm, sprung CG at 290 mm, track 1.55 m front and rear, sprung weight 6500 N, wheelbase 2.65 m, CG at 46% front. Compute the roll axis height under the CG and the roll moment arm.

**17.3** For the car in 17.2 at 1.4 g, compute the geometric load transfer at each axle.

**17.4** A car has 2.2 deg/g roll gradient and requires −2.5° camber on the outside front tire at 1.5 g. With FVSA of 2.4 m and 30 mm of bump travel at that condition, compute the required static camber.

**17.5** A front suspension has a side-view instant centre 3.1 m behind the contact patch and 0.42 m above ground. With $h = 0.30$ m and $L = 2.70$ m, compute the percent anti-dive.

**17.6** Explain why a high roll centre reduces body roll but may not reduce lateral load transfer, and describe the jacking mechanism.

**17.7** A team observes that their car gains understeer as fuel burns off and the car gets lighter and sits lower. Propose two geometry-based explanations.

---

## Solutions

**17.1**
Set up coordinates with the wheel centreline at $x=0$ and ground at $y=0$. Take the wheel centre at $y = 0.32$ m, upper ball joint at $(0, 0.44)$ and lower at $(0, 0.20)$ approximately (typical for a race car).

The upper arm rises 8° toward the chassis (inboard), so its axis has slope $+\tan 8° = 0.1405$ going inboard.
The lower arm falls 3° toward the chassis, slope $-\tan 3° = -0.0524$ going inboard.

Extending both inboard, they converge where:
$$
0.44 + 0.1405\,x = 0.20 - 0.0524\,x \Rightarrow 0.1929\,x = -0.24 \Rightarrow x = -1.244\ \text{m}
$$

Negative $x$ means the intersection lies **outboard** of the wheel, at 1.244 m from the wheel centreline, at height $y = 0.44 + 0.1405(-1.244) = 0.265$ m.

**FVSA length** = horizontal distance from the IC to the contact patch $= 1.244$ m (the contact patch is at $x = 0$).

**Camber gain**:
$$
\frac{d\gamma}{dz} \approx \frac{1}{\text{FVSA}} = \frac{1}{1.244} = 0.804\ \text{rad/m} = 0.046\ \text{deg/mm}
$$

So 30 mm of bump gives about 1.38° of negative camber gain. This is a fairly short FVSA and an aggressive camber curve — appropriate for a car with substantial roll, less so for a stiff formula car where it would produce unwanted camber change in heave under aerodynamic load.

**Roll centre**: drawing a line from this IC (at $x=-1.244$, $y=0.265$) through the contact patch (at $x = -0.775$ m from centreline, $y=0$ for a 1.55 m track), and intersecting with the mirror-image line from the other side at the vehicle centreline. The line has slope $(0 - 0.265)/(-0.775-(-1.244)) = -0.265/0.469 = -0.565$; extending from the contact patch at $x=-0.775$ to $x=0$ gives $y = 0 + 0.565(0.775) = 0.438$ m. That is a very high roll centre — 438 mm — confirming that this geometry (IC outboard and high) is not a sensible race car layout. **A useful lesson: the IC position controls camber gain and roll centre simultaneously, and they cannot be chosen independently.** A good design places the IC well inboard and slightly above ground to get a long FVSA with a low roll centre.

**17.2**
The roll axis joins the front RC (45 mm) and rear RC (85 mm). CG is at 46% front, i.e. $0.46 \times 2.65 = 1.219$ m behind the front axle.

Roll axis height under the CG, by linear interpolation:
$$
h_{RA} = 45 + (85-45)\times\frac{1.219}{2.65} = 45 + 40 \times 0.460 = 45 + 18.4 = 63.4\ \text{mm}
$$

Roll moment arm:
$$
H = h_{CG} - h_{RA} = 290 - 63.4 = 226.6\ \text{mm} = 0.2266\ \text{m}
$$

This $H$ is what enters the roll gradient calculation of Chapter 16. Note how sensitive it is: raising both roll centres by 50 mm would cut $H$ to 0.177 m, a 22% reduction in roll moment — and a 22% reduction in body roll for the same springs. That is why roll centre height is such a tempting lever, and why the jacking consequences (Exercise 17.6) must be understood before pulling it.

**17.3**
Geometric load transfer at each axle uses that axle's roll centre height and its share of the lateral force. Lateral force at each axle is proportional to its static load share.

Total lateral force at 1.4 g: $F_y = 6500 \times 1.4 = 9100$ N (sprung mass only; unsprung adds separately).
Front share (46%): $F_{yf} = 4186$ N. Rear share: $F_{yr} = 4914$ N.

$$
\Delta F_{zf}^{\text{geo}} = \frac{F_{yf}h_{RCf}}{t_f} = \frac{4186 \times 0.045}{1.55} = \frac{188.4}{1.55} = 121.5\ \text{N}
$$
$$
\Delta F_{zr}^{\text{geo}} = \frac{F_{yr}h_{RCr}}{t_r} = \frac{4914 \times 0.085}{1.55} = \frac{417.7}{1.55} = 269.5\ \text{N}
$$

Total geometric: 391 N. Compare with the total load transfer of the sprung mass:
$$
\Delta F_{z,\text{total}} = \frac{W_sh_{CG}A_y}{t} = \frac{6500 \times 0.290 \times 1.4}{1.55} = \frac{2639}{1.55} = 1702\ \text{N}
$$

So geometric transfer is 391/1702 = **23% of the total**, and the remaining 77% (1311 N) must be distributed elastically according to roll stiffness.

Importantly, the geometric split is **31% front / 69% rear** here — heavily rear-biased because the rear roll centre is nearly twice as high. That is a significant oversteer contribution that must be compensated in the elastic distribution. This is exactly why roll centre heights are a balance tool as well as a roll-control tool.

**17.4**
Body roll at 1.5 g: $\phi = 2.2 \times 1.5 = 3.3°$.

Camber gain from suspension travel:
$$
\frac{d\gamma}{dz} = \frac{1}{\text{FVSA}} = \frac{1}{2.4} = 0.4167\ \text{rad/m} = 0.0239\ \text{deg/mm}
$$
Over 30 mm of bump: $\Delta\gamma_{\text{gain}} = 30 \times 0.0239 = 0.716°$ negative.

Camber balance for the outside wheel:
$$
\gamma_{\text{outside}} = \gamma_{\text{static}} - \phi + \Delta\gamma_{\text{gain}}
$$
Using the sign convention that negative camber is what we want and roll adds positive camber to the outside wheel:
$$
-2.5 = \gamma_{\text{static}} + 3.3 - 0.716
$$
$$
\gamma_{\text{static}} = -2.5 - 3.3 + 0.716 = -5.08°
$$

**Static camber must be −5.1°** — an enormous figure, and a clear signal that the design is unbalanced. With 2.2 deg/g of roll and only a 2.4 m FVSA, the geometry recovers only 22% of the roll-induced camber loss.

Practical consequences of running −5° static: the tire runs on its inner shoulder in a straight line (poor braking and traction, rapid inner-shoulder wear) and the inside wheel in a corner is at −8.4°, which is far past useful.

**The correct fix is not more static camber.** It is either to reduce the roll gradient (stiffer springs or bars, or a lower CG/higher roll centres) or to shorten the FVSA for more camber gain — accepting the heave-sensitivity penalty. Most race cars solve this by running low roll gradients: at 1.0 deg/g, the required static camber falls to $-2.5 - 1.5 + 0.716 = -3.28°$, which is workable.

**17.5**
$$
\tan\theta_{\text{SVSA}} = \frac{0.42}{3.1} = 0.1355
$$
$$
\frac{h}{L} = \frac{0.30}{2.70} = 0.1111
$$
$$
\%\text{anti-dive} = \frac{0.1355}{0.1111}\times100 = 122\%
$$

**Over 100% — the front will actually *rise* under braking.** This is almost certainly a design error unless deliberately chosen for an aerodynamic reason.

Problems with 122% anti-dive:
- Braking forces are reacted almost entirely through the control arms, so the suspension is effectively rigid in the braking phase. Any bump encountered while braking is transmitted straight to the chassis and, worse, momentarily unloads the tire — reducing braking capability exactly when it is needed.
- The pitch reversal (nose up under braking) is disorienting and removes the driver's deceleration cue.
- Caster and camber change in the wrong direction as the front extends.

**Recommendation**: reduce the SVSA angle to give 15–25% anti-dive, i.e. $\tan\theta$ between 0.017 and 0.028, meaning the side-view IC should be either much further back or much lower. Raising the SVSA length from 3.1 m to, say, 15 m at the same height would give $\tan\theta = 0.028$ and 25% anti-dive.

**17.6**
**Why a high roll centre reduces body roll.** The roll moment on the sprung mass is $M_\phi = W_s H A_y$, where $H$ is the distance from the sprung CG to the roll axis. Raising the roll centre reduces $H$ directly, so for a fixed roll stiffness the roll angle falls proportionally. Raise the roll centre to the CG height and $H = 0$ — the body does not roll at all.

**Why lateral load transfer is barely affected.** Total lateral load transfer at an axle is fixed by statics:
$$
\Delta F_z^{\text{total}} = \frac{m A_y h_{CG}}{t}
$$
This depends on the **CG height**, the mass, the lateral acceleration and the track — and on none of the suspension parameters. It is a free-body result: the overturning moment about the contact patches must be reacted by a load couple across the track, whatever the suspension does internally.

What the roll centre changes is only **how** that fixed total is split between the geometric path (through the links, arriving instantly) and the elastic path (through the springs, arriving as the body rolls) — and how the total is distributed *between the front and rear axles*, which is the balance effect.

So: **a high roll centre buys you less roll, not less load transfer.** If the reason you wanted less roll was camber control, you have succeeded. If it was grip, you have not.

**The jacking mechanism.** Consider the outside wheel in a corner. The lateral force $F_y$ acts at the contact patch. That force is transmitted to the chassis along the line from the contact patch to the instant centre — the "force line". If the roll centre (and hence the force line) is above ground level, the force line is inclined upward toward the chassis, so the force transmitted has a **vertical upward component**:
$$
F_{\text{jack}} \approx F_y \tan\theta_{\text{force line}} = F_y\frac{h_{RC}}{t/2}
$$
per side, pushing the sprung mass up.

The mechanism is self-reinforcing: the body rises, the CG rises, load transfer increases (since $\Delta F_z \propto h_{CG}$), the outside tire is more overloaded, and on a swing-axle geometry the rising body also produces large positive camber on the outside wheel, collapsing its grip. This is the classic swing-axle "tuck-under" failure, and it is why roll centres of 400+ mm — like the geometry that emerged in Exercise 17.1 — are unacceptable in practice.

Typical race practice: roll centres between ground level and about 75 mm, sometimes slightly below ground at the front to eliminate jacking entirely, accepting the resulting increase in $H$ and compensating with roll stiffness.

**17.7**
**Explanation 1 — ride-height-dependent roll centre migration.** As fuel burns off, the car sits lower, and the suspension moves into a different part of its travel. The instant centres move, and the front and rear roll centres change by different amounts (they almost always do, because the front and rear geometries are different). If the front roll centre drops more than the rear — a common outcome — the geometric load transfer split shifts rearward at the front and the elastic split must compensate... but more directly, the roll moment arm $H$ changes and the front/rear geometric transfer ratio changes. If the net effect moves TLLTD forward, the car gains understeer.

This is a real and frequently-observed effect, and it is one reason teams chart roll centre height versus ride height across the full travel range and design for minimal migration.

**Explanation 2 — camber curve position.** Lower ride height means the suspension sits further into bump, where the camber curve has already delivered some of its gain. The static camber is now effectively more negative. If the front geometry has more camber gain than the rear (typical, since front camber control is usually prioritized), the front gains more negative camber than the rear. Past the tire's optimum camber, additional negative camber *reduces* peak lateral force — so the front loses grip relative to the rear, and the car understeers.

**A third possibility worth checking**: the aerodynamic explanation. Lower ride height changes the aero balance, and on most cars a lower front ride height initially increases front downforce but, past a point, stalls the front floor or wing and loses it abruptly. If the understeer appears suddenly at a particular fuel level rather than progressively, aero is the more likely culprit than geometry.

**Diagnostic to distinguish them**: run the car at a fixed low fuel load but with the ride heights shimmed back up to the high-fuel values. If the understeer disappears, it is ride-height driven (geometry or aero). If it persists, it is a mass or weight-distribution effect — fuel is not carried at the CG, so burning it also moves the longitudinal weight distribution, which is a fourth and entirely separate explanation.
