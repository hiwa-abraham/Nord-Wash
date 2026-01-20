/**
 * SessionSettingsTab - Manage session security settings
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Clock, 
  Shield, 
  Lock, 
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Key,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';

interface SessionSettings {
  session_timeout_minutes: number;
  warning_before_logout_minutes: number;
  require_reauth_for_payments: boolean;
  require_reauth_for_profile_changes: boolean;
  require_reauth_for_admin_actions: boolean;
  max_concurrent_sessions: number;
  session_extension_enabled: boolean;
  audit_log_retention_days: number;
}

const DEFAULT_SETTINGS: SessionSettings = {
  session_timeout_minutes: 15,
  warning_before_logout_minutes: 2,
  require_reauth_for_payments: true,
  require_reauth_for_profile_changes: false,
  require_reauth_for_admin_actions: true,
  max_concurrent_sessions: 3,
  session_extension_enabled: true,
  audit_log_retention_days: 90,
};

export function SessionSettingsTab() {
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'session_security')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load session settings');
    } else if (data && data.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
      const loadedSettings = data.value as unknown as SessionSettings;
      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
      setOriginalSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
    }
    
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);

    // Check if settings exist
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'session_security')
      .single();

    let error;
    if (existing) {
      // Update existing
      const result = await supabase
        .from('settings')
        .update({ 
          value: settings as unknown as Record<string, never>,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'session_security');
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from('settings')
        .insert([{
          key: 'session_security',
          value: settings as unknown as Record<string, never>,
          description: 'Session security and timeout settings'
        }]);
      error = result.error;
    }

    if (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } else {
      setOriginalSettings(settings);
      toast.success('Settings saved successfully');
    }

    setIsSaving(false);
  };

  const updateSetting = <K extends keyof SessionSettings>(
    key: K, 
    value: SessionSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Timeout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Session Timeout
          </CardTitle>
          <CardDescription>
            Configure automatic logout after inactivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Inactivity Timeout</Label>
                <span className="text-sm font-medium">
                  {settings.session_timeout_minutes} minutes
                </span>
              </div>
              <Slider
                value={[settings.session_timeout_minutes]}
                onValueChange={([value]) => updateSetting('session_timeout_minutes', value)}
                min={5}
                max={60}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Users will be automatically logged out after this period of inactivity
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Warning Before Logout</Label>
                <span className="text-sm font-medium">
                  {settings.warning_before_logout_minutes} minutes
                </span>
              </div>
              <Slider
                value={[settings.warning_before_logout_minutes]}
                onValueChange={([value]) => updateSetting('warning_before_logout_minutes', value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Show a warning dialog this many minutes before automatic logout
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Allow Session Extension</Label>
                <p className="text-xs text-muted-foreground">
                  Let users extend their session from the warning dialog
                </p>
              </div>
              <Switch
                checked={settings.session_extension_enabled}
                onCheckedChange={(checked) => updateSetting('session_extension_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Re-authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Re-authentication Requirements
          </CardTitle>
          <CardDescription>
            Require password confirmation for sensitive operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                Payments
                <Shield className="h-4 w-4 text-green-600" />
              </Label>
              <p className="text-xs text-muted-foreground">
                Require re-authentication before processing payments
              </p>
            </div>
            <Switch
              checked={settings.require_reauth_for_payments}
              onCheckedChange={(checked) => updateSetting('require_reauth_for_payments', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Profile Changes</Label>
              <p className="text-xs text-muted-foreground">
                Require re-authentication when updating profile information
              </p>
            </div>
            <Switch
              checked={settings.require_reauth_for_profile_changes}
              onCheckedChange={(checked) => updateSetting('require_reauth_for_profile_changes', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                Admin Actions
                <Shield className="h-4 w-4 text-orange-600" />
              </Label>
              <p className="text-xs text-muted-foreground">
                Require re-authentication for admin-level operations
              </p>
            </div>
            <Switch
              checked={settings.require_reauth_for_admin_actions}
              onCheckedChange={(checked) => updateSetting('require_reauth_for_admin_actions', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Additional security configuration options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Maximum Concurrent Sessions</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={settings.max_concurrent_sessions}
                onChange={(e) => updateSetting('max_concurrent_sessions', parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of devices a user can be logged in from simultaneously
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Audit Log Retention</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={settings.audit_log_retention_days}
                onChange={(e) => updateSetting('audit_log_retention_days', parseInt(e.target.value) || 30)}
                min={7}
                max={365}
                className="w-24"
              />
              <span className="text-sm">days</span>
              <p className="text-xs text-muted-foreground flex-1">
                Audit logs older than this will be automatically deleted
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Recommendations</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">
            • For high-security environments, consider a 5-10 minute session timeout
          </p>
          <p className="text-sm">
            • Always require re-authentication for payment operations
          </p>
          <p className="text-sm">
            • Limit concurrent sessions to prevent account sharing
          </p>
        </AlertDescription>
      </Alert>

      {/* Save Button */}
      <div className="flex items-center justify-between sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600">You have unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">All changes saved</span>
            </>
          )}
        </div>
        <Button
          onClick={saveSettings}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
