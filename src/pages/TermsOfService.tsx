import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';

export default function TermsOfService() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            {t('terms.title')}
          </h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              {t('terms.lastUpdated')}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.acceptance.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.acceptance.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.description.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.description.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.userAccounts.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.userAccounts.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.ordersPayments.title')}</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                {(t('terms.sections.ordersPayments.items', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.liability.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.liability.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.userConduct.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.userConduct.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.changesToTerms.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.changesToTerms.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('terms.sections.contact.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.contact.content')}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
