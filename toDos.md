I want you to build a new feature inside my existing AriVerse website called:

ARI XPands

IMPORTANT:
Before implementing anything, inspect the existing repository thoroughly.

Understand and reuse:
- existing framework
- routing
- component architecture
- styling/theme
- database/storage
- backend/API conventions
- authentication
- existing admin area
- deployment setup

Do NOT:
- migrate frameworks
- introduce a second design system
- duplicate authentication
- replace existing persistence unnecessarily
- break existing pages
- hard-code this feature around one specific curriculum

Preserve the existing AriVerse visual identity and architecture.

======================================================================
CORE IDEA
======================================================================

ARI XPands is a permanent section of AriVerse for documenting things I
intentionally learn, explore, research, study, or build over time.

Public root:

    /ari-xpands

The fundamental unit is called:

    Xpand

One Xpand = one learning/exploration journey.

Examples:

    AI Systems Mastery
    Transformer Deep Dive
    CUDA
    GATE 2027
    Few-Shot Learning
    Greek
    CRISPR
    Distributed Systems
    Mathematics
    Designing Data-Intensive Applications
    Some Random Research Question

ARI XPands must NOT assume that every Xpand is a course, curriculum,
project, research paper, or fixed-duration challenge.

An Xpand is simply:

    “Something Ari has chosen to expand into.”

======================================================================
MOST IMPORTANT PRODUCT REQUIREMENT
======================================================================

CREATING AN XPAND MUST BE EXTREMELY SIMPLE.

Inside the existing admin page, I should be able to enter:

    CUDA

and press:

    Create Xpand

That should be enough.

ONLY THE NAME/TITLE IS REQUIRED.

The system automatically creates:

    title: CUDA
    slug: cuda
    status: active
    visibility: public or the configured default
    createdAt
    updatedAt

and gives it its own public page:

    /ari-xpands/cuda

Everything else should initially be empty and optional.

I should NOT have to define:
- phases
- weeks
- milestones
- description
- dates
- tags
- curriculum structure
- progress
- experiments
- resources

before creating an Xpand.

Creating an Xpand should take roughly 5 seconds.

Think:

    Name it -> Create -> Start logging.

That is the central UX.

======================================================================
MENTAL MODEL
======================================================================

The architecture should conceptually be:

ARI XPands
│
├── Xpand
│    ├── Overview
│    ├── Timeline
│    ├── Logs
│    ├── Notes / Questions
│    ├── Milestones
│    ├── Evidence
│    ├── Resources
│    ├── Experiments
│    └── Optional Structure
│
├── Xpand
│    └── ...
│
└── Xpand
     └── ...

Every Xpand uses the same generic base architecture.

However, all sections except the core Xpand identity should be optional.

======================================================================
DO NOT OVER-MODEL XPANDS
======================================================================

Do NOT make these mandatory fields:

    phase
    week
    exam
    capstone
    syllabus
    research_spine
    scorecard

Those concepts may exist inside a particular Xpand but they are NOT
properties that define all XPands.

For example:

AI Systems Mastery
    may have:
        phases
        weeks
        exams
        capstones

CUDA
    may have:
        milestones
        experiments
        notes

Greek
    may have:
        logs
        resources
        vocabulary notes

Random Research Question
    may have:
        hypotheses
        experiments
        evidence

All should still be valid XPands.

======================================================================
GENERIC XPAND MODEL
======================================================================

Design an Xpand entity appropriate for the existing project's persistence
layer.

Suggested conceptual fields:

Xpand
-----
id
title
slug
subtitle?                optional
description?             optional
status
visibility
coverImage?              optional
startDate?               optional
endDate?                 optional
tags?                    optional
createdAt
updatedAt
archivedAt?              optional

Status values:

    planned
    active
    paused
    completed
    abandoned
    archived

Visibility:

    draft
    public
    private

Only title should be required from the user when creating one.

Generate slug automatically.

