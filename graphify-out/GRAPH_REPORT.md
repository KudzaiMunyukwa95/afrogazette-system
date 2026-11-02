# Graph Report - afrogazette-system  (2026-11-02)

## Corpus Check
- 120 files · ~99,355 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 804 nodes · 1462 edges · 47 communities (46 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `93052ddb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- salesActivityController.js
- AfroGazette Advert Scheduling System
- cronService.js
- invoiceController.js
- dependencies
- dependencies
- API Testing Guide - Postman Collection
- clientController.js
- App.jsx
- Step-by-Step Deployment (No Git Required)
- financeRoutes.js
- server.js
- Toast.jsx
- advertController.js
- Analytics.jsx
- Dashboard.jsx
- Layout.jsx
- CreateQuotation.jsx
- api.js
- aiVettingService.js
- ratePolicy.js
- auth.js
- useToast
- reportsController.js
- authenticate
- notificationController.js
- reportsRoutes.js
- CreateAdvert.jsx
- PendingApprovals.jsx
- activityRoutes.js
- advertRoutes.js
- schedulingService.js
- authRoutes.js
- targetRoutes.js
- userRoutes.js
- VerifyInvoice.jsx
- invoiceRoutes.js
- slotRoutes.js
- write-build-id.js
- expiringAdvertsJob.js
- SalesActivity.jsx
- database.js
- Targets.jsx

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 43 edges
2. `useAuth()` - 34 edges
3. `Layout()` - 30 edges
4. `serverError()` - 18 edges
5. `AfroGazette Advert Scheduling System` - 18 edges
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

## Communities (47 total, 1 thin omitted)

### Community 0 - "salesActivityController.js"
Cohesion: 0.07
Nodes (67): countBy(), createActivity(), createOption(), createProspect(), csvCell(), decorate(), EXPORT_COLUMNS, exportActivities() (+59 more)

### Community 1 - "AfroGazette Advert Scheduling System"
Cohesion: 0.04
Nodes (48): 1. Backend Setup, 1. Login, 2. Create Advert (Sales Rep), 2. Frontend Setup, 3. Get Pending (Admin), 4. Approve & Assign (Admin), 5. View Schedule, Admin (+40 more)

### Community 2 - "cronService.js"
Cohesion: 0.29
Nodes (9): startServer(), checkExpiringAdverts(), cleanupOldAssignments(), { createNotification }, cron, initializeCronJobs(), manualUpdate(), pool (+1 more)

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
Cohesion: 0.16
Nodes (18): App(), NotificationBell(), PrivateRoute(), AuthContext, AuthProvider(), useAuth(), NotificationContext, NotificationProvider() (+10 more)

### Community 9 - "Step-by-Step Deployment (No Git Required)"
Cohesion: 0.08
Nodes (23): 1. Backend Won't Start, 2. Migrations Fail, 3. Frontend Shows CORS Error, 4. "Token Invalid" After Login, 5. Cron Jobs Not Running, Free Tier Limitations, Next Steps, Option A: ZIP Upload (Recommended) (+15 more)

### Community 10 - "financeRoutes.js"
Cohesion: 0.12
Nodes (20): approveExpense(), createExpense(), createRequisition(), getExpenseById(), getExpenseHistory(), getExpenses(), pool, rejectExpense() (+12 more)

### Community 11 - "server.js"
Cohesion: 0.09
Nodes (22): activityRoutes, advertRoutes, analyticsRoutes, app, authRoutes, bcrypt, clientRoutes, cors (+14 more)

### Community 12 - "Toast.jsx"
Cohesion: 0.28
Nodes (5): ToastContext, ToastProvider(), DuplicateClients(), memberKey(), pickDefaultKeep()

### Community 13 - "advertController.js"
Cohesion: 0.15
Nodes (15): commissionRateForDays(), approveAdvert(), { calculateRemainingDays }, { commissionRateForDays, suggestedPriceForDays }, createAdvert(), { createNotification, notifyAdmins, resolveAdvertNotifications }, declineAdvert(), deleteAdvert() (+7 more)

### Community 14 - "Analytics.jsx"
Cohesion: 0.16
Nodes (12): CompetitorTab(), computeRange(), exportCSV(), FlightOccupancyTab(), fmtDate(), MarginTab(), PRESETS, RetentionTab() (+4 more)

### Community 15 - "Dashboard.jsx"
Cohesion: 0.12
Nodes (10): COLOR_VARIANTS, COLORS, Dashboard(), lastCalendarMonth(), monthName(), SalesRepDashboard(), staggerContainer, staggerItem (+2 more)

### Community 16 - "Layout.jsx"
Cohesion: 0.17
Nodes (9): ConfirmModal(), Pagination(), UpdateAvailableBanner(), AllAdverts(), MyAdverts(), MyClients(), Users(), advertAPI (+1 more)

### Community 17 - "CreateQuotation.jsx"
Cohesion: 0.15
Nodes (14): CreateQuotation(), emptyBilling(), emptyItem(), FALLBACK_BOTH, FALLBACK_FLIGHTS, FALLBACK_PRICES, getDefaultValidUntil(), CopyBlock() (+6 more)

### Community 18 - "api.js"
Cohesion: 0.16
Nodes (7): ACTION_META, ActivityLog(), TYPE_FILTERS, Schedule(), activityAPI, invoiceAPI, slotAPI

### Community 19 - "aiVettingService.js"
Cohesion: 0.19
Nodes (12): buildSystemPrompt(), ELEVATED_SCRUTINY_CATEGORIES, REJECT_RULES, TWEAK_RULES, checkAdvertEligibility(), rescanAdvert(), Anthropic, { buildSystemPrompt } (+4 more)

### Community 20 - "ratePolicy.js"
Cohesion: 0.19
Nodes (10): BOTH_PRICES, COMMISSION_ANCHORS, FLIGHTS, priceAnchorsFor(), PRICES, suggestedPriceForDays(), { authenticate }, express (+2 more)

### Community 21 - "auth.js"
Cohesion: 0.18
Nodes (10): isAdmin(), jwt, analyticsController, { authenticate, isAdmin }, express, router, { authenticate, isAdmin }, controller (+2 more)

### Community 22 - "useToast"
Cohesion: 0.27
Nodes (9): FinanceNav(), Layout(), useToast(), ClientManagement(), Expenses(), COLORS, FinancialReports(), Requisitions() (+1 more)

### Community 23 - "reportsController.js"
Cohesion: 0.33
Nodes (10): getCompetitorMentions(), getFlightMix(), getMargin(), getOccupancy(), getRealtimeSnapshot(), getRetention(), getTargetHistory(), pool (+2 more)

### Community 24 - "authenticate"
Cohesion: 0.33
Nodes (5): authenticate(), { authenticate }, express, quotationController, router

### Community 25 - "notificationController.js"
Cohesion: 0.27
Nodes (8): getNotifications(), markAllAsRead(), markAsRead(), pool, { authenticate }, express, { getNotifications, markAsRead, markAllAsRead }, router

### Community 26 - "reportsRoutes.js"
Cohesion: 0.29
Nodes (6): { authenticate }, { body }, express, reportsController, router, validate

### Community 27 - "CreateAdvert.jsx"
Cohesion: 0.18
Nodes (10): ClientAutocomplete(), CATEGORIES, CreateAdvert(), FALLBACK_BOTH, FALLBACK_FLIGHTS, FALLBACK_PRICES, PAYMENT_METHODS, FreeClients() (+2 more)

### Community 28 - "PendingApprovals.jsx"
Cohesion: 0.36
Nodes (6): AdvertTools(), CATEGORIES, VERDICT_META, PendingApprovals(), escapeHtml(), whatsAppToHtml()

### Community 29 - "activityRoutes.js"
Cohesion: 0.40
Nodes (4): activityController, { authenticate, isAdmin }, express, router

### Community 30 - "advertRoutes.js"
Cohesion: 0.25
Nodes (7): advertController, { authenticate, isAdmin }, { body }, express, router, VALID_CATEGORIES, validate

### Community 31 - "schedulingService.js"
Cohesion: 0.33
Nodes (4): extendAdvert(), calculateRemainingDays(), pool, updateRemainingDays()

### Community 32 - "authRoutes.js"
Cohesion: 0.20
Nodes (7): { validationResult }, authController, { authenticate }, { body }, express, router, validate

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

### Community 37 - "slotRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate }, express, router, slotController

### Community 38 - "write-build-id.js"
Cohesion: 0.40
Nodes (4): buildId, fs, outPath, path

### Community 44 - "SalesActivity.jsx"
Cohesion: 0.12
Nodes (27): PhoneActions(), SalesClientPicker(), SalesTargetBar(), emptyForm(), inputClass(), LogActivity(), RepSalesActivity(), TeamActivity() (+19 more)

### Community 45 - "database.js"
Cohesion: 0.05
Nodes (17): { Pool }, pool, pool, pool, bcrypt, jwt, pool, pool (+9 more)

### Community 50 - "Targets.jsx"
Cohesion: 0.53
Nodes (5): currentMonth(), monthLabel(), shiftMonth(), Targets(), targetAPI

## Knowledge Gaps
- **327 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `authenticate()` connect `authenticate` to `authRoutes.js`, `targetRoutes.js`, `userRoutes.js`, `invoiceRoutes.js`, `slotRoutes.js`, `clientController.js`, `financeRoutes.js`, `ratePolicy.js`, `auth.js`, `notificationController.js`, `reportsRoutes.js`, `activityRoutes.js`, `advertRoutes.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `App.jsx`, `Toast.jsx`, `SalesActivity.jsx`, `Analytics.jsx`, `Layout.jsx`, `CreateQuotation.jsx`, `api.js`, `Targets.jsx`, `CreateAdvert.jsx`, `PendingApprovals.jsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Layout()` connect `useToast` to `App.jsx`, `Toast.jsx`, `SalesActivity.jsx`, `Analytics.jsx`, `Dashboard.jsx`, `Layout.jsx`, `CreateQuotation.jsx`, `api.js`, `Targets.jsx`, `CreateAdvert.jsx`, `PendingApprovals.jsx`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `salesActivityController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07002012072434607 - nodes in this community are weakly interconnected._
- **Should `AfroGazette Advert Scheduling System` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `invoiceController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06620209059233449 - nodes in this community are weakly interconnected._