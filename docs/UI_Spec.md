# PRAMITI: Frontend Build Specification v2 (Data-Driven, Zero Prefill)

> **Supersedes `UI_SPEC.md`.** The reference image defines **layout, structure, styling and component behavior only**. **Nothing in the image is data.** Names, numbers, dates, percentages, rule numbers, file names and findings seen in the image must **never** appear in code, seeds, fixtures or copy.
>
> **Core rule: a fresh install shows an empty product. Every figure, row, chart, finding and overlay exists only because a user uploaded or created data.**

---

## 0. Agent rules (read first)

1. **No data literals in the UI.** Feature components may contain only: labels (nav items, tab names, column headers, button text), enums, and empty-state copy. Any number, institution name, application ID, date, rule clause, file name or finding text must come from an API response.
2. **No seed file shipped.** No `seed.json`, no demo handlers in the production bundle, no default rows in the database migrations (except roles and enum lookup tables).
3. **Every screen must render correctly with an empty database** (Section 3 defines how). This is the first acceptance test.
4. **Every metric is computed on the server from stored records** using the formulas in Section 6. The frontend only formats and displays.
5. **If a value cannot be computed, show "No data" or an em dash, never zero-as-fake-result and never an invented value.**
6. **Demo or test data** is allowed only through the separate synthetic generator (Section 9), which uses the normal ingestion path, tags every record `is_synthetic = true`, shows a persistent banner, and can be purged in one click.
7. Match layout and styling to the reference image; the image wins on visual structure, this file wins on data behavior.
8. AI output is advisory; findings always carry evidence, and forensic findings show "Indicator, not proof."

---

## 1. Tech stack (fixed)

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS 3 + CSS variables |
| Components | shadcn/ui |
| Icons | lucide-react |
| Charts | Recharts (donut and gauge only) |
| Routing | React Router v6 |
| Data | TanStack Query + axios |
| UI state | Zustand (selection state only, never business data) |
| PDF viewer | react-pdf |
| Overlays | Absolutely positioned boxes from stored bounding boxes |
| Backend | FastAPI + PostgreSQL + MinIO + Redis (see PRD) |
| Tests | Vitest, React Testing Library, Playwright; fixtures generated at runtime and **never imported by production code** |
| Fonts | Inter |

---

## 2. Design tokens (unchanged styling)

```css
:root {
  --bg-app:#F4F6FB; --bg-card:#FFFFFF; --bg-sidebar:#0E1A3A;
  --bg-sidebar-active:#2563EB; --bg-sidebar-hover:rgba(255,255,255,0.06);
  --text-primary:#0F172A; --text-secondary:#64748B; --text-muted:#94A3B8; --text-on-dark:#E2E8F0;
  --primary:#2563EB; --primary-soft:#EAF1FF;
  --success:#16A34A; --success-soft:#E8F7EE;
  --warning:#F59E0B; --warning-soft:#FFF5E0;
  --danger:#DC2626;  --danger-soft:#FDECEC;
  --orange:#F97316;  --orange-soft:#FFF0E6;
  --neutral:#64748B; --neutral-soft:#EEF2F7;
  --border:#E5E9F2; --radius-card:12px; --radius-chip:6px;
  --shadow-card:0 1px 2px rgba(15,23,42,.04),0 1px 3px rgba(15,23,42,.06);
}
```

Typography: page title 30/700; subtitle 14/400 secondary; card title 15/600; stat value 28/700; table header 11/600; body 13; chip 11/600. Donut category colors come from a **category-to-color map keyed by enum**, not by position.

---

## 3. Universal state model (every component implements all five)

| State | Behavior |
|---|---|
| **Loading** | Skeleton blocks matching the final layout; no spinner-only screens |
| **Empty** | Neutral illustration-free message, one-line explanation, and a primary call to action (table below) |
| **Partial** | Show what exists; unavailable sub-values show an em dash with a tooltip stating why |
| **Error** | Inline card with retry; never a blank page |
| **Populated** | Normal rendering |

Rules:
- Stat cards in empty state display an **em dash**, not `0`, unless the true count is zero **and** the system has data (distinguish "no applications yet" from "zero critical issues").
- Charts in empty state render an outlined placeholder ring with the text "No data yet".
- Delta text such as "from last month" appears **only** when the previous period has data; otherwise hide it.
- Percent values with a zero denominator render an em dash.

### Empty-state copy and calls to action