Slug generation must:
- lowercase
- be URL safe
- handle spaces
- remove unsafe characters
- handle duplicate names safely

Examples:

    "AI Systems Mastery" -> ai-systems-mastery
    "C++ & CUDA" -> c-cuda or another deterministic safe equivalent

If duplicate:
    cuda
    cuda-2

or use the existing application's slug collision convention.

======================================================================
GENERIC CHILD ENTITIES
======================================================================

Build generic reusable child entities.

1. XPAND LOG

Represents an update/journal entry.

Suggested fields:

id
xpandId
date
title?                   optional
summary?                 optional
done?                    optional text/list
learned?                 optional text/list
failed?                  optional text/list
questions?               optional text/list
blockers?                optional text/list
next?                    optional text/list
freeformNote?            optional markdown
timeSpentMinutes?        optional
visibility
createdAt
updatedAt

Do NOT require all fields.

A log containing only:

    learned:
    "Why KV cache grows linearly with sequence length"

is perfectly valid.

----------------------------------------------------------------------
2. XPAND MILESTONE
----------------------------------------------------------------------

Fields:

id
xpandId
title
description?
status
order
targetDate?
completedAt?
createdAt
updatedAt

Statuses:

    todo
    active
    completed
    blocked
    dropped

Milestones are OPTIONAL.

Progress can be derived from milestones only when an Xpand actually uses
milestones.

----------------------------------------------------------------------
3. XPAND EVIDENCE
----------------------------------------------------------------------

Evidence should be a first-class concept.

Fields:

id
xpandId
title
description?
type
url?
date
metadata?
visibility
createdAt

Possible types:

    commit
    pull_request
    github_issue
    code
    experiment
    benchmark
    report
    article
    technical_note
    demo
    video
    model
    dataset
    paper
    paper_review
    architecture
    screenshot
    presentation
    other

Do not require a URL.

Some evidence may simply be a local note or result.

----------------------------------------------------------------------
4. XPAND RESOURCE
----------------------------------------------------------------------

Things used while learning.

Fields:

id
xpandId
title
type
url?
author?
notes?
status?
createdAt

Possible types:

    paper
    book
    article
    documentation
    course
    video
    repository
    dataset
    tool
    other

Possible reading/resource status:

    queued
    reading
    completed
    dropped

----------------------------------------------------------------------
5. XPAND NOTE
----------------------------------------------------------------------

For thoughts that are not necessarily daily logs.

Fields:

id
xpandId
title?
content
kind
createdAt
updatedAt

Kinds:

    note
    question
    idea
    insight
    concept
    hypothesis
    failure
    reflection

Questions are particularly important.

I want the system to preserve what I was wondering about, not only what
I completed.

----------------------------------------------------------------------
6. XPAND EXPERIMENT
----------------------------------------------------------------------

Optional but useful for technical/research XPands.

Fields:

id
xpandId
experimentId?            human-friendly stable ID
title
question?
hypothesis?
method?
baseline?
dataset?
config?
hardware?
metrics?
result?
failureAnalysis?
interpretation?
nextExperiment?
status
startedAt?
completedAt?
createdAt
updatedAt

Statuses:

    planned
    running
    completed
    failed
    abandoned

Negative results must remain visible.

The UI must not imply that failed experiments are bad or should be
deleted.

======================================================================
OPTIONAL GENERIC STRUCTURE
======================================================================

Some XPands are structured.

Provide a generic entity such as:

    XpandSection

Fields:

id
xpandId
parentSectionId?         optional
title
description?
order
status?
startDate?
endDate?
metadata?

This should allow arbitrary hierarchy.

Examples:

AI Systems Mastery

    Bedrock
        Week 01
        Week 02
        Week 03

    Perception
        Week 06
        Week 07

GATE

    Probability
        Random Variables
        Bayes
        Distributions

Greek

    Alphabet
    Grammar
    Vocabulary
    Reading

Do NOT name the database entity "Phase" or "Week".

