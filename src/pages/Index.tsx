import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Shirt, ArrowRight, Sparkles, Shield, Clock, CalendarCheck } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 pt-8 pb-16 md:pt-16 md:pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-glow mb-6 animate-float">
            <Shirt className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            {t('home.heroTitle')}{' '}
            <span className="text-gradient">{t('home.heroTitleHighlight')}</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {t('home.heroSubtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg bg-gradient-primary hover:opacity-90 shadow-glow"
              onClick={() => navigate('/schedule-pickup')}
            >
              <CalendarCheck className="w-5 h-5 mr-2" />
              {t('home.schedulePickup')}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 text-lg"
              onClick={() => navigate('/services')}
            >
              {t('home.viewPricing')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl p-6 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.saveTime')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.saveTimeDesc')}</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.qualityCare')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.qualityCareDesc')}</p>
          </div>
          
          <div className="bg-card rounded-2xl p-6 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.securePayments')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.securePaymentsDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
