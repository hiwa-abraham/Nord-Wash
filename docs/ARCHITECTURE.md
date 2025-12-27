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
│   └── ui/                    # Shadcn UI components
│
├── hooks/
│   ├── useServices.ts         # Service management hook
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
