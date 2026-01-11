import { useTranslation } from 'react-i18next';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MessageCircle } from 'lucide-react';

export default function Help() {
  const { t } = useTranslation();

  const faqKeys = ['howItWorks', 'pricing', 'turnaround', 'insurance', 'payment', 'cancellation'];

  return (
    <main className="container mx-auto px-4 pt-24 pb-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          {t('help.title')}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t('help.subtitle')}
        </p>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('help.faq')}</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqKeys.map((key, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {t(`help.faqItems.${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`help.faqItems.${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contact Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{t('help.contactUs')}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t('help.email')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('help.emailResponse')}
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  support@nordwash.com
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  {t('help.phone')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('help.phoneHours')}
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  +1 (555) 123-4567
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  {t('help.liveChat')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('help.liveChatAvailable')}
                </p>
                <Button size="sm" className="w-full bg-gradient-primary hover:opacity-90">
                  {t('help.startChat')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Legal Links */}
        <section className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-colors">
              {t('footer.privacyPolicy')}
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-foreground transition-colors">
              {t('footer.termsOfService')}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
