# Peer Review System Architecture

## Overview

Enable interns to review each other's code submissions, fostering collaborative learning and reducing instructor workload.

**Goals:**
- ✅ **Learning** - Teach code review skills
- ✅ **Engagement** - Build community through collaboration
- ✅ **Scale** - Distribute review workload across cohort
- ✅ **Quality** - Maintain high standards with rubrics

---

## Peer Review Flow

```
┌──────────────────────┐
│  Intern Submits Code │
│  (Attempt #1)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Linus Reviews       │
│  (Auto, 30-60s)      │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │  Approved?   │
    └──┬────────┬──┘
       │ No     │ Yes
       │        │
       │        ▼
       │   ┌─────────────────┐
       │   │ Assign 2 Peers  │
       │   │ (From cohort)   │
       │   └────────┬────────┘
       │            │
       │            ▼
       │   ┌─────────────────┐
       │   │ Peers Review    │
       │   │ (48 hour window)│
       │   └────────┬────────┘
       │            │
       │            ▼
       │   ┌─────────────────┐
       │   │ Author Sees     │
       │   │ Peer Feedback   │
       │   └─────────────────┘
       │
       ▼
   ┌─────────────────┐
   │ Revise & Retry  │
   └─────────────────┘
```

---

## Data Model

### PeerReview Collection

**Path:** `peerReviews/{reviewId}`

```typescript
interface PeerReview {
    id: string;
    submissionId: string;       // Reference to TrainingSubmission
    reviewerId: string;         // User ID of reviewer
    authorId: string;           // User ID of code author
    challengeId: string;
    cohortId: string;

    // Review content
    rating: 1 | 2 | 3 | 4 | 5;  // Overall rating
    strengths: string[];         // What was done well
    improvements: string[];      // What could be better
    questions: string[];         // Questions for author
    wouldApprove: boolean;       // Would you approve this?

    // Rubric scores
    rubricScores: {
        category: string;
        score: number;           // 1-5
        comment?: string;
    }[];

    // Metadata
    assignedAt: Timestamp;
    submittedAt?: Timestamp;
    status: 'pending' | 'completed' | 'skipped';
    timeSpent?: number;          // Minutes spent reviewing

    // Quality control
    helpfulVotes: number;        // How many found this helpful
    flagged: boolean;            // Inappropriate content

    createdAt: Timestamp;
    updatedAt: Timestamp;
}
```

### Update TrainingSubmission

Add peer review tracking:

```typescript
interface TrainingSubmission {
    // ... existing fields

    // Peer review
    peerReviewsAssigned: number;  // How many peers assigned
    peerReviewsCompleted: number; // How many completed
    peerReviewIds: string[];      // Review document IDs
    peerReviewEnabled: boolean;   // Enable for this submission
}
```

### Update UserTrainingProgress

Track review participation:

```typescript
interface UserTrainingProgress {
    // ... existing fields

    // Peer review stats
    reviewsCompleted: number;
    reviewsAssigned: number;
    averageReviewRating: number;  // How helpful are their reviews
    reviewBadges: string[];       // 'helpful-reviewer', 'thorough', etc.
}
```

---

## Assignment Algorithm

### Criteria for Assignment

1. **Same cohort** - Only review peers in same cohort
2. **Same challenge** - Review submissions for challenges you've completed
3. **Not self** - Can't review your own code
4. **Load balancing** - Distribute reviews evenly
5. **Skill matching** - Match similar skill levels when possible

### Assignment Logic

```typescript
async function assignPeerReviewers(
    submission: TrainingSubmission,
    numReviewers: number = 2
): Promise<string[]> {
    const db = getAdminFirestore();

    // 1. Get eligible reviewers (completed same challenge)
    const eligibleReviewers = await db
        .collection('users')
        .where('training.cohortId', '==', submission.cohortId)
        .where('training.completedChallenges', 'array-contains', submission.challengeId)
        .get();

    // 2. Filter out author
    const candidates = eligibleReviewers.docs
        .filter(doc => doc.id !== submission.userId)
        .map(doc => ({ uid: doc.id, ...doc.data().training }));

    // 3. Calculate review load (how many pending reviews each has)
    const loads = await Promise.all(
        candidates.map(async (c) => {
            const pending = await db.collection('peerReviews')
                .where('reviewerId', '==', c.uid)
                .where('status', '==', 'pending')
                .count()
                .get();

            return { uid: c.uid, load: pending.data().count };
        })
    );

    // 4. Sort by load (assign to those with fewer pending reviews)
    loads.sort((a, b) => a.load - b.load);

    // 5. Select top N with lowest load
    const selected = loads.slice(0, numReviewers).map(l => l.uid);

    // 6. Create review documents
    for (const reviewerId of selected) {
        await db.collection('peerReviews').add({
            submissionId: submission.id,
            reviewerId,
            authorId: submission.userId,
            challengeId: submission.challengeId,
            cohortId: submission.cohortId,
            status: 'pending',
            assignedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    }

    return selected;
}
```

