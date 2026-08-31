# Chapter 12 — Chassis Set-Up

*Companion study notes to Milliken & Milliken, "Race Car Vehicle Dynamics", Chapter 12. Original explanatory material.*

---

## 1. What set-up is

Set-up is the process of choosing values for the car's adjustable parameters to suit a circuit, conditions, tire state, and driver. It is distinct from design (Chapter 10) and from development (Chapter 11): the car's fundamental capability is fixed, and the question is how to extract it.

The Millikens organize set-up into **primary** and **secondary** parameters — a hierarchy by leverage. The discipline this imposes is important, because the single greatest source of wasted track time is adjusting secondary parameters while a primary one is wrong.

## 2. The set-up hierarchy

**Primary** — large effect, must be right before anything else means anything:
1. Tire pressures and temperatures
2. Corner weights and ride heights
3. Spring rates and ride frequencies
4. Anti-roll bar rates (TLLTD)
5. Aerodynamic downforce level and balance
6. Alignment: camber and toe
7. Brake bias
8. Gear ratios

**Secondary** — refinement, meaningful only once primary is settled:
1. Damper settings (low- and high-speed, bump and rebound)
2. Bump rubbers and packers
3. Differential settings (preload, ramp angles, plate count)
4. Roll centre / geometry fine adjustment
5. Steering geometry (Ackermann, caster)
6. Bump steer
7. Asymmetric setup for ovals

The ordering is not absolute — on an oval, corner weights and asymmetry rise to the top; on a high-downforce car, aero platform control can promote dampers into the primary group. But the principle holds: **fix the thing with the biggest derivative first.**

## 3. Primary set-up in detail

### 3.1 Tire pressures

