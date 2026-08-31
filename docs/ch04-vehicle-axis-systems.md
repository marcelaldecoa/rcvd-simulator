# Chapter 4 — Vehicle Axis Systems

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 4. Original explanatory material.*

---

## 1. Why a whole chapter on bookkeeping

This is the shortest chapter in Part I and the one most often skipped. Skipping it is a mistake. Vehicle dynamics is the process of summing forces produced in four contact-patch frames, transforming them into a body frame, integrating the body-frame equations, and expressing the result in an earth frame. Every one of those steps is a place to lose a sign. The Millikens' insistence on conventions reflects hard experience: **most vehicle dynamics errors are not physics errors, they are frame errors.**

## 2. The two families of axis system

### 2.1 Earth-fixed (inertial) axes

$X_E, Y_E, Z_E$ fixed to the ground. Newton's laws hold directly here. This is where trajectory lives — the racing line is a curve in the earth frame.

### 2.2 Vehicle-fixed (body) axes

$x, y, z$ attached to and rotating with the sprung mass, origin conventionally at the CG. SAE convention:
- $x$ forward, in the plane of symmetry
- $y$ to the driver's **right**
- $z$ **downward**, completing a right-handed set

Angular rates: **roll rate** $p$ about $x$, **pitch rate** $q$ about $y$, **yaw rate** $r$ about $z$.
Velocities: $u$ (forward), $v$ (lateral), $w$ (vertical).

The advantage of body axes is that the tires, suspension, and mass properties are all naturally described there — the inertia tensor is constant in body axes and time-varying in earth axes.

The **price** of body axes is that they are non-inertial, so Newton's law acquires the transport terms.

## 3. Equations of motion in a rotating frame

For a rigid body with the axis origin at the CG, restricting to planar motion (the case for most of Chapters 5–8):

$$
\sum F_x = m(\dot{u} - v r)
$$
$$
\sum F_y = m(\dot{v} + u r)
$$
$$
\sum M_z = I_{zz}\dot{r}
$$

The $ur$ term in the lateral equation is the **centripetal term**. In steady-state cornering $\dot v = 0$ and the lateral acceleration is simply

$$
A_y = u\,r = V r
$$

which is the workhorse relation of Chapter 5: lateral acceleration equals forward speed times yaw rate. For a path of radius $R$, $r = V/R$, recovering $A_y = V^2/R$.

The distinction between the **lateral acceleration of the CG** ($\dot v + ur$) and the **lateral acceleration measured by an accelerometer** deserves care. A body-mounted accelerometer measures specific force, which in a banked or rolled attitude includes a gravity component:

$$
a_{y,\text{meas}} = A_y \cos\phi + g\sin\phi
$$

for roll angle $\phi$. At 4° of roll, the gravity contribution is 0.070 g — on a 1.5 g measurement that is a 4.7% error if uncorrected. Serious data systems either mount the accelerometer on a roll-compensated platform, correct with a measured roll angle, or use a full IMU.

## 4. Full six-DOF form

