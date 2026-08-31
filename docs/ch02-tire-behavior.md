# Chapter 2 — Tire Behavior

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 2. Original explanatory material.*

---

## 1. The central claim

The tire is the only mechanism by which the car can control its trajectory. Every suspension decision, every aerodynamic decision, every setup change is ultimately an attempt to place the four contact patches in a more favourable operating state. If you understand nothing else in vehicle dynamics, understand the shape of the tire's force–slip curves and their dependence on vertical load, camber, and combined operation.

The Millikens make a point that distinguishes automotive from aeronautical stability work: in an aircraft, the aerodynamic force derivatives are relatively benign and well-behaved; in a car, the dominant force generator is a **strongly nonlinear, load-sensitive, hysteretic rubber contact patch**. That nonlinearity is not a nuisance to be linearized away — it *is* the subject.

## 2. Lateral force and slip angle

### 2.1 Definition

**Slip angle** $\alpha$ is the angle between the wheel's direction of heading (the plane of the wheel) and its direction of travel:

$$
\alpha = \arctan\!\left(\frac{V_y}{V_x}\right) \approx \frac{V_y}{V_x} \quad \text{for small } \alpha
$$

where $V_x$, $V_y$ are the longitudinal and lateral components of the contact-patch velocity in the wheel-fixed frame. Crucially, a tire generates lateral force **only** by slipping. There is no lateral force at zero slip angle (excepting camber thrust, conicity and ply steer, discussed below).

### 2.2 The lateral force curve

The characteristic shape has three regions:

1. **Linear region** ($|\alpha| \lesssim 2$–4°): force rises nearly proportionally to slip angle.
   $$
   F_y = C_\alpha \, \alpha
   $$
   $C_\alpha$ is the **cornering stiffness**, units N/rad or N/deg. Race tires reach $C_\alpha$ values of order 1000–2500 N/deg per tire.

2. **Transitional region**: the curve bends over as an increasing fraction of the contact patch slides rather than adheres.

3. **Peak and beyond**: force reaches a maximum $F_{y,\max} \approx \mu_y F_z$ at a **peak slip angle** typically 4–8° for a slick racing tire and 8–14° for a road tire, then falls away (or plateaus) in the fully sliding regime.

**Sign convention (SAE):** a positive slip angle produces a *negative* lateral force. This trips up nearly everyone once. Many practitioners plot $-F_y$ vs $\alpha$ to get an intuitive first-quadrant curve; be explicit about which convention a data set uses.

### 2.3 The brush model — where the shape comes from

A tractable physical model treats the tread as an array of elastic bristles entering the contact patch at the leading edge. In the adhesion zone a bristle deflects linearly with distance $x$ from the leading edge; it slides once its shear force exceeds the local friction limit set by the pressure distribution. With contact length $a$, tread stiffness per unit length $c_p$, and a parabolic pressure distribution, one obtains the classic result:

$$
F_y = \begin{cases}
C_\alpha \tan\alpha - \dfrac{C_\alpha^2 \tan^2\alpha}{3\mu F_z} + \dfrac{C_\alpha^3 \tan^3\alpha}{27\mu^2 F_z^2}, & |\alpha| < \alpha_{sl}\\[2ex]
\mu F_z \operatorname{sgn}(\alpha), & |\alpha| \ge \alpha_{sl}
\end{cases}
$$

with the full-slide angle $\tan\alpha_{sl} = 3\mu F_z / C_\alpha$, and $C_\alpha = 2 c_p a^2$.

This cubic ("Fiala") form is the cheapest model that reproduces the correct shape: linear at the origin, smooth rollover, saturation at $\mu F_z$. It also explains **why** the peak occurs where it does — it is the slip angle at which the sliding zone has consumed the entire contact patch.

For data fitting, the **Magic Formula** (Pacejka) is the industry standard:

$$
F_y = D \sin\Big( C \arctan\big[ B\alpha - E(B\alpha - \arctan B\alpha)\big]\Big)
$$

