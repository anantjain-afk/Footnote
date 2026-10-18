ResearchAI: step-by-step deployment guide

This guide uses Cloudflare Pages + Render Free + your existing Supabase project + Upstash Redis Free. It prepares a controlled public demo. The commands, SQL, and code below are instructions for you to apply; they have not been applied by creating this guide.

Your final addresses will look like:

| Purpose | Example only |
| --- | --- |
| Frontend, shared with users | https://YOUR_SITE.pages.dev |
| Backend API | https://YOUR_API.onrender.com |
| Supabase project | https://YOUR_PROJECT_REF.supabase.co |

Replace examples with the actual addresses assigned to your accounts. API base URLs and CORS origins should have no trailing slash.

1. Prepare accounts and protect local secrets.

Use your existing Supabase project. Sign in to GitHub, Render, Cloudflare, and Upstash; select Free plans. Install and open Docker Desktop for the local container check. Use a current Node 22 release, with Node 22.12 or newer.

Open a terminal in this repository. Keep existing ignore rules and append these entries to the root .gitignore:

```gitignore
.env
.env.*
!.env.example
**/.env
**/.env.*
.venv/
**/node_modules/
**/__pycache__/
backups/
```

Inspect tracked environment paths:

```sh
git ls-files -- backend/.env frontend/.env .env.deploy
```

Expected result: no paths. If paths appear, remove those files from Git tracking and address any credentials already pushed before publishing. Never put API secrets or the database URL in the frontend.

2. Back up the existing database.

In Supabase, open your project and click Connect. Select Session pooler and copy its port-5432 connection string. Substitute your database password, URL-encoding reserved characters in the password component. The username usually contains your project reference; preserve the exact host/username shown by Supabase. Add sslmode=require if not already configured.

The format is:

```text
postgresql://postgres.YOUR_PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
```

