import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockRequests } from '@/data/mockData';
import { LaundryRequest, RequestStatus } from '@/types';
import { 
  Plus, 
  Shirt, 
  Clock, 
  CheckCircle2, 
  Package, 
  MapPin, 
  Calendar,
  MessageCircle
} from 'lucide-react';
import CreateRequestDialog from '@/components/CreateRequestDialog';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

const statusConfig: Record<RequestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  pending: { variant: 'outline', className: 'border-warning text-warning' },
  accepted: { variant: 'secondary', className: 'bg-primary/10 text-primary border-0' },
  'in-progress': { variant: 'default', className: 'bg-secondary text-secondary-foreground' },
  completed: { variant: 'default', className: 'bg-success text-success-foreground' },
  cancelled: { variant: 'destructive', className: '' },
};

export default function CustomerDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [requests, setRequests] = useState<LaundryRequest[]>(
    mockRequests.filter(r => r.customerId === 'customer-1')
  );

  const handleCreateRequest = (newRequest: LaundryRequest) => {
    setRequests(prev => [newRequest, ...prev]);
    setShowCreateDialog(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: RequestStatus) => {
    const statusMap: Record<RequestStatus, string> = {
      pending: t('customerDashboard.pending'),
      accepted: t('orders.status.assigned'),
      'in-progress': t('customerDashboard.inProgress'),
      completed: t('customerDashboard.completed'),
      cancelled: t('orders.status.cancelled'),
    };
    return statusMap[status];
  };

  return (
    <main className="container mx-auto px-4 py-8 pt-24">
      {/* Push Notification Prompt */}
      <div className="mb-6">
        <PushNotificationPrompt />
      </div>

      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">
          {t('customerDashboard.hello', { name: profile?.full_name?.split(' ')[0] || 'there' })} 👋
        </h1>
        <p className="text-muted-foreground">
          {t('customerDashboard.welcomeSubtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">{t('customerDashboard.pending')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'in-progress').length}</p>
              <p className="text-sm text-muted-foreground">{t('customerDashboard.inProgress')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'completed').length}</p>
              <p className="text-sm text-muted-foreground">{t('customerDashboard.completed')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Request Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-semibold">{t('customerDashboard.yourRequests')}</h2>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('customerDashboard.newRequest')}
        </Button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Shirt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">{t('customerDashboard.noRequestsYet')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('customerDashboard.noRequestsDesc')}
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              {t('customerDashboard.createRequest')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const status = statusConfig[request.status];
            return (
              <Card 
                key={request.id} 
                className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/request/${request.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <Badge variant={status.variant} className={status.className}>
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-1">
                        {request.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{request.pickupAddress}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(request.pickupDate)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gradient">${request.price}</p>
                        <p className="text-xs text-muted-foreground">{request.weight}kg</p>
                      </div>
                      {request.washerId && (
                        <Button variant="ghost" size="icon">
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateRequestDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateRequest}
      />
    </main>
  );
}