Use a generic structure.

A section may contain child sections.

This allows an Xpand to model:

    phase -> week
    subject -> chapter
    module -> lesson
    domain -> topic

without schema changes.

======================================================================
PUBLIC ROUTES
======================================================================

Create:

    /ari-xpands

Individual Xpand:

    /ari-xpands/[slug]

Optional nested routes where useful:

    /ari-xpands/[slug]/log
    /ari-xpands/[slug]/log/[entry]
    /ari-xpands/[slug]/evidence
    /ari-xpands/[slug]/experiments
    /ari-xpands/[slug]/resources

Use framework-appropriate route conventions.

Do not create unnecessary routes if a clean tab/section experience works
better in the existing architecture.

======================================================================
PUBLIC /ari-xpands HOMEPAGE
======================================================================

This page is an index of all public XPands.

This is NOT the AI Systems Mastery dashboard.

It is the home of ALL XPands.

Possible layout:

ARI XPANDS

A living record of things I'm learning,
building, questioning, and exploring.

ACTIVE XPANDS

┌─────────────────────────────────────────┐
│ AI Systems Mastery                      │
│ Research Engineering + AI Systems       │
│                                         │
│ Active                                  │
│ Last touched today                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CUDA                                    │
│                                         │
│ Active                                  │
│ Last touched 2 days ago                 │
└─────────────────────────────────────────┘

COMPLETED

[other Xpands]

Each card should derive what it can from actual data:

- title
- subtitle if present
- status
- latest update
- start date if present
- progress only if meaningful
- tags if present
- latest evidence maybe
- activity count

Do NOT show fake percentages.

If an Xpand has no progress model, just don't show a progress bar.

======================================================================
INDIVIDUAL XPAND PAGE
======================================================================

Every Xpand should immediately get a usable page even when completely
empty.

Example:

ARI XPANDS / CUDA

CUDA

Active

Started Aug 30, 2026

Latest
No entries yet.

[Timeline]
[Notes]
[Milestones]
[Evidence]
[Resources]
[Experiments]

The page should gracefully hide empty sections or show subtle empty states.

Once data exists, prioritize:

1. What is this Xpand?
2. What am I currently doing?
3. What changed recently?
4. What did I learn?
5. What questions emerged?
6. What evidence exists?
7. What failed?
8. What comes next?

======================================================================
TIMELINE IS THE HEART OF AN XPAND
======================================================================

An Xpand should feel like a journey over time.

Combine relevant events into a chronological timeline:

- Xpand created
- logs
- questions
- milestones completed
- experiments
- evidence
- resources completed
- status changes

Example:

AUG 30

Created CUDA Xpand

SEP 01

LEARNED
Threads -> warps -> blocks -> grid

QUESTION
Why are warps 32 threads?

SEP 02

EXPERIMENT
Vector-add kernel

RESULT
Custom kernel slower than PyTorch for small tensors.

FAILED / DISCOVERED
Kernel launch overhead dominates.

SEP 04

EVIDENCE
Profiler report published

This chronological view is extremely important.

======================================================================
ADMIN INTEGRATION
======================================================================

Use the EXISTING AriVerse admin.

Add:

    ARI XPands

Do not create an unrelated second admin application.

Main admin view:

ARI XPANDS

[ + New Xpand ]

ACTIVE

AI Systems Mastery
Last updated Today
[Open] [Quick Log] [Edit]

CUDA
Last updated Yesterday
[Open] [Quick Log] [Edit]

PAUSED
...

COMPLETED
...

======================================================================
NEW XPAND UX
======================================================================

This is crucial.

Click:

    + New Xpand

Show a tiny creation UI.

Something like:

What are you expanding into?

[________________________________]

                         [Create Xpand]

That is enough.

Only ask for TITLE.

Do NOT show a 15-field form before creation.

After creation:

    Xpand created.

Navigate to its admin detail page.

Then optionally show:

    Add a description
    Add structure
    Add first note
    Add milestone
    Start logging

