# Training Automation Guide

Complete guide for automating training cohort management, enrollments, and communications.

## Overview

The training platform includes automated scripts for:
- 📚 **Database Seeding** - Populate curriculum and challenges
- 👥 **Bulk Enrollment** - Enroll users into cohorts
- 📧 **Welcome Emails** - Send onboarding emails via Mailjet
- 🎓 **Role Assignment** - Assign intern role automatically

---

## Quick Start

### 1. Seed Training Database

First, populate Firestore with the training program and challenges (Weeks 1-4):

```powershell
npx tsx dev/seed-training.ts
```

**What it does:**
- Creates `trainingPrograms/bakedbot-builder-bootcamp-v1` document
- Seeds 20 challenges (5 per week for Weeks 1-4)
- Creates initial pilot cohort (max 5 participants)

**Output:**
```
🌱 Seeding training data...

📚 Creating training program...
✅ Created program: BakedBot Builder Bootcamp

📝 Creating Week 1 challenges...
  ✅ Hello BakedBot (beginner)
  ✅ Codebase Explorer (beginner)
  ...

✨ Seeding complete!
📊 Summary:
   • Program: BakedBot Builder Bootcamp
   • Challenges: 20 (Weeks 1-4)
   • Cohort: Pilot Cohort - February 2026
```

---

### 2. Enroll Users in Cohort

Enroll users individually or in bulk using CSV:

#### Option A: Individual Users

```powershell
npx tsx dev/enroll-users.ts --cohort cohort-pilot-2026-02 --users uid1,uid2,uid3
```

#### Option B: Bulk CSV Upload

Create a CSV file with user emails:

```csv
email,name
alex@example.com,Alex Johnson
sam@example.com,Sam Chen
jordan@example.com,Jordan Martinez
```

Then run:

```powershell
npx tsx dev/enroll-users.ts --cohort cohort-pilot-2026-02 --csv dev/users.csv
```

**What it does:**
1. Looks up Firebase users by email
2. Assigns `intern` role to each user (via custom claims)
3. Creates `users/{uid}/training/current` progress document
4. Adds user to cohort's `participantIds` array

**Output:**
```
📚 Bulk User Enrollment

📋 Cohort: Pilot Cohort - February 2026
   Status: enrolling
   Max Participants: 5
   Current Participants: 0

📄 Reading users from CSV: dev/users.csv
   Found 5 emails

👥 Enrolling 5 users...

Processing user: abc123xyz
  ✅ Assigned 'intern' role to abc123xyz
  ✅ Enrolled abc123xyz in cohort cohort-pilot-2026-02

📊 Enrollment Summary:
   ✅ Successful: 5
   ❌ Failed: 0
   📈 Total: 5
```

---

### 3. Send Welcome Emails

Send automated welcome emails to all enrolled participants:

#### Dry Run (Preview Only)

```powershell
npx tsx dev/send-welcome-emails.ts --cohort cohort-pilot-2026-02 --dry-run
```

#### Send Emails

```powershell
npx tsx dev/send-welcome-emails.ts --cohort cohort-pilot-2026-02
```

**Prerequisites:**
- Mailjet API credentials in environment variables:
  ```bash
  MAILJET_API_KEY=your_api_key
  MAILJET_SECRET_KEY=your_secret_key
  ```

**What it does:**
1. Fetches all participants from cohort
2. Generates personalized HTML email for each user
3. Sends via Mailjet API
4. Includes:
   - Welcome message
   - Program details (start date, duration)
   - Getting started checklist
   - Week-by-week curriculum overview
   - Support information (Slack, office hours)

**Email Contents:**
- Subject: "Welcome to [Cohort Name]! 🎉"
- From: training@bakedbot.ai
- Includes: Dashboard link, Slack invite, Linus introduction

---

## Complete Enrollment Workflow

### For New Cohort (50 interns)

```powershell
# Step 1: Create cohort (if not exists)
# Use Firestore console or create-cohort script (TODO)

# Step 2: Prepare CSV with intern emails
# File: dev/cohort-2026-03-interns.csv

# Step 3: Enroll all users
npx tsx dev/enroll-users.ts --cohort cohort-2026-03 --csv dev/cohort-2026-03-interns.csv

# Step 4: Preview welcome emails
npx tsx dev/send-welcome-emails.ts --cohort cohort-2026-03 --dry-run

# Step 5: Send welcome emails
npx tsx dev/send-welcome-emails.ts --cohort cohort-2026-03

# Step 6: Invite to Slack (manual for now)
# TODO: Automate Slack invites

# Step 7: Schedule Google Meet (manual)
# Create recurring Friday 2pm PT meeting
```

---

## Script Reference

### `dev/seed-training.ts`

Seeds initial training data.

**Usage:**
```powershell
npx tsx dev/seed-training.ts
```

**Arguments:** None

**Environment:** Requires Firebase Admin SDK initialized

**Output Collections:**
- `trainingPrograms/{programId}`
- `trainingChallenges/{challengeId}` (20 documents)
- `trainingCohorts/{cohortId}` (1 pilot cohort)

---

### `dev/enroll-users.ts`

Bulk enroll users into cohort.

**Usage:**
```powershell
# By user IDs
npx tsx dev/enroll-users.ts --cohort COHORT_ID --users uid1,uid2,uid3

# By CSV
npx tsx dev/enroll-users.ts --cohort COHORT_ID --csv path/to/users.csv
```

**Arguments:**
- `--cohort` (required) - Cohort document ID
- `--users` - Comma-separated user IDs
- `--csv` - Path to CSV file (email,name format)

**CSV Format:**
```csv
email,name
user@example.com,User Name
```

**Effects:**
- Assigns `intern` role to users
- Creates user progress documents
- Updates cohort participant list

---

### `dev/send-welcome-emails.ts`

Send welcome emails to cohort participants.

**Usage:**
```powershell
# Preview (dry run)
npx tsx dev/send-welcome-emails.ts --cohort COHORT_ID --dry-run

# Send emails
npx tsx dev/send-welcome-emails.ts --cohort COHORT_ID
```

**Arguments:**
- `--cohort` (required) - Cohort document ID
- `--dry-run` (optional) - Preview without sending

**Environment Variables:**
```bash
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
```

**Rate Limiting:**
- 100ms delay between emails
- ~10 emails/second max throughput

---

## Monitoring & Verification

### Check Enrollment Status

```typescript
// In Firebase Console or via script
const cohort = await db.collection('trainingCohorts').doc('cohort-id').get();
console.log(cohort.data().participantIds.length); // enrolled count
```

### Verify User Roles

```powershell
# Via Firebase Auth
firebase auth:export users.json
# Check custom claims for "intern" role
```

### Check User Progress

```typescript
const progress = await db.collection('users').doc(userId)
    .collection('training').doc('current').get();

console.log(progress.data());
// {
//   cohortId: 'cohort-pilot-2026-02',
//   currentWeek: 1,
//   completedChallenges: [],
//   status: 'active'
// }
```

---

## Troubleshooting

### Users Not Found in CSV

**Error:** `❌ User not found: email@example.com`

**Solution:**
- Verify user exists in Firebase Auth
- Check email spelling
- Ensure user account is not disabled

### Cohort Full

**Warning:** `⚠️ 10 users exceed available slots (5)`

**Solution:**
- Increase cohort `maxParticipants` field
- Create new cohort for overflow

### Mailjet Errors

**Error:** `Mailjet credentials not configured`

**Solution:**
```powershell
# Set environment variables
$env:MAILJET_API_KEY="your_key"
$env:MAILJET_SECRET_KEY="your_secret"

# Or add to .env file
```

### Role Assignment Failed

**Error:** `Failed to assign role to uid`

**Solution:**
- Check Firebase Admin SDK permissions
- Verify service account has `firebase.users.update` permission
- Check user exists and is not deleted

---

## Advanced Usage

### Create Custom Cohort

```typescript
// dev/create-cohort.ts (TODO)
const cohort: TrainingCohort = {
    id: 'cohort-2026-04',
    programId: 'bakedbot-builder-bootcamp-v1',
    name: 'April 2026 Cohort',
    startDate: Timestamp.fromDate(new Date('2026-04-01')),
    endDate: Timestamp.fromDate(new Date('2026-05-27')),
    status: 'enrolling',
    participantIds: [],
    maxParticipants: 50,
    enablePeerReview: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
};

await db.collection('trainingCohorts').doc(cohort.id).set(cohort);
```

### Export Cohort Stats

```typescript
// dev/export-cohort-stats.ts (TODO)
const cohortId = 'cohort-pilot-2026-02';

// Get all participants
const cohort = await db.collection('trainingCohorts').doc(cohortId).get();
const participantIds = cohort.data().participantIds;

// Get progress for each
for (const uid of participantIds) {
    const progress = await db.collection('users').doc(uid)
        .collection('training').doc('current').get();

    console.log({
        uid,
        week: progress.data().currentWeek,
        completed: progress.data().completedChallenges.length,
    });
}
```

---

## Scaling to 500+ Interns

### Weekly Enrollment (50 interns/week)

1. **Pre-enrollment:**
   - Create cohort document 1 week in advance
   - Prepare CSV with confirmed emails
   - Test dry-run emails

2. **Enrollment Day (Monday):**
   ```powershell
   npx tsx dev/enroll-users.ts --cohort cohort-2026-wk1 --csv week1.csv
   npx tsx dev/send-welcome-emails.ts --cohort cohort-2026-wk1
   ```

3. **Kick-off (Friday):**
   - Google Meet session
   - Slack channel invite
   - Q&A and first challenge walkthrough

4. **Monitoring:**
   - Track Week 1 completion rates
   - Monitor Linus review queue
   - Identify struggling interns

### Database Capacity Planning

- **Firestore Reads:** ~1M reads/month for 500 active interns
- **Linus Reviews:** ~2500 reviews/week (50 interns × 5 challenges)
- **Storage:** ~100MB for submissions + feedback

**Costs (estimated):**
- Firestore: $50-100/month
- Cloud Run (Linus): $200-400/month
- Mailjet: Free tier (6000 emails/month)

---

## Next Steps

### Phase 2 Automation (Future)

- [ ] Slack bot for automatic channel invites
- [ ] Google Calendar API for automated Meet scheduling
- [ ] Progress dashboards for admins
- [ ] Automated certificate generation
- [ ] Weekly digest emails
- [ ] Slack notifications for submissions

### Scripts to Add

- `dev/create-cohort.ts` - Programmatic cohort creation
- `dev/export-stats.ts` - Cohort analytics export
- `dev/send-reminder.ts` - Weekly progress reminders
- `dev/archive-cohort.ts` - Mark cohort as completed

---

## Support

Questions about automation scripts?
- **Slack:** #bakedbot-training-admin
- **Docs:** See TRAINING_SETUP.md for manual processes
- **Code:** All scripts in `dev/` directory
