"""Exercise the real Postgres saver, replacing only database I/O."""
import json
import unittest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

from langchain_core.messages import AIMessage
from langgraph.checkpoint.base import empty_checkpoint
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


class CheckpointSerializationTests(unittest.IsolatedAsyncioTestCase):
    async def test_async_checkpoint_writes_json_metadata(self):
        saver = AsyncPostgresSaver(AsyncMock())
        cursor = AsyncMock()

        @asynccontextmanager
        async def mock_cursor(*, pipeline=False):
            yield cursor

        config = {"configurable": {"thread_id": "regression", "checkpoint_ns": ""}}
        checkpoint = empty_checkpoint()
        checkpoint["channel_values"] = {"topic": "Research"}
        checkpoint["channel_versions"] = {"topic": "1"}
        cases = [
            {"source": "input", "step": -1, "writes": {"__start__": {"topic": "Research"}}},
            {"source": "loop", "step": 1, "writes": {"generate": {"report": "Résumé 科学"}}},
            {"source": "loop", "step": 2, "writes": {"respond": {"messages": [AIMessage(content="Answer")]}}},
        ]
        with patch.object(saver, "_cursor", mock_cursor):
            for metadata in cases:
                with self.subTest(source=metadata["source"], step=metadata["step"]):
                    result = await saver.aput(config, checkpoint, metadata, {"topic": "1"})
                    sql, params = cursor.execute.call_args.args
                    self.assertEqual(sql, saver.UPSERT_CHECKPOINTS_SQL)
                    payload = json.loads(params[-1])
                    self.assertEqual(saver._load_metadata(payload), metadata)
                    self.assertEqual(result["configurable"]["checkpoint_id"], checkpoint["id"])
                    # Channel state can still use MessagePack; only metadata needs JSON.
                    blobs = cursor.executemany.call_args.args[1]
                    self.assertEqual(saver.serde.loads_typed((blobs[0][-2], blobs[0][-1])), "Research")


if __name__ == "__main__":
    unittest.main()