but none are required.

This feature should embody:

    NAME IT -> IT EXISTS -> START LEARNING

======================================================================
ADMIN XPAND DETAIL
======================================================================

Once created, admin page should allow management of:

Overview
Logs
Notes
Questions
Milestones
Evidence
Resources
Experiments
Structure
Settings

Settings can edit:

- title
- slug
- subtitle
- description
- status
- visibility
- start/end date
- tags
- cover
- archive/delete

======================================================================
QUICK LOG
======================================================================

This is one of the most important features.

Inside each Xpand admin page provide:

    Quick Log

with one simple text area / command console.

I want to type:

    /done Implemented KV cache

    /learned KV cache prevents recomputing previous K/V states

    /question Why doesn't KV cache store queries?

    /failed Memory usage exploded at long context

    /blocker GPU unavailable

    /next Benchmark cache growth

    /read Attention Is All You Need

    /evidence https://github.com/...

    /time 2h30m

and save.

Commands typed together should be assigned to today's Xpand log.

Support multiple commands in one submission:

/done Built tokenizer
/learned BPE merges frequent pairs
/question How does unigram tokenization differ?
/time 1h45m

Use a DETERMINISTIC parser.

Do NOT require an LLM.

Unknown commands must produce a visible validation error.

Never silently discard input.

======================================================================
QUICK LOG COMMANDS
======================================================================

At minimum support:

    /done <text>
    /learned <text>
    /failed <text>
    /question <text>
    /idea <text>
    /insight <text>
    /blocker <text>
    /next <text>
    /read <text-or-url>
    /evidence <text-or-url>
    /time <duration>
    /note <text>

Potentially:

    /experiment <text>
    /milestone <text>

but only if implementation remains clean.

Duration parser should understand:

    30m
    45min
    1h
    1h30m
    1h 30m
    2h45m
    2h 45m

Store internally in minutes.

======================================================================
TODAY'S LOG BEHAVIOR
======================================================================

If today's Xpand log does not exist:

    create it

If today's Xpand log already exists:

    append/update it

Example:

Morning:

    /learned warp scheduling

Evening:

    /failed kernel slower than PyTorch
    /time 1h

Both should belong to the same daily log for that Xpand.

Preserve chronology where useful.

Do not accidentally overwrite earlier content.

======================================================================
NORMAL LOG EDITOR
======================================================================

Quick Log is for speed.

Also provide a proper editor where I can:

- edit today's entry
- edit old entries
- add markdown
- reorder or clean entries
- change visibility
- attach evidence
- connect experiment
- change date where needed

======================================================================
QUESTIONS SHOULD BE FIRST-CLASS
======================================================================

Questions matter heavily to this system.

Allow me to see:

    Open Questions

inside an Xpand.

Example:

CUDA

OPEN QUESTIONS

- Why are NVIDIA warps exactly 32 threads?
- When does higher occupancy reduce performance?
- Why can shared-memory bank conflicts serialize accesses?

A question can later become:

    open
    explored
    answered
    abandoned

When answered, optionally link it to:
- a note
- experiment
- evidence
- daily log

This lets the site capture intellectual development, not only productivity.

======================================================================
PROGRESS
======================================================================

Do NOT force all XPands into percentages.

Progress must be flexible.

Possible cases:

1. No structure

    status only:
        Active

2. Milestones exist

    4 / 10 milestones

3. Sections have completion states

    derive structured progress

4. Explicit manual progress

    optional if needed

Avoid meaningless things such as:

    CUDA — 43%

unless that number has a defensible basis.

======================================================================
ACTIVITY METRICS
======================================================================

Each Xpand may derive useful stats from actual data:

- days logged
- time invested
- notes
- questions
- questions answered
- experiments
- failed experiments
- evidence items
- resources completed
- milestones completed

Never fabricate values.

======================================================================
ARI XPANDS GLOBAL STATS
======================================================================

