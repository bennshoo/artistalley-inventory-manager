import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a YYYY-MM-DD string as "Month DD, YYYY" */
export function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

/** Format an event date range */
export function formatEventDate(dateStart: string, dateEnd: string) {
  if (dateStart === dateEnd) return formatDate(dateStart)
  return `${formatDate(dateStart)} – ${formatDate(dateEnd)}`
}
