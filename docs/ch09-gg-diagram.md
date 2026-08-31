# Chapter 9 — The "g-g" Diagram

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 9. Original explanatory material.*

---

## 1. Concept

The g-g diagram is a plot of longitudinal acceleration $A_x$ against lateral acceleration $A_y$, with the boundary showing the vehicle's complete performance envelope. It is the single most compact statement of what a race car can do, and — read the other way — of what a driver actually did.

Its ancestry is again aeronautical: it is the automobile's version of the aircraft V-n (velocity–load factor) diagram, a boundary within which the vehicle must operate.

## 2. The boundary

The idealized boundary, from a point-mass friction model:

$$
A_x^2 + A_y^2 \le (\mu g)^2
$$

The real boundary departs from a circle in four important ways:

1. **Longitudinal and lateral friction coefficients differ.** Peak $\mu_x$ typically exceeds peak $\mu_y$ by 5–15%, stretching the envelope vertically into an ellipse.

2. **Acceleration is power-limited above a certain speed.** The top of the diagram is truncated by
   $$
   A_x^{\max} = \frac{P\eta}{mV} - \frac{\frac{1}{2}\rho V^2 C_DA}{m} - f_r g
   $$
   which falls as $1/V$. At low speed the car is traction-limited (or, for a rear-drive car, limited by the load on the driven axle); at high speed it is power- and drag-limited.

3. **Braking exceeds acceleration** for almost all cars, because all four tires brake but only two (or four, with reduced efficiency) drive, and because forward load transfer aids the front brakes.

4. **Downforce makes the envelope speed-dependent.** With aerodynamics, the boundary expands with $V^2$:
   $$
   A^{\max}(V) = \mu g\left(1 + \frac{\rho V^2 C_LA}{2W}\right)
   $$
   so the g-g "diagram" is really a **g-g-V surface**, a stack of envelopes indexed by speed.

## 3. The realistic shape

A representative formula car envelope at moderate speed:

| Region | Typical value |
|---|---|
| Peak braking ($-A_x$, $A_y = 0$) | $-1.6$ to $-5.0$ g (with aero) |
| Peak acceleration ($+A_x$) | $+0.8$ to $+1.5$ g (traction limited at low speed) |
| Peak lateral | $\pm 1.4$ to $\pm 3.5$ g |
| Combined braking + cornering | roughly elliptical between them |

The upper-right and upper-left quadrants (accelerating while cornering) are systematically smaller than the lower quadrants (braking while cornering), and are further constrained by differential behaviour and traction limits at the driven axle.

## 4. Vehicle capability versus driver usage

The chapter's most valuable practical content is the distinction between the **capability envelope** (what the car could do) and the **usage plot** (what the driver did). Overlaying logged $A_x$–$A_y$ data onto the theoretical boundary produces the single most-used diagnostic plot in race data analysis.

What the patterns mean:

- **Data filling the boundary everywhere**: excellent driver, well-matched car.
- **Data reaching peak braking and peak lateral but with a "notch" between them**: the driver is braking in a straight line and then turning — not blending. Time is available in the transition. This is the classic amateur signature.
- **Data reaching lateral limits but not braking limits**: brake confidence, brake balance, or brake feel problem.
- **Data asymmetric left/right**: setup asymmetry, track layout, or driver preference.
- **Data exceeding the computed boundary**: your boundary model is wrong — usually because downforce or banking was neglected.

The transition regions matter disproportionately because, as Chapter 1 showed, time is most sensitive to speed where speed is lowest, and the low-speed portions of a lap are exactly the corner entry and exit phases where the g-g transitions occur.

## 5. Using the g-g in lap simulation

Quasi-steady-state lap simulation is built directly on the g-g surface:

1. Discretize the racing line into segments with known curvature $\kappa(s)$.
2. At each point, the lateral demand is $A_y = \kappa V^2/g$; the g-g envelope at that speed gives the remaining $A_x$ budget.
3. Forward-integrate from each corner apex under maximum acceleration; backward-integrate under maximum braking.
4. The speed profile is the minimum of the forward pass, the backward pass, and the cornering limit at each point.
5. Integrate $dt = ds/V$.

$$
V_{i+1}^2 = V_i^2 + 2A_x(V_i, A_{y,i})\,\Delta s
$$

This "QSS" method neglects transients (yaw inertia, load transfer dynamics, tire relaxation) and typically predicts lap times a fraction of a second optimistic, but it is extraordinarily useful for sensitivity studies: change $C_LA$ by 5%, rerun, read the lap time delta.

## 6. Sensitivity analysis — where the g-g earns its keep

The derivative of lap time with respect to a vehicle parameter is the currency of race car development:

$$
\frac{\partial t_{\text{lap}}}{\partial(C_LA)}, \quad \frac{\partial t_{\text{lap}}}{\partial(C_DA)}, \quad \frac{\partial t_{\text{lap}}}{\partial m}, \quad \frac{\partial t_{\text{lap}}}{\partial \mu}
$$

Typical magnitudes for a downforce formula car on a mixed circuit:
- 10 kg mass: 0.25–0.4 s/lap
- 1% downforce: 0.05–0.15 s/lap (strongly circuit-dependent)
- 1% drag: 0.02–0.08 s/lap
- The downforce/drag exchange rate ("efficiency") is the key aero design metric, and its optimum wing level differs for Monza and Monaco by a factor of two.

## 7. Historical notes

The g-g concept was developed at Cornell Aeronautical Laboratory in the 1950s–60s in the context of driver studies, and popularized in racing over subsequent decades. Its adoption tracked the availability of onboard accelerometry: the diagram is trivial to construct from two accelerometers and a data logger, which is why it became universal once such systems became affordable in the 1980s.

---

## Exercises

**9.1** A car has $\mu_x = 1.7$ and $\mu_y = 1.5$. Construct the elliptical boundary and find the maximum braking available at 1.0 g of lateral acceleration.

**9.2** A car has $P = 400$ kW at the wheels, $m = 780$ kg, $C_DA = 1.15$ m², $f_r = 0.02$. Find the maximum longitudinal acceleration at 30, 60 and 90 m/s, and identify where it becomes power-limited rather than traction-limited (assume traction limit 1.2 g).

**9.3** For a car with $\mu = 1.5$, $C_LA = 3.2$ m², $m = 720$ kg, compute the peak lateral acceleration at 30, 50 and 80 m/s.

**9.4** Using QSS integration, a car exits a corner at 25 m/s and accelerates over 200 m at an average 0.9 g. Find the entry speed to the next braking zone, and the braking distance required to reach 30 m/s at 1.8 g.

**9.5** Data from a lap shows peak lateral 1.48 g, peak braking 1.71 g, but the maximum combined magnitude recorded is 1.52 g at $(A_y, A_x) = (1.20, -0.93)$. Comment on the driver's use of the envelope.

**9.6** A team is offered two aero packages: A adds 8% downforce and 6% drag; B adds 4% downforce and 1% drag. Using the sensitivities in section 6 (0.10 s/lap per 1% downforce, 0.05 s/lap per 1% drag), evaluate. What circuit characteristics would flip the answer?

---

## Solutions

**9.1**
Boundary:
$$
\left(\frac{A_x}{1.7}\right)^2 + \left(\frac{A_y}{1.5}\right)^2 = 1
$$
At $A_y = 1.0$ g:
$$
A_x = 1.7\sqrt{1 - (1.0/1.5)^2} = 1.7\sqrt{1 - 0.4444} = 1.7 \times 0.7454 = 1.267\ g
$$

So at 67% of lateral capability, 74.5% of braking capability remains. Note this is *more* forgiving than the circular case would suggest in absolute terms (1.267 g vs 1.118 g for a circle at $\mu=1.5$) purely because $\mu_x > \mu_y$. The *fractional* trade is identical to the circle — the ellipse is just a scaled circle.

**9.2**
$$
A_x = \frac{P}{mV} - \frac{\frac{1}{2}\rho V^2C_DA}{m} - f_rg
$$
Drag term coefficient: $\frac{1}{2}(1.225)(1.15) = 0.7044$ N per (m/s)².
Rolling: $f_rg = 0.02 \times 9.81 = 0.196$ m/s².

At $V = 30$: $\frac{400000}{780\times30} = 17.09$; drag $= 0.7044(900)/780 = 0.813$; $A_x = 17.09 - 0.81 - 0.20 = 16.08$ m/s² $= 1.64$ g → **traction-limited at 1.2 g**.

At $V = 60$: $\frac{400000}{46800} = 8.547$; drag $= 0.7044(3600)/780 = 3.251$; $A_x = 8.547-3.251-0.196 = 5.10$ m/s² $= 0.52$ g → **power/drag-limited**.

At $V = 90$: $\frac{400000}{70200} = 5.698$; drag $= 0.7044(8100)/780 = 7.315$; $A_x = 5.698 - 7.315 - 0.196 = -1.81$ m/s² → **negative: the car is above its top speed**. Top speed is where $A_x = 0$; solving $\frac{400000}{780V} = 0.7044V^2/780 + 0.196$ gives $V \approx 82$ m/s (295 km/h).

