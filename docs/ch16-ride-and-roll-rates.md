# Chapter 16 — Ride and Roll Rates

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 16. Original explanatory material.*

---

## 1. What this chapter computes

Given spring rates, geometry and masses, this chapter produces the numbers that everything else depends on: **wheel rates, ride rates, ride frequencies, roll rates, roll gradient, and the elastic distribution of lateral load transfer.** It is arithmetic-heavy and conceptually straightforward, but the definitions must be exact or the results are meaningless.

## 2. Definitions, carefully

**Spring rate** $K_s$ — force per unit deflection *of the spring itself*, measured along the spring axis. Units N/mm.

**Wheel rate** $K_w$ — force per unit deflection *at the wheel centre*, with the tire treated as rigid. This is the spring rate transformed through the installation geometry.

**Ride rate** $K_R$ — force per unit deflection *at the contact patch*, i.e. the wheel rate in series with the tire's vertical rate:

$$
K_R = \frac{K_w K_T}{K_w + K_T}
$$

**Tire rate** $K_T$ — vertical stiffness of the tire, typically 200–500 N/mm for a race tire, strongly dependent on pressure and construction.

**Roll rate** $K_\phi$ — roll moment per unit roll angle, N·m/rad or N·m/deg, at an axle or for the whole vehicle.

## 3. Installation ratio (motion ratio)

The geometry between the wheel and the spring is characterized by the **installation ratio**:

$$
IR = \frac{\text{spring displacement}}{\text{wheel displacement}} = \frac{ds}{dz}
$$

**Warning on convention**: many sources define motion ratio the other way up (wheel/spring), and both appear in the literature. Since the two differ by an inversion and the rate transformation is a *square*, using the wrong one gives an error of $IR^4$. **Always verify by a physical check**: if the spring moves less than the wheel, $IR < 1$ under this definition, and the wheel rate is *less* than the spring rate.

**The rate transformation** follows from energy conservation. Equating work done at the wheel and at the spring:

$$
\tfrac{1}{2}K_w z^2 = \tfrac{1}{2}K_s s^2 = \tfrac{1}{2}K_s (IR\cdot z)^2
$$
$$
\boxed{K_w = K_s \cdot IR^2}
$$

The **square** is the point. A 10% error in installation ratio is a 21% error in wheel rate.

**Force transformation** (linear, not squared):

$$
F_{\text{spring}} = \frac{F_{\text{wheel}}}{IR}
$$

**Angularity correction**: if the spring axis is inclined at angle $\theta$ to the direction of the pushrod or link motion, an additional $\cos\theta$ factor enters. The full expression for a pushrod/rocker system requires the kinematic ratio at each stage.

**Non-linearity**: $IR$ is generally a function of wheel travel — rising-rate and falling-rate suspensions are designed by shaping $IR(z)$. The effective rate is then:

$$
K_w(z) = K_s\left(IR(z)\right)^2 + F_s\frac{d(IR)}{dz}
$$

The second term is often neglected but is not always negligible under high preload.

## 4. Ride frequency

$$
f = \frac{1}{2\pi}\sqrt{\frac{K_R}{m_s}}
$$

where $m_s$ is the **sprung mass at that corner** and $K_R$ the ride rate (wheel rate in series with tire rate).

**Common error**: using the wheel rate instead of the ride rate, or using the total corner mass instead of the sprung mass. Both inflate the answer.

Typical targets:

| Vehicle | Ride frequency |
|---|---|
| Passenger car | 1.0–1.5 Hz |
| Sports car | 1.5–2.0 Hz |
| GT / touring race car | 2.0–3.0 Hz |
| Formula car, moderate aero | 3.0–4.5 Hz |
| High-downforce car | 4.5–7+ Hz |

The **flat ride** criterion (Olley) sets rear frequency roughly 10–20% above front for a road car so that pitch decays quickly after a bump. Race cars often deviate for aero platform reasons.

## 5. Roll rate

For an axle with independent suspension, springs at track-width spacing $t_s$ (the effective spring spacing at the wheels — usually the track if the rates are expressed as wheel rates):

$$
K_{\phi,\text{springs}} = \frac{K_R\, t^2}{2}\quad\text{(N·m/rad, with } K_R \text{ in N/m and } t \text{ in m)}
$$

