# Chapter 5 — Simplified Steady-State Stability and Control

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 5. Original explanatory material.*

---

## 1. The most important chapter in Part I

Chapter 5 is the longest chapter in the book's first part and the intellectual centre of gravity of the whole text. It takes the "elementary automobile" — a two-degree-of-freedom bicycle model with linear tires — and extracts from it the entire vocabulary of handling: understeer and oversteer, neutral steer point, static margin, characteristic and critical speed, yaw velocity gain, path curvature stiffness, and the stability derivatives $Y_\beta$, $N_\beta$, $Y_\delta$, $N_\delta$.

The aeronautical DNA is unmistakable. The senior author spent decades in aircraft stability and control, and this chapter is essentially the transfer of the aircraft longitudinal static stability apparatus — neutral point, static margin, control derivatives — to the automobile. Once you see the analogy, the chapter's structure becomes obvious: the **neutral steer point is the car's aerodynamic centre, and static margin is the distance from the CG to it.**

## 2. The elementary automobile

Assumptions:
- Two degrees of freedom: lateral velocity $v$ (or sideslip $\beta$) and yaw rate $r$. Forward speed $V$ constant.
- No roll, no pitch, no load transfer.
- Front and rear tires lumped into single axles at distances $a$ and $b$ from the CG; wheelbase $L = a + b$.
- Linear tires: $F_y = C_\alpha \alpha$, with **axle** cornering stiffnesses $C_f$ and $C_r$ (each the sum of two tires).
- Small angles.

This model has perhaps six parameters and reproduces an astonishing fraction of real handling behaviour. That is the argument for studying it.

## 3. Low-speed cornering geometry — the Ackermann reference

At vanishing speed, tires produce no slip angle and the wheels simply roll around a common centre. The required steer angle is the **Ackermann angle**:

$$
\delta_{Ack} = \frac{L}{R}
$$

(in radians; $57.3\,L/R$ in degrees.) This is the geometric baseline against which all handling is measured. Everything a real car does differently at speed is attributable to tire slip angles.

## 4. The steady-state cornering equation and understeer gradient

At speed, force and moment balance require:

$$
F_{yf} + F_{yr} = \frac{mV^2}{R}, \qquad a F_{yf} = b F_{yr}
$$

The second (moment) equation gives the load-proportional distribution:

$$
F_{yf} = \frac{b}{L}\cdot\frac{mV^2}{R} = W_f \frac{V^2}{gR}, \qquad F_{yr} = W_r\frac{V^2}{gR}
$$

where $W_f = mgb/L$ and $W_r = mga/L$ are the static axle loads. Then, with linear tires,

$$
\alpha_f = \frac{W_f A_y}{C_f}, \qquad \alpha_r = \frac{W_r A_y}{C_r}
$$

with $A_y$ in g. Geometry of the bicycle model gives:

$$
\boxed{\;\delta = \frac{L}{R} + (\alpha_f - \alpha_r) = \frac{L}{R} + K A_y\;}
$$

with the **understeer gradient**:

$$
K = \frac{W_f}{C_f} - \frac{W_r}{C_r}
$$

units of deg/g (or rad/g). This equation is the single most useful result in vehicle dynamics.

**Interpretation:**
- $K > 0$: **understeer**. More steer is required as lateral acceleration rises.
- $K = 0$: **neutral steer**. Steer angle is the Ackermann angle at all lateral accelerations.
- $K < 0$: **oversteer**. Steer angle *decreases* with lateral acceleration and eventually reverses sign — the driver must apply opposite lock.

Note carefully that $K$ depends on the ratio of axle load to axle cornering stiffness at each end. It is not simply a function of weight distribution: a rear-heavy car with correspondingly larger rear tires can be perfectly neutral or understeering. This is the analytical justification for staggered tire sizes.

Define the **cornering compliance** at each axle: $D_f = W_f/C_f$, $D_r = W_r/C_r$ (deg/g). Then $K = D_f - D_r$. These are the **Bundorf cornering compliances**, and they are the more fundamental quantities — they generalize better to the nonlinear case (Chapter 7) and, crucially, they are *additive*.

### 4.1 The understeer budget

Because the effects that contribute to each axle's cornering compliance are linear and additive, $D_f$ and $D_r$ can be decomposed into separately-evaluated contributions and summed. This decomposition is the **understeer budget**, and it is one of the most useful practical tools in the book — it tells you not just that a car understeers but *which mechanism* is responsible.

The contributions, in the book's own categories:

