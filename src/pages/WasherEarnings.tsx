/**
 * WasherEarnings.tsx - Washer Earnings Dashboard
 * 
 * Displays completed orders, earnings breakdown, and statistics for washers.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Loader2,
  Package,
  Wallet,
  PiggyBank,
  ChevronRight,
  Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Use realtime hook for live updates
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

  // Filter completed orders
  const completedOrders = orders.filter(o => o.status === 'completed');
  
  // Calculate earnings
  const weeklyOrders = completedOrders.filter(o => 
    o.completed_at && isWithinInterval(new Date(o.completed_at), { start: weekStart, end: weekEnd })
  );
  const monthlyOrders = completedOrders.filter(o => 
    o.completed_at && isWithinInterval(new Date(o.completed_at), { start: monthStart, end: monthEnd })
  );

  const weeklyEarnings = weeklyOrders.reduce((sum, o) => sum + o.washer_amount, 0);
  const monthlyEarnings = monthlyOrders.reduce((sum, o) => sum + o.washer_amount, 0);
  const totalEarnings = completedOrders.reduce((sum, o) => sum + o.washer_amount, 0);

  // Pending earnings (orders in progress)
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/washer')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">Earnings</span>
            </div>
            <Badge variant="outline" className="flex items-center gap-1.5 text-success border-success/30 ml-2">
              <Wifi className="w-3 h-3" />
              <span className="text-xs">Live</span>
            </Badge>
          </div>
          
          <Link to="/washer">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(weeklyEarnings)}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
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
                  <p className="text-xs text-muted-foreground">This Month</p>
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
                  <p className="text-xs text-muted-foreground">Total Earned</p>
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
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{completedOrders.length}</p>
              <p className="text-sm text-muted-foreground">Jobs Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{weeklyOrders.length}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
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
              <p className="text-sm text-muted-foreground">Avg. per Job</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="completed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              In Progress ({pendingOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed jobs yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete your first job to start earning!
                  </p>
                  <Button onClick={() => navigate('/washer')}>
                    View Available Jobs
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
                  <h3 className="text-lg font-medium mb-2">No pending jobs</h3>
                  <p className="text-muted-foreground">
                    Accept jobs from the dashboard to see them here.
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
      </main>
    </div>
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
  const services = (Array.isArray(order.services) ? order.services : []) as unknown as ServiceItem[];

  const statusConfig: Record<string, { label: string; color: string }> = {
    paid: { label: 'Paid', color: 'bg-primary/10 text-primary' },
    assigned: { label: 'Assigned', color: 'bg-secondary/10 text-secondary' },
    in_progress: { label: 'In Progress', color: 'bg-warning/10 text-warning' },
    completed: { label: 'Completed', color: 'bg-success/10 text-success' },
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
                Order #{order.id.slice(0, 8).toUpperCase()}
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
            {/* Customer Info */}
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Customer</p>
              <p className="text-sm text-muted-foreground">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.pickup_address}, {order.pickup_city}</p>
            </div>

            {/* Services */}
            {services.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Services Provided</p>
                <div className="space-y-1">
                  {services.map((service, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {service.name} × {service.quantity}
                      </span>
                      <span>{formatCurrency(service.price * service.quantity * 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Earnings Breakdown */}
            <div>
              <p className="text-sm font-medium mb-2">Your Earnings Breakdown</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Transport Fee (yours)</span>
                  <span>{formatCurrency(order.transport_fee)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Share (90%)</span>
                  <span>{formatCurrency(order.washer_amount - order.transport_fee)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Your Total</span>
                  <span className="text-success">{formatCurrency(order.washer_amount)}</span>
                </div>
              </div>
            </div>

            {/* Completed Date */}
            {order.completed_at && (
              <div className="text-xs text-muted-foreground">
                Completed on {format(new Date(order.completed_at), 'MMM d, yyyy at h:mm a')}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
