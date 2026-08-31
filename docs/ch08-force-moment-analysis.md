# Chapter 8 — Force-Moment Analysis (The MRA Moment Method)

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 8. Original explanatory material.*

---

## 1. The idea, and why it is the book's signature contribution

Every analysis so far has imposed a constraint: the car must be in equilibrium. Force balance *and* moment balance must both hold, so for each speed and steer angle there is exactly one trimmed state. That is fine for describing steady cornering, but it discards most of the information — because a car on a race track spends most of its time **out of yaw equilibrium**, deliberately.

The Moment Method removes the moment constraint. It asks:

> If I hold the car at a given sideslip angle $\beta$ and a given steer angle $\delta$, at a given speed, what lateral force $F_y$ (i.e. what lateral acceleration $A_y$) and what yaw moment $N$ does it produce?

The result is a two-dimensional map — plot $N$ (vertical axis) against $A_y$ (horizontal axis), with contours of constant $\beta$ and constant $\delta$ crossing to form a curvilinear grid. This is the **MMM diagram**, and it is the direct analogue of the aircraft **stability-and-control map** of pitching moment versus lift coefficient at various elevator angles. The senior author's aeronautical background is nowhere more visible.

## 2. The constrained test that produces it

Physically, the MMM diagram corresponds to a real experiment. Mount the car on a rig (or model it in software) so that:

- forward speed is held at $V$,
- the vehicle is yawed to a prescribed sideslip angle $\beta$ relative to its path,
- the steering is set to a prescribed $\delta$,
- the path curvature is prescribed (usually straight-line, $r = 0$, for the basic diagram),
- and the **restraint** measures the resultant $F_y$ and $N$.

This is "constrained testing" — the car is prevented from doing what it wants to do, and the reaction forces are recorded. The physical realization at Calspan was a large flat-bed tire test facility; today the same map is produced by simulation or by carefully processed track data.

Because the vehicle is forced rather than free, the map covers **states the free vehicle can never sustain**, including the ones a car passes through during a transient, and including the ones a driver deliberately creates during corner entry.

## 3. Reading the MMM diagram

Axes: $A_y$ (g) horizontal, $N$ (N·m, or normalized $C_N$) vertical.

**Grid lines:**
- Curves of **constant $\delta$** (steer angle sweeps of $\beta$)
- Curves of **constant $\beta$** (sideslip sweeps of $\delta$)

**Key features:**

| Feature | Meaning |
|---|---|
| $N = 0$ crossings | **Trim points** — the free vehicle's equilibrium states, i.e. everything Chapters 5 and 7 computed |
| Rightmost point of the envelope | **Maximum lateral acceleration** the car can produce in *any* attitude |
| Rightmost point *on the $N=0$ axis* | Maximum *trimmed* lateral acceleration — what the car can actually sustain in a steady corner |
| Top and bottom of the envelope | Maximum yaw moment available — the car's ability to *rotate*, i.e. its transient capability |
| Slope of constant-$\delta$ lines, $\partial N/\partial A_y|_\delta$ | **Stability**: negative slope = stable (understeer), positive = unstable (oversteer) |
| Spacing of constant-$\delta$ lines, $\partial N/\partial\delta|_{A_y}$ | **Control**: how much yaw moment the driver can command |

## 4. Stability and control read directly from the map

Define, following the aircraft convention:

$$
\text{Stability} = \left.\frac{\partial N}{\partial A_y}\right|_{\delta}, \qquad
\text{Control} = \left.\frac{\partial N}{\partial \delta}\right|_{A_y}
$$

The **understeer gradient is the ratio**:

$$
K \propto -\frac{\partial N/\partial A_y|_\delta}{\partial N/\partial\delta|_{A_y}}
$$

This is exactly the aircraft relation between static margin, $C_{m\alpha}$ and $C_{m\delta_e}$. Understeer is not a primitive quantity — it is the ratio of stability to control. Two cars can have identical understeer gradients with completely different stability and control levels, and they will feel utterly different to drive: one heavy and inert, one light and sharp.

**This decomposition is the practical payoff of the whole method.** A car that is "too understeering" might need more front grip (more control) or less rear stability, and the MMM diagram tells you which.

## 5. Limit behaviour

The great virtue of the MMM diagram is what happens at the edges, where every linear method has failed.

- The envelope **closes** — there is a boundary beyond which no $(\beta,\delta)$ combination can produce a given $(A_y, N)$. This boundary is the tire limit, expressed at vehicle level.
- **Terminal understeer** appears as constant-$\delta$ lines that bunch up at the right of the diagram: additional steer produces no additional $A_y$. The trim line $N=0$ terminates against the front-limited boundary.
- **Terminal oversteer** appears as the $N=0$ line crossing into a region where increasing $\beta$ produces increasing positive $N$ — a divergence. The maximum trimmed $A_y$ is then set by the spin boundary, not by the tires' ability to produce force.
- The gap between the **maximum $A_y$ anywhere** and the **maximum trimmed $A_y$** is a direct measure of how much performance the car's balance is throwing away.