| Screen / component | Empty message | Primary action |
|---|---|---|
| Dashboard (no applications) | "No applications yet. Add an application to start validation." | **New Application** |
| Application Pipeline | "Stages appear when applications enter the workflow." | none |
| Automation Impact | "Complete validations to see automation results." | none |
| Recent Applications | "No applications to show." | **New Application** |
| Document Issues Breakdown | "No issues detected yet." | none |
| Application list | "No applications match your filters." or "No applications yet." | **New Application** |
| Checklist | "No checklist configured for this category." | **Configure checklist** (admin) |
| Document viewer | "Select a document to preview." | none |
| Verification panel | "No verification has run for this document." | **Run verification** |
| Findings | "No findings. Run analysis or upload documents." | **Run analysis** |
| Evidence panel | "Select a finding to view evidence." | none |
| Infrastructure | "No infrastructure documents uploaded." | **Upload floor plan** |
| Rules | "No rules defined. Import or author rules." | **Add rule** / **Import YAML** |
| Alerts | "You are all caught up." | none |
| Reports | "No reports generated yet." | none |

---

## 4. Global layout shell (structure matches the reference image)

### 4.1 Sidebar
Width 240px, navy. Top: logo mark + product name + subtitle (**brand strings come from config**, not data). Nav, in this order: Dashboard, Applications, Document Analysis, Rule Compliance, Verification Hub, Infrastructure Check, Alerts, Reports, Settings. Active item blue. Footer block with organization name and department read from `GET /api/org` (configurable in Settings; blank if not configured, in which case the footer is hidden).

