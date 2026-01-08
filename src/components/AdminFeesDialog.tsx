/**
 * AdminFeesDialog.tsx - Admin Fee Management Dialog
 * 
 * Allows admins to customize pickup and service fee amounts.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/hooks/useSettings';
import { Loader2, Settings2, Euro, Truck, Wrench } from 'lucide-react';

export function AdminFeesDialog() {
  const { settings, isLoading, updateSetting } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [serviceFee, setServiceFee] = useState('');
  const [transportFee, setTransportFee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync form with settings when dialog opens or settings load
  useEffect(() => {
    if (!isLoading) {
      setServiceFee(settings.service_fee.toString());
      setTransportFee(settings.transport_fee.toString());
    }
  }, [settings, isLoading]);

  const handleSaveServiceFee = async () => {
    const value = parseFloat(serviceFee);
    if (isNaN(value) || value < 0) return;
    
    setIsSaving(true);
    await updateSetting('service_fee', value);
    setIsSaving(false);
  };

  const handleSaveTransportFee = async () => {
    const value = parseFloat(transportFee);
    if (isNaN(value) || value < 0) return;
    
    setIsSaving(true);
    await updateSetting('transport_fee', value);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Manage Fees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Fee Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Service Fee */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Service Fee
                </CardTitle>
                <CardDescription>
                  Fee charged for processing each order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(e.target.value)}
                      className="pl-9"
                      placeholder="5.00"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveServiceFee}
                    disabled={isSaving || serviceFee === settings.service_fee.toString()}
                    size="sm"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transport/Pickup Fee */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  Pickup Fee
                </CardTitle>
                <CardDescription>
                  Fee charged for pickup and delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={transportFee}
                      onChange={(e) => setTransportFee(e.target.value)}
                      className="pl-9"
                      placeholder="10.00"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveTransportFee}
                    disabled={isSaving || transportFee === settings.transport_fee.toString()}
                    size="sm"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              Changes apply to all new orders immediately
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
