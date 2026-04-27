import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/admin-actions';

interface Order {
  id: string;
  customer_name: string;
  pickup_city: string;
  pickup_date: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

const STATUSES = ['pending_payment', 'paid', 'assigned', 'in_progress', 'completed', 'cancelled', 'refunded'];

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, pickup_city, pickup_date, status, payment_status, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setOrders((data ?? []) as Order[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    await logAdminAction('order.status_change', 'order', id, { status });
    toast.success('Order updated');
    await load();
    setBusy(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return [o.customer_name, o.pickup_city, o.id].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, city, order id" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No orders match.</Card>
      ) : (
        filtered.map((o) => (
          <Card key={o.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{o.customer_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {o.pickup_city} · {new Date(o.pickup_date).toLocaleDateString()} · #{o.id.slice(0, 8)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{(o.total_amount / 100).toFixed(2)}</p>
                <Badge variant="outline" className="text-[10px]">{o.payment_status}</Badge>
              </div>
            </div>
            <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)} disabled={busy === o.id}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Card>
        ))
      )}
    </div>
  );
}
