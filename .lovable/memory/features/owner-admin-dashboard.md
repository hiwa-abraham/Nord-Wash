---
name: Owner Admin Dashboard
description: Single owner_admin role gated by allowlisted email + TOTP 2FA, with issues/users/activity/emergency tabs
type: feature
---
- New role `owner_admin` (4th role; superset of admin). Only ONE may exist — enforced by DB trigger `enforce_single_owner_admin`.
- Owner email allowlist stored in `admin_settings.owner_email` (currently `admin@test.local`). `auto_promote_owner_admin` trigger on `auth.users` auto-grants role on signup if email matches.
- 2FA: Supabase TOTP MFA enforced via `OwnerAdminGuard`. Requires verified TOTP factor + AAL2 session before `/admin` renders.
- Tables:
  - `admin_settings` (key/value, owner-only writes; public read of `maintenance_mode`)
  - `issues` (priority enum critical/high/medium/low, status, source user/internal). Users create their own; owner manages all. Sorted open→priority→date.
  - `admin_action_logs` (every owner action via `log_admin_action(action, target_type, target_id, metadata)`)
  - `suspended_users` (owner-only). `Layout` checks and hard-blocks suspended users.
- Maintenance mode: kill-switch in admin_settings; `Layout` blocks all non-owner users when enabled.
- Frontend route `/admin` (AdminDashboard) — hidden from non-owners (redirect to `/`). Sidebar link only visible to owner.
- Helpers: `src/lib/admin-actions.ts` exports `logAdminAction()` wrapper around RPC.
