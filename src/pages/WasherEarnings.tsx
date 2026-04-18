/**
 * WasherEarnings.tsx - Washer Earnings Dashboard
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateServiceName } from '@/lib/service-i18n';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Loader2,
  Package,
  PiggyBank,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import type { Tables } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;

interface ServiceItem {
  name: string;
  price: number;
  quantity: number;
}

export default function WasherEarnings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { orders, isLoading } = useOrdersRealtime({
    userId: user?.id,
    role: 'washer',
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    } else if (!authLoading && role && role !== 'washer' && role !== 'admin') {
      navigate('/customer');
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const completedOrders = orders.filter(o => o.status === 'completed');
  
  const weeklyOrders = completedOrders.filter(o => 
    o.completed_at && isWithinInterval(new Date(o.completed_at), { start: weekStart, end: weekEnd })
  );
  const monthlyOrders = completedOrders.filter(o => 
    o.completed_at && isWithinInterval(new Date(o.completed_at), { start: monthStart, end: monthEnd })
  );

  const weeklyEarnings = weeklyOrders.reduce((sum, o) => sum + o.washer_amount, 0);
  const monthlyEarnings = monthlyOrders.reduce((sum, o) => sum + o.washer_amount, 0);
  const totalEarnings = completedOrders.reduce((sum, o) => sum + o.washer_amount, 0);

  const pendingOrders = orders.filter(o => ['assigned', 'in_progress', 'paid'].includes(o.status));
  const pendingEarnings = pendingOrders.reduce((sum, o) => sum + o.washer_amount, 0);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(weeklyEarnings)}</p>
                  <p className="text-xs text-muted-foreground">{t('earnings.thisWeek')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(monthlyEarnings)}</p>
                  <p className="text-xs text-muted-foreground">{t('earnings.thisMonth')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
                  <p className="text-xs text-muted-foreground">{t('earnings.totalEarned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-warning/10 to-warning/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(pendingEarnings)}</p>
                  <p className="text-xs text-muted-foreground">{t('earnings.pending')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{completedOrders.length}</p>
              <p className="text-sm text-muted-foreground">{t('earnings.jobsCompleted')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{weeklyOrders.length}</p>
              <p className="text-sm text-muted-foreground">{t('earnings.thisWeek')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">
                {completedOrders.length > 0 
                  ? formatCurrency(Math.round(totalEarnings / completedOrders.length))
                  : '€0.00'
                }
              </p>
              <p className="text-sm text-muted-foreground">{t('earnings.avgPerJob')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="completed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {t('earnings.completed')} ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('earnings.inProgress')} ({pendingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('earnings.noCompletedJobs')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('earnings.completeFirstJob')}
                  </p>
                  <Button onClick={() => navigate('/washer')}>
                    {t('earnings.viewAvailableJobs')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isExpanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  formatCurrency={formatCurrency}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('earnings.noPendingJobs')}</h3>
                  <p className="text-muted-foreground">
                    {t('earnings.acceptJobsFromDashboard')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isExpanded={expandedOrder === order.id}
                  onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  formatCurrency={formatCurrency}
                  isPending
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center">
          <Link to="/washer">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToDashboard')}
            </Button>
          </Link>
        </div>
      </main>
  );
}

interface OrderCardProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (cents: number) => string;
  isPending?: boolean;
}

function OrderCard({ order, isExpanded, onToggle, formatCurrency, isPending }: OrderCardProps) {
  const { t } = useTranslation();
  const services = (Array.isArray(order.services) ? order.services : []) as unknown as ServiceItem[];

  const statusConfig: Record<string, { label: string; color: string }> = {
    paid: { label: t('orders.status.paid'), color: 'bg-primary/10 text-primary' },
    assigned: { label: t('orders.status.assigned'), color: 'bg-secondary/10 text-secondary' },
    in_progress: { label: t('orders.status.in_progress'), color: 'bg-warning/10 text-warning' },
    completed: { label: t('orders.status.completed'), color: 'bg-success/10 text-success' },
  };

  const status = statusConfig[order.status] || statusConfig.assigned;

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader 
        className="cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPending ? 'bg-warning/10' : 'bg-success/10'}`}>
              {isPending ? (
                <Package className="w-5 h-5 text-warning" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                {t('orders.orderNumber')}{order.id.slice(0, 8).toUpperCase()}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {order.completed_at 
                    ? format(new Date(order.completed_at), 'MMM d, yyyy')
                    : format(new Date(order.pickup_date), 'MMM d, yyyy')
                  }
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-success">{formatCurrency(order.washer_amount)}</p>
              <Badge variant="outline" className={`text-xs ${status.color}`}>
                {status.label}
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
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">{t('earnings.customer')}</p>
              <p className="text-sm text-muted-foreground">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.pickup_address}, {order.pickup_city}</p>
            </div>

            {services.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('earnings.servicesProvided')}</p>
                <div className="space-y-1">
                  {services.map((service, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {translateServiceName(service.name, service.nameKey)} × {service.quantity}
                      </span>
                      <span>{formatCurrency(service.price * service.quantity * 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">{t('earnings.earningsBreakdown')}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('earnings.transportFeeYours')}</span>
                  <span>{formatCurrency(order.transport_fee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('earnings.serviceShare')}</span>
                  <span>{formatCurrency(order.washer_amount - order.transport_fee)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>{t('earnings.yourTotal')}</span>
                  <span className="text-success">{formatCurrency(order.washer_amount)}</span>
                </div>
              </div>
            </div>

            {order.completed_at && (
              <div className="text-xs text-muted-foreground">
                {t('common.completedOn')} {format(new Date(order.completed_at), 'MMM d, yyyy at h:mm a')}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
