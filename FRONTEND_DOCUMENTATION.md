# Frontend Documentation

This document is the full reference for the frontend application in BiggsFrontend.

## 1) Overview

The frontend is a Next.js App Router project that provides the operations UI for:
- Authentication and session-aware navigation
- Dashboard and admin operations
- Fetch/job monitoring and manual actions
- File and combined-file viewing
- Booking manager flows
- Notifications and realtime indicators

Core stack:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS + custom UI components
- Socket.IO client + SSE utilities (mixed realtime support)
- Sonner toasts + custom dedupe utilities

## 2) Project Structure

Top-level frontend folders:
- `app/`: Route segments, layouts, providers, and page entrypoints
- `components/`: Shared components and feature clients
- `components/ui/`: Reusable UI primitives
- `hooks/`: Reusable client hooks
- `utils/`: Auth/API/toast utility modules
- `lib/`: Shared low-level helpers (`cn`, etc.)
- `styles/`: Style assets
- `public/`: Static assets

Primary configuration files:
- `package.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `.env.example`

## 3) Runtime and Rendering Model

- Uses App Router under `app/`.
- Root route (`/`) redirects behaviorally to dashboard by rendering `app/dashboard/page.tsx`.
- Shell and navigation behavior are handled by `components/client-shell.tsx`.
- Auth state is primarily token-based via browser storage helpers in `utils/auth.ts`.
- UI is largely client-rendered for operational interactivity.

## 4) Route and Page Map

Current pages (`app/**/page.tsx`):
- `/` -> `app/page.tsx`
- `/login` -> `app/login/page.tsx`
- `/dashboard` -> `app/dashboard/page.tsx`
- `/jobs` -> `app/jobs/page.tsx`
- `/jobs/[jobId]` -> `app/jobs/[jobId]/page.tsx`
- `/uploads` -> `app/uploads/page.tsx`
- `/files` -> `app/files/page.tsx`
- `/combined-files` -> `app/combined-files/page.tsx`
- `/combine` -> `app/combine/page.tsx`
- `/booking` -> `app/booking/page.tsx`
- `/manager/bookings` -> `app/manager/bookings/page.tsx`
- `/users` -> `app/users/page.tsx`
- `/settings` -> `app/settings/page.tsx`
- `/missing-scan` -> `app/missing-scan/page.tsx`
- `/my-reports` -> `app/my-reports/page.tsx`
- `/admin/csv-viewer` -> `app/admin/csv-viewer/page.tsx`
- `/admin/fetch-logs` -> `app/admin/fetch-logs/page.tsx`

Supporting app-level files:
- `app/layout.tsx`: Global metadata, font setup, shell/provider wiring
- `app/globals.css`: Global styling and theme variables
- `app/toaster-provider.tsx`: Toast provider mounting
- `app/context/MissingToastContext.tsx`: Missing-scan toast context

## 5) Navigation and Session UX

Main shell/navigation files:
- `components/client-shell.tsx`: Decides authenticated shell rendering, sidebar visibility, and mobile behavior
- `components/sidebar.tsx`: Role-aware navigation links with collapsed/mobile states
- `components/profile-menu.tsx`: User/profile actions and sign-out controls
- `components/notification-bell.tsx`: Notification panel with unread state and mark-read actions

Auth/session behavior summary:
- Access token persisted in localStorage
- User profile object persisted in localStorage
- `auth:token` and `auth:logout` custom events synchronize state across components
- `fetchWithAuth` utility handles authenticated requests and refresh/token flows

## 6) API Integration

Primary API utility modules:
- `utils/auth.ts`: Auth-aware fetch wrapper, token storage, CSRF handling, refresh behavior
- `utils/api.ts`: Domain helper wrappers for files/reports/branches endpoints

Backend base URL notes:
- App code primarily reads `NEXT_PUBLIC_API_BASE_URL`
- `.env.example` currently shows `NEXT_PUBLIC_API_URL`
- Recommended: standardize on a single variable (prefer `NEXT_PUBLIC_API_BASE_URL`) to avoid confusion

## 7) Realtime Features

Current realtime mechanisms:
- Notification and live updates through API polling and event patterns in components
- SSE helper hook exists in `hooks/use-sse.tsx`
- Socket.IO client dependency is installed and used by parts of the dashboard flow

Note:
- Backend notification SSE route was migrated toward Socket.IO; frontend keeps reusable SSE support for compatible endpoints.

## 8) Hooks and State Utilities

Hooks:
- `hooks/useDashboardStats.ts`: Dashboard polling stats with fallback behavior
- `hooks/use-sse.tsx`: Resilient EventSource hookup with reconnect/backoff
- `hooks/use-toast.ts`: Toast helper hook integration
- `hooks/use-mobile.tsx`: Viewport/mobile helper state

Context:
- `app/context/MissingToastContext.tsx`: Cross-page missing-report toast trigger/control

## 9) Component System

Feature client components (selected):
- `components/manual-fetch-client.tsx`
- `components/missing-scan-client.tsx`
- `components/missing-scan-result-table-client.tsx`
- `components/combine-client.tsx`
- `components/fetch-logs-client.tsx`
- `components/AdminRetentionPanel.tsx`
- `components/csv-viewer/CsvViewerClient.tsx`

UI primitives:
- Located in `components/ui/`
- Include form controls, dialogs, tables, alerts, navigation primitives, toasts, and utility wrappers
- `components/ui/Button.tsx` uses CVA-based variants and sizing system

Utility helper:
- `lib/utils.ts` exposes `cn()` for `clsx` + `tailwind-merge` composition

## 10) Styling and Theming

Styling stack:
- Tailwind CSS with CSS variable-driven theme tokens
- Global styles in `app/globals.css`
- Tailwind config in `tailwind.config.ts`

Theming notes:
- `darkMode: ['class']` configured in Tailwind
- Root layout comments indicate previous theme provider mismatch concerns

## 11) Security and Next.js Configuration

Important `next.config.mjs` behavior:
- Security headers (CSP, frame, referrer, permissions, COOP/CORP, etc.) are injected on all routes
- HSTS enabled in production
- API rewrites configured for local backend proxy paths
- `poweredByHeader` disabled
- Strict mode enabled
- Browser source maps disabled in production
- Console removal in production (except warn/error)

Important caveat:
- `typescript.ignoreBuildErrors: true` is enabled, which allows production builds with TS errors. This improves deploy resilience but can hide type regressions.

## 12) Build, Run, and Deployment

Scripts from `package.json`:
- `npm run dev` -> Next.js dev with Turbopack
- `npm run build` -> Production build
- `npm run start` -> Serve production build
- `npm run lint` -> TypeScript noEmit check

Recommended local flow:
1. Ensure backend is running
2. Set frontend env values in `.env.local`
3. Run `npm install`
4. Run `npm run dev`

Production notes:
- Pair with backend CORS allowlist and TLS
- Use same-origin or trusted domain API base
- Ensure security headers and auth cookie behavior are validated in staging

## 13) Environment Variables

Frontend-consumed variables (current usage):
- `NEXT_PUBLIC_API_BASE_URL` (used widely in app code)
- `NEXT_PUBLIC_DEBUG_AUTH` (auth utility debugging)

Documented sample variable:
- `.env.example` includes `NEXT_PUBLIC_API_URL` (legacy/inconsistent naming)

Recommendation:
- Keep one canonical variable and update docs/code accordingly.

## 14) File Explanations (Frontend)

### 14.1 Core App Files

- `app/layout.tsx`: Root HTML/layout, metadata, global providers and shell
- `app/page.tsx`: Root entry page (dashboard forwarding behavior)
- `app/globals.css`: Global styles, tokens, and base utilities
- `app/toaster-provider.tsx`: Toast provider bridge

### 14.2 Auth and Session Files

- `app/login/page.tsx`: Login route entry
- `components/login-client.tsx`: Login form and auth action logic
- `components/login-layout.tsx`: Login presentation/layout wrapper
- `utils/auth.ts`: Token lifecycle, auth fetch wrapper, refresh and CSRF helpers

### 14.3 Navigation and Shell Files

- `components/client-shell.tsx`: Main authenticated shell logic
- `components/sidebar.tsx`: Role-based nav and responsive sidebar behavior
- `components/profile-menu.tsx`: User actions menu
- `components/notification-bell.tsx`: Notification UI and interactions

### 14.4 Dashboard and Operations Files

- `app/dashboard/page.tsx`: Main operations dashboard page
- `hooks/useDashboardStats.ts`: Dashboard summary stats retrieval
- `components/manual-fetch-client.tsx`: Manual fetch controls
- `components/missing-scan-client.tsx`: Missing scan actions and display
- `components/combine-client.tsx`: Combine workflow client
- `components/AdminRetentionPanel.tsx`: Retention controls panel

### 14.5 File and Job Management Files

- `app/files/page.tsx`: File listing/filters view
- `app/combined-files/page.tsx`: Combined output file view
- `app/jobs/page.tsx`: Job listing and grouping view
- `app/jobs/[jobId]/page.tsx`: Job detail view
- `app/uploads/page.tsx`: Upload interface wrapper

### 14.6 Admin and Reporting Files

- `app/admin/csv-viewer/page.tsx`: Admin CSV viewer page
- `app/admin/fetch-logs/page.tsx`: Admin fetch logs page
- `app/users/page.tsx`: User management page
- `app/settings/page.tsx`: Settings page
- `app/my-reports/page.tsx`: User report page

### 14.7 Booking/Manager Files

- `app/booking/page.tsx`: Booking-facing page entry
- `app/manager/bookings/page.tsx`: Manager booking operations page

### 14.8 Shared UI and Utility Files

- `components/ui/*`: Reusable design system components
- `lib/utils.ts`: Classname merge helper
- `hooks/use-sse.tsx`: Reconnectable SSE hook
- `hooks/use-toast.ts`: Toast integration hook
- `hooks/use-mobile.tsx`: Mobile breakpoint helper
- `utils/api.ts`: Domain API helpers
- `utils/toast-dedupe.ts`: Toast dedupe support

## 15) Documentation Links

- `README.md`
- `docs/API_DOCUMENTATION.md`
- `docs/BACKEND_DOCUMENTATION.md`
- `docs/BACKEND_ARCHITECTURE.md`
- `docs/BACKEND_FILE_EXPLANATIONS.md`
- `docs/BOOKING_SYSTEM.md`
- `docs/UPLOAD_FLOW.md`
- `docs/SECURITY_AUDIT_SUMMARY.md`

## 16) Maintenance Checklist

When frontend code changes:
1. Update route map if new pages are added
2. Update file explanations when ownership/responsibility changes
3. Keep env variable docs aligned with actual code usage
4. Update API links when backend endpoint contracts change
5. Review security headers and auth flow assumptions on major releases
