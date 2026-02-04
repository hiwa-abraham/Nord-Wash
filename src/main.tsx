import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initSecurityChecks, cleanupRateLimitEntries } from "./lib/security-utils";
import { setupGlobalErrorHandling } from "./lib/error-tracking";

// Initialize security checks on app startup
initSecurityChecks();

// Set up global error handling for uncaught errors
setupGlobalErrorHandling();

// Cleanup rate limit entries periodically (every 5 minutes)
setInterval(cleanupRateLimitEntries, 5 * 60 * 1000);

createRoot(document.getElementById("root")!).render(<App />);
