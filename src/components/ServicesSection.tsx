import { useTranslation } from 'react-i18next';
import { Service } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { translateServiceName, translateServiceDescription } from '@/lib/service-i18n';
import PriceDisplay from '@/components/PriceDisplay';

interface ServicesSectionProps {
  services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  const { t } = useTranslation();

  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100;
  };

  return (
    <section className="py-16 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('services.ourServices')}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('services.ourServicesDesc')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-card rounded-2xl p-6 shadow-md border border-border/50 hover:shadow-lg transition-shadow relative overflow-hidden"
            >
              {service.discountPercent > 0 && (
                <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
                  {service.discountPercent}% {t('services.off')}
                </Badge>
              )}
              
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{translateServiceName(service.name, service.nameKey)}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {translateServiceDescription(service.name, service.description, service.nameKey)}
              </p>
              
              <div className="flex items-baseline gap-2 flex-wrap">
                {service.discountPercent > 0 ? (
                  <>
                    <span className="text-2xl font-bold text-primary">
                      <PriceDisplay
                        amount={calculateDiscountedPrice(service.pricePerKg, service.discountPercent)}
                        currency={service.currency || 'SEK'}
                      />
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      <PriceDisplay
                        amount={service.pricePerKg}
                        currency={service.currency || 'SEK'}
                        showConversion={false}
                      />
                    </span>
                    <span className="text-sm text-muted-foreground">{t('services.perKg')}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-primary">
                      <PriceDisplay amount={service.pricePerKg} currency={service.currency || 'SEK'} />
                    </span>
                    <span className="text-sm text-muted-foreground">{t('services.perKg')}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
