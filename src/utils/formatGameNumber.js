const GAME_NUMBER_UNITS = Object.freeze([
  [1e33, 'Dc'],
  [1e30, 'No'],
  [1e27, 'Oc'],
  [1e24, 'Sp'],
  [1e21, 'Sx'],
  [1e18, 'Qi'],
  [1e15, 'Qa'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K']
])

export function formatGameNumber(value) {
  const amount = Math.floor(Number(value) || 0)
  if (!Number.isFinite(amount)) return '∞'

  const unit = GAME_NUMBER_UNITS.find(([minimum]) => Math.abs(amount) >= minimum)
  if (!unit) return amount.toLocaleString('pt-BR')

  const [minimum, suffix] = unit
  return `${(amount / minimum).toFixed(1)}${suffix}`
}
