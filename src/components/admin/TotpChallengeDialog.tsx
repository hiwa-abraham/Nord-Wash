import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props { onComplete: () => void }

export function TotpChallengeDialog({ onComplete }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f) => f.status === 'verified');
    if (!factor) { toast.error('No TOTP factor'); setLoading(false); return; }
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (chErr || !ch) { toast.error(chErr?.message ?? 'Challenge failed'); setLoading(false); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId: factor.id, challengeId: ch.id, code,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Verified');
    onComplete();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="otp">Authenticator code</Label>
        <Input id="otp" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
      </div>
      <Button onClick={submit} disabled={code.length !== 6 || loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
      </Button>
    </div>
  );
}
