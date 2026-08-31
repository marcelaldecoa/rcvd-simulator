# Chapter 11 — Testing and Development

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 11. Original explanatory material.*

---

## 1. Why testing is a discipline, not an activity

The purpose of testing is to **reduce uncertainty about a specific question**. A test that does not have a question stated in advance produces data, not information. The Millikens' treatment reflects decades of formal vehicle test practice at Calspan, where the standard was aerospace flight test: define the manoeuvre, define the measurand, define the acceptance criteria, and control the variables.

Race testing is harder than laboratory testing because the environment is uncontrolled (track temperature, rubber, wind, fuel load, tire life) and because the instrument — the driver — is adaptive. A driver will unconsciously compensate for a change, so a setup change can produce identical lap times and completely different subjective feedback, or vice versa.

## 2. The driver–vehicle relationship

The driver is a closed-loop controller with:
- **Preview** — the driver looks ahead and acts on anticipated path error, which is why a car with predictable behaviour can be driven faster than a car with the same capability and less predictability.
- **Bandwidth** — usable control bandwidth is roughly 1–2 Hz for path corrections, with neuromuscular limits above that.
- **Delay** — 0.15–0.3 s from perception to steering response.
- **Adaptation** — the driver retunes gain and strategy over a stint or a session.

Feedback channels: steering torque (the single most information-dense channel — see Chapter 2's pneumatic trail discussion), seat-of-the-pants lateral and longitudinal acceleration, yaw rate through the vestibular system, visual flow, sound, and vibration.

**Design implication**: preserving the steering-torque cue is a performance decision. So is preserving the yaw-rate cue, which argues against excessively high yaw damping.

## 3. Desirable vehicle characteristics

Distilled from the book's discussion and from the broader handling-quality literature:

- **Predictable, progressive limit behaviour** — the limit should announce itself.
- **Mild understeer through the operating range**, trending toward neutral at the limit.
- **Adequate yaw damping** but not so much that the car feels inert.
- **Short lag between steer input, yaw response and lateral acceleration.**
- **Consistent balance across speed, lateral acceleration, and fuel load.**
- **Steering torque that builds with lateral force and eases before the limit.**
- **Insensitivity to disturbances** — kerbs, bumps, wind, and the wake of another car.
- **Repeatability** — the same input gives the same result, lap after lap.

The last is underrated. A car that is a tenth faster on its best lap but scatters by three tenths is slower over a race distance.

## 4. Fundamentals of testing

**Control the variables.** Test back-to-back (A-B-A) so that track evolution can be separated from the change under test. The A-B-A protocol is the minimum acceptable standard: if the two A runs disagree by more than the A-B difference, the test is inconclusive.

**Measure, don't infer.** Instrument for the quantity of interest: string pots for suspension travel, load cells or strain-gauged pushrods for wheel loads, pitot for airspeed, laser ride-height sensors, steering torque and angle, IMU, GPS, tire temperature and pressure (ideally infrared across the tread).

**Know your accuracy.** A 1% error in a lateral accelerometer, uncorrected for roll (Chapter 4), can invalidate a tire correlation study.

**Separate the driver.** Where possible use objective manoeuvres with defined inputs rather than lap time; use the driver's subjective feedback as a *hypothesis generator*, not as data.

## 5. Standard test manoeuvres

### 5.1 Constant-radius (skid pad) test

Drive a fixed radius at progressively increasing speed, recording steer angle and lateral acceleration. Plot $\delta$ versus $A_y$.

$$
\delta = \frac{57.3L}{R} + K A_y
$$

The **intercept** is the Ackermann angle (a check on your instrumentation and the geometry) and the **slope is the understeer gradient** $K$ — measured directly, not inferred. Where the curve bends, you are reading $K(A_y)$ and the approach to the limit. Where $\delta$ stops increasing $A_y$, the front axle has saturated.

Circular skid pad testing is the most information-dense single test in vehicle dynamics for the effort involved, and it is the natural validation of Chapters 5 and 7.

### 5.2 Constant-speed, variable-radius

The dual test: hold speed, increase steer, spiral inward. Gives the same $K$ but at fixed speed, decoupling speed effects (aero, tire relaxation) from lateral acceleration effects.

### 5.3 Step steer (transient response)

From straight running at constant speed, apply a rapid steer step. Measure yaw rate and lateral acceleration versus time. Extract:
- Yaw rate response time (to 90%)
- Yaw rate overshoot → damping ratio (Chapter 6)
- Lateral acceleration lag behind yaw rate
- Steady-state gains

### 5.4 Frequency response (sine sweep / pulse)

Sinusoidal steering at increasing frequency, or a single pulse analysed by FFT. Produces Bode plots of yaw rate/steer and lateral acceleration/steer. Gives $\omega_n$ and $\zeta$ directly and reveals resonances the step test can miss.

### 5.5 Braking and combined tests

Straight-line braking for peak deceleration and bias verification; braking in a turn for stability assessment; throttle-off in a turn (lift-off oversteer) as a classic stability probe.

### 5.6 Aerodynamic verification

Constant-speed straight-line runs at several speeds with ride-height and pushrod-load measurement give downforce and balance versus speed. Coastdown gives $C_DA$ (Chapter 3, Exercise 3.6).

## 6. Track test programme planning

A workable structure for a test day:

1. **Baseline and validate.** Establish a reference setup and confirm the car and instrumentation are healthy. Take a reference run set.
2. **Systematic sweeps.** One variable at a time, sufficient range, A-B-A protocol.
3. **Bracket, don't chase.** Deliberately go too far in each direction so the optimum is bracketed, rather than creeping toward it.
4. **Re-baseline periodically.** Track and tire evolution are large; a mid-day baseline repeat is not wasted time.
5. **Debrief with the driver on each change before revealing the lap time.** Otherwise the lap time contaminates the subjective assessment.
6. **Record everything.** Fuel, tire set and age, track temperature, ambient, wind, times of day.

**Sources of error, ranked by how often they ruin a test:** tire degradation, track evolution, fuel load change, ambient temperature, wind, driver adaptation, instrumentation drift.

## 7. Development versus setup

A distinction worth holding:

- **Setup** is choosing values of existing adjustments to suit a circuit and conditions. Timescale: a session.
- **Development** is changing the car's fundamental capability — new geometry, new aero, new components. Timescale: weeks to years.

Testing serves both, but with different protocols. Development testing demands correlation with simulation; setup testing demands speed and repeatability.

## 8. Circular skid pad testing in detail

Because this is the workhorse:

**Procedure.** Mark a circle of known radius (a common standard is 30 m or 100 ft radius for road cars; larger for race cars to reach meaningful speeds). Drive at steady speed on the line, both directions. Increase speed in increments until the limit.

**Measurements.** Steer angle at the road wheel (not the wheel rim — correct for steering ratio and compliance), lateral acceleration (roll-corrected), speed, yaw rate, and ideally sideslip angle.

**Outputs.**
$$
A_y = \frac{V^2}{gR}, \qquad K = \frac{d\delta}{dA_y}, \qquad \mu_{\text{peak}} = A_y^{\max}
$$

**Both directions** — always. Asymmetry from track camber, corner weights, or driver position is common and is itself a useful measurement.

**Cautions.** Skid pad radius interacts with the result: a small radius means low speed at the limit, so aerodynamic effects are absent and the result does not represent the car at racing speed. Report the radius and speed with every $K$ value.

---

## Exercises

**11.1** A constant-radius test on $R = 45$ m gives the following data. Compute $K$ over the linear range and identify where the car departs from linearity.

| $V$ (m/s) | $\delta$ (deg, road wheel) |
|---|---|
| 10 | 4.05 |
| 14 | 4.65 |
| 18 | 5.55 |
| 22 | 6.90 |
| 25 | 8.60 |

Wheelbase $L = 2.55$ m.

**11.2** A step steer test at 40 m/s gives a yaw rate that peaks at 0.335 rad/s and settles to 0.290 rad/s, with the first peak at 0.42 s after the input. Compute the damping ratio and natural frequency.

**11.3** In a straight-line aero verification run, front pushrod loads increase by 1850 N and rear by 2400 N when speed rises from 30 to 60 m/s. Compute $C_LA$ total and the aero balance, given a motion ratio of 1.0 and neglecting drag-induced pitch.

**11.4** A team tests a front bar change and finds lap times of 88.42 s (A), 88.31 s (B), 88.48 s (A). Assess the result.

**11.5** Design a test to separate the effects of a tire pressure change from track evolution over a 90-minute session.

**11.6** Explain why a lateral accelerometer alone is insufficient for measuring understeer gradient, and what additional channel is essential.

---

## Solutions

**11.1**
Compute $A_y = V^2/(gR)$ with $gR = 9.81 \times 45 = 441.45$:

| $V$ | $A_y$ (g) | $\delta$ (deg) |
|---|---|---|
| 10 | 0.2266 | 4.05 |
| 14 | 0.4440 | 4.65 |
| 18 | 0.7339 | 5.55 |
| 22 | 1.0964 | 6.90 |
| 25 | 1.4157 | 8.60 |

Ackermann angle: $57.3 \times 2.55/45 = 3.247°$.

Successive slopes $\Delta\delta/\Delta A_y$:
- 0.227→0.444: $(4.65-4.05)/0.2174 = 2.76$ deg/g
- 0.444→0.734: $(5.55-4.65)/0.2899 = 3.10$ deg/g
- 0.734→1.096: $(6.90-5.55)/0.3625 = 3.72$ deg/g
- 1.096→1.416: $(8.60-6.90)/0.3193 = 5.32$ deg/g

Linear-range $K$: extrapolating the first segment back, $\delta_0 = 4.05 - 2.76(0.2266) = 3.42°$ — close to the 3.247° Ackermann value, confirming the measurement is sound (the small excess suggests a little steering compliance or toe).

**$K \approx 2.8$ deg/g in the linear range**, rising steadily. **Departure from linearity is already evident by 0.7 g** and severe above 1.1 g, where $K$ has nearly doubled. The car is developing progressive terminal understeer — the front axle is approaching saturation. Whether this is desirable depends on the class; for a race car it is probably too much, and the fix would be to move TLLTD rearward.

**11.2**
Overshoot ratio:
$$
M_p = \frac{0.335 - 0.290}{0.290} = 0.1552
$$
$$
\zeta = \frac{-\ln M_p}{\sqrt{\pi^2 + \ln^2 M_p}} = \frac{1.863}{\sqrt{9.870 + 3.471}} = \frac{1.863}{3.653} = 0.510
$$

Peak time relates to the damped frequency:
$$
t_p = \frac{\pi}{\omega_d} \Rightarrow \omega_d = \frac{\pi}{0.42} = 7.48\ \text{rad/s}
$$
$$
\omega_n = \frac{\omega_d}{\sqrt{1-\zeta^2}} = \frac{7.48}{\sqrt{1-0.260}} = \frac{7.48}{0.860} = 8.70\ \text{rad/s} = 1.38\ \text{Hz}
$$

A 1.38 Hz yaw mode with $\zeta = 0.51$ at 40 m/s is a responsive but somewhat lightly damped car — 15.5% overshoot is noticeable to the driver as a slight "over-rotation then settle" on turn-in. Acceptable for a race car; a road car would target $\zeta \approx 0.7$.

**11.3**
Dynamic pressure change: $q_{60} - q_{30} = \frac{1}{2}(1.225)(3600 - 900) = \frac{1}{2}(1.225)(2700) = 1654$ Pa.

Total downforce increase: $1850 + 2400 = 4250$ N.
$$
C_LA = \frac{\Delta F_z}{\Delta q} = \frac{4250}{1654} = 2.57\ \text{m}^2
$$

Aero balance:
$$
\%_{\text{front}} = \frac{1850}{4250} = 43.5\%
$$

A 43.5% front aero balance is in the normal range for a race car (usually a few points forward of the mechanical weight distribution's neutral point to avoid high-speed understeer). The caveat noted in the question matters: drag acting above the ground plane generates a nose-down pitching moment, so some of the measured front load increase is drag-induced pitch rather than direct front downforce. A rigorous test either measures at multiple ride heights to separate the effects, or uses a pitch-controlled rig.

**11.4**
A runs: 88.42 and 88.48 s — a spread of 0.06 s.
B run: 88.31 s.
Mean A: 88.45 s. B is 0.14 s faster.

**Assessment: promising but not conclusive.** The B-versus-A difference (0.14 s) is only 2.3× the observed A-to-A scatter (0.06 s). With a single B run, there is no estimate of B's own repeatability. A reasonable rule of thumb is that the effect should exceed about three times the run-to-run standard deviation before it is trusted; here we have one estimate of scatter from two points, which is a weak estimate.

**What to do**: run at least two more laps of B, and ideally another A, giving something like A-B-A-B-A. Then compare means with an estimate of variance. Also check whether the two A times bracket the B time chronologically — if the track was improving monotonically, the mean-A comparison already corrects for that, which is precisely why the A-B-A protocol exists.

Finally: check the *data*, not just the lap time. If B shows higher minimum corner speeds and the driver reports better rotation, the 0.14 s is more credible than if the gain came from a single unusually good sector.

**11.5**
**Objective**: measure the effect of a tire pressure change (say −2 psi at the front) on balance and lap time, with track evolution present.

**Design:**

1. **Instrument for the direct effect**, not just lap time: front and rear tire temperatures across the tread, steer angle versus $A_y$ through a repeatable corner, minimum corner speeds. A pressure change acts through contact patch shape and stiffness; measuring tread temperature distribution tests the mechanism directly and is far less contaminated by track state than lap time.

2. **Use an A-B-A-B-A sequence** with equal run lengths, not a one-shot comparison. Track evolution over 90 minutes is typically monotonic and roughly linear; alternating configurations lets you fit and remove a linear trend.

3. **Fix confounders**: same tire set and comparable tire age for each run (or, better, new tires for each run if budget allows — otherwise degradation is confounded with the change); same fuel load window (refuel to a constant mass before each run); same time-of-day gaps between runs.

4. **Fit the model** $t_{ij} = \mu + \beta_{\text{config}} + \gamma \cdot (\text{elapsed time}) + \epsilon$. The coefficient $\beta$ is the effect; the residual scatter gives its uncertainty.

5. **Include a null test** if time permits: an A-A comparison run under the same protocol, to calibrate what "no change" looks like given your scatter.

6. **Debrief the driver blind** — ask which run felt better before showing times.

The general principle: when the confounder is time-varying and the effect is small, **alternate and model the trend**; do not attempt to hold the track constant, because you cannot.

**11.6**
Understeer gradient is defined by $\delta = 57.3L/R + KA_y$. It is the relationship between **steer angle** and **lateral acceleration**. A lateral accelerometer measures only $A_y$; without $\delta$ there is no gradient to compute.

The essential additional channel is therefore **steering angle — measured at the road wheels, or at the steering wheel with a known and verified steering ratio, corrected for steering-system compliance.** The compliance correction is not optional: at 1.5 g a race car's steering column, rack and linkage can deflect enough to introduce several tenths of a degree of error, which on a gradient of 2–3 deg/g is a 10–20% error.

Two further channels are strongly desirable:
- **Roll angle**, to correct the accelerometer for the gravity component (Chapter 4, Exercise 4.3) — a 4–5% error otherwise.
- **Speed and yaw rate**, to verify path radius independently ($R = V/r$) rather than assuming the driver held the painted circle exactly.

With $\delta$, $A_y$ (roll-corrected), $V$ and $r$, the constant-radius test becomes self-validating: $A_y$ from the accelerometer should equal $Vr$, and any discrepancy flags a problem before it corrupts the result.
