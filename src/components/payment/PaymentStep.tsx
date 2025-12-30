/**
 * PaymentStep Component
 * 
 * Displays the payment step in the checkout flow with:
 * - Price breakdown (services, service fee, transport fee)
 * - Payment method selection (Card via Stripe, Bank Transfer)
 * - Payment distribution info (owner vs washer amounts)
 * 
 * Note: Stripe integration is prepared but not yet active.
 * When Stripe is enabled, card payments will work automatically.
 */

import { useState } from 'react';
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

// ============================================
// Types & Interfaces
// ============================================

/** Payment method options */
export type PaymentMethod = 'card' | 'bank_transfer';

/** Props for the PaymentStep component */
interface PaymentStepProps {
  /** Total price for services only (before fees) */
  servicesTotal: number;
  /** Service fee amount (default $5) */
  serviceFee?: number;
  /** Transport fee amount (default $10) */
  transportFee?: number;
  /** Callback when user goes back */
  onBack: () => void;
  /** Callback when payment is initiated */
  onPayment: (method: PaymentMethod) => Promise<void>;
  /** Whether Stripe is enabled */
  stripeEnabled?: boolean;
  /** Loading state during payment processing */
  isProcessing?: boolean;
}

// ============================================
// Constants
// ============================================

/** Default service fee in euros */
const DEFAULT_SERVICE_FEE = 5;

/** Default transport fee in euros */
const DEFAULT_TRANSPORT_FEE = 10;

/** Owner's percentage of service revenue */
const OWNER_PERCENTAGE = 10;

/** Washer's percentage of service revenue */
const WASHER_PERCENTAGE = 90;

// ============================================
// Component
// ============================================

export function PaymentStep({
  servicesTotal,
  serviceFee = DEFAULT_SERVICE_FEE,
  transportFee = DEFAULT_TRANSPORT_FEE,
  onBack,
  onPayment,
  stripeEnabled = false,
  isProcessing = false,
}: PaymentStepProps) {
  // Selected payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Calculate totals and distribution
  const totalAmount = servicesTotal + serviceFee + transportFee;
  
  // Owner gets: service fee + 10% of services
  const ownerAmount = serviceFee + (servicesTotal * OWNER_PERCENTAGE / 100);
  
  // Washer gets: 90% of services + transport fee
  const washerAmount = (servicesTotal * WASHER_PERCENTAGE / 100) + transportFee;

  /**
   * Handle payment button click
   * Triggers the onPayment callback with selected method
   */
  const handlePayment = async () => {
    await onPayment(paymentMethod);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={onBack}
        disabled={isProcessing}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Review
      </Button>

      <h1 className="text-3xl font-display font-bold mb-2">Payment</h1>
      <p className="text-muted-foreground mb-8">
        Complete your payment to confirm the pickup.
      </p>

      {/* Price Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price Breakdown</CardTitle>
          <CardDescription>
            Transparent pricing with all fees included
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Services subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Services Subtotal</span>
            <span>€{servicesTotal.toFixed(2)}</span>
          </div>
          
          {/* Service fee */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Service Fee
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Platform</span>
            </span>
            <span>€{serviceFee.toFixed(2)}</span>
          </div>
          
          {/* Transport fee */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Transport Fee
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Pickup & Delivery</span>
            </span>
            <span>€{transportFee.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          {/* Total */}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">€{totalAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription>
            Choose how you'd like to pay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            className="space-y-3"
          >
            {/* Card Payment Option */}
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
              paymentMethod === 'card' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}>
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-sm text-muted-foreground">
                      Pay securely with Visa, Mastercard, or others
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            {/* Bank Transfer Option */}
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
              paymentMethod === 'bank_transfer' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}>
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-muted-foreground">
                      Transfer directly to our bank account
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Card payment info when Stripe not enabled */}
          {paymentMethod === 'card' && !stripeEnabled && (
            <Alert className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Card payments are being set up. Your order will be created and you can complete payment when ready.
              </AlertDescription>
            </Alert>
          )}

          {/* Bank transfer instructions */}
          {paymentMethod === 'bank_transfer' && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                After placing your order, you'll receive bank details to complete the transfer. 
                Your pickup will be confirmed once payment is received.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Distribution Info (collapsed/expandable) */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            How your payment is distributed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Platform fee + commission ({OWNER_PERCENTAGE}%)</span>
            <span>€{ownerAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Washer earnings ({WASHER_PERCENTAGE}% + transport)</span>
            <span>€{washerAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pay Button */}
      <Button
        size="lg"
        className="w-full bg-gradient-primary hover:opacity-90"
        onClick={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Shield className="w-5 h-5 mr-2" />
            Pay €{totalAmount.toFixed(2)}
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {/* Security note */}
      <p className="text-xs text-center text-muted-foreground">
        🔒 Your payment is secure and encrypted
      </p>
    </div>
  );
}
