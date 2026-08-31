# Chapter 21 — Suspension Springs

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 21. Original explanatory material.*

---

## 1. Why a chapter on springs

Chapter 16 treated spring rate as a given number and computed ride and roll rates from it. This chapter is where the number comes from: the mechanics of torsion bars, coil springs and leaf springs, their combination in series and parallel, their installation, and their fatigue life.

The underlying physics is the same for all of them. **A coil spring is a torsion bar wound into a helix.** Understanding that one fact makes the coil spring formula obvious rather than something to memorize.

## 2. Torsion springs (torsion bars)

A solid circular bar of length $L$, diameter $d$, shear modulus $G$, loaded in torsion:

$$
K_T = \frac{T}{\theta} = \frac{GJ}{L}, \qquad J = \frac{\pi d^4}{32}
$$

so

$$
K_T = \frac{\pi G d^4}{32 L}
$$

With an arm of length $R$ converting torsion to linear motion, the linear rate is:

$$
K = \frac{K_T}{R^2} = \frac{\pi G d^4}{32 L R^2}
$$

**Maximum shear stress:**

$$
\tau_{\max} = \frac{16T}{\pi d^3}
$$

For a hollow bar of outer diameter $d_o$ and inner $d_i$:

$$
J = \frac{\pi(d_o^4 - d_i^4)}{32}
$$

A hollow bar removes material from the low-stress core, so it is far more efficient per unit mass. Removing the inner 60% of the diameter costs only $0.6^4 = 13\%$ of the stiffness while saving 36% of the mass — which is why anti-roll bars are almost always tubular.

**The $d^4$ dependence is the dominant practical fact.** A 5% change in bar diameter changes rate by 22%. It is also why anti-roll bar sets come in small diameter increments, and why bar diameter must be measured, not trusted from a part number.

## 3. Coil springs

A helical coil of wire diameter $d$, mean coil diameter $D$, with $N$ active coils:

$$
K = \frac{Gd^4}{8D^3N}
$$

**Derivation sketch**: an axial load $F$ on the coil produces a torque $T = FD/2$ on the wire, which is loaded essentially in torsion. The wire length is $\pi D N$. Substituting into the torsion relations and computing axial deflection gives the result above. Hence the claim in section 1.

**Shear stress**, including the Wahl correction factor for curvature:

$$
\tau = K_W\frac{8FD}{\pi d^3}, \qquad K_W = \frac{4C-1}{4C-4}+\frac{0.615}{C}, \qquad C = \frac{D}{d}
$$

$C$ is the **spring index**, typically 4–12. Low $C$ (fat wire, small coil) is hard to manufacture and highly stressed on the inner fibre; high $C$ is prone to buckling.

**Solid height and travel.** The spring cannot compress beyond coil bind:
$$
h_{\text{solid}} \approx (N_{\text{total}})\,d
$$
Available travel $= h_{\text{free}} - h_{\text{solid}}$, and race practice leaves margin so that coil bind never occurs in service — a spring that binds becomes infinitely stiff instantaneously, which is a spectacular way to lose a corner.

**Buckling.** A coil spring buckles if too slender. The critical criterion depends on the free-length-to-diameter ratio and the end conditions; a rough guide is that free length should not exceed about 4× mean coil diameter for parallel, guided ends. Race springs are typically short and stout, running over a damper body which also guides them.

**Rate consistency.** Real springs vary from nominal by a few percent, and their rate changes slightly through travel as end coils come into contact. **Measure every spring** on a rig and label it with its measured rate — this is standard practice in professional racing and it routinely finds 3–8% discrepancies.

## 4. Springs in series and parallel

**Parallel** (both springs deflect by the same amount, forces add):

$$
K_{\text{total}} = K_1 + K_2
$$

**Series** (same force, deflections add):

$$
\frac{1}{K_{\text{total}}} = \frac{1}{K_1} + \frac{1}{K_2} \quad\Rightarrow\quad K_{\text{total}} = \frac{K_1K_2}{K_1+K_2}
$$

**Where each occurs on a car:**

| Combination | Type |
|---|---|
| Main spring + tire | **Series** (Chapter 16 ride rate) |
| Main spring + anti-roll bar, in roll | **Parallel** |
| Tender spring + main spring | **Series** |
| Two springs on one damper (dual-rate) | **Series** until the tender coil-binds, then main only |
| Bump rubber engaged | **Parallel** with the main spring |

