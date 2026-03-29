import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Building2, 
  ArrowLeft, 
  ArrowRight,
  Shield,
  Info,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'card' | 'bank_transfer';

interface PaymentStepProps {
  servicesTotal: number;
  serviceFee?: number;
  transportFee?: number;
  onBack: () => void;
  onPayment: (method: PaymentMethod) => Promise<void>;
  stripeEnabled?: boolean;
  isProcessing?: boolean;
}

const DEFAULT_SERVICE_FEE = 5;
const DEFAULT_TRANSPORT_FEE = 10;
const OWNER_PERCENTAGE = 10;
const WASHER_PERCENTAGE = 90;

export function PaymentStep({
  servicesTotal,
  serviceFee = DEFAULT_SERVICE_FEE,
  transportFee = DEFAULT_TRANSPORT_FEE,
  onBack,
  onPayment,
  stripeEnabled = false,
  isProcessing = false,
}: PaymentStepProps) {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const totalAmount = servicesTotal + serviceFee + transportFee;
  const ownerAmount = serviceFee + (servicesTotal * OWNER_PERCENTAGE / 100);
  const washerAmount = (servicesTotal * WASHER_PERCENTAGE / 100) + transportFee;

  const handlePayment = async () => {
    await onPayment(paymentMethod);
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={onBack}
        disabled={isProcessing}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('payment.backToReview')}
      </Button>

      <h1 className="text-3xl font-display font-bold mb-2">{t('payment.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('payment.completePayment')}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('payment.priceBreakdown')}</CardTitle>
          <CardDescription>{t('payment.transparentPricing')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('payment.servicesSubtotal')}</span>
            <span>€{servicesTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              {t('payment.serviceFee')}
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{t('payment.platform')}</span>
            </span>
            <span>€{serviceFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              {t('payment.transportFee')}
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{t('payment.pickupDelivery')}</span>
            </span>
            <span>€{transportFee.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>{t('common.total')}</span>
            <span className="text-primary">€{totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('payment.paymentMethod')}</CardTitle>
          <CardDescription>{t('payment.choosePayment')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            className="space-y-3"
          >
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
              paymentMethod === 'card' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}>
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('payment.creditDebitCard')}</p>
                    <p className="text-sm text-muted-foreground">{t('payment.cardDesc')}</p>
                  </div>
                </div>
              </Label>
            </div>

            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
              paymentMethod === 'bank_transfer' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}>
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('payment.bankTransfer')}</p>
                    <p className="text-sm text-muted-foreground">{t('payment.bankTransferDesc')}</p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {paymentMethod === 'card' && !stripeEnabled && (
            <Alert className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {t('payment.cardSetupInfo')}
              </AlertDescription>
            </Alert>
          )}

          {paymentMethod === 'bank_transfer' && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{t('payment.bankTransferInfo')}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            {t('payment.paymentDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>{t('payment.platformFeeCommission', { percent: OWNER_PERCENTAGE })}</span>
            <span>€{ownerAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('payment.washerEarnings', { percent: WASHER_PERCENTAGE })}</span>
            <span>€{washerAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full bg-gradient-primary hover:opacity-90"
        onClick={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t('common.processing')}
          </>
        ) : (
          <>
            <Shield className="w-5 h-5 mr-2" />
            {t('payment.payAmount', { amount: totalAmount.toFixed(2) })}
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        {t('payment.securePayment')}
      </p>
    </div>
  );
}
