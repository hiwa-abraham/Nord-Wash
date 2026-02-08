import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROOT_PATHS = ['/', '/index'];

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const isRoot = ROOT_PATHS.includes(location.pathname);

  if (isRoot) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
      onClick={() => navigate(-1)}
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}
