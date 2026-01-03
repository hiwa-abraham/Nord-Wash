import { Header } from '@/components/Header';
import { ServicesSection } from '@/components/ServicesSection';
import { AdminServicesDialog } from '@/components/AdminServicesDialog';
import { useServices } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';

export default function Services() {
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Admin Controls - Only visible to admins */}
        <div className="container mx-auto px-4 pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Services & Pricing
              </h1>
              <p className="text-muted-foreground mt-2">
                Browse our laundry services and pricing options
              </p>
            </div>
            {isAdmin && (
              <AdminServicesDialog
                services={services}
                onAddService={addService}
                onUpdateService={updateService}
                onRemoveService={removeService}
                onToggleActive={toggleServiceActive}
              />
            )}
          </div>
        </div>

        {/* Services List */}
        <ServicesSection services={activeServices} />
      </main>
    </div>
  );
}
