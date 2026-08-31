# Chapter 6 — Simplified Transient Stability and Control

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 6. Original explanatory material.*

---

## 1. From steady state to response

Chapter 5 asked: *given a steer angle, what steady turn results?* Chapter 6 asks: *how does the car get there, and does it get there at all?* On a race track the car is essentially never in steady state — corner entry, mid-corner, corner exit, direction changes, and disturbance rejection are all transient events. Lap time is generated in the transitions.

The chapter's method is to introduce the spring–mass–damper as a language, then show that the two-degree-of-freedom car is a second-order system whose natural frequency and damping ratio can be computed from the same parameters that gave understeer gradient in Chapter 5.

## 2. The spring-mass-damper as vocabulary

$$
m\ddot x + c\dot x + kx = F(t)
$$
$$
\omega_n = \sqrt{k/m}, \qquad \zeta = \frac{c}{2\sqrt{km}}, \qquad \omega_d = \omega_n\sqrt{1-\zeta^2}
$$

Step response behaviour by damping ratio:
- $\zeta = 0$: undamped oscillation
- $0 < \zeta < 1$: underdamped, overshoot $= e^{-\pi\zeta/\sqrt{1-\zeta^2}}$
- $\zeta = 1$: critically damped, fastest non-overshooting response
- $\zeta > 1$: overdamped, sluggish

Useful design relations: peak time $t_p = \pi/\omega_d$; 5% settling time $\approx 3/(\zeta\omega_n)$; rise time (10–90%) $\approx 1.8/\omega_n$ for $\zeta \approx 0.7$.

**Why this matters for a car**: the yaw response to a steer input is second-order. Its $\omega_n$ and $\zeta$ determine whether the car feels darty or lazy, whether it settles cleanly or hunts, and whether the driver can close a tight loop around it.

## 3. The two-degree-of-freedom vehicle as a second-order system

Take the equations from Chapter 4/5 with states $\beta$ and $r$, constant $V$:

$$
mV(\dot\beta + r) = Y_\beta\beta + Y_r r + Y_\delta\delta
$$
$$
I_{zz}\dot r = N_\beta\beta + N_r r + N_\delta\delta
$$

In matrix form $\dot{\mathbf{x}} = A\mathbf{x} + B\delta$ with $\mathbf{x} = [\beta, r]^T$:

$$
A = \begin{bmatrix}
\dfrac{Y_\beta}{mV} & \dfrac{Y_r}{mV} - 1\\[2ex]
\dfrac{N_\beta}{I_{zz}} & \dfrac{N_r}{I_{zz}}
\end{bmatrix}
$$

The characteristic equation $\det(sI - A) = 0$ gives:

$$
s^2 + 2\zeta\omega_n s + \omega_n^2 = 0
$$

with, after substituting the bicycle-model derivatives:

$$
\omega_n^2 = \frac{C_fC_r L^2}{m I_{zz} V^2}\left(1 + \frac{KV^2}{gL}\right)
$$

$$
2\zeta\omega_n = \frac{m(a^2C_f + b^2C_r) + I_{zz}(C_f + C_r)}{m I_{zz} V}
$$

Several things are worth extracting from these expressions.

### 3.1 Natural frequency falls with speed

$\omega_n \propto 1/V$ (times the stability-factor correction). A car that responds at 1.5 Hz at 20 m/s responds at roughly 0.6 Hz at 50 m/s. **The car gets slower to respond as it goes faster** — counterintuitive but fundamental, and the reason high-speed corrections must be initiated earlier.

### 3.2 The stability factor reappears

The term $\left(1 + KV^2/(gL)\right)$ is *the same factor* that appeared in every steady-state gain in Chapter 5. When it goes to zero — at the critical speed of an oversteering car — $\omega_n \to 0$ and one root crosses into the right half plane. **Steady-state divergence and dynamic instability are the same event.** This unification is the chapter's principal theoretical payoff.

### 3.3 Damping ratio falls with speed

$$
\zeta = \frac{m(a^2C_f + b^2C_r) + I_{zz}(C_f+C_r)}{2\sqrt{m I_{zz} C_f C_r L^2 \left(1 + KV^2/(gL)\right)}}
$$

Numerator is speed-independent; denominator grows with $V$ (for $K>0$). Typical values: $\zeta \approx 1.0$–2.0 at 10 m/s falling to 0.4–0.7 at 60 m/s. Race cars at speed are noticeably underdamped in yaw, which is why a bump or a gust produces a visible weave.

## 4. Yaw rate response and the numerator zero

The transfer function from steer to yaw rate is:

$$
\frac{r(s)}{\delta(s)} = \frac{G_r\left(1 + \tau_r s\right)}{1 + \dfrac{2\zeta}{\omega_n}s + \dfrac{s^2}{\omega_n^2}}
$$

where $G_r$ is the steady-state yaw gain from Chapter 5 and the numerator time constant is:

$$
\tau_r = \frac{m a V}{C_r L}
$$

This **zero is important**. It is a lead term: it makes the initial yaw response faster than a pure second-order system would give, and it grows with speed and with forward CG position. Physically, applying steer immediately generates a front lateral force which immediately generates a yaw moment — the yaw acceleration is instantaneous while the lateral acceleration must wait for the rear axle to build slip angle.

**Consequence — the lateral acceleration response lags the yaw response.** The transfer function to lateral acceleration has a numerator with a right-half-plane zero in some configurations, giving a small initial acceleration in the *wrong direction*. This is the vehicle analogue of the non-minimum-phase behaviour familiar from aircraft with rear-mounted control surfaces, and it is what drivers describe as the car "taking a set."

## 5. Response metrics that matter to a driver

| Metric | Meaning | Typical race car |
|---|---|---|
| Yaw natural frequency | speed of response | 0.7–1.5 Hz at racing speed |
| Yaw damping ratio | overshoot / settling | 0.4–0.8 |
| Yaw rate response time (90%) | crispness | 0.10–0.25 s |
| Lateral acceleration lag behind yaw rate | "set" delay | 0.05–0.15 s |
| Sideslip settling time | stability feel | should be < yaw settling |

The best-handling cars, in both subjective and objective studies, tend toward **high yaw natural frequency with damping around 0.7, and minimal lag between yaw rate and lateral acceleration.** A car with a large lag feels like it "waits" — the driver turns, the nose rotates, and only later does the car actually change direction.

## 6. Effect of design parameters on transient response

- **Yaw inertia $I_{zz}$**: reducing it raises $\omega_n$ and generally raises $\zeta$ — a double benefit. This is the fundamental case for mid-engine layouts and mass centralization.
- **Wheelbase $L$**: longer $L$ raises $\omega_n$ (through $L^2$ in the numerator) but also raises $I_{zz}$ in practice; the net effect on response is usually a slower, more stable car — hence long-wheelbase superspeedway configurations.
- **Cornering stiffness**: raising both $C_f$ and $C_r$ raises $\omega_n$ and $\zeta$. Stiffer tires and higher pressures make the car quicker and better damped in the *linear* range (at the price of peak grip).
- **CG position $a$**: moving mass forward raises $K$ (more understeer) which raises $\omega_n$, but also increases $\tau_r$, sharpening the initial yaw and increasing the yaw/lateral lag.
- **Speed**: universally reduces both $\omega_n$ and $\zeta$.

## 7. Relaxation length and the neglected lag

The 2-DOF model above assumes tire force appears instantly with slip angle. Including relaxation (Chapter 2.9) adds a first-order lag at each axle:

$$
\frac{\sigma_r}{V}\dot F_y + F_y = C_\alpha\alpha
$$

This raises the system to fourth order and adds phase lag. At racing speeds the tire lag time constant ($\sigma_r/V \approx 0.01$–0.02 s) is an order of magnitude faster than the yaw mode, so it is a second-order effect for handling — but it becomes first-order for high-frequency work such as damper tuning interactions, ABS control loop design, and stability-control system bandwidth.

## 8. Toward advanced models

The chapter closes by sketching the hierarchy above the 2-DOF model:

1. **3-DOF** — add roll. Introduces roll-mode dynamics (1.5–3 Hz for a race car, 1–1.5 Hz for a road car) and roll-yaw coupling. Necessary to represent load transfer dynamics.
2. **Nonlinear tires** — replace $C_\alpha\alpha$ with the full characteristic. Now the eigenvalues depend on operating point; a car can be stable at 0.5 g and unstable at 1.4 g.
3. **Full multibody** — every link, bushing, and compliance. Required for correlation work, but conceptually opaque: it gives numbers, not understanding.

The Millikens' pedagogical position is consistent throughout: use the simplest model that contains the effect you are studying, and use complex models only for numbers, never for insight.

---

## Exercises

**6.1** A car has $m = 1000$ kg, $I_{zz} = 1400$ kg·m², $a = 1.25$ m, $b = 1.35$ m, $C_f = 80{,}000$ N/rad, $C_r = 90{,}000$ N/rad. Compute $\omega_n$, $\zeta$, and damped frequency at $V = 30$ m/s.

