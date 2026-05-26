import { reactive } from 'vue'

let audioCtx = null
let masterGain = null
let activeNodes = []
let isPlaying = false
let seqTimer = null

const state = reactive({
  volume: 0.15,
  enabled: true
})

// Restore saved preferences
const savedVol = localStorage.getItem('ambientVolume')
if (savedVol !== null) state.volume = parseFloat(savedVol) || 0.15
const savedEnabled = localStorage.getItem('ambientEnabled')
if (savedEnabled === '0') state.enabled = false

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

// Pentatonic scale — clean, open, pleasant
const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]
// Chord progression I-vi-IV-V in C
const CHORDS = [
  [261.63, 329.63, 392.00],
  [220.00, 261.63, 329.63],
  [349.23, 440.00, 523.25],
  [392.00, 493.88, 587.33],
]

function playNote(ctx, freq, startTime, duration, vol) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.05)
  gain.gain.linearRampToValueAtTime(vol * 0.5, startTime + duration * 0.7)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.1)
  activeNodes.push(osc, gain)
}

export function useAmbientMusic() {
  function start() {
    if (isPlaying) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    masterGain = ctx.createGain()
    masterGain.gain.value = state.volume * 0.45
    masterGain.connect(ctx.destination)

    // Evolving chord progression
    function playChord(idx) {
      if (!isPlaying) return
      const chord = CHORDS[idx % CHORDS.length]
      const now = ctx.currentTime
      for (const freq of chord) playNote(ctx, freq, now, 3.5, 0.04)
      seqTimer = setTimeout(() => playChord(idx + 1), 4000)
    }
    playChord(0)

    // Gentle random melodic notes
    function arpStep() {
      if (!isPlaying) return
      const note = SCALE[Math.floor(Math.random() * SCALE.length)]
      playNote(ctx, note, ctx.currentTime, 0.6, 0.03)
      if (Math.random() > 0.5) playNote(ctx, note * 2, ctx.currentTime + 0.15, 0.4, 0.02)
      seqTimer = setTimeout(arpStep, 600 + Math.random() * 400)
    }
    setTimeout(arpStep, 1000)

    isPlaying = true
  }

  function stop() {
    isPlaying = false
    if (seqTimer) clearTimeout(seqTimer)
    for (const n of activeNodes) {
      try { n.stop() } catch (e) { /* ok */ }
    }
    activeNodes = []
    if (masterGain) { masterGain.disconnect(); masterGain = null }
  }

  function setVolume(v) {
    state.volume = v
    if (masterGain) masterGain.gain.value = v * 0.45
    localStorage.setItem('ambientVolume', v)
  }

  function setEnabled(e) {
    state.enabled = e
    localStorage.setItem('ambientEnabled', e ? '1' : '0')
    if (e) start(); else stop()
  }

  return { state, start, stop, setVolume, setEnabled }
}
