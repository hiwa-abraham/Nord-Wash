/**
 * SecurityMetricsWidget - Real-time Security Metrics Display
 * 
 * Shows live metrics for blocked requests, rate limit hits, and failed auth attempts.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ShieldOff, 
  Ban, 
  Key, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  created_at: string;
  metadata: Json;
}

interface MetricCardProps {
  title: string;
  value: number;
  previousValue: number;
  icon: React.ElementType;
  color: string;
  description: string;
}

function MetricCard({ title, value, previousValue, icon: Icon, color, description }: MetricCardProps) {
  const trend = value - previousValue;
  const trendPercent = previousValue > 0 ? ((trend / previousValue) * 100).toFixed(1) : '0';
  
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-muted-foreground';
  
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{Math.abs(trend)} ({trendPercent}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SecurityMetricsWidget() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Fetch initial events from last 24 hours
    const fetchEvents = async () => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('security_events')
        .select('id, event_type, severity, description, created_at, metadata')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!error && data) {
        setEvents(data);
      }
    };

    fetchEvents();

    // Set up real-time subscription
    const channel = supabase
      .channel('security-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events',
        },
        (payload) => {
          const newEvent = payload.new as SecurityEvent;
          setEvents((prev) => [newEvent, ...prev].slice(0, 500));
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const lastHourEvents = events.filter(
      (e) => new Date(e.created_at) >= oneHourAgo
    );
    const previousHourEvents = events.filter(
      (e) => new Date(e.created_at) >= twoHoursAgo && new Date(e.created_at) < oneHourAgo
    );

    const countByType = (eventList: SecurityEvent[], types: string[]) =>
      eventList.filter((e) => 
        types.some((t) => e.event_type.toLowerCase().includes(t.toLowerCase()))
      ).length;

    // Categories for different metric types
    const blockedTypes = ['blocked', 'denied', 'rejected', 'forbidden', 'unauthorized_origin'];
    const rateLimitTypes = ['rate_limit', 'ratelimit', 'throttle', 'too_many'];
    const authFailTypes = ['auth_fail', 'login_fail', 'invalid_token', 'session_expired', 'unauthorized'];

    return {
      blockedRequests: {
        current: countByType(lastHourEvents, blockedTypes),
        previous: countByType(previousHourEvents, blockedTypes),
      },
      rateLimitHits: {
        current: countByType(lastHourEvents, rateLimitTypes),
        previous: countByType(previousHourEvents, rateLimitTypes),
      },
      failedAuth: {
        current: countByType(lastHourEvents, authFailTypes),
        previous: countByType(previousHourEvents, authFailTypes),
      },
      totalThreats: {
        current: lastHourEvents.filter((e) => 
          ['critical', 'error', 'warning'].includes(e.severity)
        ).length,
        previous: previousHourEvents.filter((e) => 
          ['critical', 'error', 'warning'].includes(e.severity)
        ).length,
      },
    };
  }, [events]);

  // Severity breakdown for the progress bars
  const severityBreakdown = useMemo(() => {
    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    events.forEach((e) => {
      if (e.severity in counts) {
        counts[e.severity as keyof typeof counts]++;
      }
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Live Status Indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-Time Security Metrics
        </h3>
        <Badge variant={isLive ? 'default' : 'secondary'} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground'}`} />
          {isLive ? 'Live' : 'Connecting...'}
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Blocked Requests"
          value={metrics.blockedRequests.current}
          previousValue={metrics.blockedRequests.previous}
          icon={Ban}
          color="bg-red-500"
          description="Last hour"
        />
        <MetricCard
          title="Rate Limit Hits"
          value={metrics.rateLimitHits.current}
          previousValue={metrics.rateLimitHits.previous}
          icon={ShieldOff}
          color="bg-orange-500"
          description="Last hour"
        />
        <MetricCard
          title="Failed Auth Attempts"
          value={metrics.failedAuth.current}
          previousValue={metrics.failedAuth.previous}
          icon={Key}
          color="bg-yellow-500"
          description="Last hour"
        />
        <MetricCard
          title="Total Threats"
          value={metrics.totalThreats.current}
          previousValue={metrics.totalThreats.previous}
          icon={Zap}
          color="bg-purple-500"
          description="Last hour"
        />
      </div>

      {/* Severity Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Event Severity Distribution (Last 24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Critical
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={severityBreakdown.total > 0 ? (severityBreakdown.counts.critical / severityBreakdown.total) * 100 : 0} 
                  className="w-32 h-2"
                />
                <span className="w-8 text-right font-medium">{severityBreakdown.counts.critical}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                Error
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={severityBreakdown.total > 0 ? (severityBreakdown.counts.error / severityBreakdown.total) * 100 : 0} 
                  className="w-32 h-2"
                />
                <span className="w-8 text-right font-medium">{severityBreakdown.counts.error}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                Warning
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={severityBreakdown.total > 0 ? (severityBreakdown.counts.warning / severityBreakdown.total) * 100 : 0} 
                  className="w-32 h-2"
                />
                <span className="w-8 text-right font-medium">{severityBreakdown.counts.warning}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Info
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={severityBreakdown.total > 0 ? (severityBreakdown.counts.info / severityBreakdown.total) * 100 : 0} 
                  className="w-32 h-2"
                />
                <span className="w-8 text-right font-medium">{severityBreakdown.counts.info}</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Total: {severityBreakdown.total} events in last 24 hours
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