**Dual-rate (tender spring) arrangements** are worth understanding. A soft tender spring in series with a stiff main gives a low initial rate — enough to keep the tire on the road and take up droop — until the tender binds at a designed load, after which the main spring's higher rate takes over. The result is a bilinear rate curve, used on downforce cars to give compliance at low speed and platform control at high speed.

**Bump rubbers and packers** are progressive springs engaged after a designed amount of travel. On aero cars they are often load-bearing elements of the design rather than emergency stops — the car is deliberately run onto the bump rubbers at high speed to achieve very high effective heave stiffness while retaining softer springs for slow corners. This is a series/parallel transition designed into the ride curve.

## 5. Coil spring calculations in practice

The design sequence, given a required wheel rate:

1. From the wheel rate target and installation ratio: $K_s = K_w/IR^2$ (Chapter 16).
2. Compute the required spring force at static ride height and at maximum bump.
3. Choose spring index $C$ and check the resulting stress against the material allowable.
4. Compute $N$ from $K = Gd^4/(8D^3N)$.
5. Check solid height against maximum travel with margin.
6. Check buckling.
7. Check fatigue life at the operating stress range.

For steel spring wire, $G \approx 79$ GPa. Allowable design stress for a race spring is typically 700–900 MPa for infinite life, higher for short-life applications, and depends heavily on surface treatment (shot peening raises fatigue strength substantially by inducing compressive residual surface stress).

## 6. Leaf springs

A semi-elliptic leaf spring acts simultaneously as a spring and as a location member — which is its virtue and its problem.

For a simple cantilever leaf of length $L$, width $b$, thickness $t$:

$$
K = \frac{Ebt^3}{4L^3}
$$

and for a multi-leaf spring, an equivalent width is used, or the spring is treated as a triangular plate of equivalent stiffness.

**Advantages**: simple, cheap, provides axle location in all directions, inherent friction damping.

**Disadvantages**:
- **Interleaf friction** produces hysteresis — the spring has a different rate loading and unloading, and a "stiction" band around zero where it does not respond to small inputs at all. This is a real handling problem: the suspension effectively locks for small road inputs.
- Rate is hard to change without changing the location geometry.
- Wind-up under drive and brake torque produces axle steer and, in the extreme, axle tramp.
- High unsprung mass.

Modern race applications are largely confined to classes where regulations mandate them, or to transverse composite leaf springs (which have no interleaf friction and act as a spring plus anti-roll bar in one element).

## 7. Installation considerations

- **Spring seat alignment**: a misaligned seat introduces side loads on the damper rod, causing friction and wear. Spherical or self-aligning seats are standard on race cars.
- **Preload and free length**: the spring's free length plus the perch position sets static ride height. Changing spring rate almost always requires a perch adjustment to restore ride height, and then a re-check of corner weights (Chapter 12). This is the non-orthogonality that makes bars the preferred balance tool.
- **Coil clash and helper springs**: helper springs keep the main spring captive in full droop, preventing it from becoming loose.
- **Rising rate through the linkage**: a nonlinear installation ratio produces a nonlinear wheel rate even with a linear spring (Chapter 16). Some designs deliberately use this instead of dual-rate springs.

## 8. Fatigue

Springs are fatigue-critical components — they cycle millions of times.

The governing quantity is the **alternating stress** $\tau_a = (\tau_{\max}-\tau_{\min})/2$ superimposed on a **mean stress** $\tau_m = (\tau_{\max}+\tau_{\min})/2$. A Goodman or Soderberg diagram relates the two to the fatigue limit:

$$
\frac{\tau_a}{\tau_e} + \frac{\tau_m}{\tau_u} = \frac{1}{n}
$$

where $\tau_e$ is the endurance limit, $\tau_u$ the ultimate shear strength, and $n$ the safety factor.

**Practical measures that dominate spring fatigue life:**
- **Shot peening** — the single most effective treatment, adding compressive residual surface stress and typically doubling fatigue life.
- **Surface finish and defect freedom** — fatigue cracks initiate at surface defects; a scratch from a dropped spanner is a genuine failure risk.
- **Corrosion protection** — corrosion pits are stress concentrations.
- **Presetting (scragging)** — deliberately compressing beyond the design load once during manufacture, which yields the surface locally and leaves favourable residual stress.

A race spring that has been coil-bound in service should be inspected or discarded, as should any spring with visible surface damage.

