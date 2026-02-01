# FreshFold Laundry Platform - Architecture Documentation

## Overview

FreshFold is a two-sided marketplace connecting **Clothes Owners** (customers) who need laundry services with **Laundry Providers** (washers) who perform the service.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   Index     │   │    Auth     │   │  Customer   │   │   Washer    │    │
│  │   Page      │   │    Page     │   │  Dashboard  │   │  Dashboard  │    │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
│         │                │                  │                │             │
│         └────────────────┴──────────────────┴────────────────┘             │
│                                    │                                        │
│                          ┌─────────▼─────────┐                             │
│                          │   AuthContext     │                             │
│                          │   (Global State)  │                             │
│                          └─────────┬─────────┘                             │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         │                          │                          │            │
│  ┌──────▼──────┐           ┌───────▼───────┐          ┌───────▼───────┐   │
│  │   Hooks     │           │  Components   │          │    Types      │   │
│  │ useServices │           │  ChatDialog   │          │   (models)    │   │
│  │ useAuth     │           │  CreateReq    │          └───────────────┘   │
│  └─────────────┘           └───────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Supabase Client SDK
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOVABLE CLOUD (Supabase)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        AUTHENTICATION                                │   │
│  │  • Email/Password Sign Up & Sign In                                 │   │
│  │  • Auto-confirm enabled (development)                               │   │
│  │  • User metadata stored on signup (full_name, role)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATABASE (PostgreSQL)                        │   │
│  │                                                                      │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │   │
│  │  │  profiles    │    │  user_roles  │    │conversations │          │   │
│  │  │              │    │              │    │              │          │   │
│  │  │ • user_id    │    │ • user_id    │    │ • customer_id│          │   │
│  │  │ • full_name  │    │ • role       │    │ • washer_id  │          │   │
│  │  │ • email (!)  │    │   (enum)     │    │ • order_id   │          │   │
│  │  │ • phone (!)  │    └──────────────┘    └──────┬───────┘          │   │
│  │  │ • rating     │                               │                   │   │
│  │  │ • avatar_url │                               │                   │   │
│  │  └──────────────┘                               ▼                   │   │
│  │                                          ┌──────────────┐          │   │
│  │   (!) = Admin-only visible               │   messages   │          │   │
│  │                                          │              │          │   │
│  │                                          │ • sender_id  │          │   │
│  │                                          │ • content    │          │   │
│  │                                          │ • read_at    │          │   │
│  │                                          └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ROW LEVEL SECURITY (RLS)                          │   │
│  │                                                                      │   │
│  │  • Users can only view/update their own profile                     │   │
│  │  • Users can only view their own roles                              │   │
│  │  • Admins can view all profiles and roles                           │   │
│  │  • Users can only access conversations they're part of              │   │
│  │  • Messages inherit access from parent conversation                 │   │
│  │  • Phone/Email visible only to admin via has_role() function        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         REALTIME                                     │   │
│  │                                                                      │   │
│  │  • messages table enabled for realtime subscriptions                │   │
│  │  • Instant message delivery via postgres_changes                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## User Roles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ROLES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐   │
│   │     CUSTOMER      │   │      WASHER       │   │      ADMIN        │   │
│   │   (Clothes Owner) │   │(Laundry Provider) │   │  (App Owner)      │   │
│   ├───────────────────┤   ├───────────────────┤   ├───────────────────┤   │
│   │                   │   │                   │   │                   │   │
│   │ • Create laundry  │   │ • View available  │   │ • View all users  │   │
│   │   requests        │   │   jobs            │   │   and data        │   │
│   │                   │   │                   │   │                   │   │
│   │ • Track request   │   │ • Accept jobs     │   │ • See phone and   │   │
│   │   status          │   │                   │   │   email of users  │   │
│   │                   │   │ • Complete jobs   │   │                   │   │
│   │ • Chat with       │   │                   │   │ • Manage services │   │
│   │   assigned washer │   │ • Chat with       │   │                   │   │
│   │                   │   │   customers       │   │ • View analytics  │   │
│   │ • View washer's   │   │                   │   │                   │   │
│   │   public profile  │   │ • Build rating    │   │                   │   │
│   │                   │   │                   │   │                   │   │
│   └───────────────────┘   └───────────────────┘   └───────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ORDER LIFECYCLE                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CUSTOMER                                         WASHER                    │
│   ────────                                         ──────                    │
│                                                                              │
│   ┌─────────────┐                                                            │
│   │ 1. Create   │                                                            │
│   │   Request   │──────────────────────────────────────▶ Available Jobs     │
│   └─────────────┘                                         List              │
│         │                                                   │                │
│         │                                                   │                │
│         ▼                                                   ▼                │
│   ┌─────────────┐                                  ┌─────────────┐          │
│   │  PENDING    │◀────────────────────────────────│ 2. Accept   │          │
│   │   Status    │                                  │    Job      │          │
│   └─────────────┘                                  └─────────────┘          │
│         │                                                   │                │
│         │                    ┌─────────────┐               │                │
│         └───────────────────▶│  IN-APP     │◀──────────────┘                │
│                              │   CHAT      │                                 │
│                              │  (Realtime) │                                 │
│                              └─────────────┘                                 │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────┐            ┌─────────────┐                                │
│   │ 4. Receive  │◀───────────│ 3. Complete │                                │
│   │  Clothes    │            │    Job      │                                │
│   └─────────────┘            └─────────────┘                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Payment System

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT FLOW                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CUSTOMER                                                                    │
│   ────────                                                                    │
│                                                                              │
│   1. Select Services                                                          │
│      └─> Services Subtotal (e.g., €25.00)                                    │
│                                                                              │
│   2. Enter Contact Details                                                    │
│      └─> Pickup address, phone, email                                        │
│                                                                              │
│   3. Review Order                                                             │
│      └─> See price breakdown                                                 │
│                                                                              │
│   4. Payment Step                                                             │
│      ┌────────────────────────────────────────┐                              │
│      │  Price Breakdown:                      │                              │
│      │  ├─ Services Subtotal:    €25.00      │                              │
│      │  ├─ Service Fee:           €5.00      │                              │
│      │  ├─ Transport Fee:        €10.00      │                              │
│      │  └─ TOTAL:                €40.00      │                              │
│      └────────────────────────────────────────┘                              │
│                                                                              │
│      Payment Methods:                                                         │
│      ├─ 💳 Credit/Debit Card (Stripe - pending integration)                 │
│      └─ 🏦 Bank Transfer                                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT DISTRIBUTION                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Total Payment = Services + $5 Service Fee + $10 Transport Fee              │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   OWNER (Platform)              WASHER (Service Provider)          │   │
│   │   ─────────────────             ─────────────────────────          │   │
│   │                                                                     │   │
│   │   • $5 Service Fee              • 90% of Services                  │   │
│   │   • 10% of Services             • $10 Transport Fee                │   │
│   │                                                                     │   │
│   │   Example (€25 services):       Example (€25 services):            │   │
│   │   $5 + (€25 × 10%)             (€25 × 90%) + $10                   │   │
│   │   = $5 + €2.50                 = €22.50 + $10                      │   │
│   │   = €7.50                      = €32.50                            │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Database: orders table stores all amounts in cents for precision           │
│   ├─ services_total: Services subtotal in cents                             │
│   ├─ service_fee: Platform fee (default 500 = $5.00)                        │
│   ├─ transport_fee: Delivery fee (default 1000 = $10.00)                    │
│   ├─ total_amount: Complete order total in cents                            │
│   ├─ owner_amount: Platform's share in cents                                │
│   └─ washer_amount: Service provider's share in cents                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Messaging System

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        IN-APP MESSAGING FLOW                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────┐                                        ┌────────────┐      │
│   │  CUSTOMER  │                                        │   WASHER   │      │
│   └─────┬──────┘                                        └──────┬─────┘      │
│         │                                                      │            │
│         │  1. Open Chat                                        │            │
│         ├───────────────────────┐                              │            │
│         │                       ▼                              │            │
│         │              ┌─────────────────┐                     │            │
│         │              │  ChatDialog.tsx │                     │            │
│         │              └────────┬────────┘                     │            │
│         │                       │                              │            │
│         │  2. Check/Create      │                              │            │
│         │     Conversation      ▼                              │            │
│         │              ┌─────────────────┐                     │            │
│         │              │  conversations  │                     │            │
│         │              │     table       │                     │            │
│         │              └────────┬────────┘                     │            │
│         │                       │                              │            │
│         │  3. Send Message      ▼                              │            │
│         ├──────────────▶┌─────────────────┐                    │            │
│         │               │    messages     │                    │            │
│         │               │     table       │◀───────────────────┤            │
│         │               └────────┬────────┘     3. Reply       │            │
│         │                        │                             │            │
│         │  4. Realtime          │  4. Realtime                │            │
│         │     Update             ▼     Update                  │            │
│         │◀──────────────┌─────────────────┐───────────────────▶│            │
│         │               │   Supabase      │                    │            │
│         │               │   Realtime      │                    │            │
│         │               │   Channel       │                    │            │
│         │               └─────────────────┘                    │            │
│         ▼                                                      ▼            │
│   ┌─────────────┐                                        ┌─────────────┐   │
│   │ See message │                                        │ See message │   │
│   │  instantly  │                                        │  instantly  │   │
│   └─────────────┘                                        └─────────────┘   │
│                                                                              │
│   ⚠️  PRIVACY: Phone & Email are NEVER shown in chat or UI                  │
│       Only admin can access contact information via database                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── App.tsx                    # Main app entry with routing
├── main.tsx                   # React DOM render entry point
├── index.css                  # Global styles & design tokens
│
├── contexts/
│   └── AuthContext.tsx        # Authentication state management
│
├── pages/
│   ├── Index.tsx              # Landing page
│   ├── Auth.tsx               # Login/Signup with role selection
│   ├── CustomerDashboard.tsx  # Customer view (create requests, track)
│   ├── WasherDashboard.tsx    # Washer view (accept jobs, chat)
│   ├── Services.tsx           # Service catalog
│   ├── SchedulePickup.tsx     # Pickup scheduling
│   ├── Help.tsx               # Help center
│   └── NotFound.tsx           # 404 page
│
├── components/
│   ├── ChatDialog.tsx         # In-app messaging modal
│   ├── CreateRequestDialog.tsx # New laundry request form
│   ├── Header.tsx             # Navigation header
│   ├── payment/
│   │   └── PaymentStep.tsx    # Payment step component with fee breakdown
│   └── ui/                    # Shadcn UI components
│
├── hooks/
│   ├── useServices.ts         # Service management hook
│   ├── useCreateOrder.ts      # Order creation with payment distribution
│   └── use-toast.ts           # Toast notifications
│
├── types/
│   └── index.ts               # TypeScript type definitions
│
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client (auto-generated)
│       └── types.ts           # Database types (auto-generated)
│
└── data/
    └── mockData.ts            # Mock data for development
