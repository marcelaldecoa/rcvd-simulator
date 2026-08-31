# Chapter 7 — Steady-State Pair Analysis

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 7. Original explanatory material.*

---

## 1. The problem this chapter solves

Chapter 5 gave a linear model whose parameters are constants. Racing takes place where nothing is constant: tires are past their linear range, load transfer has redistributed the vertical loads, and each of the four tires is operating at a different point on a different curve.

**Pair analysis** is the bridge. It keeps the bicycle-model structure — front axle, rear axle, force and moment balance — but replaces the constant cornering stiffness with a computed **axle characteristic**: the actual lateral force an axle produces, given its slip angle, its share of the lateral load transfer, and the nonlinear load-sensitive tire data.

The word "pair" refers to the left/right pair of tires at each end. The essential insight is that a pair of tires is *not* equivalent to one tire at twice the load, and the difference is exactly the load-sensitivity effect derived in Chapter 2.

## 2. The pair analysis procedure

For a given operating point (speed, lateral acceleration, and configuration):

1. **Compute total lateral load transfer** from $A_y$, CG height, and track width:
   $$
   \Delta F_{z,\text{total}} = \frac{m A_y h}{t}
   $$
   (for a single-track-width vehicle; see Chapter 18 for the sprung/unsprung and geometric/elastic decomposition).

2. **Distribute it front to rear** using the total lateral load transfer distribution:
   $$
   \Delta F_{zf} = \text{TLLTD} \times \Delta F_{z,\text{total}}, \qquad \Delta F_{zr} = (1-\text{TLLTD})\times \Delta F_{z,\text{total}}
   $$
   TLLTD is set by relative roll stiffnesses, roll centre heights, and unsprung mass distribution.

3. **Compute the four wheel loads:**
   $$
   F_{z,fo} = \frac{W_f}{2} + \Delta F_{zf}, \quad F_{z,fi} = \frac{W_f}{2} - \Delta F_{zf}
   $$
   and similarly at the rear. Add longitudinal transfer and aerodynamic loads as required.

4. **For a swept range of axle slip angles**, look up each tire's lateral force at its own vertical load, camber and slip angle, and sum:
   $$
   F_{yf}(\alpha_f) = F_y\big(\alpha_f + \Delta\alpha_{fo},\, F_{z,fo},\, \gamma_{fo}\big) + F_y\big(\alpha_f + \Delta\alpha_{fi},\, F_{z,fi},\, \gamma_{fi}\big)
   $$
   where the $\Delta\alpha$ terms account for steering geometry (Ackermann/parallel/anti-Ackermann) and the $\gamma$ terms for camber change in roll.

5. **Plot the axle characteristics** $F_{yf}$ vs $\alpha_f$ and $F_{yr}$ vs $\alpha_r$.

6. **Find the balance condition**: for a given $A_y$, the required forces are $F_{yf} = W_f A_y$ and $F_{yr} = W_r A_y$ (from moment balance). Read off the required slip angles from the two characteristics; their difference is the instantaneous understeer:
   $$
   \delta = \frac{57.3L}{R} + (\alpha_f - \alpha_r)
   $$

7. **Iterate** — because $A_y$ determines load transfer which determines the characteristics which determine $A_y$. Convergence is typically fast.

## 3. What the axle characteristic reveals

The two axle curves, plotted together, tell you almost everything about the car's limit behaviour:

- **Peak of each curve** = maximum axle lateral force. The ratio $F_{yf}^{\max}/W_f$ versus $F_{yr}^{\max}/W_r$ determines which axle saturates first — i.e. whether the car pushes or spins at the limit.
- **Slope at the origin** = axle cornering stiffness, recovering the Chapter 5 linear parameters.
- **Shape after the peak** determines how violent the limit is. A sharp peak with steep fall-off gives a snappy limit; a broad flat peak gives a forgiving one.
- **Separation between the curves** at each $A_y$ gives $K(A_y)$ — the nonlinear understeer gradient.

The characteristic race-engineering diagram normalizes both axes: plot $F_y/W$ (in g) against slip angle for each axle on the same axes. Then the two curves can be compared directly, and the axle whose curve peaks lower **is the limiting axle**.

## 4. Lateral load transfer distribution — the master tuning parameter