### 4.2 Topbar
Search field (placeholder text only). Bell icon; **red dot only when unread alerts exist**. User chip: initials, display name and region from `GET /api/me` (authenticated user's own profile). If region is not set, omit it.

### 4.3 First-run onboarding
On first login with an empty system, show a one-time inline card on the dashboard: steps to (1) configure org and categories, (2) define or import checklists and rules, (3) add the first application. Steps derive their completion state from actual records.

---

## 5. Screens (layout from the image; content from data)

### 5.1 Dashboard `/`
- **Header:** title "Overview", subtitle, date-range select. Options: Last 7 days, Last 30 days, Last 90 days, Custom. The default is Last 30 days. Filtering applies to real timestamps.
- **Row 1, four StatCards:** Total Applications, Automatically Cleared, Needs Review, Critical Issues. Each shows a value and a sub-line (share of total) computed per Section 6. Delta line only when comparable data exists.
- **Row 2:**
  - **Application Pipeline:** five tiles in order Submitted, AI Analysis, Verification, Officer Review, Completed. Counts are applications currently in or having passed each stage, per Section 6. Tile labels are fixed enum labels.
  - **Automation Impact:** gauge showing the auto-validated share. Below it, "Avg. time per case" (measured) and "Manual checking (baseline)". The baseline is **blank ("Not set") until an admin enters it in Settings, or until officers' timed manual reviews exist**. It is never prefilled.
- **Row 3:**
  - **Recent Applications** table: columns `#`, Institution, Type, Status, Risk Score, Submitted. Rows are the latest records. Row click opens the application.
  - **Document Issues Breakdown:** donut by issue category; center shows the total; legend shows each category's count. Categories come from the issue-type enum; zero-count categories are hidden.

### 5.2 Application detail `/applications/:id/documents`
- Back link; title is the institution name from the record; meta row shows application ID, category chip, status chip, and risk score chip (omitted until a score exists).
- Actions: **Download Report** (enabled only after a report exists or can be generated) and **Take Action** (Request Evidence, Escalate, Mark Reviewed). Every action writes to the audit log. No automated approval or rejection exists.
- Tabs: Overview, Documents, Rule Compliance, Verification, Infrastructure, AI Findings, History.
- **Column A, Document Checklist (x/y):** rows come from the **category checklist configuration**; status per row is derived (Verified, Issues Found, Missing, Not Required). Progress bar = verified required items divided by required items.
- **Column B, viewer:** renders the uploaded file; zoom, pager, rotate. Overlay boxes come from stored finding bounding boxes (normalized 0 to 1). Clicking a box selects its finding.
- **Column C, tabs Analysis / Metadata / Verification:** all fields come from extraction and verification records. The banner (e.g. valid, mismatch, expired, pending, source unavailable, manual review required) follows the verification status enum. Simulated sources carry a **SIM** tag. "View Verification Log" opens the real log.

### 5.3 AI Findings `/applications/:id/findings`
- Header risk card shows the computed score, or "Not scored" until analysis runs.
- Tabs with counts per severity, computed from findings.
- Finding card: severity icon and chip, title, description, tags. All text is generated by the rule engine or forensic module from stored records (title and description templates take parameters, e.g. `{field}`, `{value_a}`, `{value_b}`); tag content is the rule ID, clause reference and module name.
- Detail panel tabs: Evidence (original crop and highlighted crop produced from the stored bbox), AI Analysis (detection type, confidence, method, explanation), Rule Reference (clause, handbook version, inputs), Suggested Fix (template-based, parameterized).
- Footer note on forensic findings: "Indicator, not proof. Requires human verification."

### 5.4 Infrastructure `/applications/:id/infrastructure`
- Tabs: Floor Plan Analysis, Photos & Geotag, Area Calculation, Room Count, Compliance Check.
- Viewer overlays (rooms, flagged regions, measurement points) come from extraction output; legend is static chrome.
- Results panel: built-up area, declared area, difference percent, rooms detected and breakdown, compliance status. Each is computed from extracted values vs. declared values; if either is missing, show an em dash and an "Evidence needed" hint.
- Key Findings list comes from rule results; status dot color follows result level. Output vocabulary is limited to "needs more evidence" or "recommend inspection."

### 5.5 Other routes (same shell and tokens)
`/applications` (filterable table), `/rules` (rule store with YAML viewer, impact preview), `/verification` (attempt log), `/alerts` (grouped, acknowledgeable), `/reports`, `/settings` (organization, regions, thresholds, manual-review baseline, retention). All start empty.

---

## 6. Metric definitions (server-computed, never hardcoded)

| Metric | Definition |
|---|---|
| Total Applications | count of applications in the selected range |
| Automatically Cleared | applications completed with zero open findings above the configured clearance threshold and no human intervention |
| Needs Review | applications routed to officer review |
| Critical Issues | applications with at least one open critical finding |
| Share-of-total | metric divided by Total Applications; em dash if total is zero |
| Month-over-month delta | (current minus previous period) divided by previous; hidden if previous is zero or absent |
| Pipeline counts | applications whose latest workflow state is at or beyond each stage |
| Auto-validated share | Automatically Cleared divided by Total Applications |
| Avg. time per case | mean of (completion time minus submission time) for completed cases; em dash if none |
| Manual baseline | admin-entered value in Settings, or mean of officer-timed manual reviews if recorded; "Not set" otherwise |
| Issues breakdown | count of open findings grouped by issue type |
| Risk score | weighted aggregate defined in the rule configuration (severity, confidence, verification status, anomaly count); "Not scored" until computed |
| Checklist progress | verified required documents divided by required documents |

All metric endpoints return `null` for values that cannot be computed; the UI renders `null` as an em dash.

---

## 7. API contracts (schemas only, no sample values)

```ts
type Nullable<T> = T | null;
type VerifyStatus = 'verified'|'mismatch_detected'|'expired'|'verification_pending'|'source_unavailable'|'manual_review_required';
type Severity = 'critical'|'high'|'medium'|'low';
type DocStatus = 'verified'|'issues_found'|'missing'|'not_required';

GET /api/dashboard?from&to
 -> { totals: { total:number, cleared:number, needsReview:number, critical:number },
      deltaPct: Nullable<number>,
      pipeline: { stage:string, count:number }[],
      automation: { autoPct:Nullable<number>, avgMinutes:Nullable<number>, baselineMinutes:Nullable<number> },
      issues: { total:number, breakdown:{ type:string, count:number }[] },
      recent: ApplicationSummary[] }

GET /api/applications/:id
 -> { id, institutionName, category, status, riskScore:Nullable<number>, checklist:{ docType, status:DocStatus, required:boolean }[] }

GET /api/documents/:docId
 -> { name, pageCount, fileUrl, extractedFields:Field[],
      verification: Nullable<{ status:VerifyStatus, source:string, simulated:boolean, fields:Field[], log:LogEntry[] }> }

GET /api/applications/:id/findings
 -> Finding[]  // { id, title, severity, description, tags:string[], docId, ruleId, clauseRef, handbookVersion,
                //   evidence:{ page, bbox:[number,number,number,number], originalCropUrl, highlightCropUrl },
                //   analysis:{ type, confidence:number, method:string, explanation:string } }

GET /api/applications/:id/infrastructure
 -> { builtUpAreaSqm:Nullable<number>, declaredAreaSqm:Nullable<number>, diffPct:Nullable<number>,
      rooms:Nullable<{ total:number, byType:{ type:string, count:number }[] }>,
      overlays:{ kind:'room'|'flag'|'point', label:string, bbox:number[] }[],
      keyFindings:{ level:'ok'|'warn'|'fail', title:string, detail:string }[] }

POST /api/applications              // create application
POST /api/applications/:id/documents // upload (multipart); triggers async pipeline
GET  /api/org, GET /api/me, GET/PUT /api/settings
```

Arrays default to `[]`, nullable values to `null`. The frontend must never substitute defaults with fake values.

---

## 8. Data entry flows (how the product fills)

1. **Admin setup:** organization info, regions, application categories, checklists per category, thresholds, rules (author in the rule editor or import YAML).
2. **New Application:** institution details, category; the checklist appears from configuration.
3. **Upload documents:** drag and drop per checklist row; files stored in object storage; async pipeline runs classification, OCR and extraction, graph build, verification adapters, forensics, rule evaluation, scoring. The UI updates through polling or WebSocket events.
4. **Officer review:** actions create audit entries; results feed metrics.
5. **Everything on screen is therefore a function of the above.**

---

## 9. Demo and test data policy

- **Production bundle contains no mock data.** MSW and fixtures live under `/tests` and are excluded from the build.
- **Synthetic generator** (`tools/synthetic-gen`, a CLI or an admin-only button) creates institutions, documents and injected defects by calling the **same ingestion endpoints**. Records are tagged `is_synthetic = true`.
- While any synthetic record exists, a persistent banner reads: "Synthetic data present. Results are for demonstration." A **Purge synthetic data** action removes it.
- Evaluation metrics (precision, recall) are shown only on the Proof or Reports page, computed from labeled runs, and labeled as synthetic.

---

## 10. Enforcement (so the agent cannot regress)

- **ESLint rule:** forbid numeric literals greater than 1 and date-like strings in `src/features/**` and `src/components/**` except in style or layout constants (allow-list file).
- **CI grep gate:** fail the build if any of these appear in `src/`: `seed`, `mock`, `lorem`, `faker` (outside `/tests`), or any string copied from the reference image (maintain `forbidden-strings.txt` with institution names, application IDs, rule numbers and file names visible in the image).
- **Playwright "fresh install" test:** start with an empty database; visit every route; assert that no numeric value other than em dashes and empty-state copy is visible, and no table rows exist.
- **Playwright "data flows through" test:** create an application and upload a document through the UI or API; assert the dashboard totals, the checklist row, and the findings count update accordingly.
- **Contract tests:** responses for an empty database must validate against the schemas in Section 7.

---

## 11. Project structure

```
src/
  app/            router.tsx, providers.tsx
  components/
    layout/       Sidebar, Topbar, AppShell
    ui/           shadcn
    shared/       StatCard, StatusChip, RiskScore, Tag, DonutChart, KeyValueRow, EmptyState, Skeleton, PageHeader
    viewer/       DocViewer, OverlayLayer
  features/
    dashboard/ application/ findings/ infrastructure/ rules/ verification/ alerts/ reports/ settings/ onboarding/
  lib/            api.ts, format.ts (em dash for null), tokens.ts
  store/          ui.ts
tests/            fixtures (runtime-generated), mocks, e2e
tools/            synthetic-gen
```

---

## 12. Build order

1. Tokens, AppShell, shared components including `EmptyState` and `Skeleton`.
2. Backend schemas and empty endpoints returning valid empty payloads.
3. Dashboard fully functional in the empty state, then onboarding card.
4. Admin setup flows (categories, checklists, rules).
5. New Application and upload flow with async status updates.
6. Application detail, findings and infrastructure screens wired to real pipeline output.
7. Remaining routes, alerts, reports.
8. Synthetic generator, purge action and banner.
9. Enforcement gates and Playwright tests.

---

## 13. Acceptance checklist

- [ ] Fresh install: every route renders with empty states; no figures, names, or findings are visible.
- [ ] No data literals from the reference image exist in the repository (CI gate passes).
- [ ] Adding an application changes the dashboard totals, recent table and pipeline.
- [ ] Uploading a document populates checklist status, viewer, extracted fields and verification panel.
- [ ] Findings, issue donut and risk score appear only after analysis produces them.
- [ ] Deleting or purging data returns the UI to empty states.
- [ ] Null metrics display as an em dash; deltas appear only with a comparable prior period.
- [ ] Manual baseline shows "Not set" until configured or measured.
- [ ] SIM tags and the "Indicator, not proof" note appear where required.
- [ ] Synthetic data is only present after explicit generation, is bannered, and is purgeable.
- [ ] Layout, colors and component structure match the reference image.

---

## 14. Prompt for your AI agent

> Read `UI_SPEC_v2.md` fully. The reference image is for layout and styling only; none of its text or numbers are data. Build the frontend and API so a fresh install shows only empty states, and every value appears only after data is added through the product. Do not create seed files, mock data, or default rows. Implement the five-state model on every component, the metric formulas in Section 6, and the enforcement gates in Section 10. After each screen, run the fresh-install test and fix violations before moving on.
