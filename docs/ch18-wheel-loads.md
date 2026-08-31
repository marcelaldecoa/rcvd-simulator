# Chapter 18 — Wheel Loads

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 18. Original explanatory material.*

---

## 1. Why this is the pivotal chapter of Part II

Everything in this book reduces to one question: **what is the vertical load on each tire, and at what slip angle and camber is it operating?** Chapter 2 showed that lateral force is a strongly nonlinear function of vertical load. Chapter 7 showed that balance is governed by how load transfer is distributed. This chapter is where the four wheel loads are actually computed, from first principles, including every contribution.

## 2. Assumptions

The standard treatment assumes:
- Rigid chassis (revisited in section 4)
- Rigid suspension links; compliance treated separately (Chapter 23)
- Small angles
- Sprung and unsprung masses treated separately
- Steady state (transient load transfer through the dampers treated in Chapter 22)

## 3. Centre of gravity location

### 3.1 Longitudinal position

Weigh each axle. With $W_f$, $W_r$ measured and $W = W_f + W_r$:

$$
a = \frac{W_r L}{W}, \qquad b = \frac{W_f L}{W}
$$

where $a$ is the distance from the front axle to the CG.

### 3.2 Lateral position

Weigh each wheel. Lateral offset from centreline:

$$
y_{CG} = \frac{(W_{RF}+W_{RR}) - (W_{LF}+W_{LR})}{2W}\cdot t
$$

### 3.3 Height — the tilt method

Raise one axle by a known height and re-weigh. With the car raised at the rear by angle $\theta$:

$$
h_{CG} = \frac{(W_f' - W_f)L}{W\tan\theta} + r_{\text{wheel}}
$$

where $W_f'$ is the front axle weight in the tilted condition and $r_{\text{wheel}}$ the rolling radius (because the measurement is referenced to the wheel centres, not the ground).

**Practical requirements**, all of which are routinely violated and all of which matter:
- **Lock the suspension** (solid struts or blocks in place of springs). Otherwise the suspension deflects during the tilt and the mass redistributes, giving a wrong answer.
- **Deflate or block the tires** for the same reason.
- **Use a large tilt angle** — at least 10°, ideally more. The measurement is a difference of two large numbers divided by $\tan\theta$; small angles amplify scale error enormously.
- **Repeat both ways** (nose up and tail up) and average.

Accuracy of ±5 mm is achievable with care; ±30 mm is common without it. Since load transfer is directly proportional to $h_{CG}$, a 30 mm error on a 300 mm CG is a 10% error in every load transfer calculation in the rest of the chapter.

### 3.4 Sprung versus unsprung

The unsprung masses (wheels, tires, uprights, brakes, part of the arms and driveshafts) do not roll with the body and their CG heights are approximately at the wheel centres. Separating them:

$$
W = W_s + W_u, \qquad W_s h_s = W h_{CG} - W_u h_u
$$

Typical unsprung mass: 25–45 kg per corner for a formula car, more for a live-axle car.

## 4. Chassis stiffness

The whole roll-stiffness-distribution apparatus assumes the chassis connects the front and rear suspensions rigidly. If it does not, the chassis acts as a torsional spring **in series** between the two axles' roll stiffnesses:

$$
\frac{1}{K_{\phi,\text{effective}}} = \frac{1}{K_{\phi f}} + \frac{1}{K_{\text{chassis}}} + \frac{1}{K_{\phi r}} \quad\text{(schematically)}
$$

More precisely, a flexible chassis lets the front and rear roll angles differ, so the intended TLLTD is not achieved — the load transfer distribution moves toward 50/50 regardless of what the bars are set to.

**The consequence**: on a flexible car, changing an anti-roll bar produces a smaller effect than calculated, and in the extreme case produces almost no effect at all. This is the classic explanation for "the car doesn't respond to setup changes."

**Design target — the book's criterion.** RCVD does *not* state a simple multiple of total roll stiffness. Its criterion is more specific and physically better motivated: **the chassis must resist approximately the difference between the front and rear roll rates**, since that difference is the torque the structure actually has to transmit between the two axles. Compare $|K_{\phi f} - K_{\phi r}|$ with the chassis rate, and then ask how much wedge or stagger it takes to change the handling — the chassis compliance must be small against that.

The book adds a practical qualification: it does no harm to be too stiff (unless the car is made overweight chasing it), but *changing* chassis stiffness changes the setup, so springs and bar settings must be revisited afterwards.

**Typical values quoted in the book** (1995 vintage): unibody sedans 4,000–10,000 lb·ft/deg (5,400–13,600 N·m/deg); small formula cars around 3,000 lb·ft/deg (4,100 N·m/deg); composite, stiffly-sprung Formula One cars 12,000 lb·ft/deg (16,300 N·m/deg) and up. Modern carbon monocoques exceed this substantially, but that is a present-day observation rather than the book's figure.

A caution the book raises explicitly: quoted stiffness figures may be for a bare tub without the brackets and links needed to attach the suspension. **A measurement of only part of the system is misleading.**

The commonly-repeated "5–10× total roll stiffness" rule of thumb is a reasonable engineering heuristic and errs on the safe side, but it is not the book's statement and should not be attributed to it.

**Measurement**: clamp one axle, apply a known torque at the other, measure the twist with dial gauges at multiple stations along the car. Plotting twist versus station reveals *where* the compliance is — usually the engine bay, the cockpit opening, or a bulkhead joint.

## 5. Lateral load transfer — the complete derivation

Total lateral load transfer is fixed by statics:

$$
\Delta F_{z,\text{total}} = \frac{W\,A_y\,h_{CG}}{t}
$$

The book treats the car as a **three-mass system** — the sprung mass plus the front and rear unsprung masses — and the **distribution** between axles then has three contributions. (Unsprung mass is taken as the wheels, brakes, hubs, axles, and half the mass of the A-arms, springs and dampers.)

Two book conventions worth adopting. The line joining the front and rear roll centres is the **Neutral Roll Axis (NRA)**, and the roll moment arm $H$ is strictly the **perpendicular** distance from the sprung CG to the NRA, not the vertical difference — the two coincide only for a level roll axis, and the vertical approximation used in the exercises below is slightly conservative.

The book's roll centre definition is the force-based one: the point in the transverse vertical plane through a pair of wheel centres at which a lateral force may be applied to the sprung mass without producing roll.

Note also that the full derivation carries a gravity term, $M_s = -W_s h_2(A_Y - \phi)$, in which the roll angle $\phi$ slightly reduces the effective lateral acceleration. The book neglects it for small roll angles, as the treatment below does, but on a soft car at high $A_y$ it is not entirely negligible.

**1. Sprung mass, geometric (through the links).**
$$
\Delta F_{zf}^{\text{geo}} = \frac{W_{sf}A_y\,h_{RCf}}{t_f}
$$
Instantaneous, transmitted through the suspension links, set by roll centre height.

**2. Sprung mass, elastic (through the springs and bars).**
$$
\Delta F_{zf}^{\text{ela}} = \frac{K_{\phi f}}{K_{\phi f}+K_{\phi r}}\cdot\frac{W_s A_y H}{t_f}
$$
Requires body roll to develop, and is what the anti-roll bars control.

**3. Unsprung mass.**
$$
\Delta F_{zf}^{\text{uns}} = \frac{W_{uf}A_y h_{uf}}{t_f}
$$
Acts directly at the unsprung CG height (approximately the wheel centre).

**Total at the front axle:**
$$
\Delta F_{zf} = \frac{A_y}{t_f}\left[W_{sf}h_{RCf} + \frac{K_{\phi f}}{K_{\phi f}+K_{\phi r}}W_sH + W_{uf}h_{uf}\right]
$$

and similarly at the rear. The sum of front and rear must equal the total — a useful check on the arithmetic.

**TLLTD** is then:
$$
\text{TLLTD} = \frac{\Delta F_{zf}}{\Delta F_{zf}+\Delta F_{zr}}
$$

This is the master balance parameter of Chapter 7, computed at last from real geometry.

## 6. Longitudinal weight transfer

$$
\Delta F_{z,\text{long}} = \frac{W A_x h_{CG}}{L}
$$

Note it depends on the **total** CG height and the **wheelbase** — and, unlike lateral transfer, it has no distribution parameter to tune, because there is only one "axle pair" in the longitudinal direction. Front and rear axle loads under longitudinal acceleration:

$$
F_{zf} = W_f - \frac{WA_xh}{L}, \qquad F_{zr} = W_r + \frac{WA_xh}{L}
$$

(with $A_x$ positive for acceleration).

Geometric anti-features (Chapter 17) change how this transfer is *reacted* — through links versus springs — and therefore the pitch attitude, but they do **not** change the transfer itself. This is exactly analogous to the roll centre result.

## 7. The effects of banking

On a banked surface with bank angle $\theta_b$, the normal load and the required lateral force change:

$$
F_z = W\cos\theta_b + \frac{WV^2}{gR}\sin\theta_b
$$
$$
F_y^{\text{required}} = \frac{WV^2}{gR}\cos\theta_b - W\sin\theta_b
$$

The bank both increases the available normal load and reduces the required lateral force. The **neutral speed** — at which no lateral tire force is required at all — is:

$$
V_{\text{neutral}} = \sqrt{gR\tan\theta_b}
$$

On a 31° banked oval of 250 m radius: $V = \sqrt{9.81 \times 250 \times 0.6009} = 38.4$ m/s (138 km/h). Above that speed the tires work; below it the car tends to slide *down* the banking.

Load transfer on a bank is measured relative to the road surface, so:
$$
\Delta F_z = \frac{W h_{CG}}{t}\left(\frac{V^2}{gR}\cos\theta_b - \sin\theta_b\right)
$$

## 8. Other terrain effects

- **Crown and camber** of the road surface act as a small continuous bank, producing a steady lateral force requirement and a steer pull.
- **Crests and dips** change the vertical load through vertical acceleration: $F_z = W(1 \pm V^2/(gR_{\text{vert}}))$. A crest at speed can unload the car dramatically — the classic "car goes light over the brow" — and a dip can double the loads, compressing the suspension and, on an aero car, driving the floor into the ground.
- **Kerbs** produce large, brief single-wheel inputs that the geometry and damping must accommodate.

## 9. Aerodynamic loads

Downforce adds to vertical load at each axle:

$$
F_{zf}^{\text{aero}} = q\,C_{Lf}A, \qquad F_{zr}^{\text{aero}} = q\,C_{Lr}A
$$

**Important consequences:**

1. Aerodynamic load does **not** contribute to lateral load transfer directly (it acts at the aerodynamic centre of pressure, and its vertical component is symmetric side-to-side in a non-rolled, non-yawed car), but it does raise the mean load at each axle, moving the tires to a less favourable point on their load-sensitivity curve.

2. Aerodynamic **balance** (front/rear split) changes the ratio of axle loads with speed, which changes the lateral force each axle must generate. This is a balance shift with speed, independent of TLLTD.

3. Aerodynamic side force in yaw, and the roll moment it generates, do contribute to load transfer at high yaw angles.

4. Because downforce compresses the suspension, ride height falls with speed, which changes roll centres and camber curves — a coupling that only exists on aero cars.

## 10. Engine torque reaction

Drive torque is reacted by the chassis, and for a longitudinally-mounted engine the reaction is about the longitudinal axis — producing a **roll moment** that transfers load diagonally.

$$
M_{\text{reaction}} = \frac{T_{\text{engine}}\times \text{gear ratio}\times\text{final drive}}{1}
$$

For a live axle, the axle housing tries to rotate against the drive torque, adding load to one rear wheel and removing it from the other. This is why drag cars and sprint cars are set up asymmetrically, and why torque reaction is a genuine handling parameter in high-torque, low-grip applications.

For a transverse engine, the reaction is about the vertical or lateral axis instead.

Magnitude check: 500 N·m of engine torque through a 3:1 first gear and a 3.5:1 final drive is 5250 N·m at the axle. Across a 1.5 m track that is 3500 N of diagonal transfer — comparable to the total lateral load transfer at 1 g. **Not a small effect.**

## 11. Asymmetric effects

For oval racing, deliberate asymmetry is standard:
- **Left-side weight bias** (typically 55–58%) to help the constantly-left-turning car.
- **Cross-weight (wedge)** adjustment to tune balance between corner entry and exit.
- **Stagger** — different rolling radii left and right, which makes the car naturally turn.
- **Asymmetric spring rates, ride heights, and camber.**

For road racing, asymmetry is usually unintentional and undesirable — the result of driver mass, fuel cell position, exhaust routing, or a bent chassis.

## 12. Summary example structure

The chapter's summary example works through, in order: measure CG position and height; separate sprung and unsprung; compute roll centres and roll moment arm; compute roll stiffnesses; compute the three load transfer contributions; assemble TLLTD; add longitudinal and aerodynamic effects; produce the four wheel loads for the condition of interest. This produces the inputs that pair analysis (Chapter 7) requires.

---

## Exercises

**18.1** A car weighs 3450 N front axle, 4150 N rear axle, wheelbase 2.72 m. Raised 12° nose-up, the front axle reads 2980 N. Wheel radius 0.32 m. Compute CG longitudinal position and height.

**18.2** A car has sprung weight 6900 N, unsprung 900 N (450 N per axle), $h_s = 0.315$ m, $h_u = 0.32$ m, front RC 40 mm, rear RC 70 mm, track 1.58 m both ends, wheelbase 2.70 m, 45% front sprung weight distribution, $K_{\phi f} = 44$ kN·m/rad, $K_{\phi r} = 38$ kN·m/rad. Compute the roll moment arm, all three load transfer contributions at each axle at 1.5 g, and the TLLTD.

**18.3** Verify that the front and rear load transfers from 18.2 sum to the correct total.

**18.4** A chassis has torsional stiffness 3200 N·m/deg. Total suspension roll stiffness is 82 kN·m/rad. Assess adequacy and estimate the fraction of intended TLLTD change that will actually be realized.

**18.5** A car races on a 24° banked oval of 190 m radius at 55 m/s. Compute the neutral speed, the normal load factor, and the required lateral force fraction, for $W = 8000$ N.

**18.6** A rear-drive car produces 420 N·m of engine torque in a gear ratio of 2.1 with 3.8 final drive, track 1.52 m. Compute the diagonal load transfer from torque reaction and compare with lateral load transfer at 1.0 g ($h = 0.30$ m).

**18.7** Explain why aerodynamic downforce increases grip but can worsen the effect of load transfer, using the load-sensitivity relation.

---

## Solutions

**18.1**
Total $W = 3450 + 4150 = 7600$ N.
$$
a = \frac{W_r L}{W} = \frac{4150 \times 2.72}{7600} = \frac{11288}{7600} = 1.485\ \text{m from the front axle}
$$
Front weight distribution: $3450/7600 = 45.4\%$.

CG height from the tilt:
$$
h_{CG} = \frac{(W_f' - W_f)L}{W\tan\theta} + r_{\text{wheel}}
$$
Nose-up tilt moves weight rearward, so $W_f' < W_f$; use magnitudes with the correct sign convention:
$$
h_{CG} - r = \frac{(3450-2980)\times 2.72}{7600 \times \tan 12°} = \frac{470 \times 2.72}{7600 \times 0.21256} = \frac{1278.4}{1615.5} = 0.7913\ \text{m}
$$

That gives $h_{CG} = 0.791 + 0.32 = 1.11$ m — **physically impossible** for a car. The result flags an error, and working back, the transferred weight of 470 N is far too large for a 12° tilt on a car with a sensible CG height.

Check what a realistic CG height would predict: for $h_{CG} = 0.32$ m (i.e. CG at wheel-centre height, so $h - r = 0$), zero weight would transfer. For $h_{CG} = 0.45$ m:
$$
\Delta W_f = \frac{(0.45-0.32)\times 7600 \times 0.21256}{2.72} = \frac{210.0}{2.72} = 77\ \text{N}
$$

So a realistic reading would be $W_f' \approx 3373$ N, not 2980 N. **The stated measurement is inconsistent** — and this is a deliberately instructive exercise, because it is exactly the failure mode described in section 3.3. The most likely causes, in order: the suspension was not locked (so the car settled onto its rear suspension during the tilt, moving mass genuinely rearward), the tilt angle was mismeasured, or the scales were not level and zeroed in the tilted condition.

**The practical lesson**: always sanity-check a CG height measurement against the physically plausible range (roughly 0.25–0.55 m for a race car, and always above the wheel centre height for a car with any mass above the axles) before using it in load transfer calculations.

**18.2**
**Sprung mass distribution**: $W_{sf} = 0.45 \times 6900 = 3105$ N, $W_{sr} = 3795$ N.
Sprung CG position: $0.55 \times 2.70 = 1.485$ m from front axle (since 45% front means CG is 55% of the way back).

**Roll axis height under the sprung CG**:
$$
h_{RA} = 0.040 + (0.070-0.040)\times\frac{1.485}{2.70} = 0.040 + 0.030 \times 0.550 = 0.0565\ \text{m}
$$
$$
H = h_s - h_{RA} = 0.315 - 0.0565 = 0.2585\ \text{m}
$$

**At $A_y = 1.5$ g:**

*Front axle:*
- Geometric: $\dfrac{W_{sf}A_yh_{RCf}}{t_f} = \dfrac{3105 \times 1.5 \times 0.040}{1.58} = \dfrac{186.3}{1.58} = 117.9$ N
- Elastic: $\dfrac{K_{\phi f}}{K_{\phi f}+K_{\phi r}}\cdot\dfrac{W_sA_yH}{t_f} = \dfrac{44}{82}\times\dfrac{6900\times1.5\times0.2585}{1.58} = 0.5366 \times \dfrac{2675.5}{1.58} = 0.5366 \times 1693.4 = 908.7$ N
- Unsprung: $\dfrac{W_{uf}A_yh_{uf}}{t_f} = \dfrac{450\times1.5\times0.32}{1.58} = \dfrac{216}{1.58} = 136.7$ N

**Front total: 1163.3 N**

*Rear axle:*
- Geometric: $\dfrac{3795 \times 1.5 \times 0.070}{1.58} = \dfrac{398.5}{1.58} = 252.2$ N
- Elastic: $\dfrac{38}{82}\times 1693.4 = 0.4634 \times 1693.4 = 784.7$ N
- Unsprung: $\dfrac{450\times1.5\times0.32}{1.58} = 136.7$ N

**Rear total: 1173.6 N**

$$
\text{TLLTD} = \frac{1163.3}{1163.3+1173.6} = \frac{1163.3}{2336.9} = 0.498 \quad (\textbf{49.8\% front})
$$

Note how the contributions differ in character. The elastic terms dominate (78% and 67% of each axle's total) and are the ones the bars control. The geometric terms are small here because the roll centres are low, but note that the rear's is more than double the front's — a rear-oversteer contribution from geometry alone, which the elastic split (53.7% front) is partly compensating.

**18.3**
Sum of computed transfers: $1163.3 + 1173.6 = 2336.9$ N.

Direct total from statics:
$$
\Delta F_{z,\text{total}} = \frac{W A_y h_{CG}}{t}
$$
Total CG height: $W h_{CG} = W_sh_s + W_uh_u = 6900(0.315) + 900(0.32) = 2173.5 + 288 = 2461.5$, so $h_{CG} = 2461.5/7800 = 0.3156$ m.
$$
\Delta F_{z,\text{total}} = \frac{7800 \times 1.5 \times 0.3156}{1.58} = \frac{3692.5}{1.58} = 2336.8\ \text{N}
$$

**Agreement to within 0.1 N** ✓ — the check works, and it is worth running every time, because it catches the most common errors (using total weight where sprung weight belongs, or forgetting a contribution entirely).

**18.4**
Chassis: 3200 N·m/deg $= 3200 \times 57.3 = 183{,}360$ N·m/rad $= 183.4$ kN·m/rad.
Suspension total: 82 kN·m/rad.

Ratio: $183.4/82 = 2.24$.

**Assessment.** Against the book's criterion, compare the chassis rate with the *difference* in axle roll rates: $|44 - 38| = 6$ kN·m/rad, against 183.4 kN·m/rad of chassis — a ratio of 30:1, which is comfortable. Against the commonly-used heuristic of 5–10× the *total* roll stiffness, the ratio is only 2.24× and the chassis looks marginal.

The two criteria disagree because they answer different questions. The book's asks whether the chassis can transmit the differential torque without significant twist. The heuristic asks whether the chassis meaningfully participates as a spring in series with the whole suspension — which it does, at this ratio. The honest answer is that this chassis will transmit the front/rear difference adequately but will still dilute setup changes measurably, and the estimate below quantifies that dilution.

**Estimating the realized TLLTD change**: model the chassis as a torsional spring between the two axles' roll stiffnesses. The differential roll stiffness that the bars are trying to create is diluted. A useful approximation treats the chassis stiffness as acting in series with the *difference* in axle roll stiffnesses:

$$
\text{effectiveness} \approx \frac{K_{\text{chassis}}}{K_{\text{chassis}} + K_{\phi f} + K_{\phi r}} \cdot \text{(order of magnitude)}
$$

More carefully — and this expression is a first-order heuristic of my own construction, not a result from the book — for two axles with stiffnesses $K_f$, $K_r$ connected by a chassis of stiffness $K_c$, the effective front/rear stiffness ratio is pulled toward unity. With $K_f = 44$, $K_r = 38$, $K_c = 183.4$ kN·m/rad:
$$
\frac{1}{1/(K_f - K_r)_\text{eff}} \sim \text{reduced by a factor} \approx \frac{K_c}{K_c + K_f + K_r} = \frac{183.4}{265.4} = 0.69
$$

So roughly **65–70% of the intended TLLTD change is realized**; a third is absorbed by chassis twist.

The practical symptom is exactly the complaint described in section 4: the engineer calculates that a bar change should move balance by 3 points, and the car behaves as though it moved 2. Over a season this destroys the correlation between the setup model and reality, and every subsequent decision is made on a corrupted map. **Fixing chassis stiffness is not a refinement; it is a prerequisite for the rest of the book to apply.** A proper treatment models the chassis explicitly as a torsional spring between the two axle roll stiffnesses and solves the three-element system; the fraction above is only an order-of-magnitude guide.

**18.5**
$$
V_{\text{neutral}} = \sqrt{gR\tan\theta_b} = \sqrt{9.81 \times 190 \times \tan 24°} = \sqrt{9.81 \times 190 \times 0.4452} = \sqrt{829.8} = 28.8\ \text{m/s}
$$
(104 km/h — well below the racing speed of 55 m/s, so the tires are working hard.)

Lateral acceleration in the earth frame: $V^2/(gR) = 3025/(9.81 \times 190) = 3025/1863.9 = 1.623$ g.

**Normal load:**
$$
F_z = W\cos\theta_b + W\frac{V^2}{gR}\sin\theta_b = 8000(0.9135) + 8000(1.623)(0.4067)
$$
$$
= 7308 + 5281 = 12{,}589\ \text{N}
$$
Load factor: $12589/8000 = 1.574$ — **the banking has increased the vertical load by 57%.**

**Required lateral force:**
$$
F_y = W\frac{V^2}{gR}\cos\theta_b - W\sin\theta_b = 8000(1.623)(0.9135) - 8000(0.4067)
$$
$$
= 11858 - 3254 = 8604\ \text{N}
$$

Required friction coefficient: $F_y/F_z = 8604/12589 = 0.683$.

**This is the essential result about banked ovals**: the car is cornering at 1.62 g in earth terms but demanding only $\mu = 0.68$ from its tires, because the banking supplies the rest. It is why superspeedway corners are taken flat and why the limiting factor there is aerodynamics and stability rather than mechanical grip — and also why the vertical loads (and therefore tire temperatures, structural loads, and driver g-loading) are so extreme.

**18.6**
Axle torque:
$$
T_{\text{axle}} = 420 \times 2.1 \times 3.8 = 3351.6\ \text{N·m}
$$
Diagonal load transfer across the rear track:
$$
\Delta F_z = \frac{T_{\text{axle}}}{t} = \frac{3351.6}{1.52} = 2205\ \text{N}
$$

Lateral load transfer at 1.0 g, assuming $W = 8000$ N for comparison:
$$
\Delta F_{z,\text{lat}} = \frac{8000 \times 1.0 \times 0.30}{1.52} = \frac{2400}{1.52} = 1579\ \text{N}
$$

**Torque reaction (2205 N) exceeds the entire lateral load transfer at 1.0 g (1579 N)** — by 40%.

Interpretation and caveats. For a **live axle**, the full axle torque reacts through the housing and this figure is essentially correct: at full throttle in a low gear, one rear tire is heavily loaded and the other heavily unloaded, which is why a live-axle car spins the inside rear wheel out of slow corners and why sprint cars and drag cars use large asymmetric setups.

For an **independent rear suspension with a chassis-mounted differential**, the reaction is taken by the differential mounts into the chassis, and reaches the wheels only through the suspension's roll stiffness — the effect is much smaller and appears as a body roll moment rather than a direct wheel load. This is one of the underappreciated advantages of IRS with an inboard diff.

For a **transverse engine**, the reaction axis is different again and produces pitch or yaw moments rather than roll.

The general point stands: in low gears at high torque, engine torque reaction is comparable to, or larger than, the load transfers everyone worries about — and it is routinely omitted from load transfer calculations.

**18.7**
Downforce raises the vertical load on every tire. Since lateral force rises with load, grip rises — this is the whole point of aerodynamics, and it is correct.

But recall the load-sensitivity relation from Chapter 2: with $F_y(F_z) = \mu_0F_z - cF_z^2$, the **effective friction coefficient falls with load**:
$$
\mu_{\text{eff}} = \frac{F_y}{F_z} = \mu_0 - cF_z
$$

Two consequences follow.

**First, diminishing returns.** Each additional newton of downforce buys less grip than the one before, because the tire is operating further down its $\mu(F_z)$ curve. Doubling the load on a tire does *not* double its lateral force. At high speed, where downforce may be 2–3× the car's weight, the tires are operating at loads where $\mu$ may be 15–25% below the low-load value. The aerodynamicist's "downforce" figure and the resulting grip are not proportional.

**Second — and this is the subtler point — the penalty for load transfer grows.** The axle capacity loss from load transfer is $2c\Delta^2$ (Chapter 2, Exercise 2.6). Downforce does not change $c$, but it does change the operating point, and crucially it *enables higher lateral acceleration*, which produces larger $\Delta$:
$$
\Delta = \frac{m A_y h}{t}
$$
Since $A_y$ can now reach 3 g instead of 1.5 g, $\Delta$ doubles, and the axle loss quadruples. In absolute terms an aero car throws away far more capability to load transfer than a non-aero car.

**The design responses** follow directly and explain much of modern race car practice:
- Get the CG as low as physically possible — the loss goes as $h^2$ through $\Delta^2$.
- Run the widest track the regulations allow — the loss goes as $1/t^2$.
- Manage the aero *distribution* between axles carefully, since aero load raises the mean operating load at each axle and thus the local $\mu$ available there.
- Accept that peak $\mu$ figures quoted at low load are optimistic for a downforce car, and use load-corrected tire data in every calculation.