where $D$ is the peak, $BCD$ is the slope at the origin (i.e. the cornering stiffness), $C$ the shape factor, and $E$ the curvature factor. It has no physical derivation but is superbly well-behaved for interpolation.

## 3. Load sensitivity — the most important nonlinearity in the book

Lateral force does **not** grow proportionally with vertical load. The effective friction coefficient falls as load rises:

$$
\mu_y(F_z) = \mu_0\left(1 - k_\mu \frac{F_z - F_{z0}}{F_{z0}}\right) \quad\text{(a common linearization)}
$$

Equivalently, $F_y$ versus $F_z$ is a concave-down curve. This single fact generates a huge fraction of the practical content of race car engineering:

**Consequence 1 — lateral load transfer reduces axle capacity.** Consider an axle with two tires nominally at load $F_z$ each. Transfer $\Delta F_z$ from inside to outside. Total lateral force becomes

$$
F_y^{\text{axle}} = F_y(F_z + \Delta F_z) + F_y(F_z - \Delta F_z)
$$

Because $F_y(F_z)$ is concave, this is **less** than $2F_y(F_z)$ by Jensen's inequality. Expanding to second order:

$$
F_y^{\text{axle}} \approx 2F_y(F_z) + \frac{d^2 F_y}{dF_z^2}\,\Delta F_z^2
$$

and since $d^2F_y/dF_z^2 < 0$, the loss grows with the **square** of load transfer.

**Consequence 2 — this is the mechanism of balance tuning.** If you increase the roll stiffness at the front, you increase front lateral load transfer, degrade front axle capacity more than rear, and the car understeers more. Every anti-roll bar adjustment on every race car in the world is an application of this one derivative. It is developed quantitatively in Chapters 7 and 18.

**Consequence 3 — weight matters twice.** A lighter car needs less force *and* operates its tires at lower load where $\mu$ is higher.

## 4. Aligning torque and pneumatic trail

The lateral force does not act at the geometric centre of the contact patch. Because the bristle deflection distribution is triangular-ish in the adhesion region, the resultant acts **aft** of centre by the **pneumatic trail** $t_p$:

$$
M_z = -F_y \, t_p
$$

$M_z$ is the **aligning torque**, the tire's self-centring moment about the vertical axis.

Behaviour of $t_p$ with slip angle is the key insight:

- At small $\alpha$, $t_p \approx a/3$ (about one-sixth of contact length aft of centre for a parabolic pressure distribution — roughly 20–40 mm for a race tire).
- As $\alpha$ grows and the rear of the patch begins to slide, the centroid of the force distribution moves **forward**, so $t_p$ **decreases**.
- Near the lateral force peak, $t_p \to 0$ and can go slightly negative.

Therefore $M_z$ peaks at a **lower slip angle than $F_y$** and is already decaying when $F_y$ is still rising. Combined with mechanical trail from caster, this is what the driver feels through the steering wheel: **steering torque drops off before grip does, giving advance warning of the front limit.** Removing that cue — through excessive power assistance, or a caster setting that swamps the pneumatic component — removes the driver's most important limit sensor. This is a genuine handling-quality decision, not a detail.

Total trail: $t_{\text{total}} = t_p + t_m$ where $t_m$ is mechanical (caster) trail. Steering torque at the wheel $\approx F_y (t_p + t_m)/G_s$ for steering ratio $G_s$.

## 5. Longitudinal force and slip ratio

Longitudinal force is generated by **slip ratio**:

$$
SR = \frac{\Omega R_e - V_x}{V_x}
$$

(SAE definition; other definitions normalize by $\Omega R_e$ — always check.) Positive $SR$ = driving, negative = braking.