**6.2** For the same car, recompute at $V = 60$ m/s and comment on the trends.

**6.3** Compute the yaw response numerator time constant $\tau_r$ at both speeds and interpret.

**6.4** A second-order yaw response has $\omega_n = 1.2$ Hz and $\zeta = 0.55$. Find the percentage overshoot and the 5% settling time.

**6.5** Show that $\omega_n \to 0$ at the critical speed of an oversteering car, and find that speed for a car with $K = -0.8$ deg/g, $L = 2.8$ m.

**6.6** A car's yaw inertia is reduced by 20% through mass centralization, with all else unchanged. Compute the changes in $\omega_n$ and $\zeta$.

**6.7** Estimate the tire relaxation lag at 15 m/s and 60 m/s for $\sigma_r = 0.45$ m, and compare with a yaw mode period of 1.0 s.

---

## Solutions

**6.1**
$L = 2.60$ m. First the understeer gradient, since it enters $\omega_n$:
$$
W_f = 1000(9.81)(1.35/2.60) = 5093\ \text{N}, \quad W_r = 4717\ \text{N}
$$
$$
K = \frac{5093}{80000} - \frac{4717}{90000} = 0.06366 - 0.05241 = 0.01125\ \text{rad/g}
$$

Stability factor at $V=30$:
$$
1 + \frac{KV^2}{gL} = 1 + \frac{0.01125 \times 900}{9.81 \times 2.60} = 1 + 0.3970 = 1.3970
$$

$$
\omega_n^2 = \frac{C_fC_rL^2}{mI_{zz}V^2}\left(1.3970\right) = \frac{(80000)(90000)(6.76)}{(1000)(1400)(900)}\times 1.3970
$$
$$
= \frac{4.867\times10^{10}}{1.26\times10^{9}}\times1.3970 = 38.63 \times 1.3970 = 53.97\ \text{rad}^2/\text{s}^2
$$

(Numerator $(8\times10^4)(9\times10^4)(6.76) = 4.867\times10^{10}$; denominator $(10^3)(1.4\times10^3)(9\times10^2) = 1.26\times10^9$.)

$$
\omega_n = 7.35\ \text{rad/s} = 1.17\ \text{Hz}
$$

Damping:
$$
2\zeta\omega_n = \frac{m(a^2C_f + b^2C_r) + I_{zz}(C_f+C_r)}{mI_{zz}V}
$$
$$
a^2C_f = 1.5625 \times 80000 = 125{,}000; \quad b^2C_r = 1.8225\times90000 = 164{,}025
$$
$$
m(\cdot) = 1000 \times 289{,}025 = 2.890\times10^8
$$
$$
I_{zz}(C_f+C_r) = 1400 \times 170{,}000 = 2.380\times10^8
$$
$$
2\zeta\omega_n = \frac{5.270\times10^8}{1000\times1400\times30} = \frac{5.270\times10^8}{4.2\times10^7} = 12.55
$$
$$
\zeta = \frac{12.55}{2 \times 7.35} = 0.854
$$
$$
\omega_d = 7.35\sqrt{1-0.729} = 7.35 \times 0.521 = 3.83\ \text{rad/s} = 0.61\ \text{Hz}
$$

Well damped at 30 m/s — the car will settle after a steer input with only slight overshoot (~1%).

**6.2**
Stability factor at $V = 60$: $1 + \frac{0.01125 \times 3600}{25.51} = 1 + 1.588 = 2.588$.
$$
\omega_n^2 = \frac{4.867\times10^{10}}{1000\times1400\times3600}\times 2.588 = \frac{4.867\times10^{10}}{5.04\times10^9}\times2.588 = 9.657\times2.588 = 24.99
$$
$$
\omega_n = 5.00\ \text{rad/s} = 0.80\ \text{Hz}
$$
$$
2\zeta\omega_n = \frac{5.270\times10^8}{1000\times1400\times60} = 6.274 \Rightarrow \zeta = \frac{6.274}{10.0} = 0.627
$$

**Trends**: doubling speed reduced $\omega_n$ by 32% and $\zeta$ by 27%. The car is slower to respond *and* less well damped at high speed. Overshoot rises from ~1% to ~8%. This is universal, and it is why high-speed stability is a design problem distinct from low-speed agility — and why aerodynamic downforce, which raises effective cornering stiffness with $V^2$, is such a powerful stabilizer: it fights the $1/V$ trend directly.