The root /ari-xpands page can derive:

    Active XPands
    Completed XPands
    Total learning hours
    Total logged days
    Experiments
    Questions
    Evidence
    Resources completed

Again:

only from real stored data.

======================================================================
THE FIRST XPAND
======================================================================

The existing 26-week AI Systems Mastery curriculum should eventually
exist as:

    Xpand:
        title = "AI Systems Mastery"
        slug = "ai-systems-mastery"

It is ONE Xpand.

Its six phases, 26 weeks, capstones, examinations, etc. are content or
optional structure belonging to that Xpand.

Do NOT make those concepts define the entire ARI XPands architecture.

If existing curriculum data already exists in the repository, adapt or
migrate it carefully.

Do not destroy existing information.

======================================================================
OPTIONAL STRUCTURED XPAND SUPPORT
======================================================================

For a complex Xpand such as AI Systems Mastery, I should be able to build:

AI Systems Mastery
│
├── Bedrock
│    ├── Week 01
│    ├── Week 02
│    ├── Week 03
│    ├── Week 04
│    └── Week 05
│
├── Perception
│    ├── Week 06
│    └── ...
│
└── ...

using generic XpandSection relationships.

A section can contain:

- description
- notes
- milestones
- resources
- dates
- status
- child sections

Do not add special database tables named specifically after
"Bedrock", "Phase", or "Week".

======================================================================
SEARCH / FILTER
======================================================================

On /ari-xpands support sensible filtering such as:

    Active
    Completed
    Paused
    All

Potentially tags later.

Inside an Xpand allow search across:
- logs
- notes
- questions
- evidence
- resources

Do not over-engineer search initially.

======================================================================
DRAFT / PRIVACY
======================================================================

I may write things privately before publishing them.

Respect visibility.

Public pages must NEVER expose:
- draft logs
- private notes
- private evidence
- admin-only fields
- private experiments

Enforce this server-side, not just by hiding UI elements.

======================================================================
MARKDOWN
======================================================================

Notes and logs may contain Markdown.

Use the existing Markdown renderer if one exists.

Sanitize rendered content appropriately.

Support:
- headings
- bullets
- inline code
- code blocks
- links
- blockquotes
- simple tables if already supported

Do not introduce unsafe raw HTML unless the current application has a
safe, explicit mechanism.

======================================================================
DESIGN DIRECTION
======================================================================

First inspect the existing AriVerse design.

ARI XPands should feel like:

    a public intellectual laboratory
    +
    an engineering journal
    +
    a map of curiosity over time

It should NOT feel like:

- Notion clone
- Udemy/course dashboard
- habit tracker
- productivity SaaS
- childish gamification app
- corporate LMS
- generic CRUD dashboard

Desired qualities:

- minimal
- technical
- editorial
- beautiful typography
- strong information hierarchy
- slightly experimental
- calm
- intelligent
- evidence-oriented
- dense when useful
- lots of breathing room where appropriate

Use the site's existing theme and tokens.

Avoid:
- endless rounded cards
- excessive gradients
- glassmorphism everywhere
- random neon
- badges on everything
- streak flames
- coins
- trophy gamification
- meaningless charts
- fake GitHub activity grids

======================================================================
XPAND CARD DESIGN
======================================================================

The Xpand card is important.

Each Xpand on /ari-xpands should feel like one contained "bottle" of
learning.

Possible visual information:

    TITLE

    optional subtitle

    status
    start date
    last touched

    latest thought / activity if suitable

    small derived progress indicator if the Xpand actually has structure

The entire card should be clickable.

Do not overcrowd it.

The card must also look good for a brand-new Xpand that contains only:

    title = CUDA

======================================================================
EMPTY STATE DESIGN
======================================================================

Empty XPands are normal.

For a newly created Xpand:

    CUDA

    Nothing logged yet.

    Start with a question, note, resource,
    experiment, or today's log.

