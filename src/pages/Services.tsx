import { useTranslation } from 'react-i18next';
import { ServicesSection } from '@/components/ServicesSection';
import { AdminServicesDialog } from '@/components/AdminServicesDialog';
import { AdminFeesDialog } from '@/components/AdminFeesDialog';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';

export default function Services() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const {
    services,
    activeServices,
    addService,
    updateService,
    removeService,
    toggleServiceActive,
  } = useServices();

  const isAdmin = role === 'admin';

  return (
    <main className="pt-16">
      {/* Admin Controls - Only visible to admins */}
      <div className="container mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              {t('services.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('services.subtitle')}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <AdminFeesDialog />
              <AdminServicesDialog
                services={services}
                onAddService={addService}
                onUpdateService={updateService}
                onRemoveService={removeService}
                onToggleActive={toggleServiceActive}
              />
            </div>
          )}
        </div>
      </div>

      {/* Services List */}
      <ServicesSection services={activeServices} />
    </main>
  );
}
