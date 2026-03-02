# Onboard Customer: Dispensary Setup Automation

Set up a new dispensary customer using the batch onboarding infrastructure.

## Input

$ARGUMENTS should contain the customer details. Accepted formats:

**Minimal (name only):**
```
Green Leaf Albany
```
Derive slug from name: lowercase, remove spaces/special chars.

**Full CLI args:**
```
--name="Green Leaf Albany" --slug=greenleafalbany --email=owner@greenleaf.com --city=Albany --state=NY --pos=alleaves --plan=scout --promo=NYFOUNDINGPARTNER
```

**Config file:**
```
--config=scripts/ny10-dispensaries.json
```

## Steps

### Step 1: Parse arguments
Extract customer details from $ARGUMENTS. Apply defaults:
- `state`: NY (if not specified)
- `plan`: scout (if not specified)
- `slug`: derived from name (lowercase, no spaces/special chars)
- `pos`: empty (manual setup)
- `email`: required for single mode (prompt if missing)

### Step 2: Dry-run first
Show what will be created WITHOUT writing to Firestore:
```
node scripts/batch-onboard-ny10.mjs --single --name="<name>" --slug=<slug> --email=<email> --city=<city> --state=<state> --pos=<pos> --plan=<plan>
```

Present the dry-run output to the user. List exactly what documents will be created.

**Ask the user to confirm before proceeding to Step 3.**

### Step 3: Apply (after user confirms)
```
node scripts/batch-onboard-ny10.mjs --single --name="<name>" --slug=<slug> --email=<email> --city=<city> --state=<state> --pos=<pos> --plan=<plan> --apply
```

If $ARGUMENTS contains "--config=<path>", use batch mode instead:
```
node scripts/batch-onboard-ny10.mjs --config=<path> --apply
```

### Step 4: Post-onboard checklist
```
CUSTOMER ONBOARDING: <name>
============================
Org ID:     org_<slug>
Slug:       <slug>
Plan:       <plan>
State:      <state>

STATUS:
  [x] Organization created in Firestore
  [x] Brand document created at brands/<slug>
  [ ] POS system: <pos or "none - manual setup needed">
  [ ] Loyalty settings: configure at /dashboard/settings/loyalty
  [ ] Playbooks: activate when email provider ready
  [ ] Cloud Scheduler jobs: create for pos-sync, loyalty-sync, playbook-runner
  [ ] Brand guide: customer completes at /dashboard/settings/brand-guide

NEXT STEPS:
1. Share login link: https://bakedbot.ai/dashboard
2. Complete brand guide setup with customer
3. Configure POS integration (if applicable)
4. Create Cloud Scheduler cron jobs
5. Activate playbooks after Mailjet/email is configured
```