The $F_x$–$SR$ curve has the same qualitative shape as $F_y$–$\alpha$: linear region with **longitudinal stiffness** $C_s = \partial F_x/\partial SR$, a peak at typically 5–15% slip, then a decline. Peak longitudinal $\mu$ generally exceeds peak lateral $\mu$ on the same tire, often by 5–15%, because the contact patch is longer than it is wide and the bristle mechanics differ.

The declining branch after the peak is why **ABS and traction control exist**: beyond peak, the system is open-loop unstable — a wheel that starts to lock loses force, which accelerates locking.

## 6. Combined operation and the friction ellipse

A tire cannot deliver peak lateral and peak longitudinal force simultaneously. The locus of achievable $(F_x, F_y)$ is approximately an ellipse:

$$
\left(\frac{F_x}{F_{x,\max}}\right)^2 + \left(\frac{F_y}{F_{y,\max}}\right)^2 = 1
$$

Physically this arises because the friction limit acts on the *resultant* shear stress in the contact patch. If we define combined slip magnitude $\sigma = \sqrt{\sigma_x^2 + \sigma_y^2}$ with $\sigma_x = SR/(1+SR)$ and $\sigma_y = \tan\alpha/(1+SR)$, then the brush model gives a resultant force along $-\vec{\sigma}$ of magnitude $F(\sigma)$, and:

$$
F_x = \frac{\sigma_x}{\sigma}F(\sigma), \qquad F_y = \frac{\sigma_y}{\sigma}F(\sigma)
$$

which is precisely the "friction circle" structure, distorted into an ellipse by the differing peak coefficients and stiffnesses.

**Practical readings:**
- Braking at 50% of longitudinal capability leaves $\sqrt{1-0.25} = 87\%$ of lateral capability. Trail braking is cheap near the start, expensive near the end.
- The lateral force at a given slip angle collapses dramatically under simultaneous drive torque — this is the mechanism of power-on oversteer.

## 7. Camber

An inclined rolling tire generates **camber thrust** even at zero slip angle, because the contact patch is constrained to follow a straight line while the free-rolling tire would prefer to trace a cone.

$$
F_y \approx C_\alpha \alpha + C_\gamma \gamma
$$

with camber stiffness $C_\gamma$ typically **one-fifth to one-tenth** of $C_\alpha$ for a radial tire (much higher for a motorcycle tire, which is why bikes steer by leaning). Sign convention: positive camber (top of wheel leaning outboard, SAE) produces positive $F_y$.

Camber also affects the **peak**: modest negative camber on the outside wheel in a corner increases peak lateral force by improving pressure distribution across the patch under lateral deflection and by adding camber thrust in the useful direction. Excessive camber overloads the inside shoulder and reduces peak. Optimum camber for a slick is usually a small negative value, 1–4° at the outside wheel *in the cornering attitude* — which, with body roll, dictates a static setting plus camber-gain-in-roll from the suspension geometry (Chapter 17).

## 8. Other effects worth knowing

- **Conicity and ply steer**: manufacturing asymmetries producing residual lateral force at zero slip and zero camber. Conicity reverses sign with rolling direction; ply steer does not. They cause pulls and, in racing, are a reason to be careful about left/right tire fitment.
- **Rolling resistance**: $F_{roll} \approx f_r F_z$, with $f_r$ 0.01–0.02, arising from hysteretic loss in the carcass. Manifests as a forward shift of the vertical pressure centroid, producing a rolling resistance moment.
- **Temperature and pressure**: peak $\mu$ is a strong function of tread temperature, with a well-defined optimum window. Pressure changes contact patch length and stiffness — raising pressure typically raises $C_\alpha$ and lowers peak $\mu$ (smaller patch). Tire pressure is the highest-leverage, lowest-cost setup variable in racing.
- **Relaxation length** $\sigma_r$: lateral force does not appear instantaneously with slip angle; it builds with distance travelled, roughly first-order:
  $$
  \frac{\sigma_r}{V}\dot{F_y} + F_y = C_\alpha \alpha
  $$
  With $\sigma_r$ of order 0.2–0.7 m, the lag at 30 m/s is 7–23 ms — small but not negligible in transient analysis (Chapter 6).

