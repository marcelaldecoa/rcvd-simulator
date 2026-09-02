# iRacing Telemetry and RCVD

*What the simulator actually publishes, which formula in Milliken & Milliken each
number belongs to, and how far the two together will take you.*

Everything below was read off a live session rather than from documentation:
**322 channels at 60 Hz** from a NASCAR Cup car at Darlington, plus the session
string. Where a channel is described as absent, it was absent from that car's
variable table, not merely undocumented.

---

## The short answer

| | Chapters | Why |
|---|---|---|
| **Directly measurable** | 4, 5, 6, 9, 11, 12 | The car's motion is published completely — three velocities, three rates, three orientations — and that is exactly what these chapters are about |
| **Measurable with the setup sheet** | 16, 20, 21, 22 | Spring rates, damper settings, brake bias and gear ratios come from the session string; the response comes from telemetry |
| **Inferable, with assumptions** | 2, 7, 15, 18, 19 | Needs axle forces, which are never published — but they follow from mass and the demand split, if you supply the mass |
| **Out of reach** | 8, 14, 23 | Need constrained testing, per-tyre force data, or a compliance rig. None of those is a track measurement |
| **Not about measurement** | 1, 3, 10, 13, 17 | These argue, or describe hardware whose geometry the sim does not expose |

The single most useful thing to understand: **iRacing publishes motion, not
force.** Every accelerometer and gyro you could want is there. Not one tyre
force, wheel load, or slip quantity is. So RCVD's left-hand side is measured and
its right-hand side has to be reconstructed.

---

## Where the numbers come from

There are three separate sources and they are easy to confuse.

### 1. The 60 Hz channel table

The main telemetry stream. 322 channels on this car, of which about 150 concern
the vehicle rather than the session, the UI or the other cars on track.

### 2. The 360 Hz `_ST` arrays

Twelve channels are *also* published as six-element arrays sampled at 360 Hz,
delivered once per 60 Hz tick:

```
LatAccel_ST   LongAccel_ST   VertAccel_ST
YawRate_ST    PitchRate_ST   RollRate_ST
VelocityX_ST  VelocityY_ST   VelocityZ_ST
LFSHshockDefl_ST … (per corner, deflection and velocity)
```

This matters for **Ch 22**. Damper velocity histograms built at 60 Hz miss the
high-speed events entirely — a kerb strike lasts tens of milliseconds — and the
360 Hz arrays are the difference between a histogram of the car's motion and a
histogram of the road.

### 3. The session string — where the *car* is

A 512 kB YAML document, rewritten when the setup changes. This is the half most
people forget, and it carries nearly every parameter RCVD asks for as an input:

```yaml
CarSetup:
  Chassis:
    Front:
      NoseWeight: 52.8%          # → weight distribution
      CrossWeight: 58.2%
      SteeringRatio: 12:1        # → Ch 19
      FrontBrakeBias: 65.0%      # → Ch 20
    LeftFront:
      CornerWeight: 3663 N       # → Ch 18 static loads
      RideHeight: 109 mm
      ShockSpringRate: 1138 N/mm # → Ch 16, Ch 21
      Camber: +4.1 deg           # → Ch 17
      Caster: +11.5 deg          # → Ch 19
      ToeIn: +0 mm
      LsCompression: 3 clicks    # → Ch 22 (clicks, not N·s/m)
    FrontArb:
      Diameter: 44 mm            # → Ch 16 roll stiffness
      Preload: -70.0 Nm
  Rear:
    RearEndRatio: 3.89           # → Ch 20
```

**Telemetry gives you the response; the setup sheet gives you the car.** Neither
is much use for vehicle dynamics without the other.

---

## What the car publishes

### Motion — the complete set

| Channel | Unit | RCVD |
|---|---|---|
| `Speed` | m/s | $V$ |
| `VelocityX`, `VelocityY`, `VelocityZ` | m/s | $u$, $v$, $w$ — body-frame velocities (Ch 4) |
| `LatAccel`, `LongAccel`, `VertAccel` | m/s² | $A_y$, $A_x$, $A_z$ — **including gravity** |
| `YawRate`, `PitchRate`, `RollRate` | rad/s | $r$, $q$, $p$ (Ch 4) |
| `Yaw`, `Pitch`, `Roll` | rad | Euler angles |
| `YawNorth` | rad | Absolute heading |

