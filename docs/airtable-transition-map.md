# Airtable Transition Map

This note captures how the current Airtable exports line up with the OM Venture OS schema and which tables should become the next system's sources of truth.

The profiling below was based on the CSV exports shared from:

- `/Users/tylerhebert/Downloads/AirTables CSV`

An important follow-on rule now applies:

- these shared exports should be treated as real historical and current OM operating data
- future ingestion should target the exact Airtable table and view titles already in use

That contract is captured in [docs/airtable-integration-contract.md](/Users/tylerhebert/Documents/OM%20Venture%20OS/docs/airtable-integration-contract.md), and the exact export-set validator lives in [scripts/validate_airtable_export_set.py](/Users/tylerhebert/Documents/OM%20Venture%20OS/scripts/validate_airtable_export_set.py).

## Current Airtable picture

The Airtable workspace is not one single venture-tracking base. It is a blend of:

- intake and membership application history
- active member/company roster
- Builder cohort participation and weekly program artifacts
- people and access operations
- mentor scheduling and feedback ops
- light relationship-intro tracking
- unrelated office/library/admin tables

That matches the earlier strategy docs: the current system is carrying both community operations and venture progression, but venture proof is still spread across multiple tables and notes.

## Export snapshot

These were the most relevant venture/program tables in the shared export set:

| Airtable export | Rows | What it appears to be |
| --- | ---: | --- |
| `FULL_ALL_UNEDITED-Grid view.csv` | 403 | Membership/application intake archive |
| `Internal Application Review-FULL_ALL_UNEDITED.csv` | 403 | Duplicate/internal view of the same application archive |
| `Active Members-Active Members.csv` | 96 | Active company/member roster |
| `Member Companies-Startup Circle (Active from Any Cohort).csv` | 54 | Builder/Startup Circle company view with program notes |
| `Cohorts-Grid view.csv` | 54 | Cohort participation plus Miro/discovery resources |
| `Personnel-Grid view.csv` | 395 | Full personnel/people operations table |
| `Personnel-Alphabetical - Active.csv` | 125 | Active people subset |
| `Personnel-Active Personnel.csv` | 125 | Lighter active people subset |
| `Mentors-Grid view.csv` | 55 | Mentor inventory |
| `Meeting Requests-ALL Meeting Status.csv` | 86 | Mentor meeting ops/events |
| `Feedback-Grid view.csv` | 225 | Mentor/mentee feedback tied to requests |
| `Connections-Grid view.csv` | 3 | Staff-mediated intro tracking |
| `Library-Bookshelf.csv` | 84 | Library/admin inventory, not core venture tracking |

## What correlates cleanly

### Primary joins in the current Airtable model

The most reliable cross-table joins today are:

- `Company Name`
- `Link to Application`
- request/event ids such as `Request` and `Request Link`
- person names and company names as soft joins

Observed overlap from the shared exports:

- `Active Members` had 96 companies.
- 54 of those appeared in both `Member Companies-Startup Circle` and `Cohorts`.
- 84 of those appeared in `Personnel` company references.
- `Link to Application` aligned almost perfectly across `Active Members`, `Cohorts`, and `Member Companies`.

That tells us:

- `Active Members` is the best company anchor for the currently active operating system.
- `Link to Application` is the closest thing Airtable currently has to a shared legacy company key.
- `Member Companies` and `Cohorts` are effectively cohort/program overlays on top of the active company roster.

## Recommended mapping into OM Venture OS