Derivation: in a roll of angle $\phi$, each wheel deflects $\pm(t/2)\phi$, generating force $\pm K_R(t/2)\phi$, and the resulting moment is $2 \times K_R(t/2)\phi \times (t/2) = K_R t^2\phi/2$.

**Anti-roll bar contribution** adds directly:

$$
K_{\phi,\text{total}} = \frac{K_R t^2}{2} + K_{\phi,\text{ARB}}
$$

The bar's contribution must itself be referred to the wheels through its own installation ratio squared.

**Tire in series**: strictly, the tire rate should be in series with the wheel rate *before* computing roll rate (which the $K_R$ above does), and this matters more than people expect — with $K_w = 60$ N/mm and $K_T = 300$ N/mm, $K_R = 50$ N/mm, a 17% reduction.

## 6. Roll gradient

$$
\frac{\phi}{A_y} = \frac{W H}{K_{\phi f} + K_{\phi r}}
$$

where $H$ is the perpendicular distance from the sprung mass CG to the **roll axis** (the line joining the front and rear roll centres — Chapter 17).

Typical roll gradients:

| Vehicle | deg/g |
|---|---|
| Passenger car | 4–7 |
| Sports car | 2.5–4 |
| Race car (mechanical grip) | 1.0–2.0 |
| High-downforce formula car | 0.2–0.8 |

Note the *strong* coupling: reducing $H$ (lowering the CG or raising the roll centres) reduces roll for the same stiffness. But raising roll centres also increases the geometric (jacking) component of load transfer, which has its own consequences (Chapter 18).

## 7. Elastic lateral load transfer distribution

The elastic portion of load transfer at each axle:

$$
\Delta F_{z,f}^{\text{elastic}} = \frac{K_{\phi f}}{K_{\phi f}+K_{\phi r}}\cdot\frac{W_s H A_y}{t_f}
$$

so, ignoring the geometric and unsprung contributions:

$$
\text{TLLTD}^{\text{elastic}} \approx \frac{K_{\phi f}}{K_{\phi f}+K_{\phi r}}
$$

This is the key link from this chapter to the balance analysis of Chapter 7. The full expression, including geometric and unsprung terms, is in Chapter 18.

## 8. Worked framework — the standard calculation sequence

Given: spring rates, installation ratios, tire rates, bar rates, masses, track widths, CG and roll centre heights.

1. $K_w = K_s\, IR^2$ at each corner.
2. $K_R = K_wK_T/(K_w+K_T)$ at each corner.
3. $f = \frac{1}{2\pi}\sqrt{K_R/m_s}$ at each corner.
4. $K_{\phi,\text{spring}} = K_R t^2/2$ at each axle.
5. Add bar: $K_{\phi} = K_{\phi,\text{spring}} + K_{\phi,\text{ARB}}$.
6. Total $K_\phi$ and roll gradient $\phi/A_y = W_sH/K_\phi^{\text{tot}}$.
7. TLLTD from the elastic split plus geometric and unsprung terms.
8. Check: does TLLTD give the balance you designed for (Chapter 7)? Does the roll gradient give acceptable camber change (Chapter 17)? Does the ride frequency suit the surface and the aero requirement?

Iterate.

## 9. Simplified versus complete calculations

The chapter presents both a detailed first example and a simplified second one. The distinction:

**Complete** — separate sprung and unsprung masses, tire rates in series, geometric and elastic load transfer split, non-linear installation ratios, angularity corrections.

**Simplified** — rigid tires, sprung mass only, constant installation ratio. Errors of 10–20% in absolute rates, but the *ratios* (which set balance) are much less affected.

**When to use which**: simplified for setup direction and quick checks; complete for design and for anything where the absolute frequency matters (damper specification, aero platform).

---

## Exercises

**16.1** A corner has spring rate 120 N/mm, installation ratio 0.62, tire rate 320 N/mm, and sprung corner mass 155 kg. Compute wheel rate, ride rate, and ride frequency.

**16.2** For the car in 16.1 with track 1.60 m, compute the axle roll rate from the springs alone.

**16.3** An anti-roll bar has a torsional rate of 2200 N·m/rad at the bar, with drop links at 0.28 m from the bar centreline and an installation ratio of 0.85 from wheel to link. Compute the bar's contribution to axle roll rate.

