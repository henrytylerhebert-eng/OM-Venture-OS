# Live Airtable Source Contract

This document is the current nomenclature and source-mapping contract for OM Venture OS.

It exists to keep the product grounded in the real Opportunity Machine Airtable structure while we modernize the application layer.

## Source-of-truth rule

Use the repo and the live Airtable structure as product truth.

When source mapping, provenance, importer design, reconciliation, or sync logic is involved:

- preserve exact Airtable table titles
- preserve exact Airtable view titles when known
- do not rename Airtable-origin concepts just to make them prettier
- only introduce internal canonical names for implementation clarity
- allow display labels to differ from source titles only when the exact source title is still preserved in the mapping

## Mapping model

Each source object should be represented with:

- `exact Airtable title`
- `internal canonical name`
- `display label`
- `meaning`
- `do-not-confuse-with`

When useful, we should also preserve:

- export filename
- Airtable view title
- row identifier
- legacy linked-record keys like `Link to Application`

## Requested source set

The following source objects are the first source-of-truth set for the next product slices.

| Requested source object | Exact Airtable table title | Current export or evidence | Internal canonical name | Display label | Meaning | Do-not-confuse-with |
| --- | --- | --- | --- | --- | --- | --- |
| Internal Application Review | `Internal Application Review` | `Internal Application Review-FULL_ALL_UNEDITED.csv` / view `FULL_ALL_UNEDITED` | `membership_intake_review` | `Internal Application Review` | Staff-side membership and application review history, including recommendation and workspace-access context. | Do not confuse with readiness decisions, venture stage, unlock eligibility, or cohort momentum. |
| Member Companies | `Member Companies` | `Member Companies-Startup Circle (Active from Any Cohort).csv` / view `Startup Circle (Active from Any Cohort)` | `program_company_record` | `Member Companies` | Program-layer company view with Builder and Startup Circle overlays, weekly notes, Miro links, membership context, and linked scholarship history. | Do not confuse with canonical company identity, `Active Members`, or venture readiness. |
| Personnel | `Personnel` | `Personnel-Grid view.csv` / views `Active Personnel`, `Alphabetical - Active` | `personnel_profile` | `Personnel` | The people and operations master table for staff, founders, startup team members, and linked company relationships. | Do not confuse with mentors, startup companies, or app auth roles. |
| Customer Discovery | `Customer Discovery` | Not exported as a standalone CSV in the shared set; currently visible through linked fields such as `Customer Discovery`, `Customer Discovery Link`, and `Customer Discovery Tracker` in `Member Companies` and `Cohorts` exports | `customer_discovery_tracker` | `Customer Discovery` | The linked tracker or workspace for interview and discovery progress, separate from downstream synthesis and readiness logic. | Do not confuse with patterns, experiments, readiness reviews, or `News Tracker` reporting. |
| Mentors | `Mentors` | `Mentors-Grid view.csv` / view `Grid view` | `mentor_profile` | `Mentors` | Supply-side mentor inventory including expertise, cohort fit, timezone, engagement status, and meeting relationships. | Do not confuse with `Personnel`, mentor assignments, or meeting events. |
| Mentor Meeting Requests | `Meeting Requests` | `Meeting Requests-ALL Meeting Status.csv` / view `ALL Meeting Status` | `mentor_meeting_request` | `Mentor Meeting Requests` | Meeting request and scheduling event log connecting founders, mentor matches, reasons for the meeting, and program participation context. | Do not confuse with mentor inventory, feedback, or readiness reviews. |
| Mentor Meeting Feedback | `Feedback` | `Feedback-Grid view.csv` / view `Grid view` | `mentor_meeting_feedback` | `Mentor Meeting Feedback` | Post-meeting outcome and notes log from mentors or mentees, including shareable feedback, OM staff notes, and meeting context. | Do not confuse with `News Tracker`, direct mentor assignments, or formal readiness decisions. |
| News Tracker | `News Tracker` | `News Tracker-Grid view.csv` / view `Grid view` | `founder_reporting_update` | `News Tracker` | Founder reporting and progress journal that captures narrative updates, milestones, roadblocks, discovery counts, customer feedback, and traction metrics over time. | Do not confuse with canonical traction signals, readiness reviews, or venture stage. |
| Funnel | `Funnel` | `Funnel-Grid view.csv` / view `Grid view` | `top_of_funnel_intake` | `Funnel` | Top-of-funnel lead and idea intake, including contact info, fit notes, early business-model questions, and linkage into `Internal Application Review`. | Do not confuse with investor funnel, cohort momentum, or founder progress. |
| Scholarship Applications | `Scholarship Applications` | `Scholarship Applications-Grid view.csv` / view `Grid view` | `scholarship_application` | `Scholarship Applications` | Financial-access and scholarship support records tied to membership/application context and staff recommendation. | Do not confuse with readiness, venture quality, unlock eligibility, or investor visibility. |