The current codebase already has most of the right destination entities in [src/types.ts](/Users/tylerhebert/Documents/OM%20Venture%20OS/src/types.ts#L240), especially:

- `Company`
- `Person`
- `Cohort`
- `CohortApplication`
- `CohortParticipation`
- `PortfolioProgress`
- `Mentor`
- `MentorAssignment`
- `MeetingRequest`
- `Feedback`

### Table-by-table crosswalk

| Airtable export | Venture OS destination | Keep as source of truth? | Notes |
| --- | --- | --- | --- |
| `FULL_ALL_UNEDITED` | application archive, initial `Company`, initial founder `Person`, optional import staging table | No | Archive/import-only. Do not treat as live operating table. |
| `Internal Application Review-FULL_ALL_UNEDITED` | same as above | No | Looks duplicative; keep one canonical archive only. |
| `Active Members` | `Company`, `Organization`, membership metadata, active roster view | Yes, temporarily | Best current anchor for active companies. |
| `Member Companies-Startup Circle` | `CohortParticipation`, weekly check-ins, Builder artifacts | Partially | Good program overlay, but cohort values need normalization into rows. |
| `Cohorts` | `CohortParticipation` and resource links (`miroUrl`, discovery tracker) | Yes for program artifacts | This table is closer to cohort participation than a pure cohort-definition table. |
| `Personnel` | `Person` plus operational profile metadata | Yes, after cleanup | Needs role normalization and deduping. |
| `Personnel-Active Personnel` | filtered view only | No | Use for QA, not as a canonical import table. |
| `Personnel-Alphabetical - Active` | filtered view only | No | Same as above. |
| `Mentors` | `Mentor` + linked `Person` record | Yes | Good mentor inventory base. |
| `Meeting Requests` | `MeetingRequest` | Yes | Strong event table; should stay event-shaped. |
| `Feedback` | `Feedback` | Yes | Best linked outcome/event table, keyed off requests. |
| `Connections` | future `Connection` or network-intro table | Optional | Useful, but not required for core Builder evidence flow. |
| `Library` | out of scope | No | Not part of venture progression. |

## Important modeling corrections

### 1. Membership is not venture maturity

This is the biggest conceptual trap in the Airtable exports.

`FULL_ALL_UNEDITED` and `Active Members` are largely about OM membership and workspace status. Venture OS should keep that context, but it should not drive stage, readiness, or investor visibility.

That aligns with the strategy docs:

- membership status is not portfolio progress
- funding stage is separate from operating stage
- readiness gates must be explicit

### 2. Cohort data must become normalized participation rows

Examples like:

- `Fall 2024,Dropout`
- `September 2022,October 2022`
- `Spring 24 - 2.0`

show that cohort data is currently embedded as multi-value text inside company-level views.

In Venture OS, these should become:

- one `Cohort` record per program instance
- one `CohortParticipation` record per company/program enrollment
- explicit participation status such as active, completed, or withdrawn

### 3. People roles need normalization

The `Personnel` table currently contains role values like:

- `Team Lead`
- `Staff`
- blank values
- `Not a Key Card Holder`

These do not map directly to the role matrix in Venture OS. Import will need a translation layer into app roles such as:

- `om_admin`
- `om_staff`
- `founder`
- `startup_team`
- `mentor`

### 4. Mentor ops should stay event-based

The current mentor flow is already close to the right shape:

- `Mentors` = supply-side inventory
- `Meeting Requests` = interaction/request log
- `Feedback` = post-meeting outcome log

This maps well to the current app schema and should not be collapsed back into company notes.

### 5. Connections are real, but second-order

`Connections-Grid view.csv` is clearly tracking curated introductions, which is valuable.

It should likely become a dedicated relationship event layer later, but it is not the first migration priority compared with:

- companies
- people
- cohort participation
- mentor requests
- feedback
- venture evidence

## Data quality issues to expect during import

### Company identity drift

There are obvious company-name inconsistencies:

- quote wrapping
- punctuation differences
- archived suffixes
- combined names

Examples surfaced in the shared files include variants like quoted LLC names, archived suffixes, and merged labels.

Recommendation:

- create a canonical `legacySourceId`
- create a normalized company slug
- keep raw Airtable source values for traceability

### Duplicate exports / views

The shared set includes multiple filtered or duplicated views of the same underlying tables:

- `FULL_ALL_UNEDITED` and `Internal Application Review-FULL_ALL_UNEDITED`
- `Personnel-Grid view`, `Personnel-Alphabetical - Active`, `Personnel-Active Personnel`

Recommendation:

- import from one canonical source per entity
- use filtered exports only for QA comparisons

### Weak hard keys in some tables

Several relationships still rely on names rather than ids:

- company name joins
- mentor name joins
- participant/person names in cohort views

Recommendation:

- introduce immutable ids during migration
- keep Airtable row references in import metadata where possible

## Recommended migration order

1. Import canonical companies from `Active Members`, with legacy application linkage from `FULL_ALL_UNEDITED`.
2. Import people from `Personnel`, then normalize founders/staff/team-member roles.
3. Import mentors from `Mentors`, linked to imported people.
4. Normalize `Cohorts` and `Member Companies` into `Cohort` + `CohortParticipation`.
5. Import `Meeting Requests` and `Feedback` as event records.
6. Add `PortfolioProgress` and readiness logic on top of the normalized venture records.
7. Decide whether `Connections` belongs in phase two or stays external for now.

## What this means for the product roadmap

The Airtable exports reinforce the same conclusion as the strategy docs:

- OM Venture OS should be the canonical operating system
- Airtable should be treated as legacy source material and migration input
- the next product priority is not more schema invention
- the next product priority is operational surfaces and import/migration tooling

The highest-leverage next implementation slices are:

1. an import pipeline with canonical company/person ids and Airtable source metadata
2. OM staff admin views for companies, cohorts, and mentor operations
3. readiness-gated workflow surfaces that separate membership, program participation, and investor readiness