For completeness, the general rigid-body equations in body axes (Euler's equations plus Newton):

$$
\begin{aligned}
F_x &= m(\dot u + qw - rv)\\
F_y &= m(\dot v + ru - pw)\\
F_z &= m(\dot w + pv - qu)\\
M_x &= I_{xx}\dot p - (I_{yy}-I_{zz})qr - I_{xz}(\dot r + pq)\\
M_y &= I_{yy}\dot q - (I_{zz}-I_{xx})rp - I_{xz}(r^2 - p^2)\\
M_z &= I_{zz}\dot r - (I_{xx}-I_{yy})pq - I_{xz}(\dot p - qr)
\end{aligned}
$$

For a car, $I_{xy} = I_{yz} = 0$ by symmetry about the $x$–$z$ plane, but $I_{xz} \neq 0$ in general (mass distributed both high and forward). Typical values for a formula car: $I_{xx} \approx 100$–150 kg·m², $I_{yy} \approx 700$–1000, $I_{zz} \approx 800$–1100 kg·m².

A useful nondimensional grouping is the **dynamic index**:

$$
DI = \frac{I_{zz}}{m\,a\,b}
$$

with $a$, $b$ the distances from CG to front and rear axles. $DI = 1$ means the yaw and bounce/pitch modes decouple in a particular sense; race cars are typically $DI \approx 0.8$–1.0, with mid-engine layouts pulling mass toward the centre to reduce $I_{zz}$ and quicken yaw response.

## 5. Vehicle motions and the key angles

**Sideslip angle (vehicle)** $\beta$: the angle between the vehicle's $x$ axis and the velocity vector of the CG:

$$
\beta = \arctan\frac{v}{u} \approx \frac{v}{V}
$$

Note the sign trap: SAE convention makes $\beta$ positive when $v$ is positive (velocity vector pointing to the right of the nose). Many practitioners define "attitude angle" with the opposite sense so that a right-hand turn with the tail out gives a positive number. Be explicit.

**Steer angle** $\delta$: front wheel steer, positive to the left in SAE (consistent with a positive yaw rate being nose-left... except SAE's $z$ is down, making positive yaw rate nose-*right*). This is exactly the kind of trap the chapter exists to warn about. **The practical remedy: define your convention in a diagram, and check every derivation against a physical thought experiment — "if I turn left, does my equation give a left turn?"**

**Slip angle at each axle** for the bicycle model:

$$
\alpha_f = \beta + \frac{a\,r}{V} - \delta, \qquad \alpha_r = \beta - \frac{b\,r}{V}
$$

(In the SAE sign convention where positive $\alpha$ generates negative $F_y$; some texts write these with opposite signs throughout. The *physics* — front slip angle increases with steer input and rear slip angle grows with yaw rate — is convention-independent.)

## 6. Euler angles and their ordering

Orientation of the body frame relative to earth is described by yaw $\psi$, pitch $\theta$, roll $\phi$, applied in that order (3-2-1 sequence). Order matters: rotations do not commute. A 10° yaw followed by 10° pitch is not the same attitude as 10° pitch followed by 10° yaw.

The transformation from body to earth velocities:

$$
\begin{bmatrix}\dot X\\ \dot Y\end{bmatrix} =
\begin{bmatrix}\cos\psi & -\sin\psi\\ \sin\psi & \cos\psi\end{bmatrix}
\begin{bmatrix}u\\ v\end{bmatrix}
$$

for the planar case. Integrating $\dot\psi = r$ and then this transformation is how a simulation produces a track map from body-frame states.

Euler angles suffer gimbal lock at $\theta = \pm 90°$ — irrelevant for cars, relevant if you reuse aircraft code.

## 7. Sign convention pragmatics

The Millikens explicitly discuss the tension between the SAE convention (rigorous, $z$-down, aeronautical heritage) and the fact that it produces counterintuitive signs for tire load and lateral force. Common pragmatic choices in race engineering:

| Quantity | Strict SAE | Common practice |
|---|---|---|
| Vertical tire load $F_z$ | negative for a loaded tire | positive up |
| Lateral force at positive $\alpha$ | negative | often plotted as $-F_y$ |
| Roll angle in a right turn | positive (rolls right) | varies |
| Understeer gradient $K$ | positive = understeer | consistent |

**Recommended discipline for any project:**
1. Draw the axis system on the first page of the analysis.
2. Define positive senses for $\delta$, $\alpha$, $\beta$, $\phi$, $F_y$, $F_z$, $M_z$.
3. Include a "sanity case": a steady left turn, and confirm every quantity's sign.
4. When importing tire data, plot it and confirm the peak is where you expect and the sign matches.

This is not pedantry. A sign error in the rear axle cornering stiffness turns a stable car into an unstable one in simulation, and the plot still looks plausible.

## 8. The book's own symbol conventions

RCVD uses a broadly SAE-consistent set with some specific choices — notably positive tire loads and the lateral force presented so that a right turn feels natural. When cross-referencing with Pacejka, ISO, or a commercial multibody code (ADAMS/Car, CarSim, VI-Grade), expect at least one sign difference and check it deliberately. ISO differs from SAE in having $z$ **up** and $y$ to the **left**, which flips the sign of yaw rate, lateral force, and aligning torque simultaneously.

---

## Exercises

**4.1** A car travels at 40 m/s on a 250 m radius corner. Compute yaw rate, lateral acceleration in m/s² and g, and the time to traverse 90° of the corner.

**4.2** A car has $V = 30$ m/s, $r = 0.25$ rad/s, $v = -1.2$ m/s. Find the sideslip angle and the lateral acceleration, and state whether the tail is inside or outside the path.

**4.3** A body-mounted lateral accelerometer reads 1.42 g while the car rolls 3.5°. Find the true lateral acceleration of the CG.

**4.4** A car with $a = 1.35$ m, $b = 1.25$ m, $V = 35$ m/s, $\delta = 2.2°$, $\beta = -0.8°$, $r = 0.30$ rad/s. Compute front and rear slip angles.

**4.5** Given $m = 720$ kg, $a = 1.30$ m, $b = 1.35$ m, $I_{zz} = 900$ kg·m², compute the dynamic index and comment.

**4.6** Starting from $\sum F_y = m(\dot v + ur)$, show that in a steady turn of constant radius $R$ at constant speed, the required lateral force is $mV^2/R$, and identify what $\dot v = 0$ physically means.

---

## Solutions

**4.1**
$$
r = \frac{V}{R} = \frac{40}{250} = 0.16\ \text{rad/s} = 9.17°/\text{s}
$$
$$
A_y = Vr = 40 \times 0.16 = 6.4\ \text{m/s}^2 = 0.652\ g
$$
90° = 1.5708 rad, so $t = 1.5708/0.16 = 9.82$ s.

**4.2**
$$
\beta = \arctan\frac{v}{u} = \arctan\frac{-1.2}{30} = -2.29°
$$
$$
A_y = \dot v + ur \approx 30 \times 0.25 = 7.5\ \text{m/s}^2 = 0.765\ g \quad (\dot v = 0 \text{ assumed steady})
$$
With SAE axes ($z$ down, positive $r$ = nose right), positive $r$ means turning right, while $v < 0$ means the CG velocity vector points to the **left** of the nose. So the nose is pointed further into the turn than the velocity vector — the car is at a **negative sideslip angle in a right turn, i.e. the tail is outboard of the path**. This is the normal attitude for a car cornering at moderate-to-high lateral acceleration: above the "tangent speed", $\beta$ changes sign and the car runs nose-in.

**4.3**
$$
a_{y,\text{meas}} = A_y\cos\phi + g\sin\phi
$$
$$
1.42g = A_y\cos(3.5°) + g\sin(3.5°) = 0.99814\,A_y + 0.06105\,g
$$
$$
A_y = \frac{(1.42 - 0.06105)}{0.99814}g = 1.362\,g
$$
The uncorrected reading overstates lateral acceleration by **4.3%** — enough to corrupt a friction-circle study or a tire-model correlation. Always correct for roll, and note that on a banked circuit the same correction with the bank angle applies in the opposite sense.

**4.4**
$\beta = -0.8° = -0.01396$ rad; $\delta = 2.2° = 0.03840$ rad.

$$
\alpha_f = \beta + \frac{ar}{V} - \delta = -0.01396 + \frac{1.35 \times 0.30}{35} - 0.03840
$$
$$
= -0.01396 + 0.011571 - 0.03840 = -0.04079\ \text{rad} = -2.34°
$$

$$
\alpha_r = \beta - \frac{br}{V} = -0.01396 - \frac{1.25 \times 0.30}{35} = -0.01396 - 0.010714 = -0.02467\ \text{rad} = -1.41°
$$

$|\alpha_f| > |\alpha_r|$ — the front axle is working at a larger slip angle than the rear, which is the signature of an **understeering** condition (Chapter 5). The understeer gradient can be read directly here: $K \approx (\alpha_f - \alpha_r)/A_y$.

**4.5**
$$
DI = \frac{I_{zz}}{m\,a\,b} = \frac{900}{720 \times 1.30 \times 1.35} = \frac{900}{1263.6} = 0.712
$$

$DI < 1$ means yaw inertia is low relative to the "dumbbell equivalent" of the axle masses — mass is concentrated near the CG rather than at the ends. This gives quick yaw response and a short yaw-mode period, favourable for slaloms and direction changes but potentially nervous at high speed. A front-engine, front-radiator, rear-transaxle GT car with a long overhang would sit above 1.0 and feel more inert but more settled. Mid-engine layouts exist substantially to achieve this low $DI$.

**4.6**
$$
\sum F_y = m(\dot v + ur)
$$
Steady turn: $u = V$ constant, $r = V/R$ constant, and the sideslip angle is constant so $v = V\sin\beta$ is constant, hence $\dot v = 0$. Then:
$$
\sum F_y = mVr = mV\cdot\frac{V}{R} = \frac{mV^2}{R}
$$

**Physical meaning of $\dot v = 0$**: the lateral velocity in the *body frame* is not changing. The velocity vector in the earth frame is certainly changing — it is rotating at rate $r$ — but the body frame rotates with it, so the components stay fixed. All of the acceleration is supplied by the transport term $ur$. This is precisely why the $ur$ term cannot be dropped: in steady cornering it *is* the entire lateral acceleration. Dropping it is the single most common error in first attempts at writing vehicle equations of motion.
