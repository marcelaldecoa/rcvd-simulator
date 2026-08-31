# Chapter 15 — Applied Aerodynamics

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 15. Original explanatory material.*

---

## 1. From fundamentals to devices

Chapter 3 gave the physics. This chapter is the longest in Part II and covers the hardware: spoilers, dams, wings, ground effects with and without skirts, drag, flow control devices, internal airflow, flat-plate aerodynamics, and — the section that matters most for handling — aerodynamics and balance.

## 2. Historical note on downforce

Downforce was not obvious. For decades, aerodynamic work on race cars aimed at *drag reduction*, and the streamlined shapes of the 1950s often produced net **lift**, making cars dangerously light at speed. The recognition that a car could be pressed onto the road, and that the resulting grip was worth far more than the drag it cost, arrived in the mid-1960s and changed the sport permanently.

The key economics: downforce increases lateral and braking capability directly (grip $\propto$ load), while drag costs speed only on straights. Since $A_y^{\max} \propto (W + qC_LA)$ but the cost of drag is a modest reduction in terminal velocity, the trade is usually strongly in downforce's favour — the exception being circuits with very high straight-to-corner ratios.

## 3. Spoilers and dams

**Spoilers** are the simplest devices: a vertical or near-vertical surface at the trailing edge of a body that separates the flow, raises pressure upstream of itself, and reduces rear lift. A rear deck spoiler on a sedan works by pressurizing the rear deck and shrinking the low-pressure separated region.

**Front air dams** block flow under the car, reducing underbody pressure and generating front downforce, while also reducing overall drag (less air goes under the car, where it does no useful work and creates interference drag). An air dam is one of the few devices that increases downforce and *reduces* drag simultaneously.

Both are crude, high-drag devices per unit downforce compared with wings, but they are cheap, robust, and often the only thing the regulations permit on a production-based car.

## 4. Wings

An inverted airfoil. Lift (downforce) per unit span:

$$
L' = \tfrac{1}{2}\rho V^2 c\, C_l
$$

and for a finite wing:

$$
C_L = \frac{C_{L\alpha,\infty}}{1 + \frac{C_{L\alpha,\infty}}{\pi AR e}}\,\alpha
$$

showing that **aspect ratio** $AR = b^2/S$ matters: low-aspect-ratio wings (which is what fits on a car) have shallower lift-curve slopes and higher induced drag.

**Induced drag:**

$$
C_{D_i} = \frac{C_L^2}{\pi AR\,e}
$$

This is the quadratic penalty for producing downforce, and it is why the drag cost of downforce grows faster than the downforce itself, and why endplates (which raise the effective aspect ratio by inhibiting tip flow) are on every race car wing.

**Multi-element wings** — a main plane with one or more slotted flaps — achieve far higher $C_L$ than a single element because each slot re-energizes the boundary layer on the downstream element, delaying separation. This is why an F1 rear wing has two or three elements and a very high total camber that a single element could never sustain without stalling.

**Gurney flaps** — a small vertical tab (typically 1–2% of chord) at the trailing edge, perpendicular to the flow. They create a pair of counter-rotating vortices behind the tab that effectively increase the trailing-edge camber, raising $C_L$ substantially for a modest drag increase. A famously high-return, low-cost device.

**Ground proximity**: a wing close to the ground (a front wing) experiences enhanced downforce, because the ground constrains the flow beneath and accelerates it. This is a favourable ground effect — but it makes the wing's performance strongly ride-height dependent, which is the source of much of the balance-variation problem discussed below.

**Legislated wings**: regulations define wing boxes, element counts, dimensions and positions. Design within those constraints is largely about maximizing $C_L$ per unit of permitted volume and controlling the wake.

## 5. Ground effects

The underbody is by far the most efficient downforce generator available, because it produces suction over a very large area with comparatively little drag.

