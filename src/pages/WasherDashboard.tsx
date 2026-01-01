import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChatDialog from '@/components/ChatDialog';
import { 
  Shirt, 
  MapPin, 
  Calendar,
  DollarSign,
  Star,
  CheckCircle2,
  Clock,
  LogOut,
  User,
  Weight,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Temporary mock data until orders table is created
const mockAvailableRequests = [
  {
    id: '1',
    title: 'Weekly Laundry',
    customerName: 'John D.',
    customerId: 'mock-customer-1',
    description: 'Regular weekly laundry - mostly casual clothes',
    laundryType: 'regular',
    serviceType: 'wash-iron',
    weight: 5,
    price: 25,
    pickupAddress: '123 Main St, City',
    pickupDate: new Date(),
    specialInstructions: 'Please handle with care',
  },
];

const serviceLabels: Record<string, string> = {
  'wash': 'Wash Only',
  'wash-iron': 'Wash & Iron',
  'iron-only': 'Iron Only',
  'dry-clean': 'Dry Clean',
};

const laundryTypeLabels: Record<string, string> = {
  'regular': 'Regular',
  'delicate': 'Delicate',
  'heavy': 'Heavy',
  'mixed': 'Mixed',
};

export default function WasherDashboard() {
  const { user, profile, logout, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [availableRequests, setAvailableRequests] = useState(mockAvailableRequests);
  const [myJobs, setMyJobs] = useState<typeof mockAvailableRequests>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (role && role !== 'washer' && role !== 'admin') {
      navigate('/customer');
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAcceptJob = (request: typeof mockAvailableRequests[0]) => {
    const updatedRequest = {
      ...request,
    };
    
    setAvailableRequests(prev => prev.filter(r => r.id !== request.id));
    setMyJobs(prev => [updatedRequest, ...prev]);
    toast.success('Job accepted! Use the chat to coordinate with the customer.');
  };

  const handleOpenChat = (customerId: string, customerName: string) => {
    setSelectedCustomer({ id: customerId, name: customerName });
    setChatOpen(true);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Shirt className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-gradient">FreshFold</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm bg-warning/10 text-warning px-2 py-1 rounded-full">
                <Star className="w-3 h-3 fill-current" />
                <span className="font-medium">{profile?.rating || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{profile?.full_name || 'Washer'}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Ready to earn, {profile?.full_name?.split(' ')[0] || 'there'}? 💪
          </h1>
          <p className="text-muted-foreground">
            Accept laundry jobs and communicate with customers through in-app chat
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card 
            className="border-0 shadow-md bg-gradient-to-br from-secondary/10 to-secondary/5 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/washer/earnings')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">View Earnings</p>
                <p className="text-sm text-muted-foreground">Track your income</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myJobs.length}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile?.completed_jobs || 0}</p>
                <p className="text-sm text-muted-foreground">Completed Jobs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Jobs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-semibold">Available Jobs</h2>
            <Badge variant="secondary" className="ml-2">{availableRequests.length}</Badge>
          </div>
          
          {availableRequests.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Shirt className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No jobs available</h3>
                <p className="text-muted-foreground">
                  Check back later for new laundry requests!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Main Info */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{request.title}</h3>
                            <p className="text-sm text-muted-foreground">by {request.customerName}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{laundryTypeLabels[request.laundryType]}</Badge>
                            <Badge variant="secondary">{serviceLabels[request.serviceType]}</Badge>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
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
                          <div className="flex items-center gap-1">
                            <Weight className="w-4 h-4" />
                            <span>{request.weight}kg</span>
                          </div>
                        </div>
                        
                        {request.specialInstructions && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                            <span className="font-medium">Note: </span>
                            {request.specialInstructions}
                          </div>
                        )}
                      </div>
                      
                      {/* Price & Actions */}
                      <div className="lg:w-56 p-6 bg-muted/30 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 border-t lg:border-t-0 lg:border-l border-border">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-gradient">${request.price}</p>
                          <p className="text-xs text-muted-foreground">Payout</p>
                        </div>
                        <div className="flex flex-col gap-2 w-full lg:w-auto">
                          <Button 
                            onClick={() => handleAcceptJob(request)}
                            className="bg-gradient-primary hover:opacity-90"
                          >
                            Accept Job
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleOpenChat(request.customerId, request.customerName)}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Jobs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-display font-semibold">My Jobs</h2>
            <Badge variant="secondary" className="ml-2">{myJobs.length}</Badge>
          </div>
          
          {myJobs.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Accept a job above to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myJobs.map((job) => (
                <Card 
                  key={job.id} 
                  className="border-0 shadow-md hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{job.title}</h3>
                          <Badge variant="secondary">Accepted</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Customer: {job.customerName}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenChat(job.customerId, job.customerName)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                        <div className="text-right">
                          <p className="text-xl font-bold">${job.price}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Chat Dialog */}
      {selectedCustomer && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversationId={null}
          otherUserName={selectedCustomer.name}
          otherUserId={selectedCustomer.id}
        />
      )}
    </div>
  );
}