| Contribution | Mechanism |
|---|---|
| Weight distribution / tire cornering stiffness | The basic $W/C_\alpha$ term |
| Aligning torque on the rigid body | The tire's $M_z$ acting on the vehicle |
| Roll camber | Camber change in roll altering axle force (Ch. 17) |
| Roll steer | Toe change in roll (Ch. 19) |
| Lateral force deflection steer compliance | Compliance steer under $F_y$ (Ch. 23) |
| Aligning torque deflection steer compliance | Steer produced by $M_z$ through system compliance |

Each is evaluated in deg/g at the front and at the rear; the columns are summed to give $D_f$ and $D_r$; and the difference is the understeer gradient. In the book's passenger-car example the basic weight/stiffness term supplies most of the total, but the compliance and roll-steer terms together contribute enough to change the character of the car.

This is the direct automotive analogue of an aircraft's static-stability budget, in which the wing, tail, fuselage and power effects are tabulated separately as contributions to $N_\beta$ — and the book makes that comparison explicitly.

There is also a derivative-form expression for the same quantity:

$$
UG = W\left(\frac{N_\beta}{Y_\delta N_\beta - N_\delta Y_\beta}\right)(57.3)\ \text{deg/g}
$$

which involves only four derivatives and makes clear that understeer is a property of the stability and control derivatives together — the point Chapter 8 develops into the Moment Method.

## 5. Characteristic and critical speeds

**Characteristic speed** (understeering car) — the speed at which the steer angle required is twice the Ackermann angle:

$$
V_{char} = \sqrt{\frac{gL}{K}} \quad (K \text{ in rad/g})
$$

**Critical speed** (oversteering car) — the speed at which the car becomes divergently unstable:

$$
V_{crit} = \sqrt{\frac{gL}{-K}} \quad (K < 0)
$$

Above $V_{crit}$ the oversteering car cannot be held on a steady path by a fixed steer input; the yaw response grows without bound. This is the analytical statement of the practical fact that oversteering road cars are dangerous and oversteering race cars are the province of very good drivers who are continuously closing a stabilizing loop.

## 6. Response gains

**Yaw velocity gain** — steady-state yaw rate per unit steer:

$$
\frac{r}{\delta} = \frac{V/L}{1 + K V^2/(gL)}
$$

For a **neutral steer** car this is $V/L$ — increasing linearly with speed forever. For an **understeering** car it peaks at $V_{char}$ and declines thereafter. For an **oversteering** car it goes to infinity at $V_{crit}$.

**Lateral acceleration gain:**

$$
\frac{A_y}{\delta} = \frac{V^2/(gL)}{1 + KV^2/(gL)}
$$

**Curvature response** (path curvature per steer):

$$
\frac{1/R}{\delta} = \frac{1/L}{1 + KV^2/(gL)}
$$

Note the same denominator $1 + KV^2/(gL)$ appears in all three. Call it the **stability factor** denominator; it is the fingerprint of the understeer gradient in every steady-state response.

**Sideslip gain:**

$$
\frac{\beta}{\delta} = \frac{\dfrac{b}{L} - \dfrac{a m V^2}{C_r L^2}}{1 + KV^2/(gL)}
$$

The numerator vanishes at the **tangent speed**:

$$
V_{tan} = \sqrt{\frac{b\,L\,C_r}{a\,m}}
$$

(The book derives this in derivative form as $V_t = -\frac{g}{W}\left(\frac{Y_\delta N_r}{N_\delta} - Y_r\right)$, which reduces to the same expression.)

Below $V_{tan}$ the car's nose points outside the path (positive $\beta$ in a left turn); above it, the nose points inside — the familiar "pointing into the corner" attitude of a fast car. The book gives 25–35 mph (11–16 m/s) as typical for passenger cars, and notes it can be much higher for race cars with stiff rear tires and low mass. Either way, essentially all racing occurs above it.

## 7. Stability derivatives and the aeronautical formulation

Write the equations of motion in derivative form. With state $[\beta, r]$ and control $\delta$:

$$
m V(\dot\beta + r) = Y_\beta \beta + Y_r r + Y_\delta \delta
$$
$$
I_{zz}\dot r = N_\beta \beta + N_r r + N_\delta \delta
$$

For the bicycle model with linear tires:

$$
\begin{aligned}
Y_\beta &= -(C_f + C_r) &\quad& \text{(damping-in-sideslip; always negative)}\\
Y_r &= \frac{-(a C_f - b C_r)}{V}\\
Y_\delta &= C_f\\
N_\beta &= -(a C_f - b C_r) &\quad& \text{(static directional stability)}\\
N_r &= \frac{-(a^2 C_f + b^2 C_r)}{V} &\quad& \text{(yaw damping; always negative)}\\
N_\delta &= a C_f &\quad& \text{(control moment)}
\end{aligned}
$$

