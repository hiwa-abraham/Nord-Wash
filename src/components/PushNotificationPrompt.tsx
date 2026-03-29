/**
 * PushNotificationPrompt - Component to request push notification permissions
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationPrompt() {
  const { t } = useTranslation();
  const { isSupported, permissionStatus, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isSupported || permissionStatus !== 'prompt' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{t('notifications.enableTitle')}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t('notifications.enableDesc')}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isRequesting}
              >
                {isRequesting ? t('notifications.enabling') : t('notifications.enable')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                {t('notifications.notNow')}
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