---

## Review Rubric

### Categories

1. **Code Quality** (1-5)
   - Clean, readable code
   - Proper naming conventions
   - Good structure and organization

2. **TypeScript Usage** (1-5)
   - Strong typing, no `any`
   - Proper interfaces/types
   - Good type inference

3. **BakedBot Standards** (1-5)
   - Follows CLAUDE.md patterns
   - Uses logger instead of console.log
   - Proper error handling

4. **Problem Solving** (1-5)
   - Solves the challenge correctly
   - Handles edge cases
   - Efficient approach

5. **Best Practices** (1-5)
   - DRY (Don't Repeat Yourself)
   - KISS (Keep It Simple)
   - Proper documentation

### Rating Scale

- **5 - Excellent:** Exemplary work, nothing to improve
- **4 - Good:** Solid work with minor suggestions
- **3 - Satisfactory:** Meets requirements, some improvements needed
- **2 - Needs Work:** Functional but significant issues
- **1 - Poor:** Doesn't meet requirements

---

## UI Components

### 1. Review Assignment Notification

```typescript
// components/peer-review-notification.tsx
<Alert>
    <Users className="h-4 w-4" />
    <AlertTitle>Peer Review Assigned 📝</AlertTitle>
    <AlertDescription>
        You've been assigned to review {authorName}'s solution for "{challengeTitle}".
        <Button asChild>
            <Link href={`/dashboard/training/peer-review/${reviewId}`}>
                Start Review
            </Link>
        </Button>
    </AlertDescription>
</Alert>
```

### 2. Review Form

```typescript
// components/peer-review-form.tsx
<Form>
    {/* Overall Rating */}
    <StarRating value={rating} onChange={setRating} />

    {/* Rubric Scores */}
    {rubricCategories.map(category => (
        <RubricItem
            category={category}
            score={scores[category]}
            onChange={(score) => setScore(category, score)}
        />
    ))}

    {/* Feedback */}
    <Textarea label="What did they do well?" />
    <Textarea label="What could be improved?" />
    <Textarea label="Questions for the author?" />

    {/* Would you approve? */}
    <RadioGroup>
        <Radio value="yes">Yes, I would approve this</Radio>
        <Radio value="no">No, needs revision</Radio>
    </RadioGroup>

    <Button type="submit">Submit Review</Button>
</Form>
```

### 3. Received Reviews Display

```typescript
// components/peer-reviews-received.tsx
<Card>
    <CardHeader>
        <CardTitle>Peer Feedback ({reviews.length} reviews)</CardTitle>
    </CardHeader>
    <CardContent>
        {reviews.map(review => (
            <PeerReviewCard
                review={review}
                onHelpful={() => markHelpful(review.id)}
            />
        ))}
    </CardContent>
</Card>
```

### 4. Review Dashboard

```typescript
// pages/peer-review/dashboard.tsx
<Tabs>
    <TabsList>
        <TabsTrigger>Pending Reviews ({pending.length})</TabsTrigger>
        <TabsTrigger>Completed ({completed.length})</TabsTrigger>
        <TabsTrigger>Received ({received.length})</TabsTrigger>
    </TabsList>

    <TabsContent value="pending">
        {pending.map(review => (
            <PendingReviewCard review={review} />
        ))}
    </TabsContent>
</Tabs>
```

---

## Incentives & Gamification

### Review Badges

- 🌟 **Helpful Reviewer** - 10+ reviews marked as helpful
- 📚 **Thorough** - Average review > 200 words
- ⚡ **Quick Responder** - 80%+ reviews within 24 hours
- 🎯 **Constructive** - Balanced feedback (strengths + improvements)
- 👑 **Master Reviewer** - 50+ reviews completed

### Review Points

- **Complete review:** +10 points
- **Marked as helpful:** +5 points
- **Within 24 hours:** +3 points bonus
- **Comprehensive (>200 words):** +2 points bonus

### Leaderboard

Weekly leaderboard showing:
- Most reviews completed
- Highest helpfulness rating
- Most constructive feedback

---

## Quality Control

### Review Moderation

1. **Automated flags:**
   - Too short (<50 characters)
   - All max/min scores (5/5/5/5/5 or 1/1/1/1/1)
   - Inappropriate language detection

2. **Instructor review:**
   - Flagged reviews go to instructor queue
   - Instructor can approve, reject, or provide guidance

3. **Peer validation:**
   - Authors can mark reviews as "helpful" or "not helpful"
   - Low-rated reviewers get coaching notifications

### Review Guidelines

**Provided to reviewers:**

```markdown
# How to Write Great Peer Reviews

## Do's ✅
- Be constructive and kind
- Focus on the code, not the person
- Provide specific examples
- Suggest improvements with reasoning
- Ask clarifying questions

## Don'ts ❌
- Don't be harsh or demeaning
- Don't just say "looks good" without details
- Don't rewrite their entire solution
- Don't focus only on negatives
- Don't compare to your own solution

## Example Good Feedback

**Strengths:**
- "Great use of error handling with try/catch"
- "I like how you destructured the props for clarity"
- "Excellent TypeScript types throughout"

**Improvements:**
- "Consider extracting the validation logic into a separate function for reusability"
- "The function name 'getData' is generic - maybe 'getUserProfile' would be clearer?"

**Questions:**
- "Why did you choose to use a for loop instead of .map() here?"
- "Have you considered edge cases like empty arrays?"
```

---

## Notifications

### Email Notifications

1. **Review assigned:**
   - Subject: "New peer review assigned: {challengeTitle}"
   - CTA: Link to review page
   - Due date: 48 hours

2. **Review received:**
   - Subject: "You received peer feedback on {challengeTitle}"
   - CTA: Link to view feedback

3. **Reminder (24 hours before due):**
   - Subject: "Reminder: Peer review due tomorrow"

### Slack Notifications

```
🔔 New peer review assigned
You've been asked to review @AlexJohnson's solution for "Hello BakedBot"
📝 Start Review: https://bakedbot.ai/dashboard/training/peer-review/abc123
⏰ Due: Tomorrow at 5pm PT
```

---

## Server Actions

### submitPeerReview

```typescript
'use server';

export async function submitPeerReview(
    reviewId: string,
    feedback: PeerReviewFeedback
): Promise<ActionResult> {
    const user = await requireUser(['intern', 'super_user']);
    const db = getAdminFirestore();

    // Get review document
    const reviewDoc = await db.collection('peerReviews').doc(reviewId).get();
    if (!reviewDoc.exists) {
        return { success: false, error: 'Review not found' };
    }

    const review = reviewDoc.data();

    // Verify reviewer
    if (review.reviewerId !== user.uid) {
        return { success: false, error: 'Unauthorized' };
    }

    // Update review
    await reviewDoc.ref.update({
        ...feedback,
        status: 'completed',
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    // Update user stats
    await updateReviewerStats(user.uid);

    // Send notification to author
    await notifyAuthorOfReview(review.authorId, reviewId);

    return { success: true };
}
```

---

## Analytics

### Metrics to Track

**Individual:**
- Reviews completed / assigned
- Average helpfulness rating
- Average time per review
- Badge collection

**Cohort:**
- Peer review participation rate
- Average review quality scores
- Correlation: peer reviews → final scores
- Time to review completion

**Platform:**
- Total reviews completed
- Average review length (words)
- Most helpful reviewers
- Review turnaround time

---

## Implementation Phases

### Phase 1: Core System (Week 1)
- [ ] Data model (Firestore schema)
- [ ] Assignment algorithm
- [ ] Basic UI (review form)
- [ ] Server Actions (submit/get reviews)

### Phase 2: Enhancements (Week 2)
- [ ] Rubric scoring
- [ ] Review guidelines
- [ ] Notifications (email)
- [ ] Quality control (flagging)

### Phase 3: Gamification (Week 3)
- [ ] Badges and points
- [ ] Leaderboard
- [ ] Review dashboard
- [ ] Analytics

---

## Configuration

Enable/disable per cohort:

```typescript
interface TrainingCohort {
    // ... existing fields
    enablePeerReview: boolean;
    minReviewsRequired: number;      // Default: 3
    reviewersPerSubmission: number;  // Default: 2
    reviewDeadlineHours: number;     // Default: 48
}
```

---

## Success Metrics

**MVP Success:**
- 80%+ of assigned reviews completed within 48 hours
- Average review rating > 3.5/5 (helpfulness)
- 90%+ of reviews meet quality standards (not flagged)

**Long-term Success:**
- Peer review participants score 15%+ higher on Linus reviews
- 85%+ of interns find peer reviews valuable (survey)
- Instructor time saved: 20+ hours/week

---

## Future Enhancements

- Live code review sessions (pair programming)
- Video review recordings (Loom integration)
- AI-assisted review suggestions (Claude API)
- Cross-cohort expert reviews (alumni reviewing new interns)