(Signs follow the convention in which positive $\beta$ and positive $\alpha$ produce restoring effects; verify against your own sign set.)

**$N_\beta$ is the master stability parameter.** It is the yawing moment produced per unit sideslip angle — the "weathercock stability" of the car:

- $N_\beta$ stabilizing (car yaws to reduce sideslip) $\Rightarrow$ understeer.
- $N_\beta$ destabilizing $\Rightarrow$ oversteer.
- $N_\beta = 0 \Rightarrow$ neutral steer.

And note: $N_\beta \propto -(aC_f - bC_r)$, while $K \propto \frac{W_f}{C_f} - \frac{W_r}{C_r} \propto \frac{b}{C_f} - \frac{a}{C_r} \propto \frac{bC_r - aC_f}{C_fC_r}$. **Same sign, same physical content.** Understeer gradient and static directional stability are the same statement in two languages.

## 8. Neutral steer point and static margin

The **neutral steer point (NSP)** is the point on the vehicle centreline at which an applied lateral force produces **no yaw response** — pure sideslip. Its position aft of the front axle:

$$
x_{NSP} = \frac{C_r L}{C_f + C_r}
$$

**Static margin** is the normalized distance from CG to NSP:

$$
SM = \frac{x_{NSP} - a}{L}
$$

- $SM > 0$ (NSP behind CG): understeer, directionally stable.
- $SM = 0$: neutral.
- $SM < 0$ (NSP ahead of CG): oversteer, statically unstable in yaw.

This is *exactly* the aircraft longitudinal static stability construction, with NSP playing the role of the aerodynamic centre and static margin the role of $-dC_m/dC_L$. Race cars commonly run $SM$ in the range $-0.02$ to $+0.05$; road cars $+0.05$ to $+0.15$.

A crosswind or an aerodynamic side force applied at a centre of pressure ahead of the NSP is destabilizing — the same construction extends directly to aerodynamic yaw stability.

## 9. Significant speeds — summary table

| Speed | Definition | Formula |
|---|---|---|
| Tangent speed | $\beta = 0$ | $\sqrt{bLC_r/(am)}$ |
| Characteristic speed | $\delta = 2\delta_{Ack}$, US car | $\sqrt{gL/K}$ |
| Critical speed | divergence, OS car | $\sqrt{gL/(-K)}$ |
| Yaw-gain peak speed | max $r/\delta$, US car | $= V_{char}$ |

## 10. Where the linear model breaks — and why it still matters

Racing happens at 1.2–4 g, far outside the linear tire range. The chapter closes with a **nonlinear steady-state analysis** which replaces $C_\alpha\alpha$ with the actual axle characteristic $F_y(\alpha, F_z)$ and solves iteratively. Two important results emerge:

1. **The understeer gradient is not a constant.** $K$ becomes $K(A_y)$, and a plot of $\delta$ versus $A_y$ is a curve, not a line. Its local slope is the *instantaneous* understeer gradient. Most race cars are set up to understeer mildly at low $A_y$ and approach neutral or slight oversteer near the limit; a car that goes strongly oversteering near the limit is fast for one lap and unraceable for a stint.

2. **Limit behaviour is determined by which axle saturates first.** If the front axle reaches its peak first, the car "pushes" — increasing steer produces no more lateral force and the path radius grows. If the rear saturates first, the car spins. The relevant parameter is not $K$ but the **relative margin to saturation** at each axle, which is governed by load transfer distribution (Chapter 7) and tire load sensitivity (Chapter 2).

The Millikens' conclusion — carried into Chapters 7 and 8 — is that the linear model is a language, not a predictor. It gives you *neutral steer point*, *static margin*, and *gain* as concepts. Numbers for a race car at the limit require the Moment Method.

---

## Exercises

**5.1** A car has $m = 1200$ kg, $a = 1.20$ m, $b = 1.40$ m, $C_f = 1400$ N/deg, $C_r = 1600$ N/deg (per axle). Compute the axle loads, cornering compliances, understeer gradient, and classify the handling.

**5.2** For the car in 5.1, compute the characteristic speed and the steer angle required for a 60 m radius corner at 20 m/s.

**5.3** A car is measured to have $K = -1.2$ deg/g with $L = 2.7$ m. Find the critical speed and comment on driveability.

**5.4** Compute the neutral steer point location and static margin for the car of Exercise 5.1.

