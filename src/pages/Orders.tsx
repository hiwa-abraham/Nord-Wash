/**
 * Orders.tsx - Customer Order History Page
 * 
 * Displays all past orders with their status, payment info, and details.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle,
  CreditCard,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Wifi,
  Navigation
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import type { Tables } from '@/integrations/supabase/types';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import RouteMapDialog from '@/components/map/RouteMapDialog';
import MiniLocationMap from '@/components/map/MiniLocationMap';

type Order = Tables<'orders'>;

interface ServiceItem {
  name?: string;
  serviceName?: string;
  price?: number;
  totalPrice?: number;
  pricePerKg?: number;
  quantity: number;
}

const statusIcons: Record<string, typeof Clock> = {
  pending_payment: Clock,
  paid: CreditCard,
  assigned: Package,
  in_progress: Package,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  pending_payment: 'bg-warning/10 text-warning border-warning/20',
  paid: 'bg-primary/10 text-primary border-primary/20',
  assigned: 'bg-secondary/10 text-secondary border-secondary/20',
  in_progress: 'bg-secondary/10 text-secondary border-secondary/20',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  paid: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};

export default function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [mapOrder, setMapOrder] = useState<Order | null>(null);

  // Use realtime hook for live updates
  const { orders, isLoading } = useOrdersRealtime({
    userId: user?.id,
    role: 'customer',
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const getStatusIcon = (status: string) => {
    return statusIcons[status] || Clock;
  };

  const getStatusColor = (status: string) => {
    return statusColors[status] || statusColors.pending_payment;
  };

  const getPaymentStatusColor = (status: string) => {
    return paymentStatusColors[status] || paymentStatusColors.pending;
  };

  if (authLoading || isLoading) {
    return (
      <div className="pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Push Notification Prompt */}
        <div className="mb-6">
          <PushNotificationPrompt />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/customer')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">{t('orders.title')}</h1>
              <p className="text-muted-foreground">{t('orders.subtitle')}</p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5 text-success border-success/30">
            <Wifi className="w-3 h-3" />
            <span className="text-xs">{t('common.live')}</span>
          </Badge>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('orders.noOrders')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('orders.noOrdersDesc')}
              </p>
              <Button onClick={() => navigate('/schedule-pickup')}>
                {t('home.schedulePickup')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              const statusColor = getStatusColor(order.status);
              const paymentColor = getPaymentStatusColor(order.payment_status);
              const isExpanded = expandedOrder === order.id;
              const services = (Array.isArray(order.services) ? order.services : []) as unknown as ServiceItem[];

              return (
                <Card 
                  key={order.id} 
                  className="overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusColor}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium">
                            {t('orders.orderNumber')}{order.id.slice(0, 8).toUpperCase()}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                          <Badge variant="outline" className={`text-xs ${paymentColor}`}>
                            {t(`orders.paymentStatus.${order.payment_status}`)}
                          </Badge>
                        </div>
                        <ChevronRight 
                          className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 border-t">
                      <div className="pt-4 space-y-4">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t('common.status')}:</span>
                          <Badge variant="outline" className={statusColor}>
                            {t(`orders.status.${order.status}`)}
                          </Badge>
                        </div>

                        {/* Pickup Details */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">{t('orders.pickupAddress')}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.pickup_address}, {order.pickup_city}
                                {order.pickup_postal_code && `, ${order.pickup_postal_code}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">{t('orders.pickupDateTime')}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.pickup_date), 'EEEE, MMMM d, yyyy')} at {order.pickup_time}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Pickup Location Map */}
                        <MiniLocationMap
                          address={`${order.pickup_address}, ${order.pickup_city}${order.pickup_postal_code ? `, ${order.pickup_postal_code}` : ''}`}
                          label={order.pickup_address}
                        />

                        {/* Services */}
                        {services.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">{t('orders.services')}</p>
                            <div className="space-y-1">
                              {services.map((service, idx) => {
                                const displayName = service.name || service.serviceName || 'Service';
                                const displayPrice = service.totalPrice ?? (service.price ? service.price * service.quantity : 0);
                                return (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {displayName} × {service.quantity}
                                    </span>
                                    <span>{formatCurrency(displayPrice * 100)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Price Breakdown */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>{t('common.servicesSubtotal')}</span>
                            <span>{formatCurrency(order.services_total)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{t('common.serviceFee')}</span>
                            <span>{formatCurrency(order.service_fee)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>{t('common.transportFee')}</span>
                            <span>{formatCurrency(order.transport_fee)}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>{t('common.total')}</span>
                            <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                          </div>
                        </div>

                        {/* Special Instructions */}
                        {order.special_instructions && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('common.specialInstructions')}</p>
                            <p className="text-sm">{order.special_instructions}</p>
                          </div>
                        )}

                        {/* View Route Button */}
                        {order.pickup_address && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMapOrder(order);
                            }}
                          >
                            <Navigation className="w-4 h-4" />
                            {t('map.viewRoute')}
                          </Button>
                        )}

                        {/* Payment Date */}
                        {order.paid_at && (
                          <div className="text-xs text-muted-foreground">
                            {t('common.paidOn')} {format(new Date(order.paid_at), 'MMM d, yyyy at h:mm a')}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Route Map Dialog */}
        {mapOrder && (
          <RouteMapDialog
            open={!!mapOrder}
            onOpenChange={(open) => !open && setMapOrder(null)}
            destinationAddress={`${mapOrder.pickup_address}, ${mapOrder.pickup_city}${mapOrder.pickup_postal_code ? `, ${mapOrder.pickup_postal_code}` : ''}`}
            originLabel={t('map.you')}
            destinationLabel={`${mapOrder.pickup_address}, ${mapOrder.pickup_city}`}
          />
        )}
      </div>
    </main>
  );
}
