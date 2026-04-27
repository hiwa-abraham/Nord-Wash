import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SecurityMetricsWidget } from './SecurityMetricsWidget';
import { ExternalLink, Shield } from 'lucide-react';

export function SecurityTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Security center</p>
          <p className="text-xs text-muted-foreground">Full audit logs, incident playbook & session settings.</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/security">Open <ExternalLink className="w-3 h-3 ml-1" /></Link>
        </Button>
      </Card>
      <SecurityMetricsWidget />
    </div>
  );
}