## 9. The SAE tire axis system

Origin at the contact centre; $X$ forward in the wheel plane's intersection with the road; $Z$ **downward**; $Y$ to the right completing the right-handed set. Forces: $F_x$ tractive, $F_y$ lateral, $F_z$ vertical (**negative upward**, so a loaded tire has negative $F_z$ in strict SAE — most practitioners quietly flip this and use positive-up load). Moments: $M_x$ overturning, $M_y$ rolling resistance, $M_z$ aligning.

The single most common source of error in vehicle dynamics work is inconsistent sign convention between a tire data supplier, a simulation package, and a spreadsheet. **Write the convention down at the top of every analysis.**

---

## Exercises

**2.1** A tire has $C_\alpha = 1600$ N/deg, $\mu = 1.6$, $F_z = 4000$ N. Using the brush/Fiala model, find the slip angle at which full sliding begins and the lateral force at $\alpha = 2°$.

**2.2** A tire produces 4500 N at $F_z = 3000$ N and 8100 N at $F_z = 6000$ N. Fit a linear load-sensitivity model $\mu(F_z) = \mu_0 + k F_z$ and compute the axle lateral force for two tires at 4500 N each, versus 6000 N and 3000 N (i.e. 1500 N of load transfer). Quantify the loss.

**2.3** Using the friction ellipse with $F_{x,\max} = 5000$ N and $F_{y,\max} = 4500$ N, find the maximum lateral force available while braking at 3000 N, and the maximum braking while cornering at 4000 N.

**2.4** A tire has contact patch length $a = 0.16$ m. Estimate pneumatic trail at small slip angle and the steering torque at the road wheel at $F_y = 3000$ N with 25 mm of mechanical trail. If the pneumatic trail has decayed to 5 mm at the lateral force peak, what has happened to steering torque?

**2.5** A tire has relaxation length $\sigma_r = 0.5$ m and $C_\alpha = 1400$ N/deg. The wheel is subjected to a step slip angle of 3° at 40 m/s. Write the response and find the time to reach 95% of steady-state force.

**2.6** Derive, for the concave load-sensitivity curve $F_y = \mu_0 F_z - c F_z^2$, an exact expression for axle force loss due to lateral load transfer $\Delta$, and show it is independent of the nominal load.

---

## Solutions

**2.1**
Convert: $C_\alpha = 1600$ N/deg $= 91{,}673$ N/rad.
Full-slide angle:
$$
\tan\alpha_{sl} = \frac{3\mu F_z}{C_\alpha} = \frac{3 \times 1.6 \times 4000}{91673} = 0.2095 \Rightarrow \alpha_{sl} = 11.8°
$$
At $\alpha = 2° = 0.0349$ rad, $\tan\alpha = 0.0349$, and $\theta \equiv C_\alpha\tan\alpha/(3\mu F_z) = 0.0349/0.2095 = 0.1666$:
$$
F_y = 3\mu F_z\left(\theta - \theta^2 + \tfrac{1}{3}\theta^3\right) = 19200\,(0.1666 - 0.02776 + 0.00154) = 2698\ \text{N}
$$
Compare the pure linear estimate $C_\alpha \alpha = 3200$ N — the tire is already 16% below linear at only 2°. This is why linear-range analysis (Chapter 5) must be applied with care to racing, where the tires live near the peak.

**2.2**
$\mu(3000) = 4500/3000 = 1.50$; $\mu(6000) = 8100/6000 = 1.35$.
Slope: $k = (1.35-1.50)/3000 = -5.0\times10^{-5}$ per N. So $\mu(F_z) = 1.65 - 5\times10^{-5}F_z$, giving $F_y = 1.65F_z - 5\times10^{-5}F_z^2$.

Equal loads at 4500 N each: $\mu(4500) = 1.425$, $F_y = 6412$ N per tire $\Rightarrow$ **12,825 N** axle.

