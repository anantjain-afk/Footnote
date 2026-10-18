"""PDF responses retain their file until delivery and clean up failed renders."""
import os
from pathlib import Path
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch
from uuid import uuid4

import httpx

with patch.dict(os.environ, {"DEBUG": "false"}):
    from backend.main import app
    from backend.core.auth import User, get_current_user


class PDFCleanupTests(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.export_id = uuid4()
        self.output = Path(f"/tmp/report_{self.export_id.hex[:8]}.pdf")
        self.previous_override = app.dependency_overrides.get(get_current_user)
        app.dependency_overrides[get_current_user] = lambda: User(id=str(uuid4()))
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        )

    async def asyncTearDown(self):
        await self.client.aclose()
        self.output.unlink(missing_ok=True)
        if self.previous_override is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = self.previous_override

    async def test_download_delivers_contents_before_removing_file(self):
        contents = b"%PDF-1.4\nDeployment check\n%%EOF"

        async def render(**kwargs):
            Path(kwargs["output_path"]).write_bytes(contents)

        with patch("backend.api.report.uuid.uuid4", return_value=self.export_id), patch(
            "backend.api.report.generate_pdf", side_effect=render
        ):
            response = await self.client.post(
                "/api/report/export", json={"topic": "Deployment", "report": "Example"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, contents)
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertFalse(self.output.exists())

    async def test_failed_render_removes_partial_file(self):
        async def render(**kwargs):
            Path(kwargs["output_path"]).write_bytes(b"partial PDF")
            raise RuntimeError("Rendering failed")

        with patch("backend.api.report.uuid.uuid4", return_value=self.export_id), patch(
            "backend.api.report.generate_pdf", side_effect=render
        ), self.assertLogs("backend.api.report", level="ERROR"):
            response = await self.client.post(
                "/api/report/export", json={"topic": "Deployment", "report": "Example"}
            )

        self.assertEqual(response.status_code, 500)
        self.assertFalse(self.output.exists())