---

## Exercises

**21.1** A coil spring has wire diameter 14 mm, mean coil diameter 76 mm, 7 active coils, $G = 79$ GPa. Compute its rate.

**21.2** For the spring in 21.1, compute the spring index, the Wahl factor, and the shear stress at a load of 6000 N.

**21.3** A designer needs to raise the rate of the spring in 21.1 by 25%. Compute the required change by (a) wire diameter, (b) number of coils, (c) mean coil diameter. Comment on practicality.

**21.4** A tender spring of 25 N/mm is fitted in series with a main spring of 140 N/mm. Compute the combined rate. The tender has 40 mm of travel before coil bind — at what wheel load (installation ratio 0.65) does the rate transition occur?

**21.5** A hollow anti-roll bar has outer diameter 26 mm and inner 18 mm, length 900 mm, arms 250 mm, $G = 79$ GPa. Compute the torsional rate and the equivalent linear rate at the arm ends. Compare its mass efficiency with a solid bar of the same stiffness.

**21.6** A spring operates between 3500 N and 8200 N. With a Wahl-corrected stress of 0.096 MPa per newton of load, compute mean and alternating shear stress, and assess against $\tau_e = 480$ MPa, $\tau_u = 1300$ MPa with a required safety factor of 1.5.

**21.7** Explain why interleaf friction in a leaf spring is a handling problem and not merely a damping bonus.

---

## Solutions

**21.1**
$$
K = \frac{Gd^4}{8D^3N} = \frac{79\times10^9 \times (0.014)^4}{8\times(0.076)^3\times 7}
$$
Numerator: $(0.014)^4 = 3.8416\times10^{-8}$; $\times 79\times10^9 = 3035.9$.
Denominator: $(0.076)^3 = 4.3898\times10^{-4}$; $\times 8 \times 7 = 0.024583$.
$$
K = \frac{3035.9}{0.024583} = 123{,}498\ \text{N/m} = \mathbf{123.5\ N/mm}
$$

**21.2**
$$
C = \frac{D}{d} = \frac{76}{14} = 5.43
$$
$$
K_W = \frac{4C-1}{4C-4} + \frac{0.615}{C} = \frac{21.72-1}{21.72-4} + \frac{0.615}{5.43} = \frac{20.72}{17.72} + 0.1133 = 1.1693 + 0.1133 = 1.283
$$
$$
\tau = K_W\frac{8FD}{\pi d^3} = 1.283 \times \frac{8 \times 6000 \times 0.076}{\pi(0.014)^3}
$$
Numerator: $8(6000)(0.076) = 3648$. Denominator: $\pi(2.744\times10^{-6}) = 8.621\times10^{-6}$.
$$
\tau = 1.283 \times \frac{3648}{8.621\times10^{-6}} = 1.283 \times 4.232\times10^8 = 5.43\times10^8\ \text{Pa} = \mathbf{543\ MPa}
$$

Within the 700–900 MPa allowable for a shot-peened race spring, with reasonable margin. Note the Wahl factor added 28% to the stress — omitting it would give a dangerously optimistic 423 MPa.

**21.3**
Target: $K' = 1.25 \times 123.5 = 154.4$ N/mm.

**(a) Wire diameter** ($K \propto d^4$):
$$
d' = d(1.25)^{1/4} = 14 \times 1.0574 = 14.80\ \text{mm}
$$

**(b) Number of coils** ($K \propto 1/N$):
$$
N' = \frac{7}{1.25} = 5.6\ \text{coils}
$$

**(c) Mean coil diameter** ($K \propto 1/D^3$):
$$
D' = \frac{76}{(1.25)^{1/3}} = \frac{76}{1.0772} = 70.6\ \text{mm}
$$

**Practicality.**

*Wire diameter* is the manufacturer's normal lever, but 14.80 mm is not a standard wire size — real springs are made from stock diameters, so the designer works from available sizes and adjusts $N$ or $D$ to trim. Note also that increasing $d$ reduces stress (as $1/d^3$ at fixed load) and raises solid height, so it is the *benign* direction.

*Coil count* is the easiest fine adjustment and the one most used in practice, but reducing $N$ from 7 to 5.6 reduces the available travel before coil bind and increases stress per unit deflection (each coil now works harder). Check solid height.

