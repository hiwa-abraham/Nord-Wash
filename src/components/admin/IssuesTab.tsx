import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-actions';
import { useAuth } from '@/contexts/AuthContext';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

interface Issue {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  source: 'user' | 'internal';
  reporter_email: string | null;
  created_at: string;
}

const priorityRank: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const priorityColor: Record<Priority, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
};

export function IssuesTab() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const fetchIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else {
      const sorted = [...(data as Issue[])].sort((a, b) => {
        // Open issues first, then by priority, then newest
        const aOpen = a.status === 'open' || a.status === 'in_progress' ? 0 : 1;
        const bOpen = b.status === 'open' || b.status === 'in_progress' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setIssues(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { fetchIssues(); }, []);

  const create = async () => {
    if (!title.trim() || !user) return;
    const { data, error } = await supabase.from('issues').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      source: 'internal',
      reporter_id: user.id,
      reporter_email: user.email ?? null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await logAdminAction('issue.create', 'issue', data.id, { priority, title });
    toast.success('Issue created');
    setOpen(false); setTitle(''); setDescription(''); setPriority('medium');
    fetchIssues();
  };

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from('issues').update({
      status,
      resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null,
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    await logAdminAction('issue.status_change', 'issue', id, { status });
    fetchIssues();
  };

  const updatePriority = async (id: string, p: Priority) => {
    const { error } = await supabase.from('issues').update({ priority: p }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    await logAdminAction('issue.priority_change', 'issue', id, { priority: p });
    fetchIssues();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New issue</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create issue</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={create} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : issues.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No issues yet</Card>
      ) : (
        issues.map((i) => (
          <Card key={i.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{i.title}</p>
                {i.description && <p className="text-xs text-muted-foreground line-clamp-2">{i.description}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  {i.source === 'user' ? `From ${i.reporter_email ?? 'user'}` : 'Internal'} · {new Date(i.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge className={priorityColor[i.priority]}>{i.priority}</Badge>
            </div>
            <div className="flex gap-2">
              <Select value={i.priority} onValueChange={(v) => updatePriority(i.id, v as Priority)}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v as Status)}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
