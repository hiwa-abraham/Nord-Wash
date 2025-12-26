import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LaundryRequest, LaundryType, ServiceType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: LaundryRequest) => void;
}

const laundryTypes: { value: LaundryType; label: string }[] = [
  { value: 'regular', label: 'Regular Clothes' },
  { value: 'delicate', label: 'Delicate Items' },
  { value: 'heavy', label: 'Heavy Items (Bedding, Curtains)' },
  { value: 'mixed', label: 'Mixed Load' },
];

const serviceTypes: { value: ServiceType; label: string; priceMultiplier: number }[] = [
  { value: 'wash', label: 'Wash Only', priceMultiplier: 1 },
  { value: 'wash-iron', label: 'Wash & Iron', priceMultiplier: 1.5 },
  { value: 'iron-only', label: 'Iron Only', priceMultiplier: 0.8 },
  { value: 'dry-clean', label: 'Dry Clean', priceMultiplier: 2 },
];

const BASE_PRICE_PER_KG = 4;

export default function CreateRequestDialog({ open, onOpenChange, onSubmit }: CreateRequestDialogProps) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    laundryType: '' as LaundryType,
    serviceType: '' as ServiceType,
    weight: '',
    pickupAddress: '',
    deliveryAddress: '',
    pickupDate: '',
    specialInstructions: '',
  });

  const calculatePrice = () => {
    if (!formData.weight || !formData.serviceType) return 0;
    const service = serviceTypes.find(s => s.value === formData.serviceType);
    return Math.round(parseFloat(formData.weight) * BASE_PRICE_PER_KG * (service?.priceMultiplier || 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const newRequest: LaundryRequest = {
      id: `req-${Date.now()}`,
      customerId: user.id,
      customerName: profile?.full_name || 'Customer',
      title: formData.title,
      description: formData.description,
      laundryType: formData.laundryType,
      serviceType: formData.serviceType,
      weight: parseFloat(formData.weight),
      price: calculatePrice(),
      status: 'pending',
      pickupAddress: formData.pickupAddress,
      deliveryAddress: formData.deliveryAddress || formData.pickupAddress,
      pickupDate: new Date(formData.pickupDate),
      specialInstructions: formData.specialInstructions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onSubmit(newRequest);
    toast.success('Request created successfully!');
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      laundryType: '' as LaundryType,
      serviceType: '' as ServiceType,
      weight: '',
      pickupAddress: '',
      deliveryAddress: '',
      pickupDate: '',
      specialInstructions: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create Laundry Request</DialogTitle>
          <DialogDescription>
            Fill in the details and a washer will pick up your clothes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title</Label>
            <Input
              id="title"
              placeholder="e.g., Weekly laundry"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Laundry Type</Label>
              <Select 
                value={formData.laundryType} 
                onValueChange={(v: LaundryType) => setFormData(prev => ({ ...prev, laundryType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {laundryTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select 
                value={formData.serviceType} 
                onValueChange={(v: ServiceType) => setFormData(prev => ({ ...prev, serviceType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Estimated Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0.5"
                step="0.5"
                placeholder="e.g., 5"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Price</Label>
              <div className="h-10 px-3 rounded-md border border-input bg-muted flex items-center">
                <span className="text-lg font-bold text-gradient">${calculatePrice()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Pickup Address</Label>
            <Input
              id="pickupAddress"
              placeholder="Enter your pickup address"
              value={formData.pickupAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address (optional)</Label>
            <Input
              id="deliveryAddress"
              placeholder="Same as pickup if empty"
              value={formData.deliveryAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupDate">Preferred Pickup Date & Time</Label>
            <Input
              id="pickupDate"
              type="datetime-local"
              value={formData.pickupDate}
              onChange={(e) => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your laundry..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions (optional)</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special care instructions..."
              value={formData.specialInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
              Create Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
