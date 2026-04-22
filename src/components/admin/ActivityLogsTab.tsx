import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LogRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function ActivityLogsTab() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('admin_action_logs')
        .select('id, action, target_type, target_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      setLogs((data ?? []) as LogRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (logs.length === 0) return <Card className="p-6 text-center text-sm text-muted-foreground">No activity yet</Card>;

  return (
    <div className="space-y-2">
      {logs.map((l) => (
        <Card key={l.id} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium font-mono">{l.action}</p>
            <p className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
          </div>
          {l.target_type && (
            <p className="text-xs text-muted-foreground">{l.target_type}: {l.target_id}</p>
          )}
          {l.metadata && Object.keys(l.metadata).length > 0 && (
            <pre className="text-[11px] mt-1 bg-muted/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(l.metadata, null, 2)}
            </pre>
          )}
        </Card>
      ))}
    </div>
  );
}
