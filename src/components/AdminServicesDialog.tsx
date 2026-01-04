import { useState } from 'react';
import { Service } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminServicesDialogProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id'>) => Promise<boolean>;
  onUpdateService: (id: string, updates: Partial<Service>) => Promise<boolean>;
  onRemoveService: (id: string) => Promise<boolean>;
  onToggleActive: (id: string) => Promise<boolean>;
}

export function AdminServicesDialog({
  services,
  onAddService,
  onUpdateService,
  onRemoveService,
  onToggleActive,
}: AdminServicesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricePerKg: '',
    discountPercent: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pricePerKg: '',
      discountPercent: '',
    });
    setEditingService(null);
    setIsAddingNew(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      pricePerKg: service.pricePerKg.toString(),
      discountPercent: service.discountPercent.toString(),
    });
    setIsAddingNew(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.pricePerKg) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSaving(true);
    
    const serviceData = {
      name: formData.name,
      description: formData.description,
      pricePerKg: parseFloat(formData.pricePerKg) || 0,
      discountPercent: parseFloat(formData.discountPercent) || 0,
      isActive: true,
    };

    let success = false;
    if (editingService) {
      success = await onUpdateService(editingService.id, serviceData);
    } else {
      success = await onAddService(serviceData);
    }
    
    setIsSaving(false);
    
    if (success) {
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onRemoveService(id);
    setDeletingId(null);
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    await onToggleActive(id);
    setTogglingId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Manage Pricing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Services & Pricing</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Service List */}
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{service.name}</h4>
                    {service.discountPercent > 0 && (
                      <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                        {service.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    €{service.pricePerKg.toFixed(2)}/kg
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${service.id}`} className="text-xs text-muted-foreground">
                      Active
                    </Label>
                    <Switch
                      id={`active-${service.id}`}
                      checked={service.isActive}
                      disabled={togglingId === service.id}
                      onCheckedChange={() => handleToggle(service.id)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(service)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === service.id}
                    onClick={() => handleDelete(service.id)}
                  >
                    {deletingId === service.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit Form */}
          {(isAddingNew || editingService) && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
              <h4 className="font-medium">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Premium Wash"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price per kg (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pricePerKg: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discountPercent: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingService ? 'Update' : 'Add'} Service
                </Button>
              </div>
            </div>
          )}

          {!isAddingNew && !editingService && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setIsAddingNew(true)}
            >
              <Plus className="w-4 h-4" />
              Add New Service
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
