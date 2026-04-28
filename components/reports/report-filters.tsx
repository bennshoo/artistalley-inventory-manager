'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

export function ReportFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '')

  // Keep local state in sync if URL changes externally (e.g. reset)
  useEffect(() => { setDateFrom(searchParams.get('dateFrom') ?? '') }, [searchParams])
  useEffect(() => { setDateTo(searchParams.get('dateTo') ?? '') }, [searchParams])

  const hasFilters = searchParams.get('dateFrom') || searchParams.get('dateTo')

  function commit(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        type="date"
        value={dateFrom}
        onChange={e => setDateFrom(e.target.value)}
        onBlur={e => commit('dateFrom', e.target.value)}
        className="h-8 w-36 min-w-0 text-xs"
      />
      <span className="text-xs text-muted-foreground">–</span>
      <Input
        type="date"
        value={dateTo}
        onChange={e => setDateTo(e.target.value)}
        onBlur={e => commit('dateTo', e.target.value)}
        className="h-8 w-36 min-w-0 text-xs"
      />
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="h-8 inline-flex items-center rounded-md px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={12} className="mr-1" />Reset filters
        </button>
      )}
    </div>
  )
}