**With skirts** (1977–1982 F1, and various other eras/series): sliding skirts seal the edges of the underbody, so the venturi under the car works as a closed duct. The flow accelerates through a throat and decelerates in a diffuser, producing enormous suction. The Lotus 78/79 and successors more than doubled cornering capability.

The fatal problem was **skirt failure**: if a skirt jammed or lifted over a kerb, the seal broke and downforce vanished instantaneously, at maximum speed. This safety issue drove the skirt ban and flat-bottom regulations.

**Without skirts**: the modern approach. The underbody still works, but edge leakage limits the achievable suction. Key devices:
- **Diffuser** — the upward-sloping rear section that decelerates the underbody flow and recovers pressure. Its expansion ratio and length set how much suction can be sustained at the throat. Too steep and it separates, losing everything.
- **Vortex generation at the floor edges** — strakes and edge geometry create longitudinal vortices whose low-pressure cores act as "aerodynamic skirts", sealing the floor edge without a physical seal.
- **Rake** — running the car nose-down expands the underbody volume toward the rear, effectively creating a longer, larger diffuser. Rake sensitivity is a defining characteristic of modern aero design.

**Ground effect is intensely ride-height sensitive.** Downforce typically rises as ride height falls, up to a point, then collapses abruptly when the diffuser stalls or the floor contacts. Operating just above that cliff is where the performance is, and staying above it is what the suspension and damping must guarantee (Chapter 22.6).

## 6. Drag

$$
D = \tfrac{1}{2}\rho V^2 C_DA
$$

Components:
- **Pressure (form) drag** — dominant for a bluff body; determined by separation and wake size.
- **Induced drag** — the penalty for downforce, $\propto C_L^2$.
- **Skin friction** — small for a car.
- **Interference drag** — from the interaction of components (wheels, wings, bodywork).
- **Internal (cooling) drag** — air taken on board for radiators and brakes and dumped, often 5–15% of total drag.
- **Wheel drag** — exposed wheels are enormous drag generators, often 40% or more of an open-wheel car's total drag. Rotating wheels behave differently from stationary ones, which is why rotating-wheel tunnel testing matters.

**Efficiency** $L/D = C_L/C_D$ is the design metric, not $C_L$ alone (Chapter 9, Exercise 9.6).

## 7. Flow control devices

- **Vortex generators** — small vanes that energize the boundary layer to delay separation.
- **Turning vanes and bargeboards** — direct flow around wheels and into the underbody.
- **Endplates and footplates** — control tip vortices and seal floor edges.
- **Louvres and slots** — bleed pressure to control local loading and manage wake.
- **Deflectors** — protect downstream devices from wheel wake.

## 8. Internal airflow

Cooling air is a genuine aerodynamic subsystem. The mass flow required is set by heat rejection:

$$
\dot Q = \dot m\, c_p \Delta T
$$

and the drag cost is essentially momentum loss — the air is brought toward rest in the duct and released with less momentum than it had. Careful duct design (a diffusing inlet, a well-matched core, and a nozzle exit that recovers some momentum) can reduce this cost substantially, and in the extreme the "Meredith effect" recovers thrust. Race practice: size the ducts for the hottest expected condition and no larger, and use adjustable inlets.

Brake cooling, engine air intake, and driver cooling are the same problem at smaller scale.

## 9. Aerodynamics and balance — the section that matters most

Total downforce sets grip; **aerodynamic balance sets handling**, and it is far harder to control.

$$
\%_{\text{front}}^{\text{aero}} = \frac{L_f}{L_f + L_r}
$$

The problem: aero balance is not a constant. It varies with