This is Ch 4's vehicle axis system, published in full. Nothing is missing.

### Driver inputs

| Channel | Unit | RCVD |
|---|---|---|
| `SteeringWheelAngle` | rad | Handwheel — divide by the steering ratio for $\delta$ |
| `SteeringWheelTorque` | N·m | **Steering feel** (Ch 19) — the only force-like channel published |
| `Throttle`, `Brake`, `Clutch` | 0–1 | After driver aids |
| `ThrottleRaw`, `BrakeRaw`, `ClutchRaw` | 0–1 | Before aids — the difference *is* the aid |
| `Gear`, `RPM`, `ShiftPowerPct` | | Ch 20 |
| `BrakeABSactive` | bool | Ch 20 |

`SteeringWheelTorque` deserves attention. It is the only channel that reports a
force anywhere in the vehicle, and it is the sum of the front tyres' aligning
torque, the caster and kingpin geometry terms, and the steering system's own
friction — which is precisely Ch 19's subject.

### Per corner

| Measurement | Channels | RCVD |
|---|---|---|
| Shock deflection | `LFshockDefl` **or** `LFSHshockDefl` | Ch 16, Ch 21 |
| Shock velocity | `LFshockVel` **or** `LFSHshockVel` | Ch 22 |
| Tyre temperature | `LFtempL/M/R` **or** `LFtempCL/CM/CR` | Ch 2, Ch 12 |
| Tread remaining | `LFwearL/M/R` | Ch 12 |
| Cold pressure | `LFcoldPressure` | A setup value, **not** a measurement |
| Odometer | `LFodometer` | Ch 12 |

> **The naming is not consistent across the fleet.** The same shock deflection is
> `LFshockDefl` on one car and `LFSHshockDefl` on another, and three of the
> temperature names have a `C` in them on cars that report carcass rather than
> tread temperature. Ask for one name and you get silence on the other car, with
> no error — an absent channel is an ordinary state in this SDK. This cost the
> damper histogram in this app: it drew empty against a Cup car that was
> publishing the data all along, under a name the code did not ask for.

### Environment

`AirDensity` (kg/m³) is published, which is the $\rho$ in every aerodynamic
formula in Ch 3 — so at least the coefficient is not guesswork. `TrackTempCrew`,
`TrackWetness`, `AirTemp`, `WindVel` and `WindDir` follow.

---

## What is never published

This list is the real answer to "how far can we go".

| Missing | Costs you |
|---|---|
| **Tyre forces** $F_x$, $F_y$, $F_z$ per wheel | Every tyre curve in Ch 2 and Ch 14. You can never measure a tyre, only an axle, and only by assuming a mass |
| **Wheel loads** | Ch 18's load transfer as a *measurement*. Static loads come from the setup sheet; dynamic ones must be modelled |
| **Wheel rotational speeds** | Longitudinal slip ratio, and with it the combined-slip half of Ch 2 and the traction limit in Ch 20 |
| **Aligning torque** $M_z$ | Pneumatic trail directly. `SteeringWheelTorque` is a lumped proxy, not $M_z$ |
| **Mass, wheelbase, CG height, track width** | The parameters half of RCVD's formulas need. See below |
| **Suspension geometry at runtime** | Instant centres, roll centres, camber gain — Ch 17 entirely |
| **Aerodynamic forces** | Ch 3 and Ch 15 as direct measurement |
| **Position** (`Lat`/`Lon` absent) | A surveyed track map. `YawNorth` plus speed gives you a reconstructed shape, which is not the same thing |

### The parameters you must supply yourself

Four numbers RCVD cannot do without, and iRacing does not publish:

- **Mass** — but the four `CornerWeight` values sum to it. On the car above,
  3663 + 4540 + 4855 + 3089 = 16 147 N, so $m \approx 1646$ kg.
- **Weight distribution** — `NoseWeight: 52.8%` gives $b/L$ directly.
- **Wheelbase $L$** — not published anywhere. You need it from the car's spec
  sheet, and without it `NoseWeight` gives you only the *ratio* $a{:}b$, not $a$
  and $b$ themselves.
