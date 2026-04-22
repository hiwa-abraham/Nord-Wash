import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Search, Trash2, UserCheck, UserCog, UserX } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

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
    setBusyUserId(userId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusyUserId(null);
      return;
    }

    const { error } = await supabase.from('suspended_users').insert({
      user_id: userId,
      suspended_by: user.id,
      reason: 'Owner action',
    });
    if (error) { toast.error(error.message); setBusyUserId(null); return; }
    await logAdminAction('user.suspend', 'user', userId, { name });
    toast.success('User suspended');
    await load();
    setBusyUserId(null);
  };

  const unsuspend = async (userId: string, name: string) => {
    setBusyUserId(userId);
    const { error } = await supabase.from('suspended_users').delete().eq('user_id', userId);
    if (error) { toast.error(error.message); setBusyUserId(null); return; }
    await logAdminAction('user.unsuspend', 'user', userId, { name });
    toast.success('User reinstated');
    await load();
    setBusyUserId(null);
  };

  const updateRole = async (userId: string, name: string, role: string) => {
    setBusyUserId(userId);
    const { data, error } = await supabase.rpc('set_user_role', {
      _user_id: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      setBusyUserId(null);
      return;
    }
    await logAdminAction('user.role_change', 'user', userId, { name, role: data ?? role });
    toast.success('Role updated');
    await load();
    setBusyUserId(null);
  };

  const removeUser = async (userId: string, name: string) => {
    setBusyUserId(userId);
    const { error } = await supabase.rpc('delete_user_account', { _user_id: userId });
    if (error) {
      toast.error(error.message);
      setBusyUserId(null);
      return;
    }
    await logAdminAction('user.delete', 'user', userId, { name });
    toast.success('User removed');
    await load();
    setBusyUserId(null);
  };

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) => {
      const role = roles[profile.user_id] ?? 'customer';
      return [profile.full_name, profile.email ?? '', role]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [profiles, roles, search]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users by name, email, or role"
          className="pl-9"
        />
      </div>

      {filteredProfiles.map((p) => {
        const isSusp = suspended.has(p.user_id);
        const role = roles[p.user_id] ?? 'customer';
        const isBusy = busyUserId === p.user_id;
        return (
          <Card key={p.user_id} className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Joined {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap justify-end">
                <Badge variant="outline" className="text-[10px]">{role}</Badge>
                {isSusp && <Badge className="bg-destructive text-destructive-foreground text-[10px]">Suspended</Badge>}
              </div>
            </div>

            {role !== 'owner_admin' && (
              <div className="grid gap-3 md:grid-cols-[minmax(0,180px)_1fr] md:items-center">
                <Select value={role} onValueChange={(value) => updateRole(p.user_id, p.full_name, value)} disabled={isBusy}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Change role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="washer">Washer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  {isSusp ? (
                    <Button size="sm" variant="outline" onClick={() => unsuspend(p.user_id, p.full_name)} disabled={isBusy}>
                      <UserCheck className="w-4 h-4 mr-1" /> Reinstate
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => suspend(p.user_id, p.full_name)} disabled={isBusy}>
                      <UserX className="w-4 h-4 mr-1" /> Suspend
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => updateRole(p.user_id, p.full_name, 'admin')} disabled={isBusy || role === 'admin'}>
                    <UserCog className="w-4 h-4 mr-1" /> Make admin
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeUser(p.user_id, p.full_name)} disabled={isBusy}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {filteredProfiles.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No users match your search.</Card>
      )}
    </div>
  );
}