Admin may show actions:

    Quick Log
    Add Note
    Add Question
    Add Resource
    Add Milestone

Public side should remain tasteful and not expose admin prompts.

======================================================================
AUTOMATIC "LAST TOUCHED"
======================================================================

Derive last activity from the newest of:

- log
- note
- question update
- experiment
- evidence
- resource completion
- milestone update

Do not require me to manually maintain "last updated".

======================================================================
DELETE / ARCHIVE
======================================================================

Prefer archive over destructive deletion.

Deleting an Xpand with child records must require deliberate confirmation.

Follow the existing application's conventions.

Do not accidentally leave orphan records.

======================================================================
ADMIN SAFETY
======================================================================

All mutations must use the existing authentication and authorization system.

Do not rely on frontend visibility for security.

Validate input server-side.

Use appropriate:
- CSRF protection if relevant
- sanitization
- ownership/admin checks
- URL validation
- safe database operations

======================================================================
SEO
======================================================================

Public pages should have proper dynamic metadata.

Root:

    ARI XPands | AriVerse

Individual:

    CUDA | ARI XPands
    AI Systems Mastery | ARI XPands

Descriptions should derive from the Xpand description when available.

If no description exists, use a tasteful generic description rather than
fabricating content.

======================================================================
RESPONSIVENESS
======================================================================

The experience must work on desktop and mobile.

Especially:

- Xpand card grid
- timeline
- admin quick log
- nested structure
- evidence lists
- code blocks

Do not simply let complex layouts overflow horizontally.

======================================================================
ACCESSIBILITY
======================================================================

Use:
- semantic HTML
- keyboard navigation
- proper labels
- accessible dialogs
- good contrast
- visible focus states
- status conveyed by more than color

======================================================================
PERFORMANCE
======================================================================

Do not fetch the entire history of every Xpand just to render the index.

The root page should query lightweight summaries.

Individual timelines can paginate or progressively load if necessary.

Use the patterns already established by this repository.

======================================================================
RECOMMENDED DATA RELATIONSHIPS
======================================================================

Conceptually:

Xpand
  1 -> many XpandLog
  1 -> many XpandNote
  1 -> many XpandMilestone
  1 -> many XpandEvidence
  1 -> many XpandResource
  1 -> many XpandExperiment
  1 -> many XpandSection

XpandSection
  may -> parent XpandSection

Optional relationships may allow:

XpandExperiment
  -> Evidence

XpandLog
  -> Evidence

XpandNote / Question
  -> Evidence or Experiment

Implement these according to what fits the current persistence layer.

Do NOT create unnecessary complexity merely to match this diagram.

======================================================================
IMPLEMENTATION ORDER
======================================================================

PHASE 1 — REPOSITORY ANALYSIS

Before coding, inspect the application and report:

- framework
- frontend architecture
- routes
- styling
- database
- API/backend
- auth
- existing admin
- useful reusable components
- constraints relevant to ARI XPands

Then choose an implementation approach consistent with the repository.

----------------------------------------------------------------------
PHASE 2 — CORE XPAND
----------------------------------------------------------------------

Implement:

- data model
- migrations if required
- generic Xpand entity
- title-only creation
- slug generation
- statuses
- visibility
- archive behavior

----------------------------------------------------------------------
PHASE 3 — PUBLIC XPANDS
----------------------------------------------------------------------

Implement:

    /ari-xpands
    /ari-xpands/[slug]

Make brand-new empty XPands render correctly.

----------------------------------------------------------------------
PHASE 4 — ADMIN
----------------------------------------------------------------------

Extend existing admin with:

    ARI XPands

Implement:
- list
- create
- edit
- archive
- delete where appropriate

Creation requires only title.

----------------------------------------------------------------------
PHASE 5 — LOGGING
----------------------------------------------------------------------

Implement:
- daily logs
- Quick Log
- command parser
- normal editor
- duration parsing
- daily append behavior