**16.4** A designer wants to raise a front ride frequency from 2.8 Hz to 3.2 Hz without changing the installation ratio. What spring rate change is required, given the current spring is 110 N/mm, $IR = 0.70$, $K_T = 300$ N/mm, $m_s = 145$ kg? Verify by recomputing.

**16.5** A car has front roll rate 42,000 N·m/rad, rear roll rate 36,000 N·m/rad, sprung weight 6800 N, and roll moment arm 0.26 m. Compute roll gradient and elastic TLLTD.

**16.6** Show that a 10% error in installation ratio produces a 21% error in wheel rate, and compute the corresponding error in ride frequency.

**16.7** A car has front wheel rate 55 N/mm and tire rate 280 N/mm. Compute the percentage reduction in effective rate caused by tire compliance, and comment on why this matters more for stiff race cars than for road cars.

---

## Solutions

**16.1**
$$
K_w = K_s\,IR^2 = 120 \times 0.62^2 = 120 \times 0.3844 = 46.13\ \text{N/mm}
$$
$$
K_R = \frac{K_wK_T}{K_w+K_T} = \frac{46.13 \times 320}{46.13+320} = \frac{14762}{366.13} = 40.32\ \text{N/mm}
$$
$$
f = \frac{1}{2\pi}\sqrt{\frac{40320\ \text{N/m}}{155}} = \frac{1}{2\pi}\sqrt{260.1} = \frac{16.13}{6.283} = 2.57\ \text{Hz}
$$

Note that if the tire had been ignored, $f$ would compute as $\frac{1}{2\pi}\sqrt{46130/155} = 2.75$ Hz — a **7% overestimate**. The tire is not a rigid link.

**16.2**
$$
K_{\phi} = \frac{K_R t^2}{2} = \frac{40320 \times 1.60^2}{2} = \frac{40320 \times 2.56}{2} = 51{,}610\ \text{N·m/rad}
$$
$$
= 900.7\ \text{N·m/deg}
$$

**16.3**
The bar's rate must be referred to the wheels through two stages.

At the drop links (0.28 m arm), a torsional rate of 2200 N·m/rad corresponds to a linear rate at the link:
$$
K_{\text{link}} = \frac{K_T^{\text{bar}}}{r^2} = \frac{2200}{0.28^2} = \frac{2200}{0.0784} = 28{,}061\ \text{N/m per link}
$$
(This is the rate resisting differential motion between the two link ends.)

Referred to the wheel through $IR = 0.85$:
$$
K_{\text{wheel, ARB}} = 28061 \times 0.85^2 = 28061 \times 0.7225 = 20{,}274\ \text{N/m} = 20.27\ \text{N/mm}
$$

Roll rate contribution, with the same track $t = 1.60$ m:
$$
K_{\phi,\text{ARB}} = \frac{K_{\text{wheel,ARB}}\,t^2}{2} = \frac{20274 \times 2.56}{2} = 25{,}951\ \text{N·m/rad}
$$

Compare with the springs' 51,610 N·m/rad from Exercise 16.2: the bar adds **50%** to that axle's roll stiffness — a substantial but not unusual contribution.

A caution: the bar acts in series with its own mounting compliance, drop-link compliance, and the chassis. Measured bar contributions are routinely 10–25% below the calculated value for this reason, which is one more argument for measuring roll stiffness directly on a rig rather than trusting the arithmetic.

**16.4**
Required ride rate for 3.2 Hz:
$$
K_R = m_s(2\pi f)^2 = 145 \times (2\pi \times 3.2)^2 = 145 \times (20.106)^2 = 145 \times 404.3 = 58{,}620\ \text{N/m} = 58.62\ \text{N/mm}
$$

Back out the required wheel rate from the series relation $1/K_R = 1/K_w + 1/K_T$:
$$
\frac{1}{K_w} = \frac{1}{58.62} - \frac{1}{300} = 0.017059 - 0.003333 = 0.013726 \Rightarrow K_w = 72.86\ \text{N/mm}
$$
$$
K_s = \frac{K_w}{IR^2} = \frac{72.86}{0.49} = 148.7\ \text{N/mm}
$$

