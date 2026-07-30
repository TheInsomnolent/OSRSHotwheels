/** Small DOM and formatting helpers shared by the UI panels. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

/** OSRS-style stack quantity: yellow exact < 100K, white "123K", green "12M". */
export function formatQty(qty: number): { text: string; cls: string } {
  if (qty >= 10_000_000) return { text: `${Math.floor(qty / 1_000_000)}M`, cls: 'qty-green' }
  if (qty >= 100_000) return { text: `${Math.floor(qty / 1_000)}K`, cls: 'qty-white' }
  return { text: String(qty), cls: 'qty-yellow' }
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export function formatRaceTime(timeS: number | null): string {
  if (timeS === null) return 'DNF'
  const m = Math.floor(timeS / 60)
  const s = timeS - m * 60
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)}s`
}

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}
