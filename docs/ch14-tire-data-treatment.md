# Chapter 14 — Tire Data Treatment

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 14. Original explanatory material.*

---

## 1. The problem

Tire test data arrives as a large family of curves: lateral force versus slip angle, at each of several vertical loads, at each of several camber angles, at each of several pressures, for each construction, at each of several slip ratios. A modest test matrix produces hundreds of curves. Two questions follow immediately:

1. How do you **interpolate** — get the force at a load that was not tested?
2. How do you **compare** — decide whether tire A is fundamentally better than tire B, or merely tested at a more favourable load?

The answer developed by Hugo Radt at Calspan and MRA, and presented in this chapter, is **nondimensionalization**: rescale the axes so that the whole family of curves collapses onto a single master curve.

## 2. The nondimensional groups

Two normalizations do the work.

**Normalize force by the peak force at that load:**

$$
\bar F_y = \frac{F_y}{\mu_y F_z}
$$

where $\mu_y = F_{y,\text{peak}}/F_z$ is the peak friction coefficient **at that particular load** — this is where load sensitivity is absorbed.

**Normalize slip angle by the slip angle scale at that load:**

$$
\bar\alpha = \frac{C_\alpha \tan\alpha}{\mu_y F_z}
$$

The denominator $\mu_y F_z$ is the peak force; the numerator is the force the linear model would predict. So $\bar\alpha$ is the ratio of "linear-extrapolated force" to "peak available force" — a dimensionless measure of how hard the tire is being asked to work, independent of load.

With these definitions, tire data taken at widely different vertical loads collapses onto a **single master curve** $\bar F_y(\bar\alpha)$. This is the whole point of the method.

**How the master curve is represented.** Radt's presentation in RCVD fits the collapsed data with a *normalized Magic Formula*:

$$
\bar F = D' \sin\theta, \qquad \theta = C'\arctan(B'\phi), \qquad \phi = (1-E')\bar\alpha + \frac{E'}{B'}\arctan(B'\bar\alpha)
$$

For the P195/70R-14 example used in the book, the fitted parameters are $B' = 0.714$, $C' = 1.40$, $D' = 1.00$, $E' = -0.20$ — and data at five loads from 200 lb to 1800 lb falls close to that one curve. Note $D' = 1.00$: by construction the normalized peak is unity. The peak occurs near $\bar\alpha \approx 2.6$ for this fit.

The book is explicit that the Magic Formula is a convenience, not a necessity — polynomials or other fits would serve equally.

**A useful theoretical alternative.** The brush model, normalized the same way, gives a closed-form master curve:

$$
\bar F_y = \bar\alpha - \frac{\bar\alpha^2}{3} + \frac{\bar\alpha^3}{27}, \qquad |\bar\alpha| \le 3; \qquad \bar F_y = 1, \qquad |\bar\alpha| > 3
$$

with its peak at exactly $\bar\alpha = 3$. This is *not* the fit RCVD uses, and the $\bar\alpha = 3$ peak is an artifact of the brush model's parabolic pressure assumption rather than a property of real tires. It is worth knowing because it is analytically tractable — the exercises below use it for that reason — and because it shows *why* the collapse works: the brush model's shape depends only on the ratio of linear-extrapolated force to peak force, which is exactly $\bar\alpha$.

## 3. Why this works and what it means

The collapse works because the tire's behaviour is governed by two independent quantities that *both* vary with load:
- the initial slope $C_\alpha(F_z)$, and
- the peak force $\mu_y(F_z)F_z$.

Load sensitivity affects both, but in the normalized variables both have been divided out. What remains — the *shape* of the transition from linear to saturated — turns out to be nearly invariant.

**The practical payoff is threefold:**

1. **Interpolation and extrapolation.** Given $C_\alpha(F_z)$ and $\mu_y(F_z)$ as smooth functions fitted to the test loads, you can generate the full curve at any load, including loads outside the tested range (with appropriate caution). This is essential because real wheel loads in a corner — one wheel nearly unloaded, another at double static — routinely fall outside a convenient test matrix.

2. **Comparison.** If two tires collapse onto the same master curve, they differ only in $C_\alpha(F_z)$ and $\mu_y(F_z)$ — two functions instead of hundreds of curves. If they *don't* collapse onto the same curve, that is itself a meaningful finding about construction.

3. **Compression.** A tire is characterized by a handful of coefficients rather than a data table, which makes vehicle simulation tractable and makes sensitivity studies possible.

## 4. Pure slip characteristics

For **pure lateral slip**, fit:

$$
C_\alpha(F_z) = c_1 \sin\left[2\arctan\left(\frac{F_z}{c_2}\right)\right]
$$

a form that captures the characteristic rise-then-fall of cornering stiffness with load (cornering stiffness peaks at a moderate load and declines at high load), and

$$
\mu_y(F_z) = \mu_0 - k_\mu F_z \quad\text{or}\quad \mu_y = a_1 e^{-a_2 F_z} + a_3
$$

for the falling friction coefficient.

For **pure longitudinal slip**, the same construction with $C_s$ (longitudinal stiffness) and $\mu_x$:

$$
\bar\sigma = \frac{C_s\, SR}{\mu_x F_z}, \qquad \bar F_x = \frac{F_x}{\mu_x F_z}
$$

and the same master curve applies to good approximation, which is a striking result — it says the longitudinal and lateral mechanisms are the same physics in different directions, exactly as the brush model predicts.

For **aligning torque**, the book normalizes by $\mu_y F_z$ times the **pneumatic trail $T_z$**, defined specifically as the ratio of self-aligning torque to lateral force *at small slip angles*:

$$
\bar M_z = \frac{M_z}{T_z\,\mu_y F_z}
$$

and similarly for overturning moment, using an **overturning trail** $P_x$ (again the small-slip ratio of $M_x$ to $F_y$):

$$
\bar M_x = \frac{M_x}{P_x\,\mu_y F_z}
$$

Aligning torque collapses less cleanly than force, because pneumatic trail depends on the pressure distribution, which changes shape with load in ways the two-parameter normalization does not capture.

**A preprocessing step worth knowing.** Before normalizing, the book averages lateral force between positive and negative slip angles (accounting for the sign change). This removes **conicity and ply steer**, which would otherwise offset the curve at zero slip. The book's position is that these asymmetries can be reinjected for small-slip work but are of little interest for race cars, which live at high slip angles.

## 5. Combined slip characteristics

Under simultaneous slip angle and slip ratio, the natural generalization defines a **combined normalized slip vector**:

$$
\bar\sigma_x = \frac{C_s\,\sigma_x}{\mu_x F_z}, \qquad \bar\sigma_y = \frac{C_\alpha\,\sigma_y}{\mu_y F_z}, \qquad \bar\sigma = \sqrt{\bar\sigma_x^2 + \bar\sigma_y^2}
$$

with $\sigma_x = SR/(1+SR)$ and $\sigma_y = \tan\alpha/(1+SR)$ the theoretical slip quantities.

The resultant normalized force follows the same master curve in $\bar\sigma$:

$$
\bar F = f(\bar\sigma) = \bar\sigma - \frac{\bar\sigma^2}{3} + \frac{\bar\sigma^3}{27}
$$

and is directed opposite to the slip vector, so:

$$
F_x = \frac{\bar\sigma_x}{\bar\sigma}\,\bar F\,\mu_xF_z, \qquad F_y = \frac{\bar\sigma_y}{\bar\sigma}\,\bar F\,\mu_yF_z
$$

**This automatically generates the friction ellipse.** No separate ellipse assumption is required; it falls out of the normalization plus the master curve. That is the elegance of the method: one scalar function plus two load-dependent scale factors per direction reproduce the entire combined-slip surface.

## 6. Camber

Camber enters as an additional contribution to the effective slip. A common treatment defines an equivalent slip angle:

$$
\alpha_{\text{eff}} = \alpha + \frac{C_\gamma}{C_\alpha}\gamma
$$

so that camber shifts the curve laterally without changing its shape. This is adequate for moderate camber. At large camber the peak force itself changes (camber alters the pressure distribution across the patch) and a peak-scaling term is needed as well.

## 7. Practical cautions

- **Test conditions are not track conditions.** Laboratory tire testing uses a controlled surface (usually a specific abrasive belt or a drum), controlled temperature, and steady-state sweeps. Real tracks have different surfaces, different temperature histories, and transient inputs. Absolute $\mu$ from a rig routinely differs from track values by 10–20%.
- **Temperature is the largest uncontrolled variable.** Peak $\mu$ varies strongly with tread temperature, and a slip-angle sweep heats the tire as it proceeds, so the "peak" measured on a slow sweep is not the peak at a constant temperature. Good test protocols control this; not all do.
- **Wear and cycling** change the tire during the test.
- **Extrapolation beyond the tested load range is dangerous**, particularly toward very low loads, where the fitted $\mu(F_z)$ forms may misbehave.
- **The normalization presumes the master curve shape is invariant.** For radically different constructions (bias vs radial, road vs slick, wet compounds) this should be checked, not assumed.

## 8. Relationship to the Magic Formula

Pacejka's Magic Formula is the alternative industry standard:

$$
F_y = D\sin\left[C\arctan\left(B\alpha - E(B\alpha - \arctan B\alpha)\right)\right]
$$

The two approaches are complementary:

| | Radt nondimensionalization | Magic Formula |
|---|---|---|
| Basis | Physical (brush model) | Empirical curve fit |
| Parameters | 2 load-dependent scale functions + master curve | ~10–30 coefficients per mode |
| Insight | High — parameters have meaning | Low — coefficients are fit artifacts |
| Fit quality | Good | Excellent |
| Extrapolation | Principled | Unreliable |
| Industry use | MRA, race engineering | Universal in simulation |

For **understanding** a tire, nondimensionalize. For **simulating** a vehicle, fit a Magic Formula. Serious practice uses both.

---

## Exercises

*Exercises 14.1, 14.2 and 14.4 use the brush-model master curve because it is analytically tractable. With the book's normalized Magic Formula fit the numbers differ modestly — the peak arrives near $\bar\alpha \approx 2.6$ rather than exactly 3 — but the method and the conclusions are identical.*

**14.1** A tire at $F_z = 4000$ N has $C_\alpha = 1500$ N/deg and $\mu_y = 1.55$. Compute the normalized slip angle at $\alpha = 3°$ and the lateral force from the master curve.

**14.2** For the same tire, find the slip angle at which peak lateral force occurs.

**14.3** A tire tested at 2000, 4000 and 6000 N gives peak forces of 3300, 6200 and 8700 N and cornering stiffnesses of 900, 1500 and 1850 N/deg. Fit $\mu_y(F_z)$ linearly and compute the predicted peak slip angle at each load. Comment on the trend.

**14.4** Using the combined-slip normalization with $C_\alpha = 1500$ N/deg, $C_s = 90{,}000$ N/unit SR, $\mu_x = 1.70$, $\mu_y = 1.55$, $F_z = 4000$ N, compute $F_x$ and $F_y$ at $\alpha = 2°$ and $SR = 0.05$.

**14.5** Show that the master-curve construction automatically produces a friction ellipse in $(F_x, F_y)$ when the tire is fully sliding.

**14.6** A team compares two tires. Tire A: $\mu_y(4000\text{ N}) = 1.60$, $C_\alpha = 1300$ N/deg. Tire B: $\mu_y = 1.52$, $C_\alpha = 1800$ N/deg. Which is better, and for what kind of car?

---

## Solutions

**14.1**
$$
\bar\alpha = \frac{C_\alpha\tan\alpha}{\mu_yF_z}
$$
$\tan 3° = 0.05241$. $C_\alpha$ in N/rad $= 1500 \times 57.3 = 85{,}950$ N/rad.
$$
\bar\alpha = \frac{85950 \times 0.05241}{1.55 \times 4000} = \frac{4504.5}{6200} = 0.7266
$$

Master curve:
$$
\bar F_y = 0.7266 - \frac{0.7266^2}{3} + \frac{0.7266^3}{27} = 0.7266 - 0.1760 + 0.01421 = 0.5648
$$
$$
F_y = \bar F_y \mu_yF_z = 0.5648 \times 6200 = 3502\ \text{N}
$$

(The third term is $0.7266^3/27 = 0.3836/27 = 0.01421$. It is small but not negligible; dropping a decimal place here costs about 80 N.)

Compare the pure linear estimate $C_\alpha\alpha = 4500$ N. The tire is 22% below linear at 3°, and has used 56% of its peak capability.

**14.2**
Peak occurs at $\bar\alpha = 3$:
$$
\tan\alpha_{\text{peak}} = \frac{3\mu_yF_z}{C_\alpha} = \frac{3 \times 6200}{85950} = 0.2164 \Rightarrow \alpha_{\text{peak}} = 12.2°
$$

This is high for a racing slick, which suggests the assumed $C_\alpha$ is low relative to the peak — real slicks with $\mu \approx 1.55$ at 4000 N typically show $C_\alpha$ nearer 2500–3000 N/deg, giving peaks at 6–7°. **The peak slip angle is entirely determined by the ratio $\mu F_z/C_\alpha$** (times the master curve's peak $\bar\alpha$, here taken as 3 for the brush form; with the book's fit it would be about 2.6, giving 10.6° instead of 12.2°), which is a useful sanity check on any tire dataset: if the computed peak angle looks wrong, one of the two inputs is wrong.

**14.3**
$\mu_y = F_{y,\text{peak}}/F_z$:

| $F_z$ (N) | $F_{y,\text{peak}}$ (N) | $\mu_y$ | $C_\alpha$ (N/deg) |
|---|---|---|---|
| 2000 | 3300 | 1.650 | 900 |
| 4000 | 6200 | 1.550 | 1500 |
| 6000 | 8700 | 1.450 | 1850 |

Linear fit: $\mu_y = 1.75 - 5.0\times10^{-5}F_z$ (exact through all three points — the data was constructed to be linear).

Peak slip angle, $\tan\alpha_p = 3\mu_yF_z/C_\alpha$ with $C_\alpha$ converted to N/rad:

- 2000 N: $C_\alpha = 51{,}570$ N/rad; $\tan\alpha_p = 3(3300)/51570 = 0.1920 \Rightarrow 10.9°$
- 4000 N: $C_\alpha = 85{,}950$; $\tan\alpha_p = 3(6200)/85950 = 0.2164 \Rightarrow 12.2°$
- 6000 N: $C_\alpha = 106{,}005$; $\tan\alpha_p = 3(8700)/106005 = 0.2462 \Rightarrow 13.8°$

**Trend**: peak slip angle **increases with load**. This is the standard and important behaviour, and it has a direct handling consequence. In a corner, the heavily loaded outside tire wants a *larger* slip angle to reach its peak than the lightly loaded inside tire. Since both tires on an axle share (approximately) a common slip angle, they cannot both be at their optimum — the inside tire is past its peak while the outside is still short of it, or vice versa. This mismatch is part of why an axle's peak force is less than the sum of its tires' individual peaks, over and above the load-sensitivity effect of Chapter 2.

Note also that $C_\alpha$ rises less than proportionally with load (900 → 1850 for a tripling of load), which is the cornering-stiffness saturation captured by the $\sin[2\arctan(F_z/c_2)]$ fit form.

**14.4**
Theoretical slips: $\sigma_x = SR/(1+SR) = 0.05/1.05 = 0.04762$; $\sigma_y = \tan\alpha/(1+SR) = 0.03492/1.05 = 0.03326$.

Normalized:
$$
\bar\sigma_x = \frac{C_s\sigma_x}{\mu_xF_z} = \frac{90000 \times 0.04762}{1.70 \times 4000} = \frac{4285.8}{6800} = 0.6303
$$
$$
\bar\sigma_y = \frac{C_\alpha\sigma_y}{\mu_yF_z} = \frac{85950 \times 0.03326}{6200} = \frac{2858.7}{6200} = 0.4611
$$
$$
\bar\sigma = \sqrt{0.6303^2 + 0.4611^2} = \sqrt{0.3973 + 0.2126} = \sqrt{0.6099} = 0.7810
$$

Master curve:
$$
\bar F = 0.7810 - \frac{0.6099}{3} + \frac{0.4764}{27} = 0.7810 - 0.2033 + 0.01764 = 0.5953
$$

Components:
$$
F_x = \frac{0.6303}{0.7810}(0.5953)(6800) = 0.8071 \times 4048 = 3267\ \text{N}
$$
$$
F_y = \frac{0.4611}{0.7810}(0.5953)(6200) = 0.5904 \times 3691 = 2179\ \text{N}
$$

Compare with the pure-slip values: at $\alpha = 2°$ alone, $\bar\alpha = 85950(0.03492)/6200 = 0.4841$, giving $\bar F_y = 0.4841 - 0.0781 + 0.0042 = 0.4102$ and $F_y = 2543$ N. So adding 5% slip ratio has cost **14% of the lateral force** while gaining 3267 N of longitudinal force. That is the friction ellipse trade, computed from first principles.

**14.5**
In full sliding, $\bar\sigma > 3$ and $\bar F = 1$. Then:
$$
F_x = \frac{\bar\sigma_x}{\bar\sigma}\mu_xF_z, \qquad F_y = \frac{\bar\sigma_y}{\bar\sigma}\mu_yF_z
$$
Divide by the respective peaks:
$$
\frac{F_x}{\mu_xF_z} = \frac{\bar\sigma_x}{\bar\sigma}, \qquad \frac{F_y}{\mu_yF_z} = \frac{\bar\sigma_y}{\bar\sigma}
$$
Square and add:
$$
\left(\frac{F_x}{\mu_xF_z}\right)^2 + \left(\frac{F_y}{\mu_yF_z}\right)^2 = \frac{\bar\sigma_x^2 + \bar\sigma_y^2}{\bar\sigma^2} = \frac{\bar\sigma^2}{\bar\sigma^2} = 1
$$

which is precisely the friction ellipse with semi-axes $\mu_xF_z$ and $\mu_yF_z$. **The ellipse is a theorem, not an assumption.**

The result also tells you something the naive ellipse does not: it holds *exactly* only at full slide. Inside the sliding boundary ($\bar\sigma < 3$), the locus of achievable $(F_x, F_y)$ at constant $\bar\sigma$ is still an ellipse, but a smaller one scaled by $\bar F(\bar\sigma) < 1$. So the "friction ellipse" is really a nested family of ellipses indexed by total slip magnitude, and the outermost is the limit.

**14.6**
Peak forces at 4000 N: A gives $1.60 \times 4000 = 6400$ N; B gives $1.52 \times 4000 = 6080$ N. **A has 5.3% more peak grip.**

Peak slip angles: 
- A: $\tan\alpha_p = 3(6400)/(1300 \times 57.3) = 19200/74490 = 0.2578 \Rightarrow 14.5°$
- B: $\tan\alpha_p = 3(6080)/(1800 \times 57.3) = 18240/103140 = 0.1768 \Rightarrow 10.0°$

**B reaches its peak at a much lower slip angle and has 38% more cornering stiffness.**

**Which is better depends on the car:**

**Tire A** suits a car that can *afford* large slip angles: a low-downforce car where the driver can steer the car on the throttle, a car with generous steering lock, an oval or dirt car, or a series where tire wear allows sustained sliding. Its extra peak grip is the headline number, and if the car can reach 14.5° at the front without excessive scrub drag, A is faster.

**Tire B** suits a high-downforce car. Three reasons:
1. Higher cornering stiffness gives higher yaw natural frequency and better damping (Chapter 6) — a more responsive, more precise car.
2. A low peak slip angle means less energy dissipated in the contact patch at the limit, so less heat, less degradation, and better consistency over a stint.
3. Aerodynamic cars must run small slip angles anyway, because sliding the car spoils the aerodynamics — a yawed floor loses downforce. B's peak arrives where the car can actually operate.

There is also a **stability argument**: B's sharper peak means less warning at the limit and a steeper drop-off after it, so B is less forgiving. A driver who habitually overshoots the peak will be slower on B despite its theoretical advantages.

The general lesson: **peak $\mu$ alone is a poor tire comparison.** The pair $(\mu_y, C_\alpha)$, and hence the peak slip angle, characterizes how the tire will actually be used, and the right choice depends on the vehicle it is fitted to.