Because axle capacity is degraded by load transfer quadratically (Chapter 2, Exercise 2.6), and because the *total* load transfer is fixed by $m$, $A_y$, $h$ and $t$ — none of which are easily changed — the engineer's lever is the **distribution** of that fixed total between front and rear.

$$
\text{Loss}_f = 2c_f\Delta F_{zf}^2, \qquad \text{Loss}_r = 2c_r\Delta F_{zr}^2
$$

Move load transfer forward (stiffer front bar, softer rear bar, higher front roll centre) and the front loses more capacity: **more understeer**. Move it rearward: **more oversteer**. This is the entire mechanism, and it explains why:

- Anti-roll bars change balance without changing total grip much (they redistribute, they don't reduce — to first order).
- Lowering the CG improves total grip (reduces $\Delta F_z$ everywhere) but does *not* by itself change balance.
- Widening the track improves total grip at that end and reduces that end's load transfer, adding grip there.

Typical TLLTD values: 50–58% front for a mildly understeering car; the exact value that gives neutral balance depends on weight distribution, tire sizes and aero balance.

## 5. Longitudinal load transfer and combined operation

Pair analysis extends naturally to combined states. Under braking, longitudinal transfer unloads the rear:

$$
\Delta F_{z,\text{long}} = \frac{m A_x h}{L}
$$

so the rear axle characteristic collapses at exactly the moment corner entry demands rear lateral force — this is the analytical account of corner-entry instability, and why brake bias is a handling parameter, not just a braking parameter.

Under power, the reverse: the rear gains load (helping lateral capacity) but must also spend part of the friction budget on $F_x$ (hurting it via the friction ellipse). Which effect wins depends on the level of $A_x$; the crossover is the reason "maintenance throttle" stabilizes a car and "power-on" destabilizes it.

## 6. Camber and steer effects in the pair

Two second-order effects that pair analysis captures and the bicycle model cannot:

**Camber in roll.** As the body rolls, an independent suspension changes camber at both wheels. Typical outcome: the loaded outside wheel gains positive (unfavourable) camber unless the geometry provides enough camber gain. Since the outside wheel carries most of the load, its camber dominates the axle characteristic. This is why camber curves and roll centre heights are inseparable from balance (Chapter 17).

**Steer distribution across the pair.** With pure Ackermann geometry the inside wheel is steered more than the outside; at high $A_y$ the inside wheel is lightly loaded and its extra steer is wasted or harmful. Race cars commonly run reduced or reversed (anti-)Ackermann to keep the heavily loaded outside tire nearer its optimum slip angle (Chapter 19.2).

## 7. Relationship to the MRA computer program

The chapter describes an implementation: given tire data, vehicle geometry, mass properties and a configuration, sweep speed and lateral acceleration, and produce the axle characteristics and the resulting steady-state balance. This is the direct ancestor of the Moment Method program of Chapter 8 — pair analysis constrains the car to the balanced condition ($N = 0$), while the Moment Method removes that constraint and explores the whole $(\beta, \delta)$ plane.

Understanding pair analysis first is essential, because the MMM diagram is best read as **the set of all pair-analysis states, including the unbalanced ones.**

---

## Exercises

**7.1** A car has $m = 800$ kg, CG height $h = 0.30$ m, track $t = 1.55$ m front and rear, 45/55 front/rear weight distribution. Compute total lateral load transfer at 1.5 g and the front/rear split for TLLTD = 0.55.

**7.2** Using the tire model $F_y^{\max}(F_z) = 1.7F_z - 6\times10^{-5}F_z^2$, compute the front and rear axle peak forces for the car of 7.1 at 1.5 g, and determine which axle limits.

**7.3** For the same car, find the TLLTD that equalizes the axles' normalized capacity ($F_{yf}^{\max}/W_f = F_{yr}^{\max}/W_r$).

**7.4** Show that, for a quadratic load-sensitivity model, the difference in axle capacity loss between front and rear depends only on TLLTD and the total load transfer.

**7.5** A car brakes at 0.8 g while cornering at 1.0 g. With $h = 0.32$ m, $L = 2.65$ m, $m = 750$ kg, compute the longitudinal transfer and the resulting rear axle vertical loads including lateral transfer (track 1.5 m, TLLTD 0.54).

**7.6** Explain, using pair analysis logic, why lowering the CG height improves grip but not balance, whereas moving the roll centre does the opposite.

---

## Solutions

**7.1**
$$
\Delta F_{z,\text{total}} = \frac{mA_yh}{t} = \frac{800 \times (1.5 \times 9.81) \times 0.30}{1.55} = \frac{800 \times 14.715 \times 0.30}{1.55} = \frac{3531.6}{1.55} = 2278\ \text{N}
$$
$$
\Delta F_{zf} = 0.55 \times 2278 = 1253\ \text{N}, \qquad \Delta F_{zr} = 0.45 \times 2278 = 1025\ \text{N}
$$

Static loads: $W = 7848$ N; $W_f = 3532$ N (1766 N/wheel), $W_r = 4316$ N (2158 N/wheel).

Wheel loads at 1.5 g:
- Front outside: $1766 + 1253 = 3019$ N; front inside: $1766 - 1253 = 513$ N
- Rear outside: $2158 + 1025 = 3183$ N; rear inside: $2158 - 1025 = 1133$ N

Note the front inside wheel is nearly unloaded — at 1.63 g it lifts entirely. Wheel lift is not merely cosmetic: once a wheel is off the ground, the axle capacity is that of one tire only, and TLLTD becomes uncontrollable at that end.

**7.2**
$F_y^{\max}(F_z) = 1.7F_z - 6\times10^{-5}F_z^2$.

Front outside (3019 N): $1.7(3019) - 6\times10^{-5}(3019)^2 = 5132 - 547 = 4585$ N
Front inside (513 N): $872 - 16 = 856$ N
**Front axle peak: 5441 N**

Rear outside (3183 N): $5411 - 608 = 4803$ N
Rear inside (1133 N): $1926 - 77 = 1849$ N
**Rear axle peak: 6652 N**

Normalized capacity:
$$
\frac{F_{yf}^{\max}}{W_f} = \frac{5441}{3532} = 1.541\ g, \qquad \frac{F_{yr}^{\max}}{W_r} = \frac{6652}{4316} = 1.541\ g
$$

Remarkably, they are essentially equal — the car is **neutral at the limit** at this operating point with TLLTD = 0.55. (This is not coincidence; 0.55 was chosen close to the balancing value for this configuration.) At a slightly higher TLLTD the front would limit and the car would push; slightly lower and the rear would go first.

**7.3**
Work with the exact quadratic identity from Chapter 2: for tires at $\bar F \pm \Delta$,
$$
F_y^{\text{axle}} = \mu_0 W_{\text{axle}} - \frac{c W_{\text{axle}}^2}{2} - 2c\Delta^2
$$
Normalizing by axle load and equating front and rear:
$$
\mu_0 - \frac{cW_f}{2} - \frac{2c\Delta_f^2}{W_f} = \mu_0 - \frac{cW_r}{2} - \frac{2c\Delta_r^2}{W_r}
$$
The $\mu_0$ and $c$ terms cancel neatly, leaving a condition independent of $\mu_0$:
$$
\frac{W_r - W_f}{2} = 2\Delta_T^2\left[\frac{x^2}{W_f} - \frac{(1-x)^2}{W_r}\right]
$$
with $x = $ TLLTD, $\Delta_T = 2278$ N, $W_f = 3532$ N, $W_r = 4316$ N.

Left side: $392.4$. And $2\Delta_T^2 = 1.0383\times10^7$, so the bracket must equal $3.779\times10^{-5}$. Expanding into a quadratic in $x$:
$$
\left(\tfrac{1}{W_f}-\tfrac{1}{W_r}\right)x^2 + \tfrac{2}{W_r}x - \tfrac{1}{W_r} - 3.779\times10^{-5} = 0
$$
$$
5.149\times10^{-5}x^2 + 4.633\times10^{-4}x - 2.695\times10^{-4} = 0
$$
$$
x = \frac{-4.633\times10^{-4} + \sqrt{2.147\times10^{-7} + 5.550\times10^{-8}}}{1.030\times10^{-4}} = \frac{5.645\times10^{-5}}{1.030\times10^{-4}} = \boxed{0.548}
$$

Balancing TLLTD is **54.8% front**, confirming the numerical result of Exercise 7.2 (both axles at 1.541 g). Note what this says physically: the *heavier* rear axle wants the *smaller* share of load transfer. That is the general rule — a rear-biased car needs front-biased TLLTD to be neutral, which is why rear-engined cars run large front bars and soft rear bars.

Note also the caution that this closed form is exact **only** for a purely quadratic load-sensitivity model and only while all four wheels remain loaded. With real tire data, camber effects, and wheel lift, pair analysis is an iterative numerical procedure — set it up in a spreadsheet, sweep TLLTD, and read the crossing point.

**7.4**
With $F_y(F_z) = \mu_0F_z - cF_z^2$, axle loss $= 2c\Delta^2$. Writing $\Delta_f = x\Delta_T$ and $\Delta_r = (1-x)\Delta_T$:
$$
\text{Loss}_f - \text{Loss}_r = 2c\Delta_T^2\left[x^2 - (1-x)^2\right] = 2c\Delta_T^2(2x - 1)
$$

Three consequences:
1. The differential loss is **linear in $(2x-1)$** — i.e. linear in how far TLLTD departs from 50%. Balance response to bar changes is therefore quite linear and predictable, which matches race engineering experience.
2. It scales with $\Delta_T^2$, hence with $A_y^2$. **Balance changes with lateral acceleration**: a car set neutral at 1.0 g will not be neutral at 1.6 g. This is why balance must be quoted at a stated $A_y$.
3. At $x = 0.5$ the differential loss is zero regardless of $\Delta_T$ — 50% TLLTD is the "neutral" reference in this respect, with residual balance then set by weight distribution and tire sizes.

**7.5**
Longitudinal transfer under 0.8 g braking:
$$
\Delta F_{z,\text{long}} = \frac{mA_xh}{L} = \frac{750 \times 7.848 \times 0.32}{2.65} = \frac{1883.5}{2.65} = 711\ \text{N}
$$
(transferred from rear to front).

Lateral transfer at 1.0 g:
$$
\Delta F_{z,\text{lat}} = \frac{750 \times 9.81 \times 0.32}{1.50} = 1570\ \text{N}; \quad \Delta_r = 0.46 \times 1570 = 722\ \text{N}
$$

Assume 45/55 static: $W = 7358$ N, $W_r = 4047$ N, so 2023 N/wheel statically.
After longitudinal transfer: rear axle $= 4047 - 711 = 3336$ N, i.e. 1668 N/wheel.
With lateral transfer:
- Rear outside: $1668 + 722 = 2390$ N
- Rear inside: $1668 - 722 = 946$ N

The rear axle has lost 17.6% of its vertical load *and* must still supply braking force from the same contact patches. Using the quadratic model above, its lateral capacity has fallen from roughly 6800 N (static, no transfer) to $1.7(2390)-6\times10^{-5}(2390)^2 + 1.7(946)-6\times10^{-5}(946)^2 = (4063-343)+(1608-54) = 5274$ N — a 22% reduction — before the friction-ellipse penalty for simultaneous braking is applied. **This is corner-entry instability in numbers**, and it explains why moving brake bias forward is the standard first response to a car that is loose on entry.

**7.6**
**Lowering the CG** reduces $\Delta F_{z,\text{total}} = mA_yh/t$ at *both* ends proportionally. Since the capacity loss is $2c\Delta^2$ at each axle and both $\Delta$s shrink by the same factor, total grip rises. But the *ratio* of front to rear loss is unchanged, because TLLTD — which is set by roll stiffness distribution and geometric effects, not by $h$ — has not moved. So: **more grip, same balance.** (Second-order corrections exist: because the losses are quadratic, the *differential* loss also shrinks, so a low car is slightly less sensitive to bar changes.)

**Moving a roll centre** changes the split between geometric and elastic load transfer at that end, altering $\Delta F_{zf}$ and $\Delta F_{zr}$ in opposite directions while their sum stays fixed at $mA_yh/t$. So: **same total load transfer, different distribution — balance changes, total grip barely does** (again to first order; the quadratic loss term means moving away from 50/50 always costs a little total grip).

This pair of results is the cleanest statement of why the two adjustments are not interchangeable, and why "lower is better" and "roll centres set balance" are both true without contradicting each other.
