# Chapter 3 — Aerodynamic Fundamentals

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 3. Original explanatory material.*

---

## 1. Why fundamentals before applications

Chapter 15 deals with wings, diffusers, dams and ground effect. This chapter builds the machinery: properties of air, Bernoulli's equation and — as important — the conditions under which it fails, pressure coefficients, real (viscous) flow, boundary layers and separation, testing methods, and the SAE aerodynamic axis system.

The reason for the care is that aerodynamics is the one area of race car engineering where **plausible reasoning from an incomplete model reliably produces wrong answers.** Bernoulli explains why a wing works and simultaneously "proves" that drag cannot exist. Getting the domain of validity right is the whole game.

## 2. Properties of air

Standard sea-level air: $\rho = 1.225$ kg/m³, $p = 101{,}325$ Pa, $T = 288.15$ K, dynamic viscosity $\mu_{air} = 1.789\times10^{-5}$ Pa·s.

Density from the ideal gas law:

$$
\rho = \frac{p}{RT}, \qquad R = 287.05\ \text{J/(kg·K)}
$$

**This matters practically.** A race at 1500 m altitude and 35 °C sees:

$$
\rho = \frac{85{,}000}{287.05 \times 308} = 0.962\ \text{kg/m}^3
$$

a 21% reduction. Downforce and drag both fall 21%; engine power falls comparably. Setup, gearing and cooling all change. Aerodynamic performance is always quoted at a reference density and must be corrected.

Compressibility: at $M < 0.3$ (roughly $V < 100$ m/s = 360 km/h) density change is under 5% and incompressible treatment is adequate for most racing. Top-speed record cars and F1 diffuser flows locally exceed this.

## 3. Bernoulli's equation

Along a streamline, for steady, inviscid, incompressible flow with no body forces:

$$
p + \tfrac{1}{2}\rho V^2 = p_0 = \text{constant}
$$

$p$ is **static pressure**, $\frac{1}{2}\rho V^2 \equiv q$ is **dynamic pressure**, $p_0$ is **total (stagnation) pressure**. Where the flow is brought to rest — the stagnation point on the nose — $p = p_0$.

At 200 km/h (55.6 m/s), $q = \frac{1}{2}(1.225)(55.6)^2 = 1893$ Pa. Note this is only 1.9% of atmospheric pressure. **Aerodynamic forces are small pressure differences acting over large areas** — which is why a few percent error in a pressure measurement is a large error in a force.

## 4. What Bernoulli does and does not say

The Millikens devote a whole section to this because misapplication is endemic. The assumptions:

1. **Steady** — no time variation. Fails in wakes, vortex shedding, and behind another car.
2. **Inviscid** — no shear. Fails inside boundary layers and everywhere downstream of separation.
3. **Incompressible** — fine below $M \approx 0.3$.
4. **Along a streamline** — the constant $p_0$ is only common across streamlines if the flow is irrotational, which is untrue in a wake or behind a rotating wheel.
5. **No energy addition** — fails across a fan, radiator, or propeller disc.

The famous consequence of assumption 2 is **d'Alembert's paradox**: an inviscid, irrotational flow around a closed body produces exactly zero drag. Since cars manifestly experience drag, viscosity and separation are not corrections — they are the mechanism.

Similarly, the "equal transit time" explanation of lift is simply false; particles over the upper surface of a wing arrive *sooner*, not simultaneously. Lift arises because the airfoil turns the flow, and the circulation required to satisfy the Kutta condition at a sharp trailing edge accelerates the upper-surface flow. Kutta–Joukowski:

$$
L' = \rho V_\infty \Gamma
$$

per unit span, with $\Gamma$ the circulation.

## 5. Pressure coefficient

Nondimensionalize the local static pressure:

$$
C_p = \frac{p - p_\infty}{\frac{1}{2}\rho V_\infty^2}
$$

For incompressible potential flow, combining with Bernoulli:

$$
C_p = 1 - \left(\frac{V}{V_\infty}\right)^2
$$

