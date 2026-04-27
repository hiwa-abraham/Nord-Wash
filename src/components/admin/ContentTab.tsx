import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/admin-actions';

export function ContentTab() {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['homepage_hero_title', 'homepage_hero_subtitle']);
      const map = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
      const t = map.get('homepage_hero_title');
      const st = map.get('homepage_hero_subtitle');
      if (typeof t === 'string') setTitle(t);
      if (typeof st === 'string') setSubtitle(st);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('update_homepage_content', {
      _hero_title: title,
      _hero_subtitle: subtitle,
    });
    if (error) toast.error(error.message);
    else {
      await logAdminAction('content.homepage_update', 'content', 'homepage_hero', { title, subtitle });
      toast.success('Homepage content updated');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <Card className="p-4 space-y-4">
      <div>
        <p className="font-semibold">Homepage hero</p>
        <p className="text-xs text-muted-foreground">Public landing page headline shown to all visitors.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-title">Title</Label>
        <Input id="hero-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome to NordWash" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-subtitle">Subtitle</Label>
        <Textarea id="hero-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Premium laundry, picked up at your door." rows={3} />
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
        Save
      </Button>
    </Card>
  );
}