```

## Security Model

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. AUTHENTICATION (Supabase Auth)                                          │
│     ├── Email/Password authentication                                        │
│     ├── Session management via JWT tokens                                    │
│     └── Auto-confirm for development                                         │
│                                                                              │
│  2. AUTHORIZATION (Row Level Security)                                       │
│     ├── profiles: Users can only CRUD their own                             │
│     ├── user_roles: Users can only READ their own                           │
│     ├── conversations: Only participants can access                         │
│     └── messages: Inherited from conversation access                        │
│                                                                              │
│  3. DATA PRIVACY                                                             │
│     ├── Phone numbers: Only visible to admin                                │
│     ├── Email addresses: Only visible to admin                              │
│     └── get_public_profile(): Safe function for public data                 │
│                                                                              │
│  4. FUNCTION SECURITY                                                        │
│     ├── has_role(): SECURITY DEFINER to bypass RLS safely                   │
│     ├── get_user_role(): Safe role checking                                 │
│     └── handle_new_user(): Auto-creates profile on signup                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Infrastructure & Cloud Security

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE SECURITY ARCHITECTURE                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      NETWORK LAYER (Platform-Managed)                   │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ✓ Private Networking (VPC)                                            │ │
│  │    • Lovable Cloud runs on isolated VPC infrastructure                 │ │
│  │    • Database not exposed to public internet                           │ │
│  │    • Service-to-service communication via private endpoints            │ │
│  │                                                                        │ │
│  │  ✓ Firewall / Security Groups                                          │ │
│  │    • Only ports 443 (HTTPS) exposed                                    │ │
│  │    • Edge functions accessible only via API gateway                    │ │
│  │    • Database accessible only from authorized services                 │ │
│  │                                                                        │ │
│  │  ✓ DDoS Protection                                                     │ │
│  │    • Cloudflare-level protection at edge                               │ │
│  │    • Application-level rate limiting (see below)                       │ │
│  │    • Automatic traffic analysis and mitigation                         │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      ENVIRONMENT SEPARATION                             │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌─────────────────┐    ┌─────────────────┐                            │ │
│  │  │   TEST ENV      │    │   LIVE ENV      │                            │ │
│  │  │   (Staging)     │    │  (Production)   │                            │ │
│  │  ├─────────────────┤    ├─────────────────┤                            │ │
│  │  │ • Preview URL   │    │ • Published URL │                            │ │
│  │  │ • Dev data      │    │ • Real data     │                            │ │
│  │  │ • Safe testing  │    │ • User-facing   │                            │ │
│  │  └─────────────────┘    └─────────────────┘                            │ │
│  │                                                                        │ │
│  │  • Changes tested in TEST before deployment to LIVE                    │ │
│  │  • Database writes in TEST don't affect LIVE                           │ │
│  │  • Publishing deploys code + schema from TEST to LIVE                  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      MINIMAL IAM PERMISSIONS                            │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  Database Access (RLS Policies):                                       │ │
│  │  ┌───────────────────┬─────────────────────────────────────────────┐  │ │
│  │  │ Table             │ Access Rules                                │  │ │
│  │  ├───────────────────┼─────────────────────────────────────────────┤  │ │
│  │  │ profiles          │ Own data only (auth.uid() = user_id)       │  │ │
│  │  │ orders            │ Customer: own orders, Washer: assigned     │  │ │
│  │  │ conversations     │ Participants only                          │  │ │
│  │  │ messages          │ Inherited from conversation                │  │ │
│  │  │ audit_logs        │ Admin only                                 │  │ │
│  │  │ security_events   │ Admin only                                 │  │ │
│  │  │ user_roles        │ Own data only                              │  │ │
│  │  │ services          │ Public read, admin write                   │  │ │
│  │  │ settings          │ Public read, admin write                   │  │ │
│  │  └───────────────────┴─────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  Service Keys:                                                         │ │
│  │  • anon key: Limited, respects RLS                                     │ │
│  │  • service_role key: Edge functions only, never client-side            │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      ZERO-TRUST NETWORKING                              │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  Principle: "Never trust, always verify"                               │ │
│  │                                                                        │ │
│  │  Implementation (supabase/functions/_shared/):                         │ │
│  │  ├── security-middleware.ts                                            │ │
│  │  │   • JWT validation on every request                                 │ │
│  │  │   • Rate limiting by IP and user                                    │ │
│  │  │   • Origin validation                                               │ │
│  │  │   • Request body size limits                                        │ │
│  │  │                                                                     │ │
│  │  ├── zero-trust.ts                                                     │ │
│  │  │   • Token age verification                                          │ │
│  │  │   • User existence verification                                     │ │
│  │  │   • Permission verification                                         │ │
│  │  │   • Device fingerprinting                                           │ │
│  │  │   • Audit logging                                                   │ │
│  │  │                                                                     │ │
│  │  └── ip-validation.ts                                                  │ │
│  │      • IP allowlist/blocklist                                          │ │
│  │      • Data center IP detection                                        │ │
│  │      • Request pattern analysis                                        │ │
│  │      • Temporary IP blocking                                           │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      RATE LIMITING                                      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  Client-side (src/lib/rate-limit.ts):                                  │ │
│  │  ├── Form submissions: 5/minute                                        │ │
│  │  ├── API calls: 30/minute                                              │ │
│  │  ├── Auth attempts: 5/5 minutes                                        │ │
│  │  ├── Payment operations: 3/minute                                      │ │
│  │  └── Search queries: 20/minute                                         │ │
│  │                                                                        │ │
│  │  Server-side (supabase/functions/_shared/rate-limit.ts):               │ │
│  │  ├── standard: 60/minute                                               │ │
│  │  ├── strict: 10/minute                                                 │ │
│  │  ├── auth: 5/5 minutes                                                 │ │
│  │  ├── payment: 5/minute                                                 │ │
│  │  └── webhook: 100/minute                                               │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      SECURITY HEADERS                                   │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  Content Security Policy (CSP):                                        │ │
│  │  • default-src 'self'                                                  │ │
│  │  • script-src 'self' 'unsafe-inline' https://cdn.gpteng.co            │ │
│  │  • connect-src 'self' https://*.supabase.co wss://*.supabase.co       │ │
│  │  • frame-ancestors 'self' https://lovable.dev https://*.lovable.app   │ │
│  │  • upgrade-insecure-requests                                           │ │
│  │                                                                        │ │
│  │  Additional Headers:                                                    │ │
│  │  • X-Frame-Options: SAMEORIGIN                                         │ │
│  │  • X-Content-Type-Options: nosniff                                     │ │
│  │  • X-XSS-Protection: 1; mode=block                                     │ │
│  │  • Referrer-Policy: strict-origin-when-cross-origin                    │ │
│  │  • Permissions-Policy: geolocation=(self), camera=(), etc.             │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Using Security Middleware in Edge Functions

```typescript
// Example: Secure edge function with zero-trust validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  applySecurityMiddleware, 
  secureResponse, 
  logSecurityEvent 
} from "../_shared/security-middleware.ts";
import { requireZeroTrust } from "../_shared/zero-trust.ts";

serve(async (req) => {
  // Apply security middleware
  const security = await applySecurityMiddleware(req, {
    requireAuth: true,
    requiredRoles: ["admin"],
    rateLimit: "strict",
    validateOrigin: true,
  });

  if (!security.allowed) {
    return security.error;
  }

  // Additional zero-trust verification
  const zt = await requireZeroTrust(req, {
    verifyUserExists: true,
    verifySession: true,
    auditLog: true,
  });

  if ("error" in zt) {
    return zt.error;
  }

  // Proceed with business logic
  const { userId, supabaseClient } = security.context!;

  // Log the action
  await logSecurityEvent(supabaseClient, {
    eventType: "admin_action",
    description: "Admin performed sensitive action",
    severity: "info",
    userId,
    ipAddress: security.context!.ipAddress,
  });

  return secureResponse({ success: true });
});
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Shadcn UI |
| State | React Context, TanStack Query |
| Routing | React Router DOM |
| Backend | Lovable Cloud (Supabase) |
| Database | PostgreSQL |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Security | CSP, RLS, Zero-Trust, Rate Limiting |