Key values:
- $C_p = 1$ at a stagnation point (maximum possible in incompressible flow).
- $C_p = 0$ where local velocity equals freestream.
- $C_p < 0$ where flow has accelerated — **suction**. Beneath a race car floor, $C_p$ of $-1.5$ to $-3$ is achievable.

Downforce from a floor is simply the integral of suction over the plan area:

$$
F_{\text{down}} = -q \int_A C_p \, dA = -q\, A\, \overline{C_p}
$$

$C_p$ is the natural language of aerodynamic development because it is speed-independent — a pressure map measured at 40 m/s in a tunnel applies at 80 m/s on track (Reynolds effects aside).

## 6. Real flows: boundary layers, separation, Reynolds number

Viscosity forces the flow to satisfy no-slip at the surface, creating a **boundary layer** in which velocity rises from zero to freestream over a thickness $\delta$.

**Reynolds number** compares inertial to viscous forces:

$$
Re = \frac{\rho V L}{\mu_{air}} = \frac{VL}{\nu}, \qquad \nu \approx 1.46\times10^{-5}\ \text{m}^2/\text{s}
$$

For a 4.5 m car at 55 m/s: $Re = 55 \times 4.5 / 1.46\times10^{-5} = 1.7\times10^7$. Fully turbulent.

- **Laminar** boundary layer: low skin friction, poor resistance to adverse pressure gradient.
- **Turbulent**: higher skin friction, but much better at staying attached because turbulent mixing re-energizes the near-wall flow.

Approximate turbulent flat-plate thickness: $\delta/x \approx 0.37\,Re_x^{-1/5}$.

**Separation** occurs when the boundary layer meets an adverse pressure gradient ($dp/dx > 0$) it cannot overcome; the near-wall flow reverses and the flow detaches. Consequences: loss of suction (downforce collapse), a large low-pressure wake (pressure drag), and unsteadiness.

This is why race car aerodynamics is largely the art of **managing pressure recovery**: a diffuser must expand gradually enough to recover pressure without separating; a wing must not exceed its stall angle; vortex generators and gurney flaps exist to delay or exploit separation.

**Reynolds scaling problem in testing**: a 40% scale model at the same speed has 40% the Reynolds number. Either increase tunnel speed by 2.5×, pressurize the tunnel, or accept a Reynolds mismatch and trip the boundary layer artificially. Every wind tunnel programme is a negotiation with this constraint.

## 7. Aerodynamic testing

- **Wind tunnel** — closed or open jet, ideally with a **moving ground plane** (rolling road) and rotating wheels. Without a moving ground, a boundary layer grows on the tunnel floor and the ground-effect physics is simply wrong; this invalidated a great deal of pre-1980s data. Blockage and interference corrections are required.
- **CFD** — RANS for attached flow at low cost, DES/LES where separation and unsteadiness dominate. Validation against tunnel and track data is mandatory; CFD is an interpolation tool, not an oracle.
- **Track testing** — pitot-static rakes, surface pressure taps, tufts and flow-vis paint, ride-height and load-cell measurement to infer downforce from suspension deflection. The only method that sees the real environment (yaw, roughness, other cars) and the least controlled.
- **Coastdown testing** — gives total $C_D A$ plus rolling resistance from the deceleration curve:
  $$
  m\frac{dV}{dt} = -\tfrac{1}{2}\rho V^2 C_D A - f_r m g
  $$
  Fitting the quadratic separates aero from rolling terms.

## 8. SAE aerodynamic axis system and coefficients

Vehicle-fixed, origin at the ground plane below the CG (or at mid-wheelbase, ground level — **state it**). $X$ forward, $Y$ right, $Z$ down.

Forces and moments nondimensionalized by $qA$ and $qAL$:

$$
C_D = \frac{D}{qA}, \quad C_L = \frac{L}{qA}, \quad C_S = \frac{S}{qA}
$$
$$
C_{PM} = \frac{M_{pitch}}{qAL}, \quad C_{YM} = \frac{M_{yaw}}{qAL}, \quad C_{RM} = \frac{M_{roll}}{qAL}
$$