- **CG height $h$ and track width $t$** — not published. These are what Ch 18's
  load transfer $\Delta W = W A_y h / t$ is made of, so lateral load transfer
  cannot be computed from telemetry alone. It is the single largest gap.

---

## What you can derive

Everything here is arithmetic on published channels. This is the part that makes
the rest work.

### Sideslip

$$\beta = \arctan\frac{v_y}{v_x}$$

Directly, from `VelocityY` and `VelocityX`. This is the channel that matters
most and the one most sims omit — with it, both axle slip angles are separable.
Without it you must integrate $\dot\beta = A_y/V - r$, which drifts without
bound because any bias in either channel accumulates.

### Axle slip angles

$$\alpha_f = \delta - \beta - \frac{a\,r}{V}, \qquad \alpha_r = -\beta + \frac{b\,r}{V}$$

where $\delta$ = `SteeringWheelAngle` ÷ steering ratio. These are Ch 5's
definitions and they are the foundation of everything the overlay draws.

**Both divide by $V$.** Below walking pace they amplify sensor noise without
bound: a parked car reports microradians per second of yaw noise, and dividing
that by a speed near zero produces hundreds of degrees of slip. Any analysis
must gate on speed.

### Path radius and the understeer gradient

$$R = \frac{V}{r}, \qquad K = \frac{\delta - L/R}{A_y}$$

Ch 5 §4, measurable end to end from published channels plus the wheelbase. This
is the most valuable single thing you can extract from a session: it is the
number the whole book is organised around, and you get it from ordinary laps
rather than a constant-radius test.

### Axle cornering stiffness

$$F_{yf} = W_f A_y, \qquad C_f = \frac{\partial F_{yf}}{\partial \alpha_f}$$

The demand split is Ch 7's, and it holds at a trimmed cornering state. Requires
mass and weight distribution — the first supplied, the second from the setup
sheet. Regressing axle force on axle slip angle recovers $C_f$ and $C_r$
**separately**, which one equation in $K$ alone cannot do.

### Suspension force, and a route into Ch 18

$$\Delta F = k_{\text{spring}} \times \Delta(\text{shock deflection})$$

Spring rate from the setup sheet, deflection measured per corner. This is the
one genuine path to dynamic wheel loads without a load cell — and therefore the
one way to get at Ch 18 from telemetry. It measures the *sprung* contribution
only: it misses unsprung weight transfer and everything that goes through the
roll centre geometrically, which on a stiff car is a large share. Treat it as
indicative rather than as a wheel load.

---

## Chapter by chapter