**5.5** Derive the yaw velocity gain expression from the steady-state cornering equation.

**5.6** A car has yaw velocity gain measured at 0.28 (rad/s)/deg at 25 m/s and 0.30 at 40 m/s, with $L = 3.0$ m. Estimate the understeer gradient.

**5.7** A rear-engine car has 40/60 front/rear weight distribution, $m = 900$ kg, $L = 2.4$ m, and equal front and rear tires with $C_\alpha = 1200$ N/deg per axle. Compute $K$. What increase in rear axle cornering stiffness (e.g. wider rear tires) is needed to reach neutral steer?

**5.8** For a car with $K = 2.0$ deg/g, find the sensitivity $\partial\delta/\partial A_y$ and the additional steer required to go from 1.0 g to 1.5 g in a fixed-radius corner. Then repeat for a nonlinear car where $K(A_y) = 2.0 + 3.0(A_y - 1.0)$ deg/g for $A_y > 1$ g.

---

## Solutions

**5.1**
Total weight $W = 1200 \times 9.81 = 11{,}772$ N. $L = 2.60$ m.

$$
W_f = W\frac{b}{L} = 11772 \times \frac{1.40}{2.60} = 6339\ \text{N} \quad (53.8\%)
$$
$$
W_r = W\frac{a}{L} = 11772 \times \frac{1.20}{2.60} = 5433\ \text{N} \quad (46.2\%)
$$

Cornering compliances:
$$
D_f = \frac{W_f}{C_f} = \frac{6339}{1400} = 4.528\ \text{deg/g}
$$
$$
D_r = \frac{W_r}{C_r} = \frac{5433}{1600} = 3.396\ \text{deg/g}
$$
$$
K = D_f - D_r = 1.132\ \text{deg/g}
$$

**Understeering**, moderately — a typical value for a well-behaved sports car. Note both mechanisms contribute: the front is heavier *and* has softer tires.

**5.2**
$K = 1.132$ deg/g $= 0.01976$ rad/g.

$$
V_{char} = \sqrt{\frac{gL}{K}} = \sqrt{\frac{9.81 \times 2.60}{0.01976}} = \sqrt{1290.6} = 35.9\ \text{m/s} = 129\ \text{km/h}
$$

For $R = 60$ m at $V = 20$ m/s:
$$
A_y = \frac{V^2}{gR} = \frac{400}{9.81 \times 60} = 0.6796\ g
$$
$$
\delta = \frac{57.3 L}{R} + K A_y = \frac{57.3 \times 2.60}{60} + 1.132 \times 0.6796 = 2.483 + 0.769 = 3.25°
$$

The tire contribution is 31% of the total steer angle. At 30 m/s in the same corner, $A_y = 1.53$ g and the tire contribution would be 1.73° — 41% of a 4.21° total, and by then the linear model is no longer trustworthy.

**5.3**
$K = -1.2$ deg/g $= -0.020944$ rad/g.
$$
V_{crit} = \sqrt{\frac{9.81 \times 2.70}{0.020944}} = \sqrt{1264.6} = 35.6\ \text{m/s} = 128\ \text{km/h}
$$

Above 128 km/h the car is divergently unstable in yaw with the steering fixed. In practice the driver stabilizes it with continuous corrective steering — the closed-loop system can be stable even when the open-loop vehicle is not, exactly as with a statically unstable fighter aircraft under fly-by-wire. But the driver's workload is high, the margin for a distraction or a bump is small, and the failure mode is a spin. For a road car this is unacceptable; for a race car it is a deliberate but expensive choice that trades stability for response.

**5.4**
$$
x_{NSP} = \frac{C_r L}{C_f + C_r} = \frac{1600 \times 2.60}{1400 + 1600} = \frac{4160}{3000} = 1.387\ \text{m aft of the front axle}
$$
CG is at $a = 1.20$ m aft of the front axle.
$$
SM = \frac{1.387 - 1.20}{2.60} = \frac{0.187}{2.60} = 0.0719 \quad (7.2\%)
$$

Positive static margin: the NSP is 187 mm behind the CG, so a lateral disturbance force at the CG produces a stabilizing (nose-into-the-wind... or rather nose-away) yawing moment. Consistent with the positive $K$ found in 5.1 — as it must be.

**5.5**
Start from $\delta = \frac{L}{R} + KA_y$ with $A_y = \frac{V^2}{gR}$ and $r = \frac{V}{R}$, so $\frac{1}{R} = \frac{r}{V}$ and $A_y = \frac{Vr}{g}$.