The highest-leverage, cheapest adjustment on any race car. Pressure changes:
- Contact patch size and shape (higher pressure = shorter, crowned patch)
- Vertical stiffness (and therefore the tire's contribution to ride rate — Chapter 16)
- Cornering stiffness (generally rises with pressure)
- Peak $\mu$ (generally falls with pressure above the optimum, because the patch is smaller)
- Heat generation and equilibrium temperature

The standard diagnostic is the **cross-tread temperature spread** immediately after a run, taken at inner, middle and outer thirds:

| Pattern | Reading |
|---|---|
| Middle hot | Over-inflated |
| Middle cold, edges hot | Under-inflated |
| Inner much hotter than outer | Too much negative camber (for that corner) |
| Outer much hotter than inner | Not enough negative camber |
| Whole tire cold | Not enough load or not working — check balance |

Set **hot** pressures, not cold. Cold pressures are the means; hot pressure at the target is the end.

### 3.2 Corner weights and ride height

Corner weighting sets the four individual wheel loads with the driver aboard and the fuel at reference. The controlled quantity is usually the **cross-weight** (or "wedge"):

$$
\%\text{Cross} = \frac{F_{z,\text{RF}} + F_{z,\text{LR}}}{F_{z,\text{total}}} \times 100
$$

For a symmetric road-course car, target 50% cross with symmetric left/right. Departures create a diagonal preload that makes the car behave differently in left and right turns — sometimes deliberately, on an oval.

Ride heights set the aerodynamic platform and, through the suspension geometry, the roll centre heights and camber curves. On a downforce car, **ride height is an aerodynamic parameter first and a geometry parameter second.**

### 3.3 Springs and ride frequencies

Choose ride frequency (Chapter 16) from the car's aerodynamic dependence and the circuit's surface:

$$
f = \frac{1}{2\pi}\sqrt{\frac{K_{\text{ride}}}{m_{\text{sprung, corner}}}}
$$

Typical targets:
- Sedan / GT with modest aero: 1.5–2.5 Hz
- Formula car, moderate downforce: 2.5–4 Hz
- High-downforce car: 4–7 Hz (aero platform dominates)

Rear frequency is normally set 5–20% higher than front (the "flat ride" argument: the rear must catch up with the front after a bump, given the wheelbase delay). High-downforce cars often reverse this for aero platform reasons.

### 3.4 Anti-roll bars — the balance tool

The bars set TLLTD, and TLLTD sets balance (Chapter 7). The rule:

- **Stiffer front bar / softer rear bar → more understeer**
- **Softer front bar / stiffer rear bar → more oversteer**

Bars change balance with only a small effect on total grip and (crucially) **without changing ride frequency**, which is why they are the preferred balance adjustment. Springs also change balance, but they change ride frequency and the aero platform at the same time — a non-orthogonal adjustment.

### 3.5 Aerodynamic balance

Adjust with wing angles, ride heights (rake), and flap/gurney configuration. Two distinct decisions:
- **Level** — set by the circuit's corner/straight mix (Chapter 9, Exercise 9.6).
- **Balance** — set to match the mechanical balance and to remain acceptable across the whole speed range.

The characteristic problem: aero balance shifts with ride height and pitch, so a car balanced at 60 m/s may understeer badly at 80 m/s. This is why the aero balance-versus-ride-height map is one of the most closely guarded documents in any serious team.

### 3.6 Alignment

**Camber**: set so the tire is near its optimum inclination *at maximum lateral acceleration*, accounting for body roll and camber gain. Verified by tire temperature spread, not by the static number.

**Toe**: front toe-out gives quicker turn-in and more initial response at the cost of straight-line stability and tire wear; front toe-in the reverse. Rear toe-in is stabilizing (it generates a restoring slip angle in yaw) and is the standard fix for a car that is nervous on entry.

**Caster**: sets mechanical trail and therefore steering weight and self-centring, and generates camber gain with steer. More caster = heavier steering, more camber on the outside wheel when steered.

### 3.7 Brake bias

Sets the front/rear braking torque split. Front bias: stable but the fronts lock first, causing understeer under braking and long stopping distances. Rear bias: shorter stops (up to the point of rear lock) but corner-entry instability.

The ideal bias varies with deceleration level, because longitudinal load transfer varies:
$$
\%_{\text{front, ideal}} = \frac{b/L + A_x h/L}{1}
$$
so a car with adjustable-on-the-fly bias can be optimized per corner. Race engineers routinely move bias forward for tight corners and rearward for high-speed ones.

## 4. Secondary set-up

### 4.1 Dampers

Chapter 22 covers the theory. In set-up practice:
- **Low-speed damping** controls body motions: roll, pitch, heave. Affects transient balance — stiffer at one end during the transient adds transient load transfer there, so a stiffer front low-speed bump makes the car understeer *on turn-in* while leaving steady-state balance unchanged.
- **High-speed damping** controls wheel motions over bumps and kerbs. Too stiff and the wheel skips; too soft and the wheel oscillates.
- Dampers are the **transient balance tool**; bars are the steady-state balance tool. Diagnosing whether a complaint is transient or steady-state is the key skill.

### 4.2 Differential

Preload, ramp angles and plate count set the locking torque as a function of input torque. Effects:
- More locking on power: understeer on exit (the diff resists yaw), but better traction.
- More locking on overrun: stability on entry (again resists yaw), but can push the car wide.
- Open diff: best rotation, worst traction, wheelspin on the inside wheel.

### 4.3 Bump steer

Toe change with suspension travel. Should normally be near zero, or slightly toward toe-in in bump at the rear. Non-zero bump steer makes the car steer itself over bumps and under aerodynamic ride-height change — an especially serious problem on a stiff, high-downforce car where ride height varies substantially with speed.

## 5. A diagnostic method

The most valuable single skill in setup work is mapping a driver's complaint to the correct adjustment. The essential first question is always: **where in the corner?**

| Complaint | Phase | Likely mechanism | First adjustments |
|---|---|---|---|
| Understeer on entry | Turn-in transient | Front transient load transfer too high; front tires cold | Soften front bump damping, front toe-out, brake bias forward, front bar softer |
| Understeer mid-corner | Steady-state | TLLTD too far forward; front tires past peak | Soften front bar / stiffen rear bar; front aero; front camber |
| Understeer on exit | Power-on | Diff locking, rear squat, rearward aero balance | Reduce diff power ramp, rear ride height, throttle application |
| Oversteer on entry | Braking transient | Rear unloaded by longitudinal transfer + trailing throttle | Brake bias forward, soften rear bump damping, rear toe-in, less rear overrun locking |
| Oversteer mid-corner | Steady-state | TLLTD too far rearward | Stiffen front bar / soften rear bar; rear aero |
| Oversteer on exit | Traction | Rear tires at limit combined with $F_x$ | More rear diff locking, softer rear spring, rear wing, throttle discipline |
| Nervous over bumps | Any | High-speed damping, bump steer, too stiff | Soften high-speed damping, check bump steer |
| Inconsistent | Any | Tires overheating, aero platform, chassis flex | Check tire temps and pressures, ride heights |

**Rule of thumb**: entry problems are usually brake bias and damping; mid-corner problems are bars and aero balance; exit problems are diff and traction.

## 6. Set-up discipline

- **One change at a time**, unless you are deliberately trading two known-opposing effects.
- **Record everything**, including what you thought would happen.
- **Bracket the optimum** rather than creeping toward it.
- **Return to a known baseline** whenever the car becomes confusing.
- **Distinguish the driver's description from the driver's diagnosis.** "The car understeers" is data. "The front bar is too stiff" is a hypothesis, and often a wrong one.

---

## Exercises

**12.1** A car weighs 1180 N LF, 1240 N RF, 1420 N LR, 1390 N RR. Compute total weight, front percentage, left percentage, and cross-weight percentage. Comment.

**12.2** Front sprung corner mass 165 kg, front wheel rate 42 N/mm; rear sprung corner mass 195 kg, rear wheel rate 55 N/mm. Compute ride frequencies (neglecting tire rate) and comment on the flat-ride criterion.

**12.3** A car has $b/L = 0.55$, $h = 0.32$ m, $L = 2.7$ m. Compute the ideal brake bias at 0.6 g and at 1.6 g, and comment on the implications for a fixed-bias car.

**12.4** A driver reports mid-corner understeer and exit oversteer at the same corner. Propose a diagnosis and a plan.

**12.5** Tire temperatures after a run: LF outer 92 °C, middle 88 °C, inner 84 °C; RF outer 78 °C, middle 95 °C, inner 101 °C. Diagnose.

**12.6** Explain why anti-roll bars are preferred over spring rate changes for balance adjustment, using the ride frequency and TLLTD relationships.

---

## Solutions

**12.1**
Total: $1180+1240+1420+1390 = 5230$ N.
Front: $(1180+1240)/5230 = 2420/5230 = 46.3\%$.
Left: $(1180+1420)/5230 = 2600/5230 = 49.7\%$.
Cross (RF + LR): $(1240+1420)/5230 = 2660/5230 = 50.9\%$.

**Comment**: front percentage of 46.3% is normal for a mid- or rear-engine car. Left/right at 49.7/50.3 is essentially symmetric — good for a road course. Cross-weight at 50.9% is 0.9 points above neutral, a small diagonal preload that will make the car very slightly tighter in left turns and looser in right turns. For a road course this should be corrected to 50.0% by adjusting spring perches diagonally (raise LF and RR, or lower RF and LR — noting that any corner-weight adjustment also changes ride heights, so iterate).

The magnitude matters: 0.9 points on a 5230 N car is 47 N of diagonal preload, roughly 1% of a corner load. Detectable by a good driver, not catastrophic. If this appeared unintentionally between sessions, the more useful question is *why* — usually a ride-height change, a damper length change, or something bent.

**12.2**
$$
f = \frac{1}{2\pi}\sqrt{\frac{K}{m}}
$$
Front: $K = 42$ N/mm $= 42{,}000$ N/m.
$$
f_f = \frac{1}{2\pi}\sqrt{\frac{42000}{165}} = \frac{1}{2\pi}\sqrt{254.5} = \frac{15.95}{6.283} = 2.54\ \text{Hz}
$$
Rear: $K = 55{,}000$ N/m.
$$
f_r = \frac{1}{2\pi}\sqrt{\frac{55000}{195}} = \frac{1}{2\pi}\sqrt{282.1} = \frac{16.80}{6.283} = 2.67\ \text{Hz}
$$

Ratio $f_r/f_f = 1.055$ — the rear is **5.5% stiffer in frequency**.

**Flat ride criterion**: when a car passes over a bump, the front hits first and the rear a time $L/V$ later. If the rear frequency is higher, the rear's response catches up with the front's, and the resulting body motion is predominantly heave rather than pitch. Olley's classic recommendation for road cars is a rear frequency 10–20% above the front. Here 5.5% is on the low side, so some pitching will remain — but for a race car this is much less important than for a road car, and race practice often accepts or even inverts it in favour of aerodynamic platform control. Note also that including the tire rate in series (Chapter 16) will lower both frequencies and slightly change the ratio.

**12.3**
Ideal bias puts each axle at the same fraction of its available friction, i.e. proportional to instantaneous vertical load:
$$
\%_{\text{front}} = \frac{W_f + \Delta F_{z,\text{long}}}{W} = \frac{b}{L} + \frac{A_x h}{L}
$$
(with $A_x$ in g and $h/L$ in consistent units: $h/L = 0.32/2.7 = 0.1185$).

At 0.6 g: $0.55 + 0.6(0.1185) = 0.55 + 0.0711 = 62.1\%$ front.
At 1.6 g: $0.55 + 1.6(0.1185) = 0.55 + 0.1896 = 73.9\%$ front.

**Implication for a fixed-bias car**: no single setting is correct across the range. Set at 62%, the car will lock the rears in a heavy braking zone (potentially a spin). Set at 74%, the fronts will lock in light braking and the car will understeer into slow corners with cold or lightly loaded fronts.

Practical resolutions, in increasing order of sophistication:
1. Set bias for the heaviest braking zone and accept front-limited light braking (the safe compromise, and standard practice where bias is fixed).
2. Fit a **brake proportioning valve** that reduces rear line pressure above a knee point, approximating the ideal curve.
3. Give the driver an **in-cockpit bias adjuster**, as in most professional single-seaters — the driver moves it forward for the heavy zones and back for the light ones, sometimes several times a lap.
4. Electronic brake-by-wire on the rear axle, which can follow the ideal curve continuously.

Note also that on a downforce car the picture changes again, because $W$ itself is speed-dependent while $\Delta F_{z,\text{long}}$ depends on the actual deceleration — the ideal bias curve versus speed is a design output of its own.

**12.4**
**Mid-corner understeer with exit oversteer** is a classic and highly informative combination, because the two symptoms have different mechanisms and the wrong single fix makes one of them worse.

**Diagnosis (most likely):** the steady-state balance is genuinely understeering (TLLTD too far forward, or front tires past their peak), *and* the rear is separately traction-limited on exit — either because the differential is too open, or because the rear tires are overheating and losing peak $\mu$ by the exit phase, or because rearward aero balance combined with rear squat is unloading the rear at the point of throttle application.

The trap: "fix the understeer" by moving TLLTD rearward (softer front bar) would improve mid-corner and **make the exit oversteer worse**.

**Plan:**
1. **Confirm the phase separation** in the data. Overlay steering angle, throttle, and yaw rate versus distance. Mid-corner understeer shows as steer angle rising while yaw rate plateaus. Exit oversteer shows as yaw rate rising faster than steer at throttle application.
2. **Check rear tire temperatures.** If the rears are 15–20 °C above the fronts and above their window, the exit problem is thermal, and the answer is to reduce rear work (more rear grip via rear wing, or less rear load transfer) — which also helps mid-corner understeer. This is the happy case where one change fixes both.
3. **If temperatures are healthy**, treat them as two separate problems with two orthogonal tools:
   - Mid-corner: soften front bar / stiffen rear bar (moves TLLTD rearward).
   - Exit: increase differential power-side locking, or soften the rear spring for better traction, or add rear wing.
4. **Bracket and re-test.** Make the diff change first (it is exit-only and does not affect mid-corner), verify exit improves, then attack mid-corner with the bar.

The general principle worth extracting: **when two complaints point in opposite directions, find the tool that acts on only one of them.** Bars act on steady state; differentials act on power-on; dampers act on transients. Choosing the orthogonal tool is the whole craft.

**12.5**
**LF: 92 / 88 / 84 (outer / middle / inner).** Outer hotter than inner by 8 °C, with the middle intermediate — a smooth gradient toward the outside. This tire is working its outer shoulder hardest: **not enough negative camber** (or, since this is the left front, it may simply be the inside wheel in a right-hand-dominant circuit, in which case it is lightly loaded and the reading is less meaningful).

**RF: 78 / 95 / 101.** Inner much hotter than outer by 23 °C, and the middle is hotter than the outer too. This is the classic **excessive negative camber** signature — the tire is riding on its inner shoulder. The very cold outer edge (78 °C) confirms that part of the tread is doing almost no work.

**Overall diagnosis**: the right front is the loaded wheel (so the circuit is predominantly left-hand, or this was a left-turn-heavy run) and it has too much negative camber. The left front, as the lightly loaded inside wheel, shows the mirror-image pattern for the same static setting, which is expected and normal.

**Action**: reduce right front negative camber by roughly 0.75–1.0° and re-run. Rule of thumb: aim for an inner-to-outer spread of about 5–10 °C on the loaded wheel, inner slightly hotter. Also check whether the mean temperature is in the tire's working window — if the RF mean of 91 °C is above the optimum, camber alone will not fix the underlying overload, and the balance or the load transfer distribution needs attention.

A caution the chapter would insist on: tire temperatures must be taken immediately on stopping, with a probe (not an infrared surface reading, which cools far too fast), at consistent locations, and the whole set read in the same order every time. Otherwise the numbers measure your pit procedure rather than your setup.

**12.6**
Both bars and springs change roll stiffness, and therefore TLLTD, and therefore balance:
$$
\text{TLLTD} \approx \frac{K_{\phi f}}{K_{\phi f} + K_{\phi r}} \quad\text{(elastic portion)}
$$
where $K_{\phi}$ at each end is the sum of the spring contribution and the bar contribution.

The difference is what *else* they change:

**Springs** set the ride rate, and therefore the ride frequency:
$$
f = \frac{1}{2\pi}\sqrt{\frac{K_{\text{ride}}}{m_s}}
$$
Changing a spring to alter balance simultaneously changes:
- the ride frequency at that end (affecting bump absorption and flat ride),
- the static ride height (requiring a perch adjustment and re-corner-weighting),
- the ride-height change under aerodynamic load (moving the aero platform, and hence aero balance — a *second* balance change, possibly opposing the first),
- the pitch and heave behaviour under braking and acceleration,
- the damper's operating point on its curve.

**Anti-roll bars** contribute stiffness **only in roll** — they connect the two sides and are inactive in pure heave. So changing a bar alters $K_\phi$ and TLLTD while leaving ride frequency, ride height, aero platform and heave behaviour untouched.

This is the definition of an **orthogonal adjustment**, and it is exactly what section 5 of Chapter 10 argues a designer must provide. In a session where the engineer has three runs and needs to move balance by a known amount, an orthogonal tool is worth more than a theoretically superior non-orthogonal one — because with the non-orthogonal tool, a null result is uninterpretable: did the balance change cancel against the aero platform change, or did neither do anything?

The caveat: bars are not perfectly orthogonal either. A very stiff bar reduces the suspension's ability to accommodate one-wheel bumps and kerbs (single-wheel inputs see spring plus bar), and at the extreme it approaches a solid axle in roll. So the orthogonality holds over a useful range, not universally — which is one more reason to bracket rather than extrapolate.
