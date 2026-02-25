"""
Felisha — AI Meeting Assistant for BakedBot Executive Boardroom
Joins every meeting room, transcribes via Deepgram Nova-2 STT,
and posts the transcript to the BakedBot API when the room ends.

Deploy: Cloud Run (us-east1), min-instances=1 to stay warm.
Env vars: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, DEEPGRAM_API_KEY, BAKEDBOT_API_URL
"""

import asyncio
import logging
import os

import httpx
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("felisha")

BAKEDBOT_API_URL = os.environ.get("BAKEDBOT_API_URL", "https://bakedbot.ai")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "")


async def entrypoint(ctx: JobContext) -> None:
    """Called when Felisha is dispatched to a room."""
    room_name = ctx.room.name
    logger.info(f"Felisha joining room: {room_name}")

    transcript_lines: list[str] = []

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Felisha connected to room: {room_name}")

    stt = deepgram.STT(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        model="nova-2",
        language="en-US",
        punctuate=True,
        smart_format=True,
        interim_results=False,
    )

    active_tasks: list[asyncio.Task] = []

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        _publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            name = participant.name or participant.identity or "Unknown"
            task = asyncio.ensure_future(
                transcribe_track(track, name, stt, transcript_lines)
            )
            active_tasks.append(task)

    # Wait until the room closes
    disconnect_event = asyncio.Event()

    @ctx.room.on("disconnected")
    def on_disconnected() -> None:
        logger.info(f"Room {room_name} disconnected — saving transcript")
        disconnect_event.set()

    await disconnect_event.wait()

    # Cancel any in-progress transcription tasks
    for task in active_tasks:
        task.cancel()

    # Save final transcript
    final_transcript = "\n".join(transcript_lines)
    logger.info(f"Final transcript: {len(final_transcript)} chars from {len(transcript_lines)} lines")

    if final_transcript.strip():
        await save_transcript(room_name, final_transcript)
    else:
        logger.warning(f"No transcript captured for room {room_name}")


async def transcribe_track(
    track: rtc.Track,
    participant_name: str,
    stt: deepgram.STT,
    transcript_lines: list[str],
) -> None:
    """Transcribes a single audio track, appending lines to the shared list."""
    try:
        async for event in stt.stream(track):
            if event.type == agents.stt.SpeechEventType.FINAL_TRANSCRIPT:
                alts = event.alternatives
                if alts and alts[0].text.strip():
                    text = alts[0].text.strip()
                    line = f"{participant_name}: {text}"
                    transcript_lines.append(line)
                    logger.debug(f"  [{participant_name}] {text}")
    except asyncio.CancelledError:
        pass
    except Exception as exc:
        logger.error(f"Transcription error for {participant_name}: {exc}")


async def save_transcript(room_name: str, transcript: str) -> None:
    """Posts the final transcript to the BakedBot Next.js API."""
    url = f"{BAKEDBOT_API_URL}/api/livekit/transcript"
    headers = {"Authorization": f"Bearer {LIVEKIT_API_KEY}"}
    payload = {"roomName": room_name, "transcript": transcript}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                logger.info(f"Transcript saved for room {room_name}: {response.json()}")
            else:
                logger.error(f"Failed to save transcript: {response.status_code} {response.text}")
    except Exception as exc:
        logger.error(f"Exception saving transcript for {room_name}: {exc}")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint)
    )
