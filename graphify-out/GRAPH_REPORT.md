# Graph Report - afrogazette-system  (2026-11-02)

## Corpus Check
- 113 files · ~92,980 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 759 nodes · 1325 edges · 44 communities (43 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 134 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `64036418`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- salesActivityController.js
- AfroGazette Advert Scheduling System
- database.js
- invoiceController.js
- dependencies
- dependencies
- API Testing Guide - Postman Collection
- clientController.js
- App.jsx
- Step-by-Step Deployment (No Git Required)
- financeRoutes.js
- server.js
- useToast
- advertController.js
- Analytics.jsx
- Dashboard.jsx
- AllAdverts.jsx
- CreateQuotation.jsx
- api.js
- aiVettingService.js
- ratePolicy.js
- auth.js
- Layout.jsx
- reportsController.js
- authenticate
- notificationController.js
- reportsRoutes.js
- CreateAdvert.jsx
- PendingApprovals.jsx
- targetController.js
- advertRoutes.js
- schedulingService.js
- authRoutes.js
- targetRoutes.js
- userRoutes.js
- VerifyInvoice.jsx
- invoiceRoutes.js
- salesActivityRoutes.js
- write-build-id.js
- expiringAdvertsJob.js

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 37 edges
2. `useAuth()` - 29 edges
3. `Layout()` - 27 edges
4. `AfroGazette Advert Scheduling System` - 18 edges
5. `serverError()` - 17 edges
6. `authenticate()` - 16 edges
7. `updateActivity()` - 13 edges
8. `validationFailed()` - 12 edges
9. `Step-by-Step Deployment (No Git Required)` - 12 edges
10. `API Testing Guide - Postman Collection` - 11 edges

## Surprising Connections (you probably didn't know these)
- `CopyBlock()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/SalesKit.jsx → frontend/src/components/Toast.jsx
- `recordPayment()` --calls--> `commissionRateForDays()`  [EXTRACTED]
  backend/src/controllers/advertController.js → backend/src/config/ratePolicy.js
- `createAdvert()` --calls--> `suggestedPriceForDays()`  [EXTRACTED]
  backend/src/controllers/advertController.js → backend/src/config/ratePolicy.js
- `checkAdvertEligibility()` --calls--> `vetAdvert()`  [EXTRACTED]
  backend/src/controllers/advertController.js → backend/src/services/aiVettingService.js
- `deleteAdvert()` --calls--> `resolveAdvertNotifications()`  [EXTRACTED]
  backend/src/controllers/advertController.js → backend/src/controllers/notificationController.js

## Import Cycles
- None detected.

## Communities (44 total, 1 thin omitted)

### Community 0 - "salesActivityController.js"
Cohesion: 0.07
Nodes (63): countBy(), createActivity(), createOption(), createProspect(), decorate(), fetchOne(), fetchRaw(), getActivities() (+55 more)

### Community 1 - "AfroGazette Advert Scheduling System"
Cohesion: 0.04
Nodes (48): 1. Backend Setup, 1. Login, 2. Create Advert (Sales Rep), 2. Frontend Setup, 3. Get Pending (Admin), 4. Approve & Assign (Admin), 5. View Schedule, Admin (+40 more)

### Community 2 - "database.js"
Cohesion: 0.05
Nodes (18): { Pool }, pool, pool, pool, bcrypt, jwt, pool, pool (+10 more)

### Community 3 - "invoiceController.js"
Cohesion: 0.07
Nodes (35): company, downloadFinancialReport(), fs, generateFinancialReportPDF(), path, PDFDocument, pool, { renderLogo } (+27 more)

### Community 4 - "dependencies"
Cohesion: 0.05
Nodes (40): @anthropic-ai/sdk, author, dependencies, @anthropic-ai/sdk, bcryptjs, cors, dotenv, express (+32 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (35): autoprefixer, axios, date-fns, framer-motion, dependencies, axios, date-fns, framer-motion (+27 more)

### Community 6 - "API Testing Guide - Postman Collection"
Cohesion: 0.06
Nodes (32): 1.1 Login (Admin), 1.2 Register New User (Admin Only), 1.3 Get Profile, 1. AUTHENTICATION, 2.1 Get All Users, 2.2 Create User, 2.3 Delete User, 2. USER MANAGEMENT (Admin Only) (+24 more)

### Community 7 - "clientController.js"
Cohesion: 0.13
Nodes (27): createClient(), deleteClient(), findClientByPhone(), getAllClients(), getClientById(), getClients(), getFreeClients(), getPossibleDuplicates() (+19 more)

### Community 8 - "App.jsx"
Cohesion: 0.17
Nodes (17): App(), NotificationBell(), PrivateRoute(), AuthContext, AuthProvider(), useAuth(), NotificationContext, NotificationProvider() (+9 more)

### Community 9 - "Step-by-Step Deployment (No Git Required)"
Cohesion: 0.08
Nodes (23): 1. Backend Won't Start, 2. Migrations Fail, 3. Frontend Shows CORS Error, 4. "Token Invalid" After Login, 5. Cron Jobs Not Running, Free Tier Limitations, Next Steps, Option A: ZIP Upload (Recommended) (+15 more)

### Community 10 - "financeRoutes.js"
Cohesion: 0.13
Nodes (19): approveExpense(), createExpense(), createRequisition(), getExpenseById(), getExpenseHistory(), getExpenses(), pool, rejectExpense() (+11 more)

### Community 11 - "server.js"
Cohesion: 0.09
Nodes (22): activityRoutes, advertRoutes, analyticsRoutes, app, authRoutes, bcrypt, clientRoutes, cors (+14 more)

### Community 12 - "useToast"
Cohesion: 0.13
Nodes (16): ToastContext, ToastProvider(), useToast(), ACTION_META, ActivityLog(), TYPE_FILTERS, Analytics(), ClientManagement() (+8 more)

### Community 13 - "advertController.js"
Cohesion: 0.14
Nodes (16): commissionRateForDays(), approveAdvert(), { calculateRemainingDays }, { commissionRateForDays, suggestedPriceForDays }, createAdvert(), { createNotification, notifyAdmins, resolveAdvertNotifications }, declineAdvert(), deleteAdvert() (+8 more)

### Community 14 - "Analytics.jsx"
Cohesion: 0.16
Nodes (12): CompetitorTab(), computeRange(), exportCSV(), FlightOccupancyTab(), fmtDate(), MarginTab(), PRESETS, RetentionTab() (+4 more)

### Community 15 - "Dashboard.jsx"
Cohesion: 0.13
Nodes (10): COLOR_VARIANTS, COLORS, Dashboard(), lastCalendarMonth(), monthName(), SalesRepDashboard(), staggerContainer, staggerItem (+2 more)

### Community 16 - "AllAdverts.jsx"
Cohesion: 0.19
Nodes (7): ConfirmModal(), Pagination(), AllAdverts(), MyAdverts(), MyClients(), Users(), userAPI

### Community 17 - "CreateQuotation.jsx"
Cohesion: 0.15
Nodes (14): CreateQuotation(), emptyBilling(), emptyItem(), FALLBACK_BOTH, FALLBACK_FLIGHTS, FALLBACK_PRICES, getDefaultValidUntil(), CopyBlock() (+6 more)

### Community 18 - "api.js"
Cohesion: 0.17
Nodes (8): Schedule(), currentMonth(), monthLabel(), shiftMonth(), Targets(), invoiceAPI, slotAPI, targetAPI

### Community 19 - "aiVettingService.js"
Cohesion: 0.19
Nodes (12): buildSystemPrompt(), ELEVATED_SCRUTINY_CATEGORIES, REJECT_RULES, TWEAK_RULES, checkAdvertEligibility(), rescanAdvert(), Anthropic, { buildSystemPrompt } (+4 more)

### Community 20 - "ratePolicy.js"
Cohesion: 0.19
Nodes (10): BOTH_PRICES, COMMISSION_ANCHORS, FLIGHTS, priceAnchorsFor(), PRICES, suggestedPriceForDays(), { authenticate }, express (+2 more)

### Community 21 - "auth.js"
Cohesion: 0.16
Nodes (11): isAdmin(), isSalesRep(), jwt, activityController, { authenticate, isAdmin }, express, router, analyticsController (+3 more)

### Community 22 - "Layout.jsx"
Cohesion: 0.35
Nodes (5): FinanceNav(), Layout(), UpdateAvailableBanner(), COLORS, financeAPI

### Community 23 - "reportsController.js"
Cohesion: 0.33
Nodes (10): getCompetitorMentions(), getFlightMix(), getMargin(), getOccupancy(), getRealtimeSnapshot(), getRetention(), getTargetHistory(), pool (+2 more)

### Community 24 - "authenticate"
Cohesion: 0.18
Nodes (9): authenticate(), { authenticate }, express, quotationController, router, { authenticate }, express, router (+1 more)

### Community 25 - "notificationController.js"
Cohesion: 0.27
Nodes (8): getNotifications(), markAllAsRead(), markAsRead(), pool, { authenticate }, express, { getNotifications, markAsRead, markAllAsRead }, router

### Community 26 - "reportsRoutes.js"
Cohesion: 0.20
Nodes (7): { validationResult }, { authenticate }, { body }, express, reportsController, router, validate

### Community 27 - "CreateAdvert.jsx"
Cohesion: 0.22
Nodes (8): ClientAutocomplete(), CATEGORIES, CreateAdvert(), FALLBACK_BOTH, FALLBACK_FLIGHTS, FALLBACK_PRICES, PAYMENT_METHODS, clientAPI

### Community 28 - "PendingApprovals.jsx"
Cohesion: 0.33
Nodes (7): AdvertTools(), CATEGORIES, VERDICT_META, PendingApprovals(), advertAPI, escapeHtml(), whatsAppToHtml()

### Community 29 - "targetController.js"
Cohesion: 0.50
Nodes (7): getAllTargets(), getCompanyTarget(), getMyTarget(), monthRange(), normalizeMonth(), pool, setTarget()

### Community 30 - "advertRoutes.js"
Cohesion: 0.25
Nodes (7): advertController, { authenticate, isAdmin }, { body }, express, router, VALID_CATEGORIES, validate

### Community 31 - "schedulingService.js"
Cohesion: 0.33
Nodes (4): extendAdvert(), calculateRemainingDays(), pool, updateRemainingDays()

### Community 32 - "authRoutes.js"
Cohesion: 0.29
Nodes (6): authController, { authenticate }, { body }, express, router, validate

### Community 33 - "targetRoutes.js"
Cohesion: 0.29
Nodes (6): { authenticate, isAdmin }, { body }, express, router, targetController, validate

### Community 34 - "userRoutes.js"
Cohesion: 0.29
Nodes (6): { authenticate, isAdmin }, { body }, express, router, userController, validate

### Community 35 - "VerifyInvoice.jsx"
Cohesion: 0.53
Nodes (5): formatDate(), money(), titleCase(), VerifyInvoice(), api

### Community 36 - "invoiceRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate }, express, invoiceController, router

### Community 37 - "salesActivityRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, isAdmin }, controller, express, router

### Community 38 - "write-build-id.js"
Cohesion: 0.40
Nodes (4): buildId, fs, outPath, path

## Knowledge Gaps
- **326 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+321 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `authenticate()` connect `authenticate` to `authRoutes.js`, `targetRoutes.js`, `userRoutes.js`, `invoiceRoutes.js`, `salesActivityRoutes.js`, `clientController.js`, `financeRoutes.js`, `ratePolicy.js`, `auth.js`, `notificationController.js`, `reportsRoutes.js`, `advertRoutes.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `isAdmin()` connect `auth.js` to `targetRoutes.js`, `userRoutes.js`, `salesActivityRoutes.js`, `financeRoutes.js`, `advertRoutes.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `App.jsx`, `Analytics.jsx`, `AllAdverts.jsx`, `CreateQuotation.jsx`, `api.js`, `Layout.jsx`, `CreateAdvert.jsx`, `PendingApprovals.jsx`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _326 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `salesActivityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07372229760289462 - nodes in this community are weakly interconnected._
- **Should `AfroGazette Advert Scheduling System` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `database.js` be split into smaller, more focused modules?**
  _Cohesion score 0.047474747474747475 - nodes in this community are weakly interconnected._