So the spring must go from **110 to about 149 N/mm** — a 35% increase for a 14% frequency increase, which is the $f \propto \sqrt{K}$ relationship plus the tire's series softening.

**Verification**: $K_w = 148.7 \times 0.49 = 72.86$; $K_R = (72.86 \times 300)/372.86 = 58.62$ N/mm; $f = \frac{1}{2\pi}\sqrt{58620/145} = \frac{1}{2\pi}\sqrt{404.3} = \frac{20.11}{6.283} = 3.20$ Hz ✓

Practical note: 149 N/mm is not a catalogue rate. The engineer picks 150 N/mm and accepts 3.21 Hz — and this is a good reminder that ride-frequency targets are specified to the nearest 0.05 Hz at best, because tire rates vary with pressure and temperature by more than the difference.

**16.5**
Total roll rate: $42000 + 36000 = 78{,}000$ N·m/rad.

Roll moment per g: $M = W_sH = 6800 \times 0.26 = 1768$ N·m/g.

$$
\frac{\phi}{A_y} = \frac{1768}{78000} = 0.02267\ \text{rad/g} = 1.30\ \text{deg/g}
$$

Elastic TLLTD:
$$
\frac{K_{\phi f}}{K_{\phi f}+K_{\phi r}} = \frac{42000}{78000} = 0.538 \quad (53.8\%\ \text{front})
$$

A 1.30 deg/g roll gradient is typical of a race car with modest downforce. The 53.8% elastic TLLTD is a starting point; the geometric and unsprung contributions (Chapter 18) must be added before comparing with the balance target from pair analysis.

**16.6**
$K_w = K_s\,IR^2$, so:
$$
\frac{K_w'}{K_w} = \left(\frac{IR'}{IR}\right)^2 = (1.10)^2 = 1.21
$$
**A 10% IR error gives a 21% wheel rate error.** (For a 10% underestimate: $0.9^2 = 0.81$, a 19% error the other way.)

Effect on ride frequency, ignoring the tire for clarity:
$$
\frac{f'}{f} = \sqrt{1.21} = 1.10
$$
**A 10% frequency error** — the square root undoes the square, so frequency error tracks IR error one-for-one.

The practical significance: installation ratio is measured, not assumed, and it should be measured *through the travel range*, not at static ride height alone. The usual method is to jack the wheel through its travel in increments and record both wheel and spring displacement, then differentiate. A single-point measurement misses the ratio's variation and can be badly wrong if the geometry is deliberately progressive.

**16.7**
$$
K_R = \frac{55 \times 280}{55 + 280} = \frac{15400}{335} = 45.97\ \text{N/mm}
$$
$$
\text{Reduction} = 1 - \frac{45.97}{55} = 16.4\%
$$

**Why this matters more for stiff cars**: the series relation means the softer element dominates. Write the reduction factor as:
$$
\frac{K_R}{K_w} = \frac{K_T}{K_w+K_T} = \frac{1}{1 + K_w/K_T}
$$

The reduction depends entirely on the **ratio** $K_w/K_T$:

| $K_w$ (N/mm) | $K_w/K_T$ (at $K_T=280$) | Reduction |
|---|---|---|
| 20 (road car) | 0.071 | 6.7% |
| 55 (race car) | 0.196 | 16.4% |
| 150 (high-downforce) | 0.536 | 34.9% |
| 300 (extreme) | 1.071 | 51.7% |

For a road car with 20 N/mm wheel rates, the tire is nearly rigid by comparison and can be neglected with a 7% error. For a high-downforce car running 150 N/mm or more, **the tire is comparable in stiffness to the spring, and more than a third of the total compliance lives in the tire carcass.**

Three consequences for race cars:
1. Ride frequency calculations that ignore the tire are seriously wrong for stiff cars.
2. **Tire pressure becomes a suspension rate adjustment**, not just a contact-patch adjustment — changing pressure by 2 psi can change $K_T$ by 5–10% and hence the ride rate by 2–4%.
3. In the limit of very stiff suspension (some high-downforce cars, dragsters, karts), the tire *is* the suspension, and the entire ride-rate design collapses into tire selection and pressure. This is why kart setup is essentially tire and chassis-flex tuning.
