import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initSecurityChecks, cleanupRateLimitEntries } from "./lib/security-utils";

// Initialize security checks on app startup
initSecurityChecks();

// Cleanup rate limit entries periodically (every 5 minutes)
setInterval(cleanupRateLimitEntries, 5 * 60 * 1000);

createRoot(document.getElementById("root")!).render(<App />);