**Sign warning:** in aeronautical convention positive $C_L$ is *up*. Race car practice frequently reports downforce as positive $C_L$ (or as $-C_L$, or as $C_{Lf}$/$C_{Lr}$ split by axle). Always state whether your $C_L$ is lift-positive or downforce-positive.

$A$ is normally frontal area; for open-wheel cars some teams use a fixed reference area to keep coefficients comparable. Since only the product $C_L A$ has physical meaning for force, quoting $C_L A$ and $C_D A$ (units m²) is safer than quoting coefficients alone.

**Aerodynamic efficiency** $= L/D = C_L/C_D$. Race cars run $L/D$ of roughly 2–4 (F1 with high-downforce packages ~3); aircraft run 15–25. Race cars are inefficient by aircraft standards because they are optimizing for downforce at the expense of everything, in ground effect, on a bluff body with exposed wheels.

**Aerodynamic balance** — the fraction of total downforce on the front axle:

$$
\%_{\text{front}} = \frac{L_f}{L_f + L_r}
$$

This is the aerodynamic analogue of weight distribution, and because it shifts with ride height, pitch, roll and yaw, keeping it stable is arguably the central problem of modern race car aerodynamics (Chapter 15.12).

---

## Exercises

**3.1** Compute dynamic pressure at 100, 200 and 300 km/h at sea level, and the downforce produced by $C_L A = 3.5$ m² at each.

**3.2** A race is held at 2200 m altitude ($p = 77{,}500$ Pa) and 30 °C. Compute the air density and the percentage change in downforce relative to standard conditions. What does this do to the speed at which downforce equals car weight?

**3.3** A pressure tap on the underfloor reads $-2400$ Pa (gauge) at 45 m/s. Find $C_p$ and the local flow velocity implied by potential-flow theory. Comment on the validity of that inference.

**3.4** A 50% scale model is tested in a tunnel. What tunnel speed is required to match the Reynolds number of the full-scale car at 60 m/s? If the tunnel maximum is 70 m/s, what Reynolds number ratio is achieved and what are the consequences?

**3.5** A car with $C_D A = 1.2$ m² and $C_L A = 3.0$ m² has mass 750 kg and $\mu = 1.5$. Compute maximum cornering speed on a 200 m radius corner, iterating for the aerodynamic contribution.

**3.6** In a coastdown from 60 m/s, a 900 kg car decelerates at 6.2 m/s² initially and at 0.35 m/s² at 5 m/s. Extract $C_D A$ and the rolling resistance coefficient.

---

## Solutions

**3.1**
$q = \frac{1}{2}\rho V^2$, $\rho = 1.225$.

| $V$ (km/h) | $V$ (m/s) | $q$ (Pa) | $F_z = qC_LA$ (N) |
|---|---|---|---|
| 100 | 27.78 | 472.6 | 1654 |
| 200 | 55.56 | 1890 | 6616 |
| 300 | 83.33 | 4253 | 14,886 |

Note the exact quadrupling from 100→200 and the ninefold increase from 100→300. The design consequence is severe: a suspension that must accommodate 1.6 kN of downforce in slow corners and 15 kN on a straight faces an enormous ride-height control problem, which is why downforce cars run very stiff springs (Chapters 16, 22.6).

**3.2**
$$
\rho = \frac{77500}{287.05 \times 303.15} = \frac{77500}{87020} = 0.891\ \text{kg/m}^3
$$
Change: $0.891/1.225 - 1 = -27.3\%$. Downforce and drag both drop 27.3%.

The weight-equals-downforce speed scales as $\rho^{-1/2}$:
$$
V_{\text{new}} = V_{\text{std}}\sqrt{1.225/0.891} = 1.173\,V_{\text{std}}
$$
a **17.3% higher speed** required to reach the same downforce. High-altitude circuits (Mexico City, Interlagos to a lesser degree) therefore run maximum-downforce wing packages and still have less grip — while also being fast in a straight line because drag falls equally. This is a genuine setup dilemma, not a free lunch.