1. **Front ride height** — the front wing in ground effect is extremely height-sensitive.
2. **Rear ride height / rake** — sets diffuser performance.
3. **Pitch angle** — under braking the nose drops and the tail rises; both effects usually move balance forward, adding understeer exactly when the driver is turning in.
4. **Roll** — changes both wings' effective incidence and asymmetrically loads the floor.
5. **Yaw** — a yawed car loses floor and diffuser performance and the balance shifts, typically rearward-then-sharply-forward. Yaw sensitivity is what makes a car "nervous" at high speed.
6. **Speed** — through Reynolds effects and through the ride-height change that downforce itself causes.
7. **Following another car** — the wake reduces front downforce disproportionately, producing severe understeer. This is the "dirty air" problem, and it is a regulatory preoccupation because it inhibits overtaking.

**The engineering objective is not maximum downforce; it is maximum downforce subject to acceptable balance stability across the operating envelope.** A car with 5% more downforce and a balance that swings 4% front-to-rear through a corner will be slower than a car with less downforce and a stable platform, because the driver must drive to the worst case.

This is why:
- Aero maps are generated as functions of (front ride height, rear ride height, roll, yaw), not as single numbers.
- Suspension stiffness and damping on downforce cars are chosen primarily to control the aero platform (Chapter 22.6), with mechanical grip a secondary consideration.
- Heave springs and third elements exist — they allow high heave stiffness (for platform control) with lower roll stiffness (for mechanical grip and balance).

## 10. Flat plate aerodynamics

A useful reference case. A flat plate at incidence $\alpha$ in inviscid theory gives $C_L = 2\pi\sin\alpha \approx 2\pi\alpha$; in practice, a thin plate stalls early and produces roughly $C_L \approx 2\pi\alpha$ only for very small $\alpha$. For a bluff plate normal to the flow, $C_D \approx 1.1$–1.2.

Flat-plate estimates are useful for first-order sizing of dams, splitters and simple spoilers, and for sanity-checking CFD.

---

## Exercises

**15.1** A rear wing has span 1.4 m, chord 0.30 m, and operates at $C_L = 2.4$, $C_D = 0.55$ at 60 m/s. Compute downforce, drag, and $L/D$.

**15.2** For the same wing, compute the aspect ratio and the induced drag coefficient assuming $e = 0.85$. What fraction of total drag is induced?

**15.3** A car has $C_LA = 3.6$ m² with 42% front balance. Under braking the pitch change moves the balance to 47% front. Compute the change in front and rear downforce at 70 m/s and comment on the handling consequence.

**15.4** A ground-effect floor generates an average $C_p$ of $-1.4$ over a plan area of 3.2 m². Compute downforce at 55 m/s and compare with a wing of the same downforce at $C_L = 2.5$: what wing area would be needed, and what does this say about efficiency?

**15.5** A team can add 12% downforce for 9% drag (Package X) or 6% downforce for 2% drag (Package Y). Baseline $C_LA = 3.0$, $C_DA = 1.10$. Compute the resulting $L/D$ for each and the change from baseline.

**15.6** Explain why running more rake generally increases downforce but also increases the risk of a sudden aero balance loss.

**15.7** A cooling duct passes 1.8 kg/s of air at 60 m/s freestream, and the air leaves the exit at 25 m/s. Estimate the cooling drag.

---

## Solutions

**15.1**
Wing area $S = 1.4 \times 0.30 = 0.42$ m².
$q = \frac{1}{2}(1.225)(3600) = 2205$ Pa.
$$
L = qSC_L = 2205 \times 0.42 \times 2.4 = 2223\ \text{N}
$$
$$
D = qSC_D = 2205 \times 0.42 \times 0.55 = 509\ \text{N}
$$
$$
L/D = 2.4/0.55 = 4.36
$$

An $L/D$ of 4.4 is respectable for a race car wing (which operates at very high $C_L$ and low aspect ratio). Compare an aircraft wing at $L/D$ 20+, which operates at $C_L \approx 0.5$ and $AR \approx 8$.

**15.2**
$$
AR = \frac{b^2}{S} = \frac{1.4^2}{0.42} = \frac{1.96}{0.42} = 4.67
$$
$$
C_{D_i} = \frac{C_L^2}{\pi AR\,e} = \frac{2.4^2}{\pi(4.67)(0.85)} = \frac{5.76}{12.47} = 0.462
$$

