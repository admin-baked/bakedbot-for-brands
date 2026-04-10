---
description: Generate onboarding walkthrough videos via HeyGen API. Reads scripts from dev/onboarding-video-scripts/, extracts narration, submits to HeyGen, polls for completion. Use --dry-run first to preview. Requires HEYGEN_API_KEY.
---

# Generate Onboarding Videos

Generate all 10 onboarding walkthrough videos from the scripts in `dev/onboarding-video-scripts/` using the HeyGen API.

## Prerequisites

Before running, verify:
1. `HEYGEN_API_KEY` is set (in `.env` or environment)
2. `HEYGEN_AVATAR_ID` is set (your custom avatar or HeyGen stock)
3. `HEYGEN_VOICE_ID` is set (your voice clone or HeyGen stock)

If any are missing, tell the user what's needed and stop.

## Steps

### 1. Dry Run First

Always start with a dry run to preview what will be generated:

```bash
node scripts/heygen/generate-videos.mjs --all --dry-run
```

Show the user the output — script titles, character counts, estimated video lengths, and cost estimate.

### 2. Confirm with User

Ask the user to confirm before spending credits. Show:
- Total number of videos
- Estimated total minutes
- Estimated credit cost
- Which avatar and voice will be used

### 3. Generate Videos

If confirmed, run the generation:

```bash
node scripts/heygen/generate-videos.mjs --all
```

This will:
- Submit each script as a video generation job
- Poll HeyGen API every 15s until each video completes
- Save a manifest JSON to `tmp/heygen-output/`

For a single script:
```bash
node scripts/heygen/generate-videos.mjs --script 01-brand-guide.md
```

### 4. Handle Results

After generation completes:
- Report which videos succeeded/failed
- For failed videos, check the error and retry if appropriate
- Save video URLs to the manifest

### 5. Wire into Coaching Cards

Once videos are generated, update `src/components/dashboard/onboarding-coaching-card.tsx`:
- Add `videoUrl` to each step's `STEP_GUIDANCE` entry
- The coaching card already has a `videoId` slot ready for this

## Useful Commands

```bash
# Check status of a specific video
node scripts/heygen/generate-videos.mjs --status <video_id>

# List recent videos in your HeyGen account
node scripts/heygen/generate-videos.mjs --list

# Generate without waiting (fire and forget)
node scripts/heygen/generate-videos.mjs --all --no-poll

# Include the bonus full-journey video
node scripts/heygen/generate-videos.mjs --all --include-bonus
```

## MCP Alternative

If HeyGen MCP is configured (`claude mcp add --transport http heygen https://mcp.heygen.com/mcp/v1/`), you can also use MCP tools directly:
- `create_avatar_video` — submit video generation
- `get_video` — check status
- `list_videos` — list account videos

The REST script above is the primary path; MCP is a convenient alternative for ad-hoc single videos.

$ARGUMENTS
