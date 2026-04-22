import { supabase } from '@/integrations/supabase/client';

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc('log_admin_action', {
    _action: action,
    _target_type: targetType ?? null,
    _target_id: targetId ?? null,
    _metadata: metadata as never,
  });
  if (error) console.error('logAdminAction failed', error);
}