With transfer: $F_y(6000) = 8100$ N, $F_y(3000) = 4500$ N $\Rightarrow$ **12,600 N** axle.

Loss = 225 N, or **1.75%**. Note from the quadratic form: loss $= c\Delta^2 = 5\times10^{-5} \times 1500^2 = 112.5 \times 2$? Careful — see Exercise 2.6: loss $= 2c\Delta^2$... let's verify: $F_y(F_0+\Delta)+F_y(F_0-\Delta) = 2\mu_0 F_0 - c[(F_0+\Delta)^2+(F_0-\Delta)^2] = 2\mu_0F_0 - c[2F_0^2 + 2\Delta^2]$. Loss relative to $\Delta=0$ is $2c\Delta^2 = 2\times5\times10^{-5}\times 1500^2 = 225$ N. ✓

**2.3**
Braking 3000 N of 5000 N max: $F_x/F_{x,\max} = 0.6$.
$$
F_y = F_{y,\max}\sqrt{1-0.6^2} = 4500 \times 0.8 = 3600\ \text{N}
$$
Cornering 4000 N of 4500 N max: ratio 0.889.
$$
F_x = 5000\sqrt{1-0.790} = 5000 \times 0.458 = 2292\ \text{N}
$$
The asymmetry in the answers is the ellipse's essential message: the first 60% of braking costs only 20% of cornering, but the last 11% of cornering costs 54% of braking.

**2.4**
Small-angle pneumatic trail $\approx a/6 = 0.0267$ m (using the parabolic-pressure result that the force centroid sits one-sixth of the contact length behind centre; the $a/3$ figure applies when $a$ denotes the half-length — state your definition).

Take $t_p = 26.7$ mm, $t_m = 25$ mm, total 51.7 mm:
$$
M_{\text{steer}} = 3000 \times 0.0517 = 155\ \text{N·m at the road wheel}
$$
At the peak, $t_p = 5$ mm, total 30 mm. If $F_y$ has risen to, say, 4000 N:
$$
M = 4000 \times 0.030 = 120\ \text{N·m}
$$
**Torque has fallen 23% even though lateral force rose 33%.** This inversion — torque decreasing while grip is still increasing — is the front-limit warning the driver feels. A caster setting large enough to make $t_m \gg t_p$ suppresses it.

**2.5**
First-order lag in *distance*, converted to time via $\tau = \sigma_r / V = 0.5/40 = 0.0125$ s.
$$
F_y(t) = C_\alpha\alpha\left(1 - e^{-t/\tau}\right) = 4200\left(1 - e^{-t/0.0125}\right)\ \text{N}
$$
95% requires $t = 3\tau = 0.0375$ s. At low speed this lag grows: at 10 m/s, $\tau = 0.05$ s and $t_{95} = 0.15$ s, which is genuinely significant in a slalom or a low-speed transient.

**2.6**
With $F_y(F_z) = \mu_0 F_z - cF_z^2$:
$$
F_y^{\text{axle}}(\Delta) = \mu_0[(F_0+\Delta)+(F_0-\Delta)] - c[(F_0+\Delta)^2+(F_0-\Delta)^2]
$$
$$
= 2\mu_0 F_0 - c(2F_0^2 + 2\Delta^2) = F_y^{\text{axle}}(0) - 2c\Delta^2
$$
The loss is $\boxed{2c\Delta^2}$ — **quadratic in load transfer and independent of the nominal axle load.**

Two important corollaries. First, since the loss goes as $\Delta^2$, small load transfers are almost free and large ones are very expensive: doubling roll stiffness at one end more than doubles the balance effect. Second, because the loss depends only on $\Delta$ and $c$, the *difference* in loss between front and rear axles depends on the difference in their load transfers — which is exactly the total lateral load transfer distribution (TLLTD) that Chapters 7 and 18 make the master balance parameter.
