# Airtable Integration Contract

This note captures an important operating rule for OM Venture OS:

- the Airtable exports shared so far should be treated as real historical and current operating data
- future ingestion should integrate against the exact Airtable table and view titles already in use
- Venture OS should be designed so those sources can be mapped, imported, reconciled, and eventually synced without renaming the source system out of existence

This is not the live sync implementation.
It is the contract we should build against so the later Airtable integration work starts from the real OM operating environment.

## Source-of-truth stance

Until direct Airtable access is connected, the shared CSV exports should be treated as:

- historical record
- current operating snapshot
- migration input
- naming contract for future sync work

That means these files are not throwaway examples.
They are the real system legacy that should inform:

- entity modeling
- import assumptions
- staff workflows
- founder progress surfaces
- milestone and unlock rules
- future sync pipeline design

## Exact Airtable titles we should preserve

The future ingestion pipeline should target these exact table/view titles as first-class source references.

### Core venture and program sources

| Export filename | Airtable table | Airtable view | Role in Venture OS |
| --- | --- | --- | --- |
| `FULL_ALL_UNEDITED-Grid view.csv` | `FULL_ALL_UNEDITED` | `Grid view` | historical application archive |
| `Internal Application Review-FULL_ALL_UNEDITED.csv` | `Internal Application Review` | `FULL_ALL_UNEDITED` | duplicate/internal application review source |
| `Active Members-Active Members.csv` | `Active Members` | `Active Members` | active company roster and strongest live company anchor |
| `Member Companies-Startup Circle (Active from Any Cohort).csv` | `Member Companies` | `Startup Circle (Active from Any Cohort)` | Builder and Startup Circle overlay |
| `Cohorts-Grid view.csv` | `Cohorts` | `Grid view` | cohort participation plus Builder artifacts |
| `Personnel-Grid view.csv` | `Personnel` | `Grid view` | people and operations master table |
| `Personnel-Active Personnel.csv` | `Personnel` | `Active Personnel` | filtered active-people QA view |
| `Personnel-Alphabetical - Active.csv` | `Personnel` | `Alphabetical - Active` | alternate filtered active-people QA view |
| `Mentors-Grid view.csv` | `Mentors` | `Grid view` | mentor inventory |
| `Meeting Requests-ALL Meeting Status.csv` | `Meeting Requests` | `ALL Meeting Status` | mentor request and meeting event log |
| `Feedback-Grid view.csv` | `Feedback` | `Grid view` | post-meeting and mentor feedback log |
| `Connections-Grid view.csv` | `Connections` | `Grid view` | curated intro tracking |

### Shared but currently out-of-scope or lower-priority sources

These also exist in the shared export set and should remain recognized by exact title even if they are not part of the first ingestion phase:

- `2.0_3.0 Invoices` / `Grid view`
- `Change Requests` / `Remove Team Member`
- `File Cabinets` / `Grid view`
- `Funnel` / `Grid view`
- `Inventory` / `Overdue`
- `Ledger` / `By Action`
- `Library` / `Bookshelf`
- `Mailboxes` / `Mailbox Reference Sheet`
- `News Tracker` / `Grid view`
- `Office Keys` / `Grid view`
- `Scholarship Applications` / `Grid view`

## Build implications right now

This contract changes how we should think about the product:

### 1. Treat Airtable naming as part of the integration surface

When we later build live Airtable sync, we should preserve source metadata such as:

- Airtable table title
- Airtable view title
- export filename or source descriptor
- row id when available
- import timestamp
- sync timestamp
- legacy keys such as `Link to Application`

### 2. Preserve source provenance on imported records

Imported Venture OS records should carry traceability fields such as:

- `sourceSystem`
- `sourceTableTitle`
- `sourceViewTitle`
- `sourceRecordId`
- `sourceFilename`
- `legacyApplicationLink`
- `importBatchId`
- `lastSyncedAt`

This matters because OM will need to reconcile:

- legacy records
- corrected records
- future live syncs
- duplicate companies and people
- role normalization decisions

### 3. Design founder and staff surfaces against real historical shape

The product should assume that:

- company data arrives with legacy membership context
- cohort participation may be denormalized
- people roles may be messy
- mentor interactions are event-shaped
- feedback is a first-class historical signal

That means our interfaces should be resilient to partial records and provenance-rich imports.

## Requirements for the future live ingestion pipeline

When we are ready to connect directly to Airtable, the integration should support:

1. exact table and view targeting using the current OM names above
2. dry-run import mode before write mode
3. row-count and key-overlap validation before commit
4. canonical id mapping for companies and people
5. preservation of raw source values for auditability
6. sync health reporting by source table
7. table-by-table enablement so we can phase rollout safely

## Suggested implementation phases later

### Phase 1: export-driven importer

Use the shared CSV naming contract above to build:

- deterministic import jobs
- canonical id creation
- source metadata storage
- reconciliation reports

### Phase 2: live Airtable connector

After access is granted and mappings are confirmed:

- connect to the exact Airtable tables and views
- compare live record counts to the export contract
- verify field mapping against the known imports
- enable incremental sync

### Phase 3: operational sync monitoring

Add:

- sync status dashboard
- import errors by table
- row drift alerts
- QA views for mismatched joins and duplicate identities

## Practical rule for current build work

Until the live Airtable integration exists:

- use the existing Airtable exports to inform product design
- treat the shared titles as canonical source references
- avoid inventing fake source names that drift from OM's real Airtable setup
- build the Venture OS schema so it can absorb these sources cleanly later

This keeps the new OS grounded in the actual OM operating history while still letting us modernize the product model.
