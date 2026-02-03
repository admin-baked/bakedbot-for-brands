# BakedBot Training Platform - Setup Guide

Complete guide for setting up and using the training platform for onboarding 500+ interns.

---

## Overview

The BakedBot Builder Bootcamp is an 8-week interactive training program that teaches new engineers the "BakedBot AI way" through hands-on coding challenges with AI-powered code review by Linus (AI CTO).

**Status:** MVP Complete ✅
- Week 1 fully defined (5 challenges)
- Weeks 2-8 placeholder structure
- Linus AI review integration
- Progress tracking
- Cohort management

---

## Initial Setup

### 1. Seed the Database

Populate Firestore with training data:

```powershell
# Run seeding script
npx tsx dev/seed-training.ts
```

This creates:
- ✅ Training program document
- ✅ 5 Week 1 challenges
- ✅ Pilot cohort (max 5 participants)

### 2. Enroll Test Interns

Use the `enrollInCohort` Server Action to add users:

```typescript
// Example: Enroll via Firebase Console or admin script
import { enrollInCohort } from '@/server/actions/training';

await enrollInCohort(
  'user_uid_here',           // User UID from Firebase Auth
  'cohort-pilot-2026-02'     // Cohort ID from seeding
);
```

**Or manually in Firestore:**

1. Go to Firebase Console → Firestore
2. Navigate to `users/{userId}/training`
3. Create document `current` with:

```json
{
  "cohortId": "cohort-pilot-2026-02",
  "programId": "bakedbot-builder-bootcamp-v1",
  "enrolledAt": [Timestamp],
  "currentWeek": 1,
  "completedChallenges": [],
  "totalSubmissions": 0,
  "acceptedSubmissions": 0,
  "weeklyProgress": [],
  "certificateEarned": false,
  "lastActivityAt": [Timestamp],
  "status": "active"
}
```

### 3. Set User Role to `intern`

Update the user's role in Firestore:

```
users/{userId}
  role: "intern"
```

### 4. Verify Access

1. Login as the test intern
2. Navigate to `/dashboard/training`
3. You should see the curriculum overview

---

## File Structure

```
src/
├── types/training.ts                              # All training types
├── lib/training/curriculum.ts                     # 8-week curriculum
├── server/
│   ├── services/training/linus-review.ts         # AI code review
│   └── actions/training.ts                       # Server Actions
└── app/dashboard/training/
    ├── page.tsx                                  # Server Component
    ├── page-client.tsx                           # Client UI
    └── components/
        ├── code-submission-form.tsx              # Textarea form
        └── review-panel.tsx                      # Linus feedback display

dev/
└── seed-training.ts                              # Database seeding script
```

---

## Week 1 Curriculum

### Challenge 1: Hello BakedBot (30 min)
**Focus:** Server Actions, Authentication, TypeScript
- Create first Server Action with auth
- Use `requireUser()` properly
- Return ActionResult type

### Challenge 2: Codebase Explorer (45 min)
**Focus:** Codebase navigation, Directory structure
- Count agents in `src/server/agents/`
- Understand services vs actions vs tools
- Identify key files

### Challenge 3: Standards Enforcer (40 min)
**Focus:** Coding standards, Best practices
- Fix intentional violations
- Replace console.log with logger
- Add proper TypeScript types

### Challenge 4: Build Health Check (35 min)
**Focus:** TypeScript, Build tools, Debugging
- Run `npm run check:types`
- Create intentional errors
- Fix and verify

### Challenge 5: First Real Contribution (45 min)
**Focus:** Git, Documentation, Contribution
- Find real typo
- Create proper commit
- Submit PR

---

## User Flow

### 1. Enrollment
```
Admin enrolls intern → User gets "intern" role → Progress document created
```

### 2. View Curriculum
```
Navigate to /dashboard/training → See 8-week overview → Current week highlighted
```

### 3. Submit Challenge (Future - Phase 2)
```
Select challenge → Read instructions → Write code → Submit → Linus reviews (30-60s)
```

### 4. View Feedback
```
See overall score → Read strengths → Review improvements → Category breakdown
```

### 5. Resubmit (if needed)
```
Fix code based on feedback → Submit again → New attempt number
```

### 6. Progress
```
Approved submission → Progress updated → Challenge marked complete → Move to next
```

---

## Linus AI Review

### How It Works

1. **Submission** → Code sent to Firestore
2. **Prompt Building** → Challenge + submission → structured prompt
3. **Linus Call** → Via `runAgentChat('linus', ...)`
4. **Response Parsing** → Extract JSON feedback
5. **Feedback Storage** → Update submission document
6. **Progress Update** → If approved, mark challenge complete

### Review Criteria

Each challenge defines criteria with weights:

```typescript
reviewCriteria: [
  { category: 'TypeScript', weight: 0.3, description: '...' },
  { category: 'Server Actions', weight: 0.3, description: '...' },
  { category: 'Authentication', weight: 0.2, description: '...' },
  { category: 'Code Quality', weight: 0.2, description: '...' }
]
```

### Approval Guidelines

**APPROVE if:**
- 60%+ on each category
- No critical errors
- Follows BakedBot standards

**NEEDS_REVISION if:**
- Below 60% on any category
- Security issues
- Major standard violations

---

## Adding New Challenges

### 1. Define Challenge

Edit `src/lib/training/curriculum.ts`:

```typescript
{
  id: 'week2-ch1',
  programId: 'bakedbot-builder-bootcamp-v1',
  weekNumber: 2,
  order: 1,
  title: 'Firestore CRUD',
  description: 'Build basic CRUD operations',
  difficulty: 'intermediate',
  instructions: `# Challenge: Firestore CRUD...`,
  starterCode: `'use server';\n\n// Your code`,
  hints: ['Hint 1', 'Hint 2'],
  referenceDocs: [{ title: 'Firestore Guide', url: '...' }],
  reviewCriteria: [
    { category: 'Firestore', weight: 0.4, description: '...' },
    // ...
  ],
  estimatedMinutes: 60,
  tags: ['firestore', 'crud'],
  isRequired: true
}
```

### 2. Update Curriculum

Add challenge ID to week's `challengeIds` array:

```typescript
{
  weekNumber: 2,
  title: 'Firestore & Data Modeling',
  challengeIds: ['week2-ch1', 'week2-ch2', ...],
}
```

### 3. Seed to Firestore

```powershell
npx tsx dev/seed-training.ts
```

### 4. Test

1. View challenge in dashboard
2. Submit solution
3. Verify Linus review
4. Check progress updates

---

## Cohort Management

### Create New Cohort

```typescript
const cohort: TrainingCohort = {
  id: 'cohort-2026-03',
  programId: 'bakedbot-builder-bootcamp-v1',
  name: 'March 2026 Cohort',
  startDate: Timestamp.now(),
  endDate: Timestamp.fromDate(new Date(Date.now() + 56 * 24 * 60 * 60 * 1000)), // 8 weeks
  status: 'enrolling',
  participantIds: [],
  maxParticipants: 50,
  enablePeerReview: false,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};

await db.collection('trainingCohorts').doc(cohort.id).set(cohort);
```

### Bulk Enrollment

```typescript
// Enroll 50 interns at once
const userIds = ['uid1', 'uid2', ...]; // From Firebase Auth
const cohortId = 'cohort-2026-03';

for (const userId of userIds) {
  await enrollInCohort(userId, cohortId);
}
```

---

## Monitoring & Analytics

### Check Progress

```typescript
// Get user progress
const progress = await getMyTrainingProgress();

console.log(`Week: ${progress.data.currentWeek}`);
console.log(`Completed: ${progress.data.completedChallenges.length}`);
console.log(`Approval Rate: ${progress.data.acceptedSubmissions / progress.data.totalSubmissions}`);
```

### View Submissions

```typescript
// Get all attempts for a challenge
const submissions = await getChallengeSubmissions('week1-ch1');

submissions.data.forEach(sub => {
  console.log(`Attempt ${sub.attemptNumber}: ${sub.status}`);
  if (sub.linusFeedback) {
    console.log(`Score: ${sub.linusFeedback.overallScore}`);
  }
});
```

### Cohort Stats

```typescript
// Query all participants in cohort
const cohort = await getCohort('cohort-pilot-2026-02');
console.log(`Enrolled: ${cohort.data.participantIds.length}/${cohort.data.maxParticipants}`);
```

---

## Phase 2 Features (Planned)

### 1. Full Challenge UI
- Individual challenge detail pages
- In-browser code editor (Monaco)
- Live TypeScript checking
- Submission history view

### 2. Server-Side Code Execution
- Cloud Run sandboxed execution
- Run tests against submissions
- Return console output + test results
- 30s timeout, memory limits

### 3. Peer Review System
- Assign 2 peers per submission
- Blind reviews (anonymous)
- Rubric-based scoring
- Peer feedback displayed alongside Linus

### 4. Certificates
- PDF generation on completion
- Signed by "Linus (CTO)" + "Leo (COO)"
- Verification QR code
- LinkedIn sharing

### 5. Slack Integration
- Bot for questions (`/ask-linus`)
- Daily check-ins
- Challenge completion notifications
- Peer review reminders

### 6. Admin Dashboard
- `/dashboard/training/admin`
- Create/edit challenges without code
- Bulk operations
- Analytics and reporting

---

## Troubleshooting

### Type Check Fails

```powershell
npm run check:types
```

Common issues:
- Missing imports
- Type mismatches in Server Actions
- Firestore Timestamp types

### Linus Review Not Working

Check logs:
```typescript
// Look for:
[Training] Submitting to Linus for review
[Training] Linus review complete
```

Common issues:
- `runAgentChat` not found → Check import
- Timeout → Linus might be overloaded
- Parse error → Check JSON format in response

### Progress Not Updating

Verify:
1. User enrolled? Check `users/{uid}/training/current`
2. Submission approved? Check `linusFeedback.approved === true`
3. `updateUserProgress()` called? Check logs

### Challenge Not Showing

Verify:
1. Challenge seeded? Check `trainingChallenges/{id}`
2. Challenge ID in curriculum? Check `challengeIds` array
3. Firestore permissions? Check security rules

---

## Support

- **Documentation:** This file + code comments
- **Code Review:** Ask Linus in dashboard chat
- **Bugs:** Create issue in repo
- **Questions:** Slack #training channel

---

## Success Metrics

### MVP (5 Interns)
- ✅ All 5 complete Week 1
- ✅ Average Linus review < 2 min
- ✅ 90%+ positive feedback
- ✅ Zero blocking bugs

### Scale (50/week)
- ✅ 80%+ Week 1 completion
- ✅ Average review time < 5 min
- ✅ 60-70% first-attempt approval
- ✅ 70%+ certificate earn rate (8 weeks)

---

**Last Updated:** February 2, 2026
**Version:** MVP 1.0
**Status:** Ready for pilot testing
