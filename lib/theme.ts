/**
 * lib/theme.ts
 * Anti-FOUC inline script for dark/light mode.
 * The runtime theme state is managed by hooks/useDarkMode.ts.
 */

const KEY = 'finuvo_theme'

/** Inline-safe: call this from <script> in <head> to prevent FOUC */
export const themeScript = `(() => {
  try {
    var t = localStorage.getItem('${KEY}')
    var dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  } catch(e) {}
})()`