----------------------------------------------------------------------
PHASE 6 — KNOWLEDGE OBJECTS
----------------------------------------------------------------------

Implement:

- notes
- questions
- milestones
- evidence
- resources
- experiments

----------------------------------------------------------------------
PHASE 7 — OPTIONAL STRUCTURE
----------------------------------------------------------------------

Implement nested generic XpandSections.

Do not force sections on simple XPands.

----------------------------------------------------------------------
PHASE 8 — TIMELINE
----------------------------------------------------------------------

Build unified chronological activity display.

----------------------------------------------------------------------
PHASE 9 — POLISH
----------------------------------------------------------------------

Add:
- derived stats
- last-touched
- filters
- SEO
- responsive behavior
- accessibility
- empty states

----------------------------------------------------------------------
PHASE 10 — VERIFICATION
----------------------------------------------------------------------

Run:

- formatter
- lint
- type checking
- tests
- production build

Fix errors introduced by this implementation.

======================================================================
TESTS
======================================================================

At minimum test:

XPAND
- create from title only
- slug generation
- duplicate slug
- Unicode/special-character titles
- edit
- archive
- public/private visibility

QUICK LOG
- one command
- multiple commands
- repeated commands
- malformed command
- unknown command
- whitespace
- existing daily log append
- new daily log creation

TIME
- 30m
- 1h
- 1h30m
- 1h 30m
- 2h45m
- invalid duration

SECURITY
- unauthenticated mutation rejected
- draft/private data excluded publicly
- markdown sanitization
- invalid URLs handled

RELATIONSHIPS
- child objects correctly associated with Xpand
- deleting/archiving does not create broken relations
- nested sections work

PUBLIC
- empty Xpand page works
- Xpand with logs works
- Xpand with optional structure works
- root only shows public XPands
- last-touched value derives correctly

BUILD
- existing AriVerse routes continue to work

======================================================================
DO NOT FABRICATE DATA
======================================================================

Do not seed fake:

- logs
- hours
- questions
- progress
- milestones
- experiments
- results
- evidence
- resources
- scores

A brand-new Xpand may contain only its name.

That is valid.

======================================================================
CRITICAL UX TEST
======================================================================

After implementation, this exact workflow must work:

1. I open AriVerse Admin.
2. I click ARI XPands.
3. I click "+ New Xpand".
4. I type:

       CUDA

5. I press Create.
6. The system immediately creates:

       /ari-xpands/cuda

7. I type:

       /question Why are warps 32 threads?
       /learned A warp is the basic scheduling unit on NVIDIA GPUs.
       /time 35m

8. I press Save.
9. The CUDA Xpand now shows today's activity.
10. The public page presents the published parts elegantly.

No source code modification should be necessary to create the next Xpand.

Tomorrow I could create:

    Greek

or:

    Transformer Deep Dive

or:

    Graph Neural Networks

and the exact same system should work.

======================================================================
FINAL PRODUCT PRINCIPLE
======================================================================

ARI XPands should answer:

    What has Ari chosen to expand into?

Each Xpand should answer:

    Why did I start this?
    What am I learning?
    What am I questioning?
    What did I try?
    What failed?
    What did I build?
    What evidence exists?
    How did my understanding change over time?

But none of those must be filled before an Xpand can exist.

The fundamental interaction remains:

    NAME IT.
    CREATE IT.
    EXPAND INTO IT.

Build the architecture around that simplicity.

======================================================================
FINAL DELIVERY
======================================================================

After implementation, give me a concise report containing:

1. Architecture discovered
2. Files changed
3. Database/schema changes
4. Public routes added
5. Admin routes/features added
6. Xpand creation flow
7. Quick Log commands supported
8. Data entities implemented
9. Tests added
10. Build/lint/typecheck status
11. Any migrations or environment variables required
12. Remaining limitations or sensible future improvements

Do not perform an unrelated rewrite of AriVerse.
Make the smallest coherent architectural changes needed to make ARI XPands
a durable, extensible feature.