**6.3**
$$
\tau_r = \frac{maV}{C_rL}
$$
At 30 m/s: $\tau_r = \frac{1000 \times 1.25 \times 30}{90000 \times 2.60} = \frac{37500}{234000} = 0.160$ s.
At 60 m/s: $\tau_r = 0.321$ s.

Interpretation: the lead term becomes more pronounced at speed. Since the second-order response is *slowing* ($\omega_n$ falling) while the lead is *growing*, the gap between the initial yaw response and the eventual lateral acceleration widens dramatically with speed. The car increasingly rotates first and translates later — the "the car yaws but doesn't go anywhere" sensation reported at high speed. Reducing $\tau_r$ requires a rearward CG (smaller $a$) or a stiffer rear axle (larger $C_r$), both of which are also oversteer-inducing — a genuine and unavoidable trade.

**6.4**
$\omega_n = 1.2$ Hz $= 7.54$ rad/s, $\zeta = 0.55$.

Overshoot:
$$
M_p = \exp\left(\frac{-\pi\zeta}{\sqrt{1-\zeta^2}}\right) = \exp\left(\frac{-\pi(0.55)}{\sqrt{1-0.3025}}\right) = \exp\left(\frac{-1.728}{0.835}\right) = e^{-2.069} = 0.126
$$
**12.6% overshoot.**

Settling time (5%):
$$
t_s \approx \frac{3}{\zeta\omega_n} = \frac{3}{0.55 \times 7.54} = 0.724\ \text{s}
$$

A 12.6% yaw overshoot with a 0.72 s settling time is at the edge of acceptable — the driver will perceive the car as "loose on turn-in" and will subconsciously apply a slower steering input to avoid exciting it. That slower input costs lap time. Raising $\zeta$ to 0.7 would cut overshoot to 4.6%.

**6.5**
$$
\omega_n^2 = \frac{C_fC_rL^2}{mI_{zz}V^2}\left(1 + \frac{KV^2}{gL}\right)
$$
The bracket vanishes when $V^2 = -gL/K$, i.e. $V = \sqrt{gL/(-K)} = V_{crit}$. At that speed $\omega_n = 0$: one eigenvalue sits at the origin and, beyond it, moves into the right half plane. **Steady-state divergence and the loss of dynamic stability are the same phenomenon**, which is the point of the exercise.

For $K = -0.8$ deg/g $= -0.013963$ rad/g, $L = 2.8$ m:
$$
V_{crit} = \sqrt{\frac{9.81 \times 2.8}{0.013963}} = \sqrt{1967} = 44.4\ \text{m/s} = 160\ \text{km/h}
$$

**6.6**
$I_{zz}: 1400 \to 1120$ kg·m².

$\omega_n \propto I_{zz}^{-1/2}$: new $\omega_n = 7.35 \times \sqrt{1400/1120} = 7.35 \times 1.118 = 8.22$ rad/s (+11.8%).

Damping (at $V = 30$):
$$
2\zeta\omega_n = \frac{m(a^2C_f+b^2C_r) + I_{zz}(C_f+C_r)}{mI_{zz}V}
= \frac{2.890\times10^8 + 1120(170000)}{1000(1120)(30)}
$$
$$
= \frac{2.890\times10^8 + 1.904\times10^8}{3.36\times10^7} = \frac{4.794\times10^8}{3.36\times10^7} = 14.27
$$
$$
\zeta = \frac{14.27}{2(8.22)} = 0.868
$$

So $\omega_n$ up 11.8% and $\zeta$ up slightly (0.854 → 0.868). **Reducing yaw inertia is one of the very few changes that improves response speed and damping simultaneously**, with no compensating penalty in the 2-DOF model. This is why mass centralization is pursued so relentlessly — moving the fuel cell between the axles, mounting the battery low and central, shortening overhangs. The real-world penalty is packaging and, sometimes, aerodynamics.

**6.7**
$$
\tau_{tire} = \frac{\sigma_r}{V}
$$
At 15 m/s: $0.45/15 = 0.030$ s. At 60 m/s: $0.45/60 = 0.0075$ s.

Yaw mode period 1.0 s. Ratio of tire lag to yaw period: 3.0% at 15 m/s, 0.75% at 60 m/s.

Conclusion: **negligible for handling analysis at all racing speeds**, and increasingly negligible as speed rises. It matters when the excitation frequency approaches $V/(2\pi\sigma_r)$ — at 60 m/s that is 21 Hz, which is in the range of damper/wheel-hop dynamics and control-system bandwidths, not driver inputs. The right conclusion is not "relaxation length doesn't matter" but "relaxation length matters for a different set of problems than the ones in this chapter."
