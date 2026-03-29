/**
 * SessionTimeoutWarning - Warning dialog before automatic logout
 */

import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) {
  const { t } = useTranslation();
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  
  const timeDisplay = minutes > 0 
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds} seconds`;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            {t('sessionTimeout.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p dangerouslySetInnerHTML={{ __html: t('sessionTimeout.message', { time: timeDisplay }) }} />
            <p>{t('sessionTimeout.stayQuestion')}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('sessionTimeout.logOutNow')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onExtend}
            className="bg-primary hover:bg-primary/90"
          >
            {t('sessionTimeout.stayLoggedIn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
