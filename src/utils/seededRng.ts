/**
 * Seeded PRNG — mulberry32 algorithm.
 * Provides deterministic random numbers from a seed.
 */

let currentSeed = Date.now()
let rngInstance = null

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/** Get the current RNG function */
export function rng() {
  return rngInstance()
}

/** Reseed the global RNG */
export function seedRng(s) {
  currentSeed = s
  rngInstance = mulberry32(s)
  return s
}

/** Get current seed */
export function getSeed() {
  return currentSeed
}

// Initialize with time-based seed
seedRng(Date.now())

/** Random integer in [min, max] */
export function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

/** Random float in [min, max) */
export function randFloat(min, max) {
  return rng() * (max - min) + min
}

/** Pick a random element from an array */
export function randPick(arr) {
  return arr[Math.floor(rng() * arr.length)]
}

/** Box-Muller normal distribution */
export function randomNormal() {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}