## 6. Chassis tuning with the Moment Method

The chapter's examples (an N-$A_y$ race car study, and a $C_N$-$A_y$ sports car tuning study) demonstrate the workflow:

1. Generate the baseline MMM diagram.
2. Identify the deficiency: is the maximum trimmed $A_y$ below the maximum available $A_y$? Is control adequate at the limit? Is the car stable through the operating range or only near zero?
3. Make a configuration change (bar rate, ride height, wing angle, tire pressure, differential setting).
4. Regenerate and compare the *deltas* in stability, control, trimmed limit, and envelope shape.

Typical readings:

- **Adding front roll stiffness**: shifts the whole diagram, reducing max trimmed $A_y$ if the car was already front-limited, but increasing stability.
- **Adding rear wing**: increases the envelope on the negative-$N$ side and moves the maximum trimmed $A_y$ up, but reduces the available rotation moment — the car becomes stable and reluctant.
- **Reducing rear tire pressure**: raises rear axle capacity, moves stability positive (toward understeer), moves trimmed limit up.

## 7. Relation to lap time

The chapter closes with lap time analysis, which is where the method earns its place in a race programme. Combining the MMM envelope with the g-g diagram of Chapter 9 and a track model:

$$
t_{\text{lap}} = \int_0^{S}\frac{ds}{V(s)}
$$

where $V(s)$ is determined by the achievable $A_y$ at each point of the racing line, and the achievable $A_y$ is the **trimmed** value from the MMM diagram at the relevant speed and aerodynamic state.

The crucial insight for setup work: **lap time is not maximized by maximizing peak trimmed $A_y$ alone.** A configuration with slightly less peak but more yaw moment available at the limit lets the driver rotate the car on entry, use a shorter braking zone, and get on power earlier. The MMM diagram is the tool that makes this trade visible instead of anecdotal.

## 8. Practical notes and limitations

- The basic diagram assumes **zero path curvature** ($r = 0$), which corresponds to a car sliding sideways down a straight — physically odd but analytically clean. Constant-curvature variants exist and are more representative of mid-corner.
- It is a **quasi-steady** method: it contains no inertia, so it says nothing about how fast the car transitions between states. Chapter 6 handles that.
- Results are only as good as the tire data. Load, camber, slip angle, slip ratio, temperature and pressure all matter, and the sensitivity of the map to the tire model is high.
- Comparing configurations (deltas) is far more robust than trusting absolute numbers.

---

## Exercises

**8.1** Explain why the $N = 0$ line on an MMM diagram reproduces the results of Chapter 5's steady-state analysis, and what information the rest of the diagram adds.

**8.2** A car's MMM diagram shows constant-$\delta$ lines with slope $\partial N/\partial A_y = -2400$ N·m/g, and constant-$A_y$ spacing giving $\partial N/\partial\delta = 3200$ N·m/deg. Compute the understeer gradient.

**8.3** A car has maximum $A_y$ anywhere on the diagram of 1.62 g, but maximum trimmed $A_y$ of 1.44 g. Interpret and suggest two setup directions.

**8.4** Two configurations both show $K = 1.1$ deg/g. Configuration A: stability $-1800$ N·m/g, control 1636 N·m/deg. Configuration B: stability $-4200$ N·m/g, control 3818 N·m/deg. Describe how each would feel and which you would choose for a wet race.

**8.5** Sketch (describe) what happens to the MMM diagram when a car develops terminal oversteer, and state what limits maximum trimmed lateral acceleration in that case.

**8.6** A car produces $N = +900$ N·m at $A_y = 1.3$ g with the steering held at the trim value for 1.3 g. With $I_{zz} = 950$ kg·m², compute the yaw acceleration and interpret.

---

## Solutions

**8.1**
On the $N = 0$ line, both force and moment equilibrium hold simultaneously — which is precisely the definition of steady-state cornering used in Chapter 5 and evaluated numerically in Chapter 7. Each point on that line is a $(\delta, \beta, A_y)$ triple that the free vehicle can hold indefinitely, so tracing it recovers the $\delta$-versus-$A_y$ curve and hence $K(A_y)$.

What the rest of the diagram adds is **the vehicle's behaviour when it is not in equilibrium** — which is to say, everything that happens during corner entry, corner exit, a correction, a disturbance, or a deliberate rotation. The off-trim region tells you:
- how much yaw moment is available to *change* the car's attitude (the driver's rotational authority),
- how strongly the car resists departures from trim (stability, as the vertical distance from the trim line),
- and where the limits close in, so how much margin exists before a departure becomes unrecoverable.

