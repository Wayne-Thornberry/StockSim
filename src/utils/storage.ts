const STORAGE_KEY = 'stocksim_saves'
const MAX_SLOTS = 10

/** Get all save slots from localStorage */
export function getSaveSlots() {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    return json ? JSON.parse(json) : []
  } catch (e) {
    console.error('Failed to load saves:', e)
    return []
  }
}

/** Save all slots to localStorage */
function saveSlots(slots) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots))
    return true
  } catch (e) {
    console.error('Failed to save:', e)
    return false
  }
}

/** Save game to a specific slot (0-9). Returns success. */
export function saveToSlot(slotIndex, gameState, marketState, portfolioState) {
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return false
  const slots = getSaveSlots()

  const day = gameState.day || 1
  const cash = gameState.cash || 0

  slots[slotIndex] = {
    slot: slotIndex,
    name: `Day ${day} — ${formatCash(cash)}`,
    timestamp: Date.now(),
    day,
    cash,
    gameState: JSON.parse(JSON.stringify(gameState)),
    marketState: JSON.parse(JSON.stringify(marketState)),
    portfolioState: JSON.parse(JSON.stringify(portfolioState))
  }
  return saveSlots(slots)
}

/** Load game from a specific slot. Returns { gameState, marketState, portfolioState } or null. */
export function loadFromSlot(slotIndex) {
  const slots = getSaveSlots()
  const slot = slots[slotIndex]
  if (!slot) return null
  return {
    gameState: JSON.parse(JSON.stringify(slot.gameState)),
    marketState: JSON.parse(JSON.stringify(slot.marketState)),
    portfolioState: JSON.parse(JSON.stringify(slot.portfolioState))
  }
}

/** Delete a specific save slot */
export function deleteSlot(slotIndex) {
  const slots = getSaveSlots()
  delete slots[slotIndex]
  return saveSlots(slots)
}

/** Get metadata for all slots (for display) */
export function getSlotMeta() {
  const slots = getSaveSlots()
  return Array.from({ length: MAX_SLOTS }, (_, i) => {
    const s = slots[i]
    return s ? {
      slot: i, name: s.name, timestamp: s.timestamp,
      day: s.day, cash: s.cash, exists: true
    } : {
      slot: i, name: 'Empty Slot', timestamp: 0,
      day: 0, cash: 0, exists: false
    }
  })
}

/** Export all saves as a downloadable JSON file */
export function exportAllSaves() {
  const slots = getSaveSlots()
  const json = JSON.stringify(slots.filter(Boolean), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stocksim-saves-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Import saves from a JSON file. Merges with existing slots. */
export function importAllSaves() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return reject('No file selected')
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const incoming = JSON.parse(ev.target.result)
          if (!Array.isArray(incoming)) return reject('Invalid saves file — expected array')
          const existing = getSaveSlots()
          for (const save of incoming) {
            if (save && typeof save.slot === 'number' && save.slot >= 0 && save.slot < MAX_SLOTS) {
              existing[save.slot] = save
            }
          }
          saveSlots(existing)
          resolve(incoming.length)
        } catch (err) {
          reject('Invalid save file')
        }
      }
      reader.onerror = () => reject('Failed to read file')
      reader.readAsText(file)
    }
    input.click()
  })
}

/** Delete all saves */
export function deleteAllSaves() {
  localStorage.removeItem(STORAGE_KEY)
}

function formatCash(cash) {
  if (cash >= 1e9) return '$' + (cash / 1e9).toFixed(1) + 'B'
  if (cash >= 1e6) return '$' + (cash / 1e6).toFixed(1) + 'M'
  if (cash >= 1e3) return '$' + (cash / 1e3).toFixed(1) + 'K'
  return '$' + cash.toFixed(0)
}
