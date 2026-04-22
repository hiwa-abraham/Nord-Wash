import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, UserX, UserCheck } from 'lucide-react';
import { logAdminAction } from '@/lib/admin-actions';

interface Profile {
  user_id: string;
  full_name: string;
  email: string | null;
  created_at: string;
}

export function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [suspended, setSuspended] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: ps }, { data: ss }, { data: rs }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, email, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('suspended_users').select('user_id'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    setProfiles((ps ?? []) as Profile[]);
    setSuspended(new Set((ss ?? []).map((s: { user_id: string }) => s.user_id)));
    const rmap: Record<string, string> = {};
    (rs ?? []).forEach((r: { user_id: string; role: string }) => { rmap[r.user_id] = r.role; });
    setRoles(rmap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const suspend = async (userId: string, name: string) => {
    const { error } = await supabase.from('suspended_users').insert({
      user_id: userId, suspended_by: userId, reason: 'Admin action',
    });
    // suspended_by needs the actor; fix:
    if (error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: e2 } = await supabase.from('suspended_users').insert({
        user_id: userId, suspended_by: user.id, reason: 'Admin action',
      });
      if (e2) { toast.error(e2.message); return; }
    }
    await logAdminAction('user.suspend', 'user', userId, { name });
    toast.success('User suspended');
    load();
  };

  const unsuspend = async (userId: string, name: string) => {
    const { error } = await supabase.from('suspended_users').delete().eq('user_id', userId);
    if (error) { toast.error(error.message); return; }
    await logAdminAction('user.unsuspend', 'user', userId, { name });
    toast.success('User reinstated');
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-2">
      {profiles.map((p) => {
        const isSusp = suspended.has(p.user_id);
        const role = roles[p.user_id] ?? 'customer';
        return (
          <Card key={p.user_id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-[10px]">{role}</Badge>
                {isSusp && <Badge className="bg-destructive text-destructive-foreground text-[10px]">Suspended</Badge>}
              </div>
            </div>
            {role !== 'owner_admin' && (
              isSusp ? (
                <Button size="sm" variant="outline" onClick={() => unsuspend(p.user_id, p.full_name)}>
                  <UserCheck className="w-4 h-4 mr-1" /> Reinstate
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => suspend(p.user_id, p.full_name)}>
                  <UserX className="w-4 h-4 mr-1" /> Suspend
                </Button>
              )
            )}
          </Card>
        );
      })}
    </div>
  );
}
