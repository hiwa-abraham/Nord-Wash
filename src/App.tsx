/**
 * App.tsx - Main Application Entry Point
 * 
 * This is the root component of the FreshFold laundry platform.
 * It sets up the core providers and routing for the application.
 * 
 * Provider Hierarchy:
 * 1. QueryClientProvider - TanStack Query for server state management
 * 2. AuthProvider - Custom authentication context for user state
 * 3. TooltipProvider - Radix UI tooltips support
 * 4. BrowserRouter - React Router for client-side routing
 * 
 * Routes:
 * - / : Landing page (public)
 * - /auth : Authentication page (login/signup with role selection)
 * - /customer : Customer dashboard (protected - clothes owners)
 * - /washer : Washer dashboard (protected - laundry providers)
 * - /services : Service catalog (public)
 * - /schedule-pickup : Pickup scheduling (protected)
 * - /help : Help center (public)
 * - * : 404 Not Found
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CustomerDashboard from "./pages/CustomerDashboard";
import WasherDashboard from "./pages/WasherDashboard";
import WasherEarnings from "./pages/WasherEarnings";
import Services from "./pages/Services";
import SchedulePickup from "./pages/SchedulePickup";
import Orders from "./pages/Orders";
import Help from "./pages/Help";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import AdminSecurity from "./pages/AdminSecurity";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import { SessionManager } from "@/components/SessionManager";

// Create a QueryClient instance for TanStack Query
// This manages caching, background updates, and stale data for API requests
const queryClient = new QueryClient();

const App = () => (
  // ErrorBoundary catches React errors and logs them
  <ErrorBoundary componentName="App">
    {/* QueryClientProvider enables React Query hooks throughout the app */}
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider manages user authentication state globally */}
      <AuthProvider>
        {/* TooltipProvider enables Radix UI tooltips */}
        <TooltipProvider>
          {/* Toast notifications for user feedback */}
          <Toaster />
          <Sonner />
          {/* Client-side routing */}
          <BrowserRouter>
            {/* Session timeout management - auto-logout after 15 min inactivity */}
            <SessionManager timeoutMinutes={15} warningMinutes={2} />
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/services" element={<Services />} />
                <Route path="/help" element={<Help />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                
                {/* Protected routes - require authentication */}
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/washer" element={<WasherDashboard />} />
                <Route path="/washer/earnings" element={<WasherEarnings />} />
                <Route path="/schedule-pickup" element={<SchedulePickup />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* Admin routes */}
                <Route path="/admin/security" element={<AdminSecurity />} />
                
                {/* Catch-all for 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
