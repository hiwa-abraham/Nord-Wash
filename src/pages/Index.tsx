import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shirt, ArrowRight, Sparkles, Shield, Clock } from 'lucide-react';
import { ServicesSection } from '@/components/ServicesSection';
import { AdminServicesDialog } from '@/components/AdminServicesDialog';
import { useServices } from '@/hooks/useServices';

export default function Index() {
  const navigate = useNavigate();
  const {
    services,
    activeServices,
    addService,
    updateService,
    removeService,
    toggleServiceActive,
  } = useServices();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Admin Button - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <AdminServicesDialog
          services={services}
          onAddService={addService}
          onUpdateService={updateService}
          onRemoveService={removeService}
          onToggleActive={toggleServiceActive}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-glow mb-6 animate-float">
            <Shirt className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            Fresh laundry,{' '}
            <span className="text-gradient">delivered to you</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Connect with local washers who pick up, clean, and deliver your laundry. 
            Or earn money by helping others with their laundry needs.
          </p>
          
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg bg-gradient-primary hover:opacity-90 shadow-glow"
            onClick={() => navigate('/auth')}
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl p-6 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Save Time</h3>
            <p className="text-sm text-muted-foreground">Skip the laundromat. We pick up and deliver.</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold mb-2">Quality Care</h3>
            <p className="text-sm text-muted-foreground">Your clothes handled with professional care.</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">Pay securely through the app with Stripe.</p>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <ServicesSection services={activeServices} />
    </div>
  );
}
