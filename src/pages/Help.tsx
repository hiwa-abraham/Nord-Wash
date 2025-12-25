import { Header } from '@/components/Header';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MessageCircle } from 'lucide-react';

const faqs = [
  {
    question: "How does NordWash work?",
    answer: "NordWash connects you with local washers who pick up your laundry, clean it professionally, and deliver it back to you. Simply create an order, choose your services, and we'll handle the rest."
  },
  {
    question: "What are the pricing options?",
    answer: "We offer competitive per-item pricing for all services including wash & fold, dry cleaning, ironing, and more. Check our Services & Pricing section for detailed rates."
  },
  {
    question: "How long does it take?",
    answer: "Standard turnaround is 24-48 hours. Express service is available for same-day delivery at an additional charge."
  },
  {
    question: "Is my laundry insured?",
    answer: "Yes, all items are insured during the wash process. We take full responsibility for your clothes from pickup to delivery."
  },
  {
    question: "How do I pay?",
    answer: "We accept all major credit cards and digital payments through our secure Stripe integration. Payment is processed after your order is complete."
  },
  {
    question: "Can I cancel my order?",
    answer: "You can cancel your order for free before the washer picks up your laundry. After pickup, cancellation fees may apply."
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Help Center
          </h1>
          <p className="text-muted-foreground mb-8">
            Find answers to common questions or get in touch with us.
          </p>

          {/* FAQ Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Contact Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Get a response within 24 hours
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
                    Phone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Mon-Fri 9am-6pm
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
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Available 24/7
                  </p>
                  <Button size="sm" className="w-full bg-gradient-primary hover:opacity-90">
                    Start Chat
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
