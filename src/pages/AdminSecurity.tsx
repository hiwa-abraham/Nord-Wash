/**
 * AdminSecurity - Security Incident Response Dashboard
 * 
 * Admin-only page for viewing security events, audit logs, and session settings.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  ArrowLeft,
  Bell,
  FileText,
  Clock,
  User,
  RefreshCw,
  Database,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AuditLogsTab } from '@/components/admin/AuditLogsTab';
import { SessionSettingsTab } from '@/components/admin/SessionSettingsTab';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  user_id: string | null;
  ip_address: string | null;
  metadata: Json;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

const severityConfig: Record<string, { icon: typeof AlertCircle; color: string; bg: string }> = {
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  error: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
};

export default function AdminSecurity() {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate('/auth');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchSecurityEvents();
    }
  }, [user, role]);

  const fetchSecurityEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching security events:', error);
      toast.error('Failed to load security events');
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  const acknowledgeEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('security_events')
      .update({ 
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id 
      })
      .eq('id', eventId);

    if (error) {
      toast.error('Failed to acknowledge event');
    } else {
      toast.success('Event acknowledged');
      fetchSecurityEvents();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unacknowledgedCount = events.filter(e => !e.acknowledged_at).length;
  const criticalCount = events.filter(e => e.severity === 'critical' && !e.acknowledged_at).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Security Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor security events and incident response procedures
            </p>
          </div>
          <Button onClick={fetchSecurityEvents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className={criticalCount > 0 ? 'border-red-500 bg-red-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Critical Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-600" />
                Unacknowledged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unacknowledgedCount}</div>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">Last 100 events</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Security Events</span>
              <span className="sm:hidden">Events</span>
              {unacknowledgedCount > 0 && (
                <Badge variant="destructive" className="ml-1">{unacknowledgedCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Logs</span>
              <span className="sm:hidden">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Session Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="playbook" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Incident Playbook</span>
              <span className="sm:hidden">Playbook</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>
                  Real-time security event monitoring and alerting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No security events recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => {
                        const config = severityConfig[event.severity] || severityConfig.info;
                        const Icon = config.icon;
                        
                        return (
                          <div 
                            key={event.id} 
                            className={`p-4 rounded-lg border ${event.acknowledged_at ? 'opacity-60' : ''} ${config.bg}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{event.event_type}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {event.severity}
                                    </Badge>
                                    {event.acknowledged_at && (
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Acknowledged
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{event.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(event.created_at), 'PPpp')}
                                    </span>
                                    {event.user_id && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {event.user_id.slice(0, 8)}...
                                      </span>
                                    )}
                                    {event.ip_address && (
                                      <span>IP: {event.ip_address}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!event.acknowledged_at && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => acknowledgeEvent(event.id)}
                                >
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsTab />
          </TabsContent>

          <TabsContent value="settings">
            <SessionSettingsTab />
          </TabsContent>

          <TabsContent value="playbook">
            <IncidentResponsePlaybook />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function IncidentResponsePlaybook() {
  return (
    <div className="space-y-6">
      {/* Step 1: Isolate & Contain */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold">1</span>
            ISOLATE & CONTAIN (Immediate)
          </CardTitle>
          <CardDescription>First priority actions - Execute within minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Take Vulnerable Endpoint Offline
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              If you cannot isolate the specific component, take the affected service down entirely. This is your top priority.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              Block the Exposure
            </h4>
            <ul className="text-sm text-muted-foreground pl-6 space-y-1">
              <li>• Public S3 bucket → Change permissions to private</li>
              <li>• Unprotected API → Disable the endpoint</li>
              <li>• Debug file exposed → Remove it immediately</li>
              <li>• RLS misconfigured → Apply restrictive policies</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-600" />
              Preserve Logs
            </h4>
            <p className="text-sm text-muted-foreground pl-6">
              Secure and backup all relevant application, database, and server logs for forensic investigation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Assess Scope */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold">2</span>
            ASSESS THE SCOPE (Within Hours)
          </CardTitle>
          <CardDescription>Determine the extent of the breach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Critical Questions to Answer:</h4>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                Exactly what data was exposed? (Names, emails, addresses, phone numbers, order history?)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                For how long has it been exposed?
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                Was it actively accessed by unauthorized parties? (Check access logs for suspicious IPs/bot traffic)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                How many users/customers are affected?
              </li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Legal Requirements</h4>
            <p className="text-sm text-yellow-700">
              Engage your Data Privacy Officer/Legal team immediately. There are strict timelines 
              (often <strong>72 hours</strong>) for notifying authorities under GDPR, CCPA, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Communicate */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">3</span>
            COMMUNICATE (Carefully & Legally)
          </CardTitle>
          <CardDescription>Coordinate internal and external communications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Internal Communication</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Inform executive team</li>
                <li>• Brief PR/Legal departments</li>
                <li>• Prepare unified internal statement</li>
                <li>• Establish communication chain</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">External Communication</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Wait for Legal approval</li>
                <li>• Notify affected customers</li>
                <li>• Notify regulators if required</li>
                <li>• Be transparent about:</li>
                <li className="pl-4">- What happened</li>
                <li className="pl-4">- What data was involved</li>
                <li className="pl-4">- What you've done to fix it</li>
                <li className="pl-4">- Steps users should take</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Remediate */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold">4</span>
            REMEDIATE & PREVENT
          </CardTitle>
          <CardDescription>Fix the vulnerability and prevent recurrence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Immediate Fixes</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Patch the specific vulnerability</li>
              <li>• Review and update RLS policies</li>
              <li>• Rotate any exposed credentials</li>
              <li>• Force password resets if needed</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Long-term Prevention</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Conduct full security audit</li>
              <li>• Implement automated security scanning</li>
              <li>• Set up real-time alerting for suspicious activity</li>
              <li>• Update security documentation and training</li>
              <li>• Schedule regular security reviews</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>Key personnel for security incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Security Lead</p>
              <p className="text-muted-foreground">security@company.com</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Legal/DPO</p>
              <p className="text-muted-foreground">legal@company.com</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Executive Team</p>
              <p className="text-muted-foreground">exec@company.com</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
