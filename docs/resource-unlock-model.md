# Resource Unlock Model

This note captures the founder experience implied by the shared screenshots:

- a portfolio progression curve where companies move through stages over time
- a validation-driven unlock panel where founders gain access to new OM resources only after they earn them

Referenced screenshots:

- `/Users/tylerhebert/Downloads/Untitled jockeys .jpg`
- `/Users/tylerhebert/Downloads/Validation .jpg`

## Core product idea

OM Venture OS should not only track stage and evidence. It should decide which resources a founder can access next.

That means the platform needs two related but distinct concepts:

1. **venture progression**
   - Where the company sits on the journey curve
   - Example stages: idea development, customer discovery, product development, beta testing, customer acquisition, growth, alumni

2. **resource unlocks**
   - Which support tracks become available once specific proof thresholds are satisfied
   - Example resources: startup circle, mentor programs, pitch opportunities, PRD support, tech intern support, funding support

The screenshots imply that these should work together but should not be collapsed into one field.

## What the screenshots mean

### 1. Progression curve view

The first image shows a portfolio progression curve:

- x-axis = company stage
- y-axis = progress score or maturity score
- each company is plotted as a point on the curve
- companies should cluster based on current stage and proof quality

This maps well to the current `PortfolioProgress` model in [src/types.ts](/Users/tylerhebert/Documents/OM%20Venture%20OS/src/types.ts#L284):

- `recommendedStage`
- `finalStage`
- `progressScore`
- `stageConfidence`
- `fundingStage`
- `primaryProofType`
- `nextMilestone`
- `biggestBlocker`

### 2. Validation unlock view

The second image shows a gated support model:

#### Validation Level 1

Unlocked after appropriate customer discovery is done:

- Testing Track
- Monthly Reporting
- Startup Circle
- Mentor Programs
- Pitch Opportunities
- Mix & Jingle / Elevator Pitch

#### Validation Level 2

Unlocked after some testing validation beyond customer discovery interviews:

- Tech Tank
- Product Requirement Doc
- Tech Intern Support
- Funding Support
- SBIR / STTR
- Angel / Venture

This means OM support should feel like a progression ladder, not a static menu.

## Recommended product behavior

### Founder experience

A founder should see:

- current stage
- current progress score
- unlocked resources
- locked resources
- exactly what is missing for the next unlock
- why a resource is available now

The important behavior is:

- no guessing
- no “ask staff and hope”
- no hidden support paths

The platform should say:

- what you have unlocked
- what evidence earned it
- what to do next to unlock the next layer

### OM staff experience

Staff should see:

- which founders are close to unlocking new support
- who is already eligible but not yet activated
- which unlocks were automatically granted
- which unlocks were manually overridden
- who is stuck because proof is missing

This should become a queue, not just a read-only dashboard.

## Recommended data model

The current schema already contains most of the evidence needed to drive unlocks:

- `Interview`
- `Pattern`
- `Assumption`
- `Experiment`
- `Signal`
- `ReadinessReview`
- `PortfolioProgress`
- `MentorAssignment`

What is still missing is an explicit unlock layer.

### Suggested new entities

#### Resource catalog

Defines what can be unlocked.

Example fields:

- `resourceKey`
- `name`
- `category`
- `description`
- `level`
- `active`
- `sortOrder`

Example categories:

- program
- mentor
- pitch
- build
- capital

#### Unlock rule

Defines the criteria for a resource.

Example fields:

- `resourceKey`
- `ruleKey`
- `label`
- `criteriaType`
- `threshold`
- `required`
- `notes`

Example criteria types:

- interview_count
- high_pain_interview_count
- validated_pattern_count
- active_experiment_count
- completed_experiment_count
- traction_signal_count
- readiness_status
- stage_minimum
- mentor_ready
- investor_ready

#### Company resource access

Stores the current access state for a company.

Example fields:

- `companyId`
- `resourceKey`
- `status`
- `unlockedAt`
- `unlockedByRule`
- `grantedByPersonId`
- `overrideReason`
- `notes`

Example statuses:

- locked
- eligible
- unlocked
- paused
- revoked

## Suggested unlock rules

These are not final rules, but they are a strong first draft based on the screenshots and the Builder docs.

### Validation Level 1

Goal: customer discovery completed well enough to unlock structured support.

Possible rule bundle:

- at least 15 interviews logged
- at least 5 interviews with pain intensity 4 or 5
- at least 2 repeated problem patterns identified
- top assumptions documented
- founder has a current primary segment and problem statement

Suggested resources unlocked:

- Testing Track
- Monthly Reporting
- Startup Circle
- Mentor Programs
- Pitch Opportunities
- Mix & Jingle

### Validation Level 2

Goal: founder has moved beyond interviews into test-driven validation.

Possible rule bundle:

- at least 1 active or completed experiment
- at least 1 measurable traction signal
- evidence of a sharpened value proposition
- a current GTM draft or test motion
- staff or system marks company as build-ready or mentor-ready

Suggested resources unlocked:

- Tech Tank
- Product Requirement Doc
- Tech Intern Support
- Funding Support
- SBIR / STTR track
- Angel / Venture track

### Investor-facing unlock

This should remain stricter than Validation Level 2.

Possible rule bundle:

- readiness review marked `investor_ready`
- clear proof packet exists
- current metrics and next milestone defined
- OM approval given for visibility

Suggested resources unlocked:

- investor packet generation
- investor review queue
- investor-specific diligence sharing

## How this maps to the UI

### Founder dashboard module

Add an “Unlocked Resources” section that shows:

- current level
- unlocked items with checkmarks
- next-level locked items
- missing criteria for each locked item

### Portfolio/admin view

Add an “Unlock Queue” view that shows:

- company
- current stage
- progress score
- next unlock level
- unmet criteria count
- staff override status

### Curve/dashboard view

The curve view should be driven by:

- x-axis from `PortfolioProgress.finalStage`
- y-axis from `PortfolioProgress.progressScore`

And each company detail panel should include:

- unlocked support
- next unlock target
- missing proof

## Important design rule

Do not treat stage alone as access.

A company can be in a later stage but still lack the proof needed for a resource.
Likewise, a company can be early but highly evidence-rich in a way that justifies a staff review.

So the model should be:

- stage = where the company is
- score = how strong the progress is
- unlock criteria = whether the company has earned support access

## Recommended implementation order

1. Add an explicit resource/unlock schema layer.
2. Build a founder-facing unlocked resources panel.
3. Build a staff-facing unlock queue.
4. Connect unlock rules to current evidence tables.
5. Add manual override controls for OM staff.
6. Later, connect the unlock state to mentor access, PRD generation, tech support, and investor packet workflows.

## Why this matters

This is one of the clearest ways to make OM Venture OS feel different from a generic CRM:

- founders do not just log data
- logged proof changes what the system allows them to do next
- OM support becomes structured, visible, and earned

That is the product behavior the screenshots are pointing toward.
