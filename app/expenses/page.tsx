import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CostLogger } from '@/components/events/cost-logger'
import { Receipt } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const { data: costs } = await supabase
    .from('cost')
    .select('*')
    .is('event_id', null)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">General Expenses</h1>
        <p className="text-sm text-muted-foreground">Costs not tied to a specific event</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt size={14} /> Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CostLogger eventId={null} initialCosts={costs ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
