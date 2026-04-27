import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, ShoppingBag, AlertTriangle, DollarSign, ShieldAlert, Activity } from 'lucide-react';

interface Metrics {
  total_users: number;
  active_users_last_30_days: number;
  new_orders_last_7_days: number;
  open_issues: number;
  revenue_paid_cents: number;
  system_status: string;
  failed_logins_last_24h: number;
  suspicious_activity_last_24h: number;
}

export function OverviewTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');
      if (!error && data && Array.isArray(data) && data.length > 0) {
        setMetrics(data[0] as unknown as Metrics);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!metrics) return <Card className="p-6 text-center text-sm text-muted-foreground">No metrics available</Card>;

  const statusColor =
    metrics.system_status === 'healthy' ? 'bg-green-500' :
    metrics.system_status === 'attention' ? 'bg-orange-500' : 'bg-destructive';

  const stats = [
    { label: 'Total users', value: metrics.total_users, icon: Users },
    { label: 'Active (30d)', value: metrics.active_users_last_30_days, icon: Activity },
    { label: 'New orders (7d)', value: metrics.new_orders_last_7_days, icon: ShoppingBag },
    { label: 'Open issues', value: metrics.open_issues, icon: AlertTriangle },
    { label: 'Revenue (paid)', value: `${(Number(metrics.revenue_paid_cents) / 100).toFixed(2)}`, icon: DollarSign },
    { label: 'Failed logins (24h)', value: metrics.failed_logins_last_24h, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">System status</p>
          <p className="font-semibold capitalize">{metrics.system_status}</p>
        </div>
        <Badge className={`${statusColor} text-white`}>{metrics.system_status}</Badge>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="w-4 h-4" />
              <p className="text-[11px]">{s.label}</p>
            </div>
            <p className="text-xl font-semibold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {metrics.suspicious_activity_last_24h > 0 && (
        <Card className="p-3 border-destructive/50 bg-destructive/5">
          <p className="text-sm font-medium text-destructive">
            {metrics.suspicious_activity_last_24h} suspicious activity event(s) in the last 24h
          </p>
        </Card>
      )}
    </div>
  );
}