Fraction of total drag: $0.462/0.55 = 84\%$.

**Induced drag is 84% of the wing's total drag.** This is the dominant reality of race car wing design and it has three consequences:
1. Endplates and footplates are not decoration — anything that raises effective aspect ratio pays enormously.
2. Profile drag optimization (smoothing the section, reducing skin friction) is nearly pointless in comparison.
3. Because $C_{D_i} \propto C_L^2$, the marginal drag cost of the *last* increment of downforce is very high. Adding downforce to an already highly-loaded wing is expensive; getting it from the floor (where induced drag is much lower relative to the downforce, because the "wing" is effectively enormous in span) is cheap. **This is the fundamental reason underbody downforce is preferred over wing downforce wherever regulations allow it.**

**15.3**
$q = \frac{1}{2}(1.225)(4900) = 3001$ Pa.
Total downforce: $3001 \times 3.6 = 10{,}804$ N.

At 42% front: $L_f = 4538$ N, $L_r = 6266$ N.
At 47% front: $L_f = 5078$ N, $L_r = 5726$ N.

Change: front **+540 N**, rear **−540 N**.

**Handling consequence**: this occurs under braking, at the moment the driver is turning into a corner. It looks superficially helpful — more front downforce means more front grip and better turn-in. But the rear has simultaneously lost 540 N of downforce *at the same time* that longitudinal load transfer is already unloading the rear axle mechanically. The two effects compound, and the result is corner-entry oversteer.

Worse, the effect is transient and speed-dependent: it appears strongly in high-speed braking zones and weakly in slow ones, so a brake bias or damping setting that fixes it in one corner will be wrong in another. The proper fix is aerodynamic: reduce the pitch sensitivity of the aero map, typically by reducing the front wing's ground-effect dependence (raising it, or changing the section) or by controlling pitch mechanically with stiffer front springs, anti-dive geometry, or brake-phase damping.

The general point: **a 5-point balance swing is a very large handling change.** For comparison, a 5-point TLLTD change (Chapter 12) is a substantial mechanical balance adjustment. Getting 5 points for free, in the wrong direction, mid-corner-entry, is a serious problem.

**15.4**
$q = \frac{1}{2}(1.225)(3025) = 1853$ Pa.

Floor downforce:
$$
F = -q\,\overline{C_p}\,A = 1853 \times 1.4 \times 3.2 = 8301\ \text{N}
$$

Equivalent wing at $C_L = 2.5$:
$$
S = \frac{F}{qC_L} = \frac{8301}{1853 \times 2.5} = \frac{8301}{4633} = 1.79\ \text{m}^2
$$

**Interpretation**: 3.2 m² of floor at a modest $C_p$ of $-1.4$ does the work of a 1.79 m² wing at a high $C_L$ of 2.5. A 1.79 m² wing on a race car is enormous — roughly 2.5 m span by 0.7 m chord — and would carry an induced drag penalty scaling with $C_L^2$ at low aspect ratio.

The floor, by contrast, is essentially a very high-aspect-ratio, very lightly loaded surface, so its induced drag per unit downforce is far lower. Typical efficiencies: a floor/diffuser system might achieve $L/D$ of 10–20 in isolation; a rear wing achieves 3–5.

**This is the whole argument for ground effect**, and it explains why every regulatory attempt to reduce cornering speeds has focused on the underbody, and why every design team's response has been to find whatever underbody geometry remains legal.

**15.5**
Baseline: $L/D = 3.0/1.10 = 2.727$.

Package X: $C_LA = 3.36$, $C_DA = 1.199$. $L/D = 3.36/1.199 = 2.802$ (+2.8%).
Package Y: $C_LA = 3.18$, $C_DA = 1.122$. $L/D = 3.18/1.122 = 2.834$ (+3.9%).