**3.3**
$q = \frac{1}{2}(1.225)(45)^2 = 1240$ Pa.
$$
C_p = \frac{-2400}{1240} = -1.94
$$
From $C_p = 1 - (V/V_\infty)^2$:
$$
V/V_\infty = \sqrt{1 - C_p} = \sqrt{2.94} = 1.71 \Rightarrow V = 77\ \text{m/s}
$$
**Validity caveat**: this inference assumes inviscid, incompressible, steady flow along a streamline connected to the freestream. Under a race car floor, near a diffuser throat, with vortices from the front wing and boundary layers from the ground plane, that chain is fragile. The $C_p$ value itself is a valid measurement; the velocity is a model-dependent inference and should be corroborated (e.g. by PIV or CFD) before being trusted.

**3.4**
Matching $Re$ requires $V_m L_m = V_f L_f$, so $V_m = 60 \times (1/0.5) = 120$ m/s.

At 70 m/s: $Re_m/Re_f = (70 \times 0.5)/(60 \times 1) = 0.583$ — only 58% of full-scale Reynolds number.

Consequences: the boundary layer is relatively thicker, transition occurs further aft, and **separation is predicted earlier than reality**. Measured $C_L$ tends to be pessimistic and $C_D$ optimistic for attached-flow devices; devices near their stall margin behave misleadingly. Mitigations: boundary-layer trip strips at scaled transition locations, pressurized or cryogenic tunnels, and — most practically — using the tunnel for *deltas* between configurations rather than absolute values, then anchoring the absolute level with track data.

**3.5**
Cornering condition: $\dfrac{mV^2}{R} = \mu\left(mg + \tfrac{1}{2}\rho V^2 C_L A\right)$.

Rearranged:
$$
V^2\left(\frac{m}{R} - \frac{\mu\rho C_L A}{2}\right) = \mu m g
$$
$$
\frac{m}{R} = \frac{750}{200} = 3.75, \qquad \frac{\mu\rho C_LA}{2} = \frac{1.5 \times 1.225 \times 3.0}{2} = 2.756
$$
$$
V^2 = \frac{1.5 \times 750 \times 9.81}{3.75 - 2.756} = \frac{11036}{0.994} = 11{,}103 \Rightarrow V = 105.4\ \text{m/s} = 379\ \text{km/h}
$$

Two lessons. First, without downforce the answer would be $V = \sqrt{\mu g R} = 54.2$ m/s — downforce has **doubled** the corner speed. Second, note how nearly the denominator vanished: had $C_L A$ been 3.3 m², the denominator would go negative, meaning the equation has no finite solution — the car would be limited by something else entirely (power, tire thermal limits, structural limits, driver neck loads). This near-singularity is the mathematical signature of the ground-effect era, when cars became limited by physiology rather than grip and the regulations intervened.

**3.6**
At low speed aerodynamic drag is negligible:
$$
f_r g = 0.35 \Rightarrow f_r = 0.0357
$$
At 60 m/s:
$$
m\,a = \tfrac{1}{2}\rho V^2 C_D A + f_r m g
$$
$$
900 \times 6.2 = 5580\ \text{N total}
$$
$$
f_r m g = 0.0357 \times 900 \times 9.81 = 315\ \text{N}
$$
$$
\tfrac{1}{2}(1.225)(3600) C_DA = 5265 \Rightarrow 2205\,C_DA = 5265 \Rightarrow C_D A = 2.39\ \text{m}^2
$$

Cautions on this method: it lumps driveline drag into $f_r$, ignores the fact that rolling resistance itself rises with downforce (so $f_r$ is not truly constant on a downforce car), and is sensitive to wind and gradient. Best practice is bidirectional runs on a flat, still-air site, and fitting the full $V(t)$ curve rather than two points.