$$
\delta = \frac{Lr}{V} + K\frac{Vr}{g} = r\left(\frac{L}{V} + \frac{KV}{g}\right)
$$
$$
\frac{r}{\delta} = \frac{1}{\dfrac{L}{V} + \dfrac{KV}{g}} = \frac{V/L}{1 + \dfrac{KV^2}{gL}}
$$
as required. The denominator makes the physics transparent: at $K=0$ gain grows linearly with $V$; at $K<0$ the denominator vanishes at $V^2 = gL/(-K)$, which is precisely the critical speed.

**5.6**
$$
\frac{r}{\delta} = \frac{V/L}{1 + KV^2/(gL)}
$$
At $V = 25$: $\frac{25/3.0}{1 + K(625)/(29.43)} = 0.28$ (rad/s per **deg**, so convert: gain in per-rad = $0.28 \times 57.3 = 16.04$ (rad/s)/rad).
$$
\frac{8.333}{1 + 21.24K} = 16.04 \Rightarrow 1 + 21.24K = 0.5195 \Rightarrow K = -0.02262\ \text{rad/g}
$$
Check at $V = 40$: gain in per-rad $= 0.30 \times 57.3 = 17.19$.
$$
\frac{13.333}{1 + K(1600)/29.43} = \frac{13.333}{1 + 54.37K} = 17.19 \Rightarrow 1 + 54.37K = 0.7757 \Rightarrow K = -0.004126
$$

The two estimates disagree substantially ($-0.023$ vs $-0.004$ rad/g), which is the useful lesson: **a two-point fit to yaw gain is a poor estimator of $K$**, because gain is a weak function of $K$ at low speed and the measurement noise is amplified. In practice, $K$ is measured directly from the constant-radius test (steer angle versus $A_y$ — Chapter 11), where it appears as a slope rather than buried in a denominator. Taking the average, the car is mildly **oversteering** ($K < 0$); the trend of *rising* gain with speed confirms this, since an understeering car's gain would peak and fall.

**5.7**
$W = 900 \times 9.81 = 8829$ N. $W_f = 0.40 \times 8829 = 3532$ N, $W_r = 5297$ N.
$$
D_f = 3532/1200 = 2.943, \qquad D_r = 5297/1200 = 4.414\ \text{deg/g}
$$
$$
K = 2.943 - 4.414 = -1.471\ \text{deg/g} \quad \textbf{(oversteer)}
$$
Critical speed: $K = -0.02568$ rad/g,
$$
V_{crit} = \sqrt{\frac{9.81 \times 2.4}{0.02568}} = \sqrt{916.8} = 30.3\ \text{m/s} = 109\ \text{km/h}
$$

For neutral steer we need $D_r = D_f = 2.943$:
$$
C_r = \frac{W_r}{D_f} = \frac{5297}{2.943} = 1800\ \text{N/deg}
$$
a **50% increase** in rear axle cornering stiffness.

This is the analytical account of the 911's history: a rear-weight-biased layout with equal tires is critically unstable at ordinary road speeds, and the engineering answer — arrived at empirically over decades — was progressively wider rear tires, rear toe-in, and eventually electronic aids. Fifty percent more rear cornering stiffness is roughly what a 235/305 stagger delivers.

**5.8**
Linear case, $K = 2.0$ deg/g constant:
$$
\frac{\partial\delta}{\partial A_y} = K = 2.0\ \text{deg/g}
$$
From 1.0 g to 1.5 g at fixed radius: $\Delta\delta = 2.0 \times 0.5 = 1.0°$.

Nonlinear case, $K(A_y) = 2.0 + 3.0(A_y - 1.0)$ for $A_y > 1$:
$$
\Delta\delta = \int_{1.0}^{1.5} K(A_y)\,dA_y = \int_{1.0}^{1.5}\left[2.0 + 3.0(A_y-1)\right]dA_y
$$
$$
= 2.0(0.5) + 3.0\cdot\frac{(0.5)^2}{2} = 1.0 + 0.375 = 1.375°
$$

The nonlinear car needs 37.5% more additional steer over that range. More importantly, its *instantaneous* gradient at 1.5 g is $2.0 + 3.0(0.5) = 3.5$ deg/g — the car is progressively "washing out" at the front. The driver experiences this as the steering going light and the car refusing to take more angle: terminal understeer. Whether this is acceptable depends entirely on how it is approached; a gradual rise in $K$ is a friendly warning, a sudden one is a wall. This distinction — the *shape* of $K(A_y)$, not its value at one point — is what Chapters 7 and 8 exist to characterize.
