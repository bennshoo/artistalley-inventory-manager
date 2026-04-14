export const APP_STATUSES = [
  'Unreleased',
  'Application Open',
  'App Pending',
  'Waitlisted',
  'Rejected',
  'Accepted',
  'Voided',
] as const

export type AppStatus = typeof APP_STATUSES[number]

export function getAppStatusStyle(status: string): { bg: string; text: string } {
  switch (status) {
    case 'Unreleased':       return { bg: 'bg-muted',             text: 'text-muted-foreground' }
    case 'Application Open': return { bg: 'bg-blue-100',          text: 'text-blue-800' }
    case 'App Pending':      return { bg: 'bg-amber-100',         text: 'text-amber-800' }
    case 'Waitlisted':       return { bg: 'bg-orange-100',        text: 'text-orange-800' }
    case 'Rejected':         return { bg: 'bg-red-100',           text: 'text-red-800' }
    case 'Accepted':         return { bg: 'bg-green-100',         text: 'text-green-800' }
    case 'Voided':           return { bg: 'bg-muted',             text: 'text-muted-foreground line-through' }
    default:                 return { bg: 'bg-muted',             text: 'text-muted-foreground' }
  }
}
