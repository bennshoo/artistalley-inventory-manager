export const COLLECTION_COLORS = [
  { id: 'black',  label: 'Black',  bg: '#18181b', text: '#ffffff' },
  { id: 'gray',   label: 'Gray',   bg: '#6b7280', text: '#ffffff' },
  { id: 'red',    label: 'Red',    bg: '#ef4444', text: '#ffffff' },
  { id: 'orange', label: 'Orange', bg: '#f97316', text: '#ffffff' },
  { id: 'amber',  label: 'Amber',  bg: '#f59e0b', text: '#ffffff' },
  { id: 'lime',   label: 'Lime',   bg: '#84cc16', text: '#ffffff' },
  { id: 'green',  label: 'Green',  bg: '#22c55e', text: '#ffffff' },
  { id: 'cyan',   label: 'Cyan',   bg: '#06b6d4', text: '#ffffff' },
  { id: 'blue',   label: 'Blue',   bg: '#3b82f6', text: '#ffffff' },
  { id: 'purple', label: 'Purple', bg: '#a855f7', text: '#ffffff' },
] as const

export type CollectionColorId = typeof COLLECTION_COLORS[number]['id']

export function getCollectionColor(colorId: string) {
  return COLLECTION_COLORS.find(c => c.id === colorId) ?? COLLECTION_COLORS[1]
}

/** Pick the least-used color among existing collections */
export function pickNextColor(existingColors: string[]): CollectionColorId {
  const counts = Object.fromEntries(COLLECTION_COLORS.map(c => [c.id, 0]))
  for (const c of existingColors) if (c in counts) counts[c]++
  return COLLECTION_COLORS.reduce((a, b) => counts[a.id] <= counts[b.id] ? a : b).id
}
