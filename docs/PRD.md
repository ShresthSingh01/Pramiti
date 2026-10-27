# Product Requirements Document (Final): PRAMITI

**Verifiable Evidence Intelligence for AICTE Approval Processing**

SIH Problem Statement 26261 | Organization: AICTE, Regulation Bureau | Theme: Smart Automation | Version 3.0 (final)

## 1. Executive summary

PRAMITI is an AI **decision-support** platform that validates AICTE approval applications at the earliest stage. It converts each application into a **verifiable evidence graph**: every extracted fact is linked to its document, page and region; checked against versioned, clause-cited rules; authenticated through issuing-authority adapters; and recorded in a tamper-evident audit chain. When confidence is low, the system **abstains and routes the case to a human**. Performance is **measured on held-out data against a baseline**, and every limitation is stated openly.

**Honesty statement.** The prototype is built and evaluated on synthetic and anonymized data. Only QR decoding and digital-signature validation are real verification mechanisms; other issuing-authority sources are simulated and labeled. Final regulatory decisions remain with AICTE authorities.

## 2. Problem statement and goals

Manual scrutiny of Extension of Approval applications is slow because of missing or expired documents, cross-document inconsistencies, suspected alterations, and slow confirmation from issuing authorities.

| Goal | Success measure |
| --- | --- |
| Catch deficiencies at submission | Per-defect-type recall on held-out data |
| Reduce repeated manual checking | Officer minutes per case, manual vs. assisted, same cases |
| Reliable document authentication | Verification success rate; forgery-indicator precision and recall |
| Explainable, auditable output | 100% of findings carry evidence, rule clause and confidence |
| Safe automation | Abstention coverage vs. accuracy curve; zero automated adverse actions |

## 3. Scope and delivery strategy

The prototype goes deep on one **golden path** and demonstrates extensibility through configuration.

| Dimension | Prototype (v1) | Roadmap |
| --- | --- | --- |
| Application category | EoA renewal | Other EoA and approval-change categories via new checklists |
| Documents | Affidavit, NOC, accreditation certificate, floor plan, previous EoA, faculty list | Full document catalogue |
| Rules | 8 to 10 clause-cited rules | Full Handbook coverage, authored with AICTE officials |
| Defect types | Missing, expired, cross-document mismatch, tampered field or date, duplicate document or photo | Broader forensic indicators |
| Languages | English, with bilingual (Hindi and English) OCR as a stretch | Full multilingual support |
| Verification | QR and digital signature real; others simulated | Live issuing-authority APIs when authorized |
| Infrastructure | Floor-plan area and room-count checks, EXIF and geotag checks, reused-photo detection | Computer-vision analysis of photos and video |

**Out of scope:** final approval or rejection decisions, access to restricted databases, any bypass of access controls.

## 3.1 Regulatory & Architectural Guardrails (Evaluator Concerns Addressed)

To ensure legal defensibility and prevent ungrounded claims, PRAMITI strictly adheres to four architectural guardrails:

1. **Genuine vs. Simulated Verification Taxonomy:**
   - External registry queries are classified under the PS-mandated 6 statuses: `VERIFIED_FROM_SOURCE`, `MISMATCH_DETECTED`, `EXPIRED`, `PENDING`, `SOURCE_UNAVAILABLE`, `MANUAL_REVIEW_REQUIRED`.
   - In prototype mode, mock adapters are explicitly badged as `SIMULATED DEMO [SIM]`. Production deployment seamlessly routes to the national DigiLocker `/pull/uri` endpoint without core architecture changes.

2. **Evidentiary Threshold & "Potential Anomaly" Policy:**
   - Algorithms detect statistical and raster anomalies (compression deltas, metadata tampering), but cannot legally prove fraudulent intent (*mens rea*).
   - All findings are labeled as **`Potential Anomalies`** rather than definitive accusations of fraud, and recommendation outputs are restricted to `"Needs More Evidence"` or `"Recommend Inspection"`.

3. **Authoritative Golden Rule Grounding (APH 2025–26):**
   - The platform avoids overclaiming generic rule automation by demonstrating a vetted **Golden Rule Set of 6 foundational statutory checks** (Land Area reconciliation, NOC validity, Built-up area schedule, NAAC accreditation, Entity consistency, and Authorized signatory).
   - Every rule contains complete statutory metadata: `rule_id`, `clause_ref`, `handbook_version (APH 2025-26)`, `applicable_category`, and `statutory_rationale`.

