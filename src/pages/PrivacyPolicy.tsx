import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            {t('privacy.title')}
          </h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              {t('privacy.lastUpdated')}
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('privacy.sections.infoCollect.title')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.sections.infoCollect.intro')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                {(t('privacy.sections.infoCollect.items', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('privacy.sections.howUse.title')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.sections.howUse.intro')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                {(t('privacy.sections.howUse.items', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('privacy.sections.infoSharing.title')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.sections.infoSharing.intro')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                {(t('privacy.sections.infoSharing.items', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground">
                {t('privacy.sections.infoSharing.noSell')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('privacy.sections.dataSecurity.title')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.sections.dataSecurity.content')}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('privacy.sections.yourRights.title')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.sections.yourRights.intro')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                {(t('privacy.sections.yourRights.items', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">{t('privacy.sections.contact.title')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.sections.contact.content')}
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
