import { AdminFeesDialog } from '@/components/AdminFeesDialog';
import { AdminServicesDialog } from '@/components/AdminServicesDialog';
import { useServices } from '@/hooks/useServices';
import { useSettings } from '@/hooks/useSettings';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-actions';
import type { Service } from '@/types';

export function PricingTab() {
  const { services, loading, addService, updateService, removeService, toggleServiceActive } = useServices();
  const { settings, isLoading: feesLoading } = useSettings();

  const wrappedAdd = async (s: Omit<Service, 'id'>) => {
    await addService(s);
    await logAdminAction('service.create', 'service', null, { name: s.name, price: s.pricePerKg, currency: s.currency });
  };
  const wrappedUpdate = async (id: string, updates: Partial<Service>) => {
    await updateService(id, updates);
    await logAdminAction('service.update', 'service', id, updates as Record<string, unknown>);
  };
  const wrappedRemove = async (id: string) => {
    await removeService(id);
    await logAdminAction('service.delete', 'service', id);
  };
  const wrappedToggle = async (id: string) => {
    await toggleServiceActive(id);
    await logAdminAction('service.toggle_active', 'service', id);
  };

  if (loading || feesLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold">Platform fees</p>
            <p className="text-xs text-muted-foreground">Service fee €{settings.service_fee} · Pickup fee €{settings.transport_fee}</p>
          </div>
          <AdminFeesDialog />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold">Services catalog</p>
            <p className="text-xs text-muted-foreground">{services.length} services · {services.filter((s) => s.isActive).length} active</p>
          </div>
          <AdminServicesDialog
            services={services}
            onAddService={wrappedAdd}
            onUpdateService={wrappedUpdate}
            onRemoveService={wrappedRemove}
            onToggleActive={wrappedToggle}
          />
        </div>
        <div className="space-y-1">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm py-1">
              <span className={s.isActive ? '' : 'text-muted-foreground line-through'}>{s.name}</span>
              <span className="text-muted-foreground">{s.pricePerKg} {s.currency || 'SEK'}/kg</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
