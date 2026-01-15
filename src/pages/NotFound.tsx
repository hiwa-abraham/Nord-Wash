import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { secureLog } from "@/lib/secure-logger";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Log only the path, not query params which may contain sensitive data
    secureLog.warn("404 Error: Non-existent route accessed:", location.pathname.split('?')[0]);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-16 items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('notFound.title')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('notFound.message')}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t('notFound.returnHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
