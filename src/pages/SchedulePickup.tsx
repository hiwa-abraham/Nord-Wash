/**
 * SchedulePickup Page
 * 
 * Multi-step form for scheduling laundry pickup:
 * 1. Select Services - Choose services and quantities
 * 2. Contact Details - Enter pickup address and contact info
 * 3. Review Order - Review before payment
 * 4. Payment - Select payment method and complete order
 * 
 * Includes fee structure:
 * - $5 service fee (goes to owner)
 * - $10 transport fee (goes to washer)
 * - 10% of services (goes to owner)
 * - 90% of services (goes to washer)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useToast } from '@/hooks/use-toast';
import { useCreateOrder } from '@/hooks/useCreateOrder';
import { useSettings } from '@/hooks/useSettings';
import { PaymentStep, type PaymentMethod } from '@/components/payment/PaymentStep';
import { cn } from '@/lib/utils';
import { contactDetailsSchema, validateForm, getFirstError } from '@/lib/validations';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Minus, 
  Plus, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  Mail,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface ServiceSelection {
  serviceId: string;
  quantity: number; // kg
}

interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  specialInstructions: string;
}

export default function SchedulePickup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeServices } = useServices();
  const { createOrder, isProcessing } = useCreateOrder();
  const { settings, isLoading: isLoadingSettings } = useSettings();
  
  // Dynamic fees from settings
  const SERVICE_FEE = settings.service_fee;
  const TRANSPORT_FEE = settings.transport_fee;
  
  // Current step in the flow: services -> details -> confirm -> payment
  const [step, setStep] = useState<'services' | 'details' | 'confirm' | 'payment'>('services');
  const [selections, setSelections] = useState<ServiceSelection[]>([]);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState<string>('');
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    specialInstructions: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const updateQuantity = (serviceId: string, delta: number) => {
    setSelections((prev) => {
      const existing = prev.find((s) => s.serviceId === serviceId);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) {
          return prev.filter((s) => s.serviceId !== serviceId);
        }
        return prev.map((s) =>
          s.serviceId === serviceId ? { ...s, quantity: newQty } : s
        );
      } else if (delta > 0) {
        return [...prev, { serviceId, quantity: delta }];
      }
      return prev;
    });
  };

  const getQuantity = (serviceId: string) => {
    return selections.find((s) => s.serviceId === serviceId)?.quantity || 0;
  };

  const calculateServicePrice = (serviceId: string) => {
    const service = activeServices.find((s) => s.id === serviceId);
    const qty = getQuantity(serviceId);
    if (!service || qty === 0) return 0;
    
    const basePrice = service.pricePerKg * qty;
    const discount = (basePrice * service.discountPercent) / 100;
    return basePrice - discount;
  };

  const totalPrice = selections.reduce(
    (sum, sel) => sum + calculateServicePrice(sel.serviceId),
    0
  );

  const hasSelections = selections.length > 0;

  const canProceedToDetails = hasSelections && pickupDate && pickupTime;

  /**
   * Validate contact details before proceeding
   * Returns true if valid, false otherwise
   */
  const validateContactDetails = (): boolean => {
    const result = validateForm(contactDetailsSchema, contactDetails);
    
    if (result.success === false) {
      setValidationErrors(result.errors);
      toast({
        title: t('pickup.validationError'),
        description: getFirstError(result.errors),
        variant: 'destructive',
      });
      return false;
    }
    
    setValidationErrors({});
    return true;
  };

  /**
   * Handle proceeding to confirm step with validation
   */
  const handleProceedToConfirm = () => {
    if (validateContactDetails()) {
      setStep('confirm');
    }
  };

  // Check if contact details are complete for proceeding to confirm
  const canProceedToConfirm =
    contactDetails.name.trim() &&
    contactDetails.email.trim() &&
    contactDetails.phone.trim() &&
    contactDetails.address.trim() &&
    contactDetails.city.trim();

  // Total with fees for display
  const totalWithFees = totalPrice + SERVICE_FEE + TRANSPORT_FEE;

  /**
   * Handle payment completion
   * Creates the order and navigates on success
   */
  const handlePayment = async (paymentMethod: PaymentMethod) => {
    // Prepare service data for order
    const serviceData = selections.map((sel) => {
      const service = activeServices.find((s) => s.id === sel.serviceId);
      return {
        serviceId: sel.serviceId,
        serviceName: service?.name || 'Unknown Service',
        quantity: sel.quantity,
        pricePerKg: service?.pricePerKg || 0,
        totalPrice: calculateServicePrice(sel.serviceId),
      };
    });

    // Create the order
    const orderId = await createOrder({
      services: serviceData,
      servicesTotal: totalPrice,
      pickupDate: pickupDate!,
      pickupTime,
      contactDetails,
      paymentMethod,
    });

    // Navigate on success
    if (orderId) {
      navigate('/');
    }
  };

  const timeSlots = [
    '08:00 - 10:00',
    '10:00 - 12:00',
    '12:00 - 14:00',
    '14:00 - 16:00',
    '16:00 - 18:00',
    '18:00 - 20:00',
  ];

  return (
    <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps - 4 steps now */}
          <div className="flex items-center justify-center mb-8 flex-wrap gap-y-2">
            {/* Step 1: Services */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === 'services' ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
              )}>
                {step !== 'services' ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{t('pickup.steps.services')}</span>
            </div>
            <Separator className="w-4 sm:w-8 mx-1 sm:mx-2" />
            
            {/* Step 2: Details */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === 'details' ? "bg-primary text-primary-foreground" : 
                ['confirm', 'payment'].includes(step) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {['confirm', 'payment'].includes(step) ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{t('pickup.steps.details')}</span>
            </div>
            <Separator className="w-4 sm:w-8 mx-1 sm:mx-2" />
            
            {/* Step 3: Confirm */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === 'confirm' ? "bg-primary text-primary-foreground" : 
                step === 'payment' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {step === 'payment' ? <CheckCircle2 className="w-5 h-5" /> : '3'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{t('pickup.steps.review')}</span>
            </div>
            <Separator className="w-4 sm:w-8 mx-1 sm:mx-2" />
            
            {/* Step 4: Payment */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === 'payment' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden sm:inline">{t('pickup.steps.payment')}</span>
            </div>
          </div>

          {/* Step 1: Service Selection */}
          {step === 'services' && (
            <>
              <h1 className="text-3xl font-display font-bold mb-2">{t('pickup.title')}</h1>
              <p className="text-muted-foreground mb-8">
                {t('pickup.selectServicesDesc')}
              </p>

              <div className="space-y-4 mb-8">
                {activeServices.map((service) => {
                  const qty = getQuantity(service.id);
                  const price = calculateServicePrice(service.id);
                  const hasDiscount = service.discountPercent > 0;
                  
                  return (
                    <Card key={service.id} className={cn(
                      "transition-all",
                      qty > 0 && "ring-2 ring-primary"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{service.name}</h3>
                              {hasDiscount && (
                                 <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                                  {service.discountPercent}% {t('services.off')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {hasDiscount ? (
                                <>
                                  <span className="text-sm line-through text-muted-foreground">
                                    €{service.pricePerKg}/kg
                                  </span>
                                  <span className="text-sm font-semibold text-primary">
                                    €{(service.pricePerKg * (1 - service.discountPercent / 100)).toFixed(2)}/kg
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm font-semibold">€{service.pricePerKg}/kg</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {qty > 0 && (
                              <span className="text-sm font-medium text-primary">
                                €{price.toFixed(2)}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(service.id, -1)}
                                disabled={qty === 0}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">{qty}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(service.id, 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pickup Date & Time */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-lg">{t('pickup.pickupSchedule')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pickup Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !pickupDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {pickupDate ? format(pickupDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={pickupDate}
                            onSelect={setPickupDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Pickup Time</Label>
                      <Select value={pickupTime} onValueChange={setPickupTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total & Continue */}
              <Card className="sticky bottom-4 shadow-lg border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total (incl. fees)</p>
                      <p className="text-2xl font-bold">€{totalWithFees.toFixed(2)}</p>
                      {hasSelections && (
                        <p className="text-xs text-muted-foreground">
                          Services €{totalPrice.toFixed(2)} + Pickup €{TRANSPORT_FEE} + Service fee €{SERVICE_FEE}
                        </p>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className="bg-gradient-primary hover:opacity-90"
                      disabled={!canProceedToDetails}
                      onClick={() => setStep('details')}
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: Contact Details */}
          {step === 'details' && (
            <>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep('services')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Services
              </Button>

              <h1 className="text-3xl font-display font-bold mb-2">Contact Details</h1>
              <p className="text-muted-foreground mb-8">
                Enter your pickup address and contact information.
              </p>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={contactDetails.name}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            placeholder="+47 123 45 678"
                            className="pl-10"
                            value={contactDetails.phone}
                            onChange={(e) =>
                              setContactDetails({ ...contactDetails, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10"
                          value={contactDetails.email}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Pickup Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address *</Label>
                      <Input
                        id="address"
                        placeholder="123 Main Street, Apt 4B"
                        value={contactDetails.address}
                        onChange={(e) =>
                          setContactDetails({ ...contactDetails, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          placeholder="Oslo"
                          value={contactDetails.city}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, city: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          placeholder="0123"
                          value={contactDetails.postalCode}
                          onChange={(e) =>
                            setContactDetails({ ...contactDetails, postalCode: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instructions">Special Instructions</Label>
                      <Textarea
                        id="instructions"
                        placeholder="Gate code, delivery notes, etc."
                        rows={3}
                        value={contactDetails.specialInstructions}
                        onChange={(e) =>
                          setContactDetails({
                            ...contactDetails,
                            specialInstructions: e.target.value,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Continue Button */}
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    className="bg-gradient-primary hover:opacity-90"
                    disabled={!canProceedToConfirm}
                    onClick={handleProceedToConfirm}
                  >
                    Review Order
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep('details')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Details
              </Button>

              <h1 className="text-3xl font-display font-bold mb-2">Review Your Order</h1>
              <p className="text-muted-foreground mb-8">
                Please review your order details before confirming.
              </p>

              <div className="space-y-6">
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selections.map((sel) => {
                      const service = activeServices.find((s) => s.id === sel.serviceId);
                      if (!service) return null;
                      return (
                        <div key={sel.serviceId} className="flex justify-between">
                          <span>
                            {service.name} × {sel.quantity} kg
                          </span>
                          <span className="font-medium">
                            €{calculateServicePrice(sel.serviceId).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    <Separator />
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (Services)</span>
                      <span>€{totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Pickup Fee</span>
                      <span>€{TRANSPORT_FEE.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Service Fee</span>
                      <span>€{SERVICE_FEE.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">€{totalWithFees.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pickup Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pickup Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Date:</strong> {pickupDate && format(pickupDate, 'PPP')}</p>
                    <p><strong>Time:</strong> {pickupTime}</p>
                    <p><strong>Address:</strong> {contactDetails.address}, {contactDetails.city} {contactDetails.postalCode}</p>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {contactDetails.name}</p>
                    <p><strong>Phone:</strong> {contactDetails.phone}</p>
                    <p><strong>Email:</strong> {contactDetails.email}</p>
                    {contactDetails.specialInstructions && (
                      <p><strong>Notes:</strong> {contactDetails.specialInstructions}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Proceed to Payment Button */}
                <Button
                  size="lg"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={() => setStep('payment')}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Payment - €{totalWithFees.toFixed(2)}
                </Button>
              </div>
            </>
          )}

          {/* Step 4: Payment */}
          {step === 'payment' && (
            <PaymentStep
              servicesTotal={totalPrice}
              serviceFee={SERVICE_FEE}
              transportFee={TRANSPORT_FEE}
              onBack={() => setStep('confirm')}
              onPayment={handlePayment}
              stripeEnabled={false}
              isProcessing={isProcessing}
            />
          )}
        </div>
      </main>
  );
}
