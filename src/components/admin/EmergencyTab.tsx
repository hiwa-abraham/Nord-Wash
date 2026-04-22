import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-actions';

export function EmergencyTab() {
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('admin_settings').select('value').eq('key', 'maintenance_mode').single();
      setMaintenance(data?.value === true);
      setLoading(false);
    })();
  }, []);

  const toggle = async (value: boolean) => {
    const { error } = await supabase.from('admin_settings').update({
      value: value as never,
      updated_at: new Date().toISOString(),
    }).eq('key', 'maintenance_mode');
    if (error) { toast.error(error.message); return; }
    await logAdminAction('emergency.maintenance_mode', 'system', null, { enabled: value });
    setMaintenance(value);
    toast.success(value ? 'Maintenance mode ON — only owner can access app' : 'Maintenance mode OFF');
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <Card className="p-4 border-destructive/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="maintenance" className="font-semibold">Maintenance mode (kill switch)</Label>
              <p className="text-xs text-muted-foreground">Blocks all non-owner users from using the app. Use only in emergencies.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="maintenance" checked={maintenance} onCheckedChange={toggle} />
              <span className="text-sm">{maintenance ? 'ENABLED' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        Suspend specific users from the <strong>Users</strong> tab.
      </Card>
    </div>
  );
}