A steady-state analysis can tell you the car is neutral. Only the full map can tell you that it is neutral *and* has almost no yaw moment available at the limit, which is the difference between a car that can be rotated into a hairpin and one that cannot.

**8.2**
$$
K \propto -\frac{\partial N/\partial A_y}{\partial N/\partial\delta} = -\frac{-2400\ \text{N·m/g}}{3200\ \text{N·m/deg}} = 0.75\ \text{deg/g}
$$

**$K = 0.75$ deg/g — mild understeer.** The negative stability slope confirms it: an increase in $A_y$ at fixed steer generates a restoring (negative) yaw moment that opposes further turning.

**8.3**
The car can generate 1.62 g in some attitude, but can only *sustain* 1.44 g in a balanced corner — an 11% shortfall. The 0.18 g gap is capability the balance is not letting the driver use: at the attitude that produces 1.62 g, the car is producing a net yaw moment and would either spin or straighten.

Two directions:
1. **If the trim line terminates against a front-limited boundary** (terminal understeer), add front capacity or remove rear: soften the front bar, raise front tire pressure toward its optimum, reduce front ride height for aero balance, increase front wing, reduce rear wing. The goal is to move the front-limited boundary right so the trim line can reach further.
2. **If the trim line terminates against a stability boundary** (the car goes unstable before the tires saturate), add rear stability: stiffen the front bar, add rear wing, move ballast rearward, add rear toe-in. Here the tires are not the constraint — the car's own yaw divergence is.

Distinguishing these two cases is exactly what the diagram is for, and it is why "the car is 0.18 g off its potential" is an actionable statement rather than a lament.

**8.4**
Both have $K = 1800/1636 = 1.1$ and $4200/3818 = 1.1$ deg/g. Identical steady-state handling on paper.

**Configuration A** (low stability, low control): the car responds languidly to steer input — a large steer angle produces modest yaw moment — but it also resists disturbances weakly. Steering feels low-gain and vague. Yaw natural frequency will be low. Forgiving in the sense that nothing happens quickly, but hard to place precisely and slow to correct once out of shape.

**Configuration B** (high stability, high control): sharp, high-gain steering, strong self-correction, high yaw natural frequency. The car goes exactly where it is pointed and returns to trim decisively. Demanding in that small steering errors produce visible yaw responses.

**For a wet race**: Configuration A, with an important caveat. In the wet the tires' peak is much lower and arrives at a lower slip angle, so the limit is reached with less warning; a low-gain car gives the driver more time and smaller consequences for an imprecise input. But Configuration A's weak stability means recovery from a slide is slow — and in the wet slides are frequent. The best wet compromise is usually **moderate control with high stability** — i.e. deliberately increasing $K$ rather than scaling both derivatives down. This is why wet setups conventionally soften the car, raise ride height, and add front bar or rear wing: they raise stability without proportionally raising control.

**8.5**
Terminal oversteer appears as follows. Following the $N=0$ trim line rightward (increasing $A_y$), the constant-$\delta$ lines that it crosses change from negative slope to **positive slope**. In that region, an increase in $A_y$ (or in $\beta$) at fixed steer produces a *positive* yaw moment that drives the car further into the turn — a divergence.

Physically, the rear axle characteristic has passed its peak while the front has not, so additional sideslip unloads the rear's ability to resist rotation.

**What limits maximum trimmed $A_y$ in this case**: not the tires' total force capability, but the **stability boundary**. The trim line terminates where $\partial N/\partial A_y|_\delta$ changes sign, because beyond that point the equilibrium exists mathematically but is unstable — the driver cannot hold it open-loop, and can hold it closed-loop only with continuous corrective steering and only up to the point where the required correction rate exceeds human bandwidth. The envelope may extend well to the right of where the usable trim line stops; that unused region is real force capability rendered inaccessible by balance.

**8.6**
$$
\dot r = \frac{N}{I_{zz}} = \frac{900}{950} = 0.947\ \text{rad/s}^2 = 54.3°/\text{s}^2
$$

Interpretation: at the steer angle that trims the car at 1.3 g, the car is producing a residual positive yaw moment, so it is not actually in equilibrium at the state described — it is rotating into the turn at nearly 1 rad/s². If left for 0.3 s the yaw rate would build by 0.28 rad/s, which at 40 m/s corresponds to a lateral acceleration change of $V\Delta r = 11.4$ m/s² — well over 1 g. The car would depart rapidly.

This is a useful reading of the diagram's vertical axis in general: **divide $N$ by $I_{zz}$ and you have the rate at which the car is leaving the state you are examining.** Points far from the $N=0$ line are transient states passed through quickly; points near it are states the car can dwell in. The vertical extent of the envelope, divided by $I_{zz}$, is the car's peak rotational authority — the number that determines how quickly a driver can rotate the car into a slow corner, and one of the most useful single figures the Moment Method produces.