4. **Component Decomposition Matrix (No AI Buzzwords):**
   - **PyMuPDF / Regex:** Deterministic extraction of raw text and normalized bounding boxes `[ymin, xmin, ymax, xmax]`.
   - **OpenCV / ELA / pyzbar:** Visual signal processing for raster compression deltas, QR decoding, and duplicate image hashing.
   - **On-Device SLM (Qwen-2.5 3B):** Schema-constrained extraction of unstructured legal notary phrasing at ₹0 API cost.
   - **Relational Evidence Graph:** Deterministic $O(1)$ relationship comparisons between cross-document fact nodes.
   - **PageIndex Engine:** Vectorless hierarchical tree navigation across official APH 2025–26 chapters.
   - **Human Scrutiny Officer:** Holds sole statutory authority for regulatory decisions.

## 4. Compliance matrix: how the PRD maps to the PS

| PS requirement | Coverage | How addressed | Honest limitation |
| --- | --- | --- | --- |
| Identify category and applicable checklist | Full (one category built) | Category-to-checklist configuration | Other categories are configuration, not yet proven |
| OCR, classification, extraction | Full | PaddleOCR, schema-constrained extraction, validators | Poor scans and Hindi text reduce accuracy; low confidence routes to a human |
| Detect missing, incomplete, expired, inconsistent items | Full | Checklist engine, date logic, graph consistency checks | Limited to implemented rules |
| Structured validation report; rectification | Full | Evidence-linked PDF report; applicant fix and re-validate loop | Resubmission permissions depend on AICTE process |
| Anomaly and potential forgery detection | Partial | Metadata, ELA, copy-move, perceptual hashes, identifier logic | Image forensics can give false positives on compressed scans; outputs are indicators only |
| Verification via issuing authorities | Partial (simulated) | Adapter framework; QR and signature real; others simulated | No live authority access assumed; all simulated sources tagged SIM |
| Infrastructure compliance assistance | Partial | Floor-plan, EXIF, geotag and duplicate-photo checks | No full computer-vision compliance judgement |
| Dashboard, alerts, audit trail | Full | Officer workspace, alert engine, hash-chained audit log | Alert delivery channels are mocked in the prototype |
| Integration with AICTE portal | Designed | OpenAPI contract and adapters (Section 8) | Integration is designed, not deployed |
| Role-based access, security, human review | Full | RBAC, PII masking, encryption, human sign-off | Production hardening is out of prototype scope |
| Evaluation on synthetic or anonymized data | Full | Held-out evaluation with baseline (Section 12) | Synthetic results may overstate real-world performance |

## 5. Users and roles

| Role | Needs | Permissions |
| --- | --- | --- |
| Applicant (institution) | Pre-submission checks, plain-language fix list, resubmission | Own applications only |
| Scrutiny officer | Ranked queue, evidence-linked findings, quick actions | Assigned applications; accept, request evidence, escalate |
| Senior or admin officer | Rule management, impact preview, analytics | Rule editing with approval workflow |
| Auditor | Integrity verification, history | Read-only audit access |

## 6. System architecture

### 6.1 Layered architecture

| Layer | Components | Responsibility |
| --- | --- | --- |
| 1. Presentation | Applicant portal, officer workspace, admin rule studio | Role-based interfaces |
| 2. API gateway | FastAPI, JWT with RBAC, rate limiting, request logging | Single secured entry point |
| 3. Integration | AICTE Records Adapter (mock), Issuing-Authority Adapters, Notification Adapter (mock) | Authorized, pluggable external access |
| 4. Processing | Classifier, OCR and extraction, forensics, infrastructure module | Convert raw files into evidence |
| 5. Knowledge | Evidence graph, versioned rule store | Structured facts and regulatory logic |
| 6. Decision support | Rule engine, triage score, abstain-and-route | Findings with confidence and routing |
| 7. Trust and security | Hash-chained audit log, PII masking, encryption, access logging | Accountability and confidentiality |
| 8. Data and infrastructure | PostgreSQL, MinIO object store, Redis queue, Docker Compose | Persistence, async jobs, reproducible deployment |

### 6.2 End-to-end flow