**Y is the more efficient package**, improving $L/D$ by 3.9% versus X's 2.8%.

But efficiency is not the whole answer — the *marginal* efficiency of each increment is what matters for the decision:
- X's increment: $\Delta C_LA/\Delta C_DA = 0.36/0.099 = 3.64$
- Y's increment: $0.18/0.022 = 8.18$

Y's added downforce comes at more than twice the marginal efficiency. On a circuit where downforce is worth 0.10 s/% and drag costs 0.05 s/%:
- X: $12(0.10) - 9(0.05) = 1.20 - 0.45 = 0.75$ s
- Y: $6(0.10) - 2(0.05) = 0.60 - 0.10 = 0.50$ s

**X wins on lap time at this circuit despite being less efficient**, because it simply produces more. The right decision therefore depends on the circuit, and the ideal is to develop Y further — since its marginal efficiency is high, scaling it up is cheap, whereas scaling X up runs quickly into the $C_L^2$ induced drag wall.

**15.6**
**Why rake increases downforce**: running nose-down tilts the floor so the underbody forms a larger-volume, longer-effective diffuser. The flow entering at the front is squeezed through a lower throat (accelerating it, dropping the pressure) and then expands through a greater area ratio toward the rear. Both the peak suction and the pressure-recovery capacity improve, so total floor downforce rises. Rake also loads the front of the floor more, which is often useful for balance.

**Why it increases the risk of sudden loss**: three mechanisms compound.

1. **The diffuser is closer to stall.** A greater expansion ratio means a more severe adverse pressure gradient in the diffuser. Boundary layers can tolerate only so much; beyond a critical expansion the flow separates and the pressure recovery — and with it the entire underbody suction — collapses. Rake pushes the design toward that boundary deliberately.

2. **Front ride height is very low.** The high-suction region at the front of the floor is operating close to the ground, where $C_p$ is steepest with height. A small further reduction (a bump, a dip, a braking pitch, extra downforce at speed) produces a large change in loading, and eventually the floor contacts or the flow chokes, at which point front downforce drops sharply.

3. **The loss is not gradual and it is balance-asymmetric.** Because the front of the floor is the part running closest to the ground, it stalls first. A front-biased downforce loss is instantaneous, severe understeer at high speed — the worst possible failure mode.

**Consequence for setup**: high-rake cars require very tight platform control — stiff heave stiffness, carefully tuned damping, and often bump rubbers or packers to guarantee that ride height never crosses the cliff. The performance sits on the near side of a discontinuity, and the suspension's job is to guarantee the car stays there. That is why Chapter 22.6 treats aero-critical damping as a separate discipline.

**15.7**
Cooling (or "ram") drag is the momentum loss of the captured air:
$$
D_{\text{cool}} = \dot m (V_\infty - V_{\text{exit}}) = 1.8 \times (60 - 25) = 1.8 \times 35 = 63\ \text{N}
$$

For context, a formula car at 60 m/s with $C_DA = 1.1$ m² has total drag $= 2205 \times 1.1 = 2426$ N. So cooling drag is **2.6% of total drag** — small but far from negligible, and it is one of the few drag components that can be reduced without any downforce penalty.

Two engineering notes. First, this is a lower bound: it ignores duct losses, the drag of the inlet lip, and the interference of the exit flow with the external flow. Real cooling drag is typically 1.5–2× the simple momentum estimate. Second, the exit velocity is the lever: if careful nozzle design raised the exit velocity from 25 to 40 m/s at the same mass flow, drag would fall to $1.8 \times 20 = 36$ N, a 43% reduction. In the limit where the exit velocity exceeds the freestream (achievable when the heat added to the air raises its energy sufficiently), the term goes negative and the duct produces net thrust — the Meredith effect, exploited on the P-51 Mustang and, in a limited way, on some race cars.

The practical rule: **size the inlet for the hottest condition and no larger, and design the exit as a nozzle rather than a hole.**