Use session pooling, not the transaction pooler on 6543, for the current clients. [Supabase connection choices](https://supabase.com/docs/guides/database/connecting-to-postgres)

With Docker Desktop running, use Supabase's CLI backup procedure. These zsh commands prompt for the URL without writing its literal value into the command:

```sh
mkdir -p backups
read -rs 'DEPLOY_DB_URL?Paste your session-pooler database URL: '
echo
npx supabase@latest db dump --db-url "$DEPLOY_DB_URL" -f backups/roles.sql --role-only
npx supabase@latest db dump --db-url "$DEPLOY_DB_URL" -f backups/schema.sql
npx supabase@latest db dump --db-url "$DEPLOY_DB_URL" -f backups/data.sql --data-only --use-copy -x storage.buckets_vectors -x storage.vector_indexes
unset DEPLOY_DB_URL
```

Check that each command succeeds and the files exist before changing permissions. Store backups privately. Complete Auth/Storage restore requirements are covered in the [Supabase backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore); the CLI exports are not a substitute for every managed-project setting.

3. Restrict browser access to database tables.

The current frontend uses Supabase for authentication and FastAPI for application data. Browser roles do not need direct access to the application's tables. The backend should use the server-only Postgres connection from step 2, preserving its table-owner access.

Open Supabase SQL Editor. Save the following as a migration in your repository and run it in the SQL Editor:

```sql
BEGIN;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'chat_messages',
    'checkpoint_blobs',
    'checkpoint_migrations',
    'checkpoint_writes',
    'checkpoints',
    'groundedness_results',
    'report_sources',
    'report_versions',
    'reports',
    'research_sessions',
    'users'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      target_table
    );
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      target_table
    );
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

COMMIT;
```

This applies to the inspected tables and defaults for tables created by postgres. It does not delete application data or change Supabase Auth's own tables. Other object-creating roles need their default privileges reviewed separately.

Run this metadata query afterward:

```sql
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_read,
  has_table_privilege('anon', c.oid, 'INSERT') AS anon_can_insert,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS browser_user_can_read
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

For the 11 listed tables, expect RLS true and all three browser permission columns false. Confirm the existing app can still sign in and read its reports through FastAPI. [Supabase row security](https://supabase.com/docs/guides/database/postgres/row-level-security)

4. Create the free Redis database.

In Upstash, create a Redis database using the Free plan. Choose a region close to the backend region you intend to use.

Open its connection panel and copy the native Redis connection information. Your REDIS_URL must have this form:

```text
rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT:YOUR_PORT
```

Use the exact username, password, endpoint, and port provided. Do not copy an HTTPS REST URL into REDIS_URL. Your Python client uses native TCP. Upstash requires TLS, hence rediss://. [Connection instructions](https://upstash.com/docs/redis/howto/connect-client)

5. Make the two required code configuration changes.

In backend/main.py, add:

```python
from .core.config import settings
```

In the existing CORSMiddleware call, replace:

```python
allow_origins=["*"],
```

with:

```python
allow_origins=settings.cors_origins,
```

Keep the other existing CORS arguments.

In frontend/src/api/research.js, add this below the import:

```javascript
const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;
```

Inside exportReportPDF, replace the hardcoded localhost URL with:

```javascript
const response = await fetchWithAuth(`${BASE}/report/export`, {
```

Keep the remainder of that function. Other API modules already use VITE_BACKEND_URL.

6. Add backend container files.

Create Dockerfile at the repository root, alongside requirements.txt:

```dockerfile
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && python -m playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY backend ./backend

ENV PORT=10000
EXPOSE 10000

CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
```

The browser installation supplies the Linux dependencies needed for PDF export. Keep one worker: progress queues currently live inside the Python process. [Playwright container guidance](https://playwright.dev/python/docs/docker)

Create .dockerignore at the repository root:

```text
.git
.agents
.codex
.venv
**/.venv
**/node_modules
**/dist
**/__pycache__
**/*.pyc
.env
.env.*
**/.env
**/.env.*
backups
**/*.db
**/.DS_Store
```

The image copies backend code, not the frontend. Do not copy environment files into it. After a successful Linux build, capture the resolved Python versions in a deployment lock file for reproducible rebuilds.

7. Check the container locally.

Create a private .env.deploy file at the repository root. Populate it from your existing backend/.env and the new hosted connections. This is for local Docker only; Render receives these values through its environment settings.

```dotenv
GROQ_API_KEY=YOUR_EXISTING_GROQ_KEY
TAVILY_API_KEY=YOUR_EXISTING_TAVILY_KEY
FIRECRAWL_API_KEY=YOUR_EXISTING_FIRECRAWL_KEY

DATABASE_URL=YOUR_TLS_SESSION_POOLER_URL
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_JWT_SECRET=YOUR_EXISTING_LEGACY_JWT_SECRET_IF_USED
REDIS_URL=YOUR_UPSTASH_REDISS_URL

FIRECRAWL_KEY_ENCRYPTION_KEY=YOUR_EXISTING_ENCRYPTION_KEY

DEBUG=false
LANGCHAIN_TRACING_V2=false
CORS_ORIGINS=["http://localhost:5173"]
RATE_LIMIT_KEY_PREFIX=research-agent:deploy-check
RATE_LIMIT_REPORTS=10
RATE_LIMIT_CHAT=30
RATE_LIMIT_WINDOW_SECONDS=3600
```

For Docker --env-file, do not surround scalar values with shell quotes. Keep the JSON quotes inside the CORS list. Omit SUPABASE_JWT_SECRET if the project uses only asymmetric signing keys.

Reuse your existing FIRECRAWL_KEY_ENCRYPTION_KEY. Generating a replacement would make already saved user keys unreadable.

From the repository root:

```sh
docker build -t research-agent-api .
docker run --rm --init --name research-agent-check --memory=512m --cpus=0.1 -p 8000:10000 --env-file .env.deploy research-agent-api
```

Stop any existing backend using port 8000 first. Leave this terminal open. In another terminal:

```sh
curl -i http://localhost:8000/
curl -i http://localhost:8000/health/ready
```

Expect HTTP 200 for both. The root checks the server, and readiness checks the Redis dependency.

Run the frontend against localhost:8000. From frontend/:

```sh
npm ci
npm run build
npm run dev
```

Use an existing developer account to try a short normal report, PDF export, and deep research with a saved user Firecrawl key. Use Docker Desktop or docker stats research-agent-check to watch memory. These operations consume provider credits. This is a local resource approximation; final checks must run on Render too. A Mac's container architecture can differ from Render's.

If the container exits with an out-of-memory event, the full feature set has not passed the Render Free gate. Use the Oracle alternative in DEPLOYMENT_PLAN.md or reduce measured resource use before inviting users. The guide does not establish a safe concurrency level; begin with controlled access and one job at a time.

8. Commit and push the prepared repository.

Review git status and git diff. Include the code edits, Dockerfile, .dockerignore, ignore rules, and the database permission migration. Include your approved landing-page changes if they are still uncommitted. Exclude backups and all secret files.

Publish the repository privately to GitHub if it is not already there. GitHub Desktop's Publish repository flow is sufficient. If an existing remote is configured, commit the selected changes and push to the branch you will deploy. Grant the hosting services access to this repository when prompted.

9. Deploy the backend on Render.

In Render, select New → Web Service and connect your GitHub repository. Use these values:

| Setting | Value |
| --- | --- |
| Language/runtime | Docker |
| Branch | The branch containing your prepared changes |
| Root directory | Leave blank: repository root |
| Dockerfile path | ./Dockerfile |
| Instance type | Free |
| Region | Close to Supabase/Upstash where possible |
| Health check path | / |
| Docker command override | Leave blank; use Dockerfile CMD |

Add the .env.deploy variables through Render's Environment settings. Keep the provider keys, database URL, encryption key, and Redis URL private. For Render, change RATE_LIMIT_KEY_PREFIX to research-agent:production. Keep CORS_ORIGINS as the localhost JSON list temporarily; replace it with the assigned frontend URL in step 11. Render supplies PORT.

Create/deploy the service. Wait for Live, then copy the exact HTTPS address, for example https://YOUR_API.onrender.com.

Open these in a browser or use curl:

```text
https://YOUR_API.onrender.com/
https://YOUR_API.onrender.com/health/ready
```

Both should return successful JSON. Use / for Render's frequent health checks: /health/ready performs a Redis command on every request. Do not add --reload or multiple workers. [Render Docker setup](https://render.com/docs/docker)

10. Deploy the frontend on Cloudflare Pages.

In Cloudflare, open Workers & Pages → Create application → Pages → Import an existing Git repository. Choose the same repository.

| Setting | Value |
| --- | --- |
| Project name | Choose an available name |
| Production branch | The prepared deployment branch |
| Root directory | frontend |
| Framework preset | Vite, if offered |
| Build command | npm run build |
| Build output directory | dist |
| NODE_VERSION | 22 |

Before the build, add these Production environment variables:

```dotenv
VITE_BACKEND_URL=https://YOUR_API.onrender.com
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_EXISTING_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Copy the public key from frontend/.env or Supabase's API settings. Use the same Supabase project as the backend. Never use service_role or a server secret key here.

Deploy, then copy the exact https://YOUR_SITE.pages.dev address. Preview deployments need their own deliberate CORS/Auth configuration; initially use the production address.

[Pages deployment instructions](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [Node version settings](https://developers.cloudflare.com/pages/configuration/build-image/)

11. Connect the final frontend origin and authentication.

Return to Render → your service → Environment. Set:

```text
CORS_ORIGINS=["https://YOUR_SITE.pages.dev"]
```

Save and redeploy the backend. Enter the value as raw JSON, without wrapping the entire list in another pair of quotes.

In Supabase → Authentication → URL Configuration, set Site URL to:

```text
https://YOUR_SITE.pages.dev
```

Add that address to Redirect URLs too. Keep localhost redirect entries if you still develop locally.

For Google sign-in, open Supabase → Authentication → Sign In / Providers → Google. Copy its callback URL, usually:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

In Google Cloud's Google Auth Platform/OAuth client settings, configure an External app and a Web application client. Add your final frontend URL as an authorized JavaScript origin and the exact Supabase callback as an authorized redirect URI. Add test users while testing. For public access, finish the audience/publishing settings so sign-in is not limited to your test-user list.

Copy the Google Client ID and Client Secret into Supabase's Google provider configuration and enable the provider. They do not belong in VITE_ variables. [Google sign-in setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

If you want public email signup, configure custom SMTP under Supabase Auth before advertising it. The default Supabase sender is restricted to team addresses. The initial zero-domain route is Google sign-in; email signup still needs the additional mail setup. [SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp)

12. Validate the deployed site, then share it.

Open the production pages.dev URL in a private browser window. Verify these outcomes:

| Check | Expected result |
| --- | --- |
| Landing page and mode switch | Correct headings; no accumulated 01 headings |
| Google sign-in | Returns to your deployed frontend and opens the dashboard |
| Normal research | Progress updates and a saved report |
| Deep research | Requires a user Firecrawl key, then completes with progress |
| PDF export | Downloads a PDF through the hosted backend |
| Chat and report versions | Work and persist after refresh |
| Second account | Cannot access the first account's sessions or reports |
| Anonymous API call | Protected routes return 401 |
| Database permissions | Browser roles cannot read/insert application tables directly |
| Backend sleep/restart | Cold start and interrupted-job limitations are understood |
| Resource use | No OOM, repeated restarts, or provider quota failures during intended use |

Watch Render logs/metrics and provider usage during the checks. Existing background tasks do not automatically resume after a restart. Completed reports remain in Postgres, but interrupted jobs may need a new request. Avoid deploying during active research. Global concurrency control and automatic interrupted-job recovery remain additional hardening work before broader access.

Once these pass for your intended small audience, share the frontend pages.dev URL. The onrender.com address is the backend API.

Common problems

| Symptom | First thing to check |
| --- | --- |
| Dashboard requests blocked by CORS | The backend code edit is deployed, the exact production pages.dev origin is in CORS_ORIGINS, and the API URL has no trailing slash |
| Generate/chat return 503 | /health/ready; hosted rediss:// URL, Redis credentials, region latency, and allowance |
| Container fails before serving requests | Render logs, required keys, database password encoding, session-pooler host and port 5432 |
| PDF says browser executable missing | Chromium and OS dependencies were installed during Docker build |
| PDF or research causes a restart | Render memory metrics/OOM; the 512 MB gate may have failed |
| Requests still go to localhost | VITE_BACKEND_URL was set before the latest frontend build; the PDF URL fix was committed |
| Google returns redirect_uri_mismatch | Google's redirect URI must be the Supabase callback, not the pages.dev URL |
| OAuth works only for you | Google app audience/testing status and authorized test users |
| Email signup does not send | Configure custom SMTP; the default sender is not for arbitrary public addresses |
| Old saved Firecrawl keys cannot decrypt | Restore the original FIRECRAWL_KEY_ENCRYPTION_KEY |
| Research is stuck after a restart | Background tasks are not durable; start a fresh request and implement recovery before broader use |

Future updates follow your Git deployment configuration. Backend changes rebuild on Render; frontend builds use the Cloudflare build settings. Changing VITE_ variables requires rebuilding the frontend. Keep secrets in service settings, provider accounts on Free, and paid top-ups disabled.