1. **Submit:** the applicant uploads documents; the category selects the checklist.
2. **Classify and check completeness:** document types are identified; missing items are flagged immediately.
3. **Extract:** OCR and schema-constrained extraction create facts with provenance (document, page, bounding box, confidence).
4. **Build graph:** facts become nodes; relations become edges (same-entity, derived-from, issued-by, supersedes).
5. **Authenticate:** QR and signature checks run; adapters return one of the PS statuses: verified, mismatch detected, expired, verification pending, source unavailable, manual review required.
6. **Forensics:** metadata, ELA, copy-move and duplicate checks produce indicators.
7. **Evaluate rules:** the engine runs versioned rules on the graph; each finding cites its clause.
8. **Score and route:** a transparent weighted score ranks cases; low-confidence findings are abstained and routed to manual review.
9. **Report and alert:** a validation report is generated; alerts fire per Section 7.5.
10. **Review and rectify:** the officer decides; the applicant may fix and resubmit where permitted. Every action is appended to the audit chain.

### 6.3 Core data model

- **Application**(id, institution\_id, category, status, version)
- **Document**(id, application\_id, type, sha256, page\_count)
- **Fact**(id, field, value, document\_id, page, bbox, confidence, extractor\_version)
- **Edge**(fact\_a, fact\_b, relation)
- **Rule**(id, clause\_ref, handbook\_version, version, yaml, status)
- **Finding**(id, rule\_id, facts\[\], severity, confidence, status, resolution)
- **Verification**(id, document\_id, source, timestamp, status, response\_hash)
- **Alert**(id, trigger, application\_id, recipient\_role, created\_at, acknowledged\_at)
- **AuditEntry**(id, actor, action, payload\_hash, prev\_hash, hash)

## 7. Functional requirements

### 7.1 Intake, classification and extraction

- Classify category and document types; apply the category checklist.
- Extract fields with confidence and provenance; flag low-confidence fields for review rather than guessing.
- *Acceptance:* every extracted value links to a highlighted region; documents below the confidence threshold are routed to manual review.

### 7.2 Evidence graph and consistency engine

- **Cross-document:** for example affidavit land area vs. floor plan vs. previous EoA.
- **Cross-year:** intake or faculty changes without an approval trail.
- **Cross-institution:** the same faculty member at two colleges, or a reused NOC or photo, evaluated on synthetic or anonymized records through the authorized Records Adapter.
- *Acceptance:* seeded conflicts are detected and displayed with both source regions.

### 7.3 Clause-cited rule engine

Rules are YAML, drafted with LLM assistance from the Handbook and approved by a human. Each rule carries its clause reference and Handbook version. Example:

```
id: R-LAND-01
clause: "Approval Process Handbook, Sec. 4.2 (illustrative)"
handbook_version: "2025-26"
when: category == "EoA_renewal"
check: abs(affidavit.land_area - floorplan.land_area) <= 2%
severity: high
message: "Land area differs across affidavit and floor plan"
```

- **Rule-impact simulator:** before activating an edited rule, show which existing applications would change status.
- *Acceptance:* a rule edit changes outcomes with no code change; the previous version remains in history.

### 7.4 Verification orchestrator

Adapter contract: `verify(document) -> {status, source, timestamp, evidence}`.

