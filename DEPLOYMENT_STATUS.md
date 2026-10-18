Footnote deployment status — 19 October 2026

This file records the implementation of DEPLOYMENT_GUIDE.md. It contains no credentials.

Already completed before this deployment pass:

- Supabase database backups exist locally in backups/.
- The database URL uses the Sydney session pooler on port 5432.
- A hosted TLS Upstash connection is configured and responds to Lua/TIME checks.
- CORS reads configured origins, and PDF export reads VITE_BACKEND_URL.
- Google sign-in is enabled in Supabase.
- The Render CLI is authenticated, and the GitHub remote is configured.

Completed during this pass:

- Added Git/Docker exclusions for credentials, backups, and local build files.
- Added the backend Dockerfile, pinned Linux/Python 3.12 dependencies, Render Free/Singapore configuration, and frontend Node 22 selection.
- Created an ignored, permission-restricted .env.deploy from the existing credentials, preserving the Firecrawl encryption key.
- Applied migrations/20261019_restrict_browser_table_access.sql to the existing database. All 11 application tables have RLS enabled and browser-role table grants revoked; backend-owner access was verified.
- Saved original grants and a rollback migration under ignored backups/.
- Verified the anonymous Supabase REST request for reports is rejected without returning records.
- Added temporary PDF cleanup after delivery and after failed rendering.
- Updated stale rate-limit test mocks for transactional chat and per-user key checks.
- Verified the frontend production build and 7 frontend tests.
- Verified all 30 backend tests inside the Linux deployment image with isolated Redis and mocked AI providers.
- Verified resource-limited backend startup, Redis readiness, and anonymous API rejection. The idle container used approximately 100 MiB of its 512 MiB limit.
- Rendered a valid sample PDF with Chromium under the 512 MiB / 0.1 CPU container limit. Observed peak container memory was 320.43 MiB; dependency consistency also passed.

In progress:

- Final pinned image build.
- Commit/push of the deployment package and the current UI, as authorized.
- Render backend creation and health verification.

Manual account settings remaining:

1. Create or select the Cloudflare Pages project and connect the GitHub deployment branch. Use root frontend, build npm run build, output dist, and Node 22. Cloudflare Pages serves globally and has no region setting.
2. Set VITE_BACKEND_URL to the final Render HTTPS URL. Copy VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from frontend/.env into Cloudflare's production build variables. Do not copy backend secrets.
3. After Cloudflare assigns the frontend URL, put that exact origin in Render's CORS_ORIGINS JSON list and redeploy the backend.
4. Set the same frontend URL as Supabase Auth Site URL and add it to allowed redirect URLs. Verify the existing Google OAuth client permits public sign-in and the appropriate production origin/callback.
5. Verify custom SMTP before offering public email signup. Google is enabled, but this session cannot inspect private SMTP or OAuth dashboard configuration.
6. Sign in through the deployed frontend and check one normal report, one deep report with a saved user key, PDF export, chat, versions, and cross-user isolation. These live provider workflows require an interactive user session and consume provider allowance.

The complete research workflow under concurrent users has not been resource-tested. Background jobs are not automatically resumed after backend restarts. Start with controlled access and verify intended usage before sharing broadly.
