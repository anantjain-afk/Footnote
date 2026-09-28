import asyncio
import json
from typing import Dict, Any

# In-memory event bus: session_id -> asyncio.Queue
_event_queues: Dict[str, asyncio.Queue] = {}

def get_queue(session_id: str) -> asyncio.Queue:
    """Get or create an event queue for a session."""
    if session_id not in _event_queues:
        _event_queues[session_id] = asyncio.Queue()
    return _event_queues[session_id]

def remove_queue(session_id: str):
    """Clean up the queue when done."""
    if session_id in _event_queues:
        del _event_queues[session_id]

def format_sse_event(event_type: str, data: Any) -> dict:
    """Format an event for sse-starlette."""
    return {
        "event": event_type,
        "data": json.dumps(data)
    }

async def publish_event(session_id: str, event_type: str, data: Any):
    """Publish an event to the session's queue."""
    queue = get_queue(session_id)
    await queue.put(format_sse_event(event_type, data))
