type Pattern = number | number[]

function tryVibrate(pattern: Pattern) {
  if (typeof navigator === 'undefined') return

  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // Ignore unsupported or blocked vibration calls.
  }
}

export const haptics = {
  light: () => tryVibrate(8),
  medium: () => tryVibrate(16),
  success: () => tryVibrate([8, 30, 8]),
  warn: () => tryVibrate([12, 40, 12]),
  error: () => tryVibrate([20, 60, 20]),
  select: () => tryVibrate(5),
}