## Exact-title preservation notes

Two of the requested source objects need careful handling:

### 1. Mentor Meeting Requests

The exact Airtable table title in the shared exports is:

- `Meeting Requests`

In product UI, we may display this lane as:

- `Mentor Meeting Requests`

But in any source-mapping layer, provenance record, import pipeline, or sync configuration, preserve the exact Airtable title:

- `Meeting Requests`

### 2. Mentor Meeting Feedback

The exact Airtable table title in the shared exports is:

- `Feedback`

In product UI, we may display this lane as:

- `Mentor Meeting Feedback`

But in any source-mapping layer, provenance record, import pipeline, or sync configuration, preserve the exact Airtable title:

- `Feedback`

## Concept separation rules

The following concepts must remain separate in schema, logic, and UI.

### Membership status

Meaning:

- whether a company or person is an OM member
- whether they are active, pending, inactive, alumni, etc.

Primary source anchors:

- `Internal Application Review`
- `Member Companies`
- `Scholarship Applications`
- `Personnel`

Do not confuse with:

- venture stage
- readiness
- unlock eligibility
- investor visibility

### Venture stage

Meaning:

- where the company sits in the venture journey, such as customer discovery, beta testing, or customer acquisition

Primary source anchors:

- Builder evidence inside Venture OS
- `Customer Discovery`
- `Member Companies`
- `News Tracker`

Do not confuse with:

- membership status
- readiness
- unlock eligibility
- investor visibility

### Readiness

Meaning:

- a formal OM decision about whether the company is ready for a specific next step such as Builder completion, mentor-ready, intern-ready, pitch-ready, or investor-ready

Primary source anchors:

- Venture OS readiness reviews
- staff operating decisions

Do not confuse with:

- membership status
- venture stage
- unlock eligibility
- scholarship approval

### Unlock eligibility

Meaning:

- whether the company has earned access to the next support layer based on proof thresholds

Primary source anchors:

- interviews
- patterns
- assumptions
- experiments
- signals
- readiness reviews
- `Customer Discovery`
- `Member Companies`

Do not confuse with:

- automatic support activation
- readiness decisions
- investor visibility

### Investor visibility

Meaning:

- whether OM chooses to expose a company to investor-facing review or packet-sharing workflows

Primary source anchors:

- future OM-controlled access rules

Do not confuse with:

- `Funnel`
- membership status
- validation level 1
- scholarship access
- raw traction reporting in `News Tracker`

## First staff-console lanes this contract implies

The OM staff console should be organized around these lanes:

1. `Member Companies` + `Customer Discovery`
- weekly founder progress
- evidence quality
- next proof gap

2. `Internal Application Review` + `Scholarship Applications`
- intake and membership review
- financial access context
- explicitly separate from readiness

3. `Mentors` + `Meeting Requests` + `Feedback`
- mentor matching
- meeting operations
- follow-up quality

4. `News Tracker`
- cohort momentum
- founder reporting cadence
- milestone and roadblock visibility

5. Venture OS evidence + readiness layer
- unlock eligibility
- readiness decisions
- intervention queue

## Current implementation rule

Until the importer exists:

- preserve source titles in docs and source-mapping references
- use the Airtable structure to shape staff information architecture
- do not pretend Venture OS already has full live coverage of every source table
- do not collapse intake, reporting, mentor ops, and venture proof into one generic admin surface