*Coil diameter* is constrained by the damper body it must fit over and by the spring seat, so it is usually fixed by packaging. It is also the most stress-sensitive lever ($\tau \propto D$), and reducing $D$ lowers stress — but it also lowers the spring index to $70.6/14 = 5.04$, approaching the manufacturing and stress-concentration limit.

**Practical answer**: in a race environment, you do not modify a spring — you order the next rate up from the supplier's range and check it on the rig.

**21.4**
Series combination:
$$
K = \frac{25 \times 140}{25 + 140} = \frac{3500}{165} = 21.2\ \text{N/mm}
$$

The combined rate is barely above the tender's own rate — which is the point of a tender spring: the soft element dominates a series pair.

**Transition load.** The tender binds after 40 mm of its own compression, at a force of:
$$
F_{\text{spring}} = 25 \times 40 = 1000\ \text{N}
$$

Referred to the wheel through $IR = 0.65$. The energy relation $F_{\text{wheel}}\,dz = F_{\text{spring}}\,ds$ with $ds = IR\,dz$ gives $F_{\text{wheel}} = F_{\text{spring}} \times IR$:
$$
F_{\text{wheel}} = 1000 \times 0.65 = 650\ \text{N}
$$

So the rate transitions from 21.2 N/mm to 140 N/mm (spring rate; at the wheel, from $21.2(0.65)^2 = 8.96$ N/mm to $140(0.65)^2 = 59.2$ N/mm) at only **650 N of wheel load** — a small fraction of a typical static corner load of 1500–2500 N.

**Interpretation**: this tender spring binds essentially immediately and does nothing at operating loads. It is functioning purely as a **helper spring** — keeping the main spring captive in full droop so it does not rattle loose — rather than as a genuine dual-rate element. If a real dual-rate transition were wanted at, say, 60% of static load, the tender would need a much higher rate or much more travel.

This distinction between a "tender spring" (intended to carry load and set an initial rate) and a "helper spring" (intended only to take up droop) is a common source of confusion, and the arithmetic above is how to tell which one you actually have.

**21.5**
Polar second moment:
$$
J = \frac{\pi(d_o^4 - d_i^4)}{32} = \frac{\pi\left((0.026)^4 - (0.018)^4\right)}{32} = \frac{\pi(4.5698\times10^{-7} - 1.0498\times10^{-7})}{32}
$$
$$
= \frac{\pi(3.5200\times10^{-7})}{32} = \frac{1.1058\times10^{-6}}{32} = 3.4556\times10^{-8}\ \text{m}^4
$$
$$
K_T = \frac{GJ}{L} = \frac{79\times10^9 \times 3.4556\times10^{-8}}{0.900} = \frac{2730.0}{0.900} = 3033\ \text{N·m/rad}
$$

Linear rate at the arm ends (each arm 0.250 m):
$$
K = \frac{K_T}{R^2} = \frac{3033}{0.0625} = 48{,}528\ \text{N/m} = 48.5\ \text{N/mm}
$$

**Mass efficiency comparison.** A solid bar of the same $J$ requires:
$$
\frac{\pi d^4}{32} = 3.4556\times10^{-8} \Rightarrow d^4 = 3.5200\times10^{-7} \Rightarrow d = 0.02436\ \text{m} = 24.4\ \text{mm}
$$

Cross-sectional areas:
- Hollow: $\frac{\pi}{4}(0.026^2 - 0.018^2) = \frac{\pi}{4}(6.76\times10^{-4} - 3.24\times10^{-4}) = \frac{\pi}{4}(3.52\times10^{-4}) = 2.765\times10^{-4}$ m²
- Solid: $\frac{\pi}{4}(0.02436)^2 = \frac{\pi}{4}(5.934\times10^{-4}) = 4.660\times10^{-4}$ m²

Mass ratio: $2.765/4.660 = 0.593$.

**The hollow bar achieves identical stiffness for 59% of the mass — a 41% saving.** The reason is that torsional stress varies linearly from zero at the centre to maximum at the surface, so the core material carries almost no load while contributing full mass. The penalty is that the hollow bar's peak stress is higher for the same torque (the section modulus $J/r_o$ is smaller relative to a solid bar of the same $J$... in fact here $r_o$ is larger, 13 mm vs 12.2 mm, so stress is slightly *lower*) — and that thin-walled tubes are vulnerable to local buckling and to damage from clamping. Race practice: hollow bars with a wall thickness not less than about 12–15% of the outer diameter.