Crossover from traction- to power-limited: set $P/(mV) - \text{drag}/m - f_rg = 1.2g = 11.77$:
$$
\frac{512.8}{V} - 9.03\times10^{-4}V^2 = 11.97 \Rightarrow V \approx 42\ \text{m/s}
$$
Below about 42 m/s the car is grip-limited; above it, power-limited. This crossover speed is the single most useful number for gearing decisions.

**9.3**
$$
A_y^{\max} = \mu g\left(1 + \frac{\rho V^2C_LA}{2W}\right), \quad W = 720 \times 9.81 = 7063\ \text{N}
$$
$$
\frac{\rho C_LA}{2W} = \frac{1.225 \times 3.2}{2 \times 7063} = 2.775\times10^{-4}
$$

| $V$ (m/s) | Downforce factor | $A_y^{\max}$ (g) |
|---|---|---|
| 30 | $1 + 0.2498 = 1.250$ | 1.87 |
| 50 | $1 + 0.6938 = 1.694$ | 2.54 |
| 80 | $1 + 1.776 = 2.776$ | 4.16 |

The 80 m/s figure of 4.16 g is at the edge of physiological sustainability and would in practice be limited by tire thermal capacity, structural loads and driver neck strength before the friction limit. It also illustrates why fast corners in modern formula cars are effectively flat-out: the required $A_y$ to follow a large-radius corner at high speed is far below what the car can generate.

**9.4**
Acceleration phase:
$$
V^2 = 25^2 + 2(0.9 \times 9.81)(200) = 625 + 3532 = 4157 \Rightarrow V = 64.5\ \text{m/s}
$$

Braking from 64.5 to 30 m/s at 1.8 g $= 17.66$ m/s²:
$$
d = \frac{V_1^2 - V_2^2}{2a} = \frac{4157 - 900}{2 \times 17.66} = \frac{3257}{35.32} = 92.2\ \text{m}
$$

Note the asymmetry: 200 m to gain 39.5 m/s, 92 m to lose 34.5 m/s. Braking is roughly twice as effective as acceleration in this example — which is why braking points are so much more time-critical than throttle application points, and why the QSS backward pass usually determines the speed profile over more of the lap than the forward pass.

**9.5**
Peak resultant recorded: $\sqrt{1.20^2 + 0.93^2} = \sqrt{1.44+0.865} = 1.518$ g. Compare with peak pure lateral (1.48 g) and peak pure braking (1.71 g).

The elliptical boundary through those pure values would predict, at $A_y = 1.20$:
$$
A_x = 1.71\sqrt{1 - (1.20/1.48)^2} = 1.71\sqrt{1 - 0.6574} = 1.71 \times 0.5854 = 1.001\ g
$$
The driver achieved 0.93 g — **93% of the available combined braking**, which is respectable.

The more telling number is that the peak *resultant* is only 1.52 g while the car can do 1.71 g in pure braking. That is expected on an ellipse (the resultant magnitude is not constant on an ellipse) but the driver should be checked for whether the combined-region data forms a smooth arc or a gap. The specific diagnostic to run: plot the data density along the boundary. Sparse data in the region between $(0, -1.71)$ and $(1.20, -0.93)$ would indicate the driver releases the brake abruptly on turn-in rather than blending — the "notch" signature. Given the 93% figure, this driver is blending reasonably; the remaining time is probably in the throttle-application quadrant, which was not reported.

**9.6**
Package A: $8 \times 0.10 - 6 \times 0.05 = 0.80 - 0.30 = 0.50$ s/lap gain.
Package B: $4 \times 0.10 - 1 \times 0.05 = 0.40 - 0.05 = 0.35$ s/lap gain.

**Package A wins** on these sensitivities, by 0.15 s/lap.

**What flips the answer**: the sensitivities are circuit-dependent, and the ratio $\partial t/\partial C_L : \partial t/\partial C_D$ scales roughly with the ratio of corner-dominated to straight-dominated lap distance.

At a low-downforce circuit like Monza — long straights, few slow corners — the drag sensitivity might be 0.12 s/lap per 1% and the downforce sensitivity 0.04 s/lap per 1%. Then:
- A: $8(0.04) - 6(0.12) = 0.32 - 0.72 = -0.40$ s/lap — a **loss**.
- B: $4(0.04) - 1(0.12) = 0.16 - 0.12 = +0.04$ s/lap — a marginal gain.

B wins decisively. The other flipping factor is **efficiency**: A's $L/D$ increment is $8/6 = 1.33$, B's is $4/1 = 4.0$. Package B is a far better piece of aerodynamics; it simply produces less of it. In a development programme, B is the device you want, because you can add more of it (or scale it up) — whereas A's poor efficiency means adding more makes the drag penalty worse faster. **Always evaluate an aero change by its efficiency first and its magnitude second.**