- **Real:** QR decoding and digital-signature validation (PAdES or PKCS#7) against configurable trust anchors.
- **Simulated and labeled SIM:** university, accreditation body and DigiLocker-style sources.
- Timeouts and failures return "source unavailable" and route to manual review; retries use backoff.
- *Acceptance:* all six PS statuses are reachable in tests; every result records source, timestamp and result.

### 7.5 Alerts module

| Trigger | Recipient | Timing |
| --- | --- | --- |
| Missing mandatory document | Applicant | At submission |
| Document expired or expiring within configured window | Applicant and officer | On detection |
| Source verification pending beyond threshold | Officer | After configured wait |
| Suspected anomaly | Assigned officer | On detection |
| Unresolved high-severity finding | Senior officer | After configured days |

- In-app notifications are real; email and SMS are mocked through the Notification Adapter.
- *Acceptance:* alert latency from detection to notification is measured and reported.

### 7.6 Forensics indicators

PDF metadata and producer mismatches, font and edit-layer inconsistencies, Error Level Analysis, copy-move detection on stamps and signatures, perceptual-hash duplicates, and date and identifier logic. Every output is labeled "indicator, not proof" and ranked by confidence.

### 7.7 Infrastructure compliance assistance

Floor-plan area and room-count extraction vs. claimed figures; photo EXIF timestamp and geotag vs. campus coordinates; reused-photo detection. Output is limited to "needs more evidence" or "recommend inspection". Vision-language analysis of photos is an optional experiment, excluded from reported results.

### 7.8 Validation report and rectification

- A downloadable PDF per application: checklist status, findings with evidence images, verification results, and open items.
- **Rectification loop:** finding raised, applicant fixes and resubmits where the process permits, system re-validates, history is preserved, and the audit chain records each step.

### 7.9 Triage score

A transparent weighted score (severity, confidence, verification status, anomaly count) ranks the queue. Factor contributions are always visible. It is a prioritization aid, never a decision.

### 7.10 Abstain-and-route

Findings or extractions below a calibrated confidence threshold are not asserted; they are routed to manual review. The coverage vs. accuracy trade-off is reported.

### 7.11 Audit trail

Each entry stores the hash of the previous entry. A "Verify integrity" action recomputes the chain and reports pass or fail. Logged items: rules applied, records checked, source responses, alerts, observations and actions.

## 8. Integration design

The prototype is designed for integration with the AICTE portal through a documented contract.

| Endpoint | Purpose |
| --- | --- |
| POST /applications | Register or ingest an application and documents |
| GET /applications/{id}/validation | Retrieve findings, statuses and report |
| POST /applications/{id}/resubmit | Submit rectified documents |
| GET /institutions/{id}/records | Fetch authorized institutional records (via Records Adapter) |
| POST /verifications | Trigger source verification |
| GET /audit/{application\_id} | Retrieve audit entries and integrity status |
| Webhook: validation.completed | Notify the portal of completion |

- **Authentication:** OAuth2 or JWT service tokens; role claims map to RBAC.
- **Data minimization:** only fields required for the check are retrieved.
- **Assumption:** access to institutional records is authorized and provided by AICTE; the prototype uses a mock Records Adapter with the same schema.

## 9. Non-functional requirements

| Area | Target (prototype) |
| --- | --- |
| Processing time | Under 2 minutes per application of about 6 documents on a standard laptop |
| Concurrency | 20 concurrent applications with a queue |
| Availability | Graceful degradation: a failed source never blocks the case |
| Explainability | Every finding shows clause, inputs, evidence region and confidence |
| Security | Encryption in transit and at rest; PII masking; access logging |
| Retention | Configurable policy; documents deletable after the retention period |
| Reproducibility | One-command Docker Compose deployment; fixed random seeds for evaluation |
| Accessibility | Keyboard navigation; readable contrast; bilingual UI labels as a stretch |

## 10. Experience design

Evidence-first and minimal, avoiding a generic KPI dashboard.

- **Queue:** ranked cases with a one-line reason and score breakdown.
- **Case view:** checklist ledger, document viewer with highlighted regions, evidence card with accept, request evidence and escalate actions.
- **Evidence graph view:** conflicting facts connected by a visible thread.
- **Verification timeline** with SIM tags on simulated sources.
- **Audit ribbon** with live integrity check.
- **Proof page:** metrics computed live from the labeled evaluation set.
- **Applicant view:** fix-it checklist and readiness meter.

## 11. Technology stack

| Concern | Choice | Reason |
| --- | --- | --- |
| Frontend | React, Vite, Tailwind, PDF.js, Cytoscape.js | Region overlays and graph views |
| Backend | Python, FastAPI, WebSockets | Fast APIs and live updates |
| Jobs | Celery or RQ with Redis | Async processing and retries |
| Database | PostgreSQL | Relational data and audit |
| Object store | MinIO | Document storage |
| Graph | NetworkX with Neo4j-compatible schema | Simple now, scalable later |
| OCR | PaddleOCR with Tesseract fallback | Layout and text accuracy |
| Extraction | Open-weight or API LLM with JSON-schema output | Field extraction and rule drafting |
| Forensics | OpenCV, imagehash, PyMuPDF, pikepdf | Indicators |
| Crypto and QR | pyHanko, pyzbar | Signature and QR verification |
| Security | JWT, RBAC, PII masking | Safeguards |
| Deployment | Docker Compose | Reproducible demo |

## 12. Evaluation plan

- **Synthetic generator** produces applications with injected defects and ground-truth labels.
- **Held-out defect variants** unseen during rule and threshold tuning.
- **Baseline:** a plain OCR plus LLM checklist pipeline evaluated on the same data. The comparison shows what the graph adds.
- **Metrics:** extraction accuracy; per-defect-type precision and recall; verification success rate; alert latency; abstention coverage vs. accuracy; officer minutes per case with and without the tool.
- **Reporting rules:** results are labeled synthetic; failures and weak defect types are shown; no cherry-picking.

## 13. Weakness remediation plan

| Weakness | Mitigation in this PRD | Residual risk |
| --- | --- | --- |
| Scope too broad | Golden-path scope; roadmap for the rest | Reduced breadth by design |
| Circular, self-graded metrics | Held-out defects, baseline, per-type reporting | Synthetic data still differs from real data |
| Simulated verification | Real QR and signature checks; SIM tags; adapter framework | No live authority access |
| Weak image forensics on scans | Indicators only, confidence ranking, human review | False positives remain possible |
| Shallow infrastructure vision | Deterministic floor-plan and EXIF checks; VLM excluded from claims | Not full compliance judgement |
| Missing alerts and report | Sections 7.5 and 7.8 | Delivery channels mocked |
| Integration unspecified | Section 8 contract | Not deployed against the real portal |
| Missing NFRs | Section 9 | Targets are prototype-level |
| LLM errors | Schema-constrained output, validators, evidence required, abstention | Residual extraction errors |
| Handbook changes | Versioned rules and impact simulator | Needs official rule approval process |

## 14. Delivery plan

| Phase | Deliverable | Exit test |
| --- | --- | --- |
| 1 | Ingestion, OCR, extraction with provenance | Fields highlighted on source |
| 2 | Evidence graph and cross-document checks | Seeded mismatch detected |
| 3 | Rule engine, 8 to 10 rules | Findings cite clauses |
| 4 | Verification orchestrator | All six statuses reachable |
| 5 | Forensics indicators | Tamper and duplicate flags fire |
| 6 | Alerts and validation report | Alert and PDF generated |
| 7 | Case view, queue, audit ribbon | Flag click highlights region |
| 8 | Evaluation harness, baseline, abstention curve | Proof page populated |
| 9 | Rule-impact simulator, fix-it loop | Live rule edit demo |

**Cut order if time runs short:** optional vision experiments, bilingual OCR, then simulator. Never cut evaluation.

## 15. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| OCR errors on poor scans | High | Confidence thresholds and abstention |
| LLM hallucination | Medium | Schema constraints and validators |
| False positives burdening officers | Medium | Indicators only; precision reporting |
| Demo-day failure | Medium | Pre-seeded data, offline models, recorded fallback |
| Overclaiming | Medium | Compliance matrix and limitations slide |

## 16. Mapping to SIH evaluation

| Criterion | Our answer |
| --- | --- |
| Innovation and novelty | Evidence graph with region-level provenance, abstain-and-route, rule-impact simulator |
| Technical feasibility | Open-source stack, golden path, working prototype |
| Impact | Measured reduction in officer minutes; earlier deficiency detection |
| Scalability | Layered architecture, adapter pattern, configuration-driven rules |
| Safeguards and ethics | Advisory outputs, RBAC, PII masking, human sign-off |
| Honesty and rigor | Compliance matrix, held-out evaluation, limitations slide |

## 17. Demo script (3 minutes)

1. Open the ranked queue and the highest-risk case.
2. Click a finding; the exact region highlights with clause and reason.
3. Show the conflict in the evidence graph.
4. Show the verification timeline: real QR and signature checks and a SIM-tagged source.
5. Upload a tampered document and watch a new flag appear.
6. Edit a rule and show the impact simulator.
7. Verify audit chain integrity.
8. Close on the Proof page with the baseline comparison, abstention curve, and the limitations slide.

## 18. Limitations (stated openly)

- Evaluated on synthetic and anonymized data; real-world accuracy will differ.
- Only QR and digital-signature checks are real; other verification sources are simulated.
- Image forensics are indicators, not proof, and can misfire on compressed scans.
- Infrastructure checks are documentary and metadata-based, not full visual compliance assessment.
- Rule coverage is a subset of the Handbook and needs official validation.
- Integration with the AICTE portal is designed, not deployed.
