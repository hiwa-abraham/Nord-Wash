import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props { onComplete: () => void }

export function TotpEnrollDialog({ onComplete }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Clean any unverified factor first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverified = factors?.totp?.find((f) => f.status !== 'verified');
      if (unverified) {
        await supabase.auth.mfa.unenroll({ factorId: unverified.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Owner Admin ${Date.now()}`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setQr(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      }
      setLoading(false);
    })();
  }, []);

  const verify = async () => {
    if (!factorId) return;
    setLoading(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !ch) { toast.error(chErr?.message ?? 'Challenge failed'); setLoading(false); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId, challengeId: ch.id, code,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('2FA enabled');
    onComplete();
  };

  if (loading && !qr) {
    return <Loader2 className="w-5 h-5 animate-spin" />;
  }

  return (
    <div className="space-y-4">
      {qr && (
        <div className="flex flex-col items-center gap-3">
          <img src={qr} alt="TOTP QR code" className="w-48 h-48 bg-white p-2 rounded" />
          <p className="text-xs text-muted-foreground break-all text-center">
            Or enter manually: <code className="font-mono">{secret}</code>
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="totp">6-digit code</Label>
        <Input id="totp" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      </div>
      <Button onClick={verify} disabled={code.length !== 6 || loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & enable'}
      </Button>
    </div>
  );
}
