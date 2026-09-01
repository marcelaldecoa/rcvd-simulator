/**
 * The telemetry barrel -- the parts safe to import from anywhere.
 *
 * `ibt.ts` and `live.ts` are deliberately NOT re-exported. They reach for
 * `node:fs` and a Windows FFI respectively, so pulling them in from the
 * renderer would break the web build for the sake of a convenience import.
 * The main process imports those two by path; everything here is pure and
 * runs in either place.
 */
export * from './types.js'
export * from './identify.js'
export * from './identifyAxle.js'
export * from './synthetic.js'
export * from './state.js'
export * from './histogram.js'
export * from './laps.js'