| Ch | Subject | How far telemetry takes you |
|---|---|---|
| 1 | The Problem Imposed by Racing | Not a measurement chapter |
| 2 | Tire Behavior | **Axle level only.** Slip angle derived, axle force inferred from mass. No per-tyre force, no slip ratio, so no friction ellipse from data. Tyre temperatures across the tread are published and are the practical substitute |
| 3 | Aerodynamic Fundamentals | `AirDensity` is given; forces are not. Theory chapter in practice |
| 4 | Vehicle Axis Systems | **Complete.** Every velocity, rate and Euler angle. The chapter iRacing serves best |
| 5 | Steady-State Stability and Control | **The flagship.** $K$, both slip angles, path radius, the whole steady-state picture from ordinary laps |
| 6 | Transient Stability and Control | **Strong.** Yaw-rate response to steer input at 60 Hz, or 360 Hz via `_ST`. Response time and damping are directly measurable |
| 7 | Steady-State Pair Analysis | **Inferable.** The demand split needs the weight distribution, which the setup sheet gives. The TLLTD it turns on does not |
| 8 | Force-Moment Analysis | **Out of reach.** MMM needs the car held at a fixed $\beta$ while $\delta$ is swept. You cannot do that on a track. You *can* plot your measured $(\beta, \delta)$ trajectory on a modelled map, which is worth doing |
| 9 | The g-g Diagram | **Directly measurable** — it is two published channels plotted against each other. Mind the gravity correction below |
| 10 | Race Car Design | Not a measurement chapter |
| 11 | Testing and Development | **Fully applicable as method.** Repeatability, confounders, one change at a time. The discipline matters more with sim data, not less, because it is so easy to collect |
| 12 | Chassis Set-Up | **Strong.** The setup sheet is the independent variable and telemetry is the dependent one. This is the loop the book describes |
| 13 | Historical Note | No |
| 14 | Tire Data Treatment | **Out of reach.** Radt normalisation needs $F_z$ per tyre and a force curve to normalise. Neither exists |
| 15 | Applied Aerodynamics | **Indirectly.** Peak lateral acceleration against speed is the classic way to back downforce out of track data, and both channels are published |
| 16 | Ride and Roll Rates | **Good.** Spring rates from setup, deflections measured, `RollRate` published. Ride frequencies are recoverable from the deflection traces |
| 17 | Suspension Geometry | **Setup only.** Camber, caster and toe are published as settings. Instant centres, roll centres and camber gain are not exposed at any rate |
| 18 | Wheel Loads | **Modelled, not measured.** Static from corner weights; dynamic needs CG height and track width, which are not published. The spring-deflection route above is the nearest thing |
| 19 | Steering Systems | **Partly, and unusually well.** `SteeringWheelTorque` is a real measurement of steering feel, and ratio, caster and toe come from the setup sheet |
| 20 | Driving and Braking | **Partly.** Pedals, gear, RPM, longitudinal acceleration and brake bias are all there. Without wheel speeds there is no slip ratio, so the traction limit itself is not measurable |
| 21 | Suspension Springs | **Good.** Rates from setup, deflections measured, so wheel rates and motion ratios can be checked against the geometry |
| 22 | Dampers | **Good, and use the 360 Hz arrays.** Damper settings arrive as *clicks*, not N·s/m, so the force–velocity curve still has to come from the manufacturer or be assumed |
| 23 | Compliances | **No.** Nothing in telemetry measures a compliance. It needs a rig |

---

## Traps

Four that will cost you a session if you do not know about them.

### Accelerations include gravity

iRacing says so in the channel description, and on a banked oval it dominates.
At Darlington's banking the gravity component along the body-lateral axis is of
order $g \sin\phi \approx 0.4g$ — comparable to the cornering acceleration
itself. `Roll` and `Pitch` are published, so the correction is available, but it
has to be applied deliberately.

**A test worth running:** park on the banking and read `LatAccel`. Whatever it
says is the correction, and it is not small.

### An absent channel is silent

There is no error when you ask for a channel a car does not publish. It simply
is not in the variable table, and every downstream number becomes a constant
zero — which looks exactly like a car that never moved. Check presence against
the variable table, never by inspecting the data.

### The steering ratio lives in two places, and neither is universal

`DriverCarSteeringRatio` under `DriverInfo` on some cars; `SteeringRatio: 12:1`
under `CarSetup` on others — a ratio with a colon in it, not a number. Read only
the first and you silently fall back to a default. A wrong steering ratio scales
**every** slip angle you compute, and it will look plausible the whole time.

### Cold pressure is not tyre pressure

`LFcoldPressure` is what was set in the garage. It does not change as the tyre
works. There is no running-pressure channel on this car, and substituting the
cold value gives you a plausible-looking constant where you should have had
nothing — which is the worse of the two failures.

---

## So how far can you go?

Far enough that the constraint is your understanding rather than the data.

**Chapters 4, 5, 6, 9, 11 and 12 are fully available.** That is the spine of the
book: axis systems, steady-state balance, transient response, the friction
envelope, and the discipline for testing them. You can measure your car's
understeer gradient from ordinary laps, watch it move when you change a bar, and
check whether the change was real or the noise between two laps.

**Chapters 16, 20, 21 and 22 open up once you read the setup sheet**, which is
the half most people never touch.

**What you cannot do is measure a tyre.** No force, no load, no slip ratio. Ch 2
and Ch 14 stay theory, and everything resting on wheel loads — Ch 18 especially
— stays modelled. You will always be working at the axle, with a mass you
supplied, and it is worth knowing which of your numbers were measured and which
were assumed.

That boundary is not a failure of the simulator. It is the same boundary a real
race engineer works against without instrumented hubs, which is most of them.