**21.6**
$$
\tau_{\max} = 0.096 \times 8200 = 787.2\ \text{MPa}
$$
$$
\tau_{\min} = 0.096 \times 3500 = 336.0\ \text{MPa}
$$
$$
\tau_m = \frac{787.2 + 336.0}{2} = 561.6\ \text{MPa}, \qquad \tau_a = \frac{787.2 - 336.0}{2} = 225.6\ \text{MPa}
$$

Goodman criterion:
$$
\frac{\tau_a}{\tau_e} + \frac{\tau_m}{\tau_u} = \frac{225.6}{480} + \frac{561.6}{1300} = 0.4700 + 0.4320 = 0.9020
$$
$$
n = \frac{1}{0.9020} = 1.109
$$

**Safety factor 1.11 against a requirement of 1.5 — the spring fails the fatigue criterion.**

Options, in order of practicality:

1. **Shot peening**, if not already applied, typically raises the effective endurance limit $\tau_e$ by 30–50%. At $\tau_e = 650$ MPa: $225.6/650 + 0.4320 = 0.3471 + 0.4320 = 0.7791$, giving $n = 1.28$ — better, but still short.

2. **Reduce the stress level** by increasing wire diameter. Since $\tau \propto 1/d^3$ at fixed load and $K \propto d^4$, increasing $d$ requires a compensating increase in $N$ or $D$ to hold the rate. Going from $d$ to $1.1d$ reduces stress by 25% while $N$ must rise by $1.1^4 = 1.46$ to maintain rate. New stresses: $\tau_m = 421$, $\tau_a = 169$. Then $169/650 + 421/1300 = 0.260 + 0.324 = 0.584$, $n = 1.71$ ✓. Cost: a heavier, longer spring.

3. **Reduce the load range** by softening the spring or limiting travel — but the loads come from the car, so this is a vehicle-level change.

4. **Accept a finite life** and specify a replacement interval. This is legitimate in racing, where a spring might be scrapped after a season regardless, but it must be a deliberate decision with an inspection regime, not an accident.

**Note on the mean stress**: at 562 MPa, the mean is by far the larger contributor to the utilization. Springs are preloaded elements operating at high mean stress, which is precisely why compressive residual surface stress from peening and presetting is so valuable — it directly offsets the mean term.

**21.7**
Interleaf friction is often described as "free damping", and in a crude sense it does dissipate energy. But it is **Coulomb (dry) friction**, not viscous damping, and the two behave completely differently.

**A viscous damper** produces force proportional to velocity: $F = c\dot x$. At zero velocity it produces zero force, so the suspension is always free to respond to a new input, however small.

**Coulomb friction** produces a constant force opposing motion, independent of velocity, and — critically — it produces a **breakaway threshold**. Below a force sufficient to overcome static friction, the joint does not move at all. The suspension is effectively rigid.

The handling consequences:

1. **Small road inputs are transmitted directly to the chassis.** Any bump generating less than the breakaway force does not deflect the suspension; the wheel and the body move together. The tire's contact patch load fluctuates violently and its ability to generate lateral force fluctuates with it. The car "skates" over a rough surface.

2. **A stiction band around static ride height.** The suspension does not respond to small load changes, so the car does not settle predictably. Corner weights measured on a leaf-sprung car are notoriously unrepeatable for exactly this reason — the car must be rolled and bounced to release the friction before weighing.

3. **Rate hysteresis.** The effective spring rate is higher in the loading direction and lower in unloading, by roughly twice the friction force divided by the deflection. The car's roll stiffness on turn-in differs from its roll stiffness on exit, so the balance is not the same entering and leaving a corner.

4. **The friction is uncontrolled and variable.** It depends on interleaf pressure, surface condition, lubrication, temperature and wear. It changes over a race distance, over a season, and between the left and right springs on the same car. A damper's characteristic can be measured and set; interleaf friction cannot.

5. **It is a poor damper anyway.** Because the force is velocity-independent, it under-damps high-velocity events (where you want more force) and over-damps low-velocity ones (where you want less) — precisely the inverse of what a well-designed damper curve provides (Chapter 22).

**The remedies** in practice: interleaf liners or plastic buttons, single-leaf (mono-leaf) construction, or composite transverse leaves with no interleaf contact at all. Where a multi-leaf spring must be retained by regulation, teams spend real effort on lubrication and liner materials — recognizing that reducing this friction is worth more than the "damping" it provides.
