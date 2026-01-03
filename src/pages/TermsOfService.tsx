import { Header } from '@/components/Header';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">
            Terms of Service
          </h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: January 3, 2026
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using NordWash, you accept and agree to be bound by these Terms of 
                Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              <p className="text-muted-foreground">
                NordWash is a platform that connects customers with laundry service providers (washers). 
                We facilitate the pickup, cleaning, and delivery of laundry items.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. User Accounts</h2>
              <p className="text-muted-foreground">
                To use our services, you must create an account with accurate and complete information. 
                You are responsible for maintaining the confidentiality of your account credentials 
                and for all activities under your account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Orders and Payments</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>All prices are displayed in the app and may be subject to change</li>
                <li>Payment is processed securely through our payment provider</li>
                <li>You agree to pay for all orders placed through your account</li>
                <li>Refunds are handled on a case-by-case basis</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Liability</h2>
              <p className="text-muted-foreground">
                While we take care to ensure quality service, NordWash is not liable for damages to 
                items that are inherently delicate or improperly labeled. We recommend declaring any 
                special care requirements when placing orders.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. User Conduct</h2>
              <p className="text-muted-foreground">
                You agree to use our services respectfully and lawfully. Abuse of the platform, 
                including harassment of washers or fraudulent activity, may result in account 
                termination.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the service 
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Contact</h2>
              <p className="text-muted-foreground">
                For questions regarding these Terms of Service, please contact us through the Help 
                section of our app.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
