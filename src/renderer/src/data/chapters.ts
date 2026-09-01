/**
 * Chapter index. `lab` names the interactive module for chapters that have one;
 * the rest render their notes and are wired up as the labs are built.
 */

export type LabId =
  | 'cornering'
  | 'conditions'
  | 'tire'
  | 'steady'
  | 'transient'
  | 'pair'
  | 'wheelLoads'
  | 'glossary'
  | 'formulas'
  | 'aero'
  | 'gg'
  | 'mmm'
  | 'rates'
  | 'geometry'
  | 'steering'
  | 'driveline'
  | 'compliance'

export interface Chapter {
  /** Chapter number, or 0 for the course overview. */
  n: number
  title: string
  file: string
  part: 'Start here' | 'Part I — Fundamentals' | 'Part II — Applied Subsystems'
  lab?: LabId
  /** One-line hook shown in the empty state of chapters without a lab yet. */
  blurb?: string
}

export const CHAPTERS: Chapter[] = [
  {
    n: 0,
    title: 'How a Car Corners',
    file: '00-course-overview.md',
    part: 'Start here',
    lab: 'cornering',
    blurb: 'The one idea the whole subject rests on, in one picture.'
  },
  {
    n: 0,
    title: 'Changing Conditions',
    file: 'ch12-chassis-setup.md',
    part: 'Start here',
    lab: 'conditions',
    blurb: 'What fuel, wear, temperature and surface actually do to the car.'
  },
  {
    n: 0,
    title: 'The Formulas',
    file: '00-course-overview.md',
    part: 'Start here',
    lab: 'formulas',
    blurb: 'Every key equation, with your numbers in it and a chart of the relationship.'
  },
  {
    n: 0,
    title: 'Glossary · Glossário',
    file: 'glossary.md',
    part: 'Start here',
    lab: 'glossary',
    blurb: 'Every term in English and Brazilian Portuguese, searchable.'
  },
  { n: 0, title: 'Course Overview', file: '00-course-overview.md', part: 'Start here' },

  {
    n: 1,
    title: 'The Problem Imposed by Racing',
    file: 'ch01-problem-imposed-by-racing.md',
    part: 'Part I — Fundamentals',
    blurb: 'Lap-time sensitivity and the single friction budget.'
  },
  {
    n: 2,
    title: 'Tire Behavior',
    file: 'ch02-tire-behavior.md',
    part: 'Part I — Fundamentals',
    lab: 'tire'
  },
  {
    n: 3,
    title: 'Aerodynamic Fundamentals',
    file: 'ch03-aerodynamic-fundamentals.md',
    part: 'Part I — Fundamentals',
    lab: 'aero'
  },
  {
    n: 4,
    title: 'Vehicle Axis Systems',
    file: 'ch04-vehicle-axis-systems.md',
    part: 'Part I — Fundamentals',
    blurb: 'Body axes and the transport term Ay = V·r.'
  },
  {
    n: 5,
    title: 'Steady-State Stability and Control',
    file: 'ch05-steady-state-stability-and-control.md',
    part: 'Part I — Fundamentals',
    lab: 'steady'
  },
  {
    n: 6,
    title: 'Transient Stability and Control',
    file: 'ch06-transient-stability-and-control.md',
    part: 'Part I — Fundamentals',
    lab: 'transient'
  },
  {
    n: 7,
    title: 'Steady-State Pair Analysis',
    file: 'ch07-steady-state-pair-analysis.md',
    part: 'Part I — Fundamentals',
    lab: 'pair'
  },
  {
    n: 8,
    title: 'Force-Moment Analysis',
    file: 'ch08-force-moment-analysis.md',
    part: 'Part I — Fundamentals',
    lab: 'mmm'
  },
  {
    n: 9,
    title: 'The g-g Diagram',
    file: 'ch09-gg-diagram.md',
    part: 'Part I — Fundamentals',
    lab: 'gg'
  },
  {
    n: 10,
    title: 'Race Car Design',
    file: 'ch10-race-car-design.md',
    part: 'Part I — Fundamentals',
    blurb: 'Specification couplings and designing adjustability orthogonally.'
  },
  {
    n: 11,
    title: 'Testing and Development',
    file: 'ch11-testing-and-development.md',
    part: 'Part I — Fundamentals',
    blurb: 'A-B-A protocol and the standard manoeuvres.'
  },
  {
    n: 12,
    title: 'Chassis Set-Up',
    file: 'ch12-chassis-setup.md',
    part: 'Part I — Fundamentals',
    blurb: 'The complaint-to-adjustment diagnostic table.'
  },
  {
    n: 13,
    title: 'Historical Note',
    file: 'ch13-historical-note.md',
    part: 'Part I — Fundamentals',
    blurb: 'Olley, the aeronautical transfer, and the computational era.'
  },

  {
    n: 14,
    title: 'Tire Data Treatment',
    file: 'ch14-tire-data-treatment.md',
    part: 'Part II — Applied Subsystems',
    blurb: 'Radt nondimensionalisation collapsing a 9:1 load range onto one curve.'
  },
  {
    n: 15,
    title: 'Applied Aerodynamics',
    file: 'ch15-applied-aerodynamics.md',
    part: 'Part II — Applied Subsystems',
    lab: 'aero'
  },
  {
    n: 16,
    title: 'Ride and Roll Rates',
    file: 'ch16-ride-and-roll-rates.md',
    part: 'Part II — Applied Subsystems',
    lab: 'rates'
  },
  {
    n: 17,
    title: 'Suspension Geometry',
    file: 'ch17-suspension-geometry.md',
    part: 'Part II — Applied Subsystems',
    lab: 'geometry'
  },
  {
    n: 18,
    title: 'Wheel Loads',
    file: 'ch18-wheel-loads.md',
    part: 'Part II — Applied Subsystems',
    lab: 'wheelLoads'
  },
  {
    n: 19,
    title: 'Steering Systems',
    file: 'ch19-steering-systems.md',
    part: 'Part II — Applied Subsystems',
    lab: 'steering'
  },
  {
    n: 20,
    title: 'Driving and Braking',
    file: 'ch20-driving-and-braking.md',
    part: 'Part II — Applied Subsystems',
    lab: 'driveline'
  },
  {
    n: 21,
    title: 'Suspension Springs',
    file: 'ch21-suspension-springs.md',
    part: 'Part II — Applied Subsystems',
    blurb: 'Coil and torsion bar rates, series/parallel, Goodman fatigue.'
  },
  {
    n: 22,
    title: 'Dampers',
    file: 'ch22-dampers.md',
    part: 'Part II — Applied Subsystems',
    blurb: 'Body and wheel-hop modes, IR² vs IR, contact-patch load variation.'
  },
  {
    n: 23,
    title: 'Compliances',
    file: 'ch23-compliances.md',
    part: 'Part II — Applied Subsystems',
    lab: 'compliance'
  }
]

export const PARTS = [
  'Start here',
  'Part I — Fundamentals',
  'Part II — Applied Subsystems'
] as const
