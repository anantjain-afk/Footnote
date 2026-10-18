ResearchAI deployment plan — 18 October 2026

Recommended first launch: Cloudflare Pages for the frontend, Render Free for the backend, the existing Supabase Free project for Postgres and Auth, and Upstash Redis Free for quotas. Use the supplied hosting subdomains to keep infrastructure at $0/month. This recommendation targets a small public demo with limited concurrency and acceptable delays after inactivity. Free limits can stop the app; they do not provide an uptime commitment.

This is a plan, not a completed deployment. Application code and database configuration were not changed for this task.

What I inspected

- Frontend: React 19, Vite 8, Tailwind, Supabase authentication, authenticated API requests, and streamed research/chat progress.
- Backend: FastAPI, LangGraph background research tasks, server-sent events, Groq, Tavily, Firecrawl, and Playwright Chromium PDF rendering.
- Persistence: asyncpg application connections and psycopg LangGraph checkpoints in Postgres. The local research_agent.db file is not used by the inspected database implementation.
- Redis: required for report/chat admission. Missing or unavailable REDIS_URL makes those operations return 503.
- Live database: a read-only metadata inspection found 11 public tables and a total database size of approximately 12.72 MiB. No user records were queried and no credential values were printed. This estimate is not Supabase's billing meter.
- Launch blocker: 10 public tables have RLS disabled while anon and authenticated have SELECT access; anon also has INSERT access. Only users has RLS enabled. Checkpoints, reports, sessions, sources, versions, and chat need access restrictions before launch.

The service choices

| Layer | Free option | Benefit for this app | Tradeoff | Decision |
| --- | --- | --- | --- | --- |
| Frontend | Cloudflare Pages | Hosts the existing Vite build, Git deployments, free pages.dev address, unlimited static requests and bandwidth. | 500 builds/month; 25 MiB per asset; separate Python hosting required. | Best frontend choice. |
| Frontend | Vercel Hobby | Simple React deployment and preview URLs. | Personal, noncommercial use only. | Good personal-project alternative. |
| Backend | Render Free web service | Straightforward Docker deployment of the current FastAPI app. | 512 MB RAM and 0.1 CPU. Sleeps after 15 idle minutes; approximately one-minute wake-up. Chromium and research concurrency need a memory check. | Best first deployment, subject to the resource gate below. |
| Backend | Oracle Cloud Always Free A1 VM | Currently up to 2 OCPUs and 12 GB RAM across eligible instances. More room for Python and Chromium. | Card verification, regional capacity, ARM compatibility, and server administration. Idle instances can be reclaimed. | Best free capacity if you can maintain a VM. |
| Database and Auth | Supabase Free | Preserves current SQL, JWT verification, Auth users, and the users foreign key to auth.users. | 500 MB database, 5 GB uncached egress, and pausing after a week of inactivity. | Best database and Auth choice. |
| Database | Neon Free | Managed Postgres with 1 GB/project and 100 CU-hours/project/month. | Compute allowance and scale to zero. Existing Supabase Auth integration and cross-schema user relationships require migration work. | Alternative if storage becomes the limiting factor. |
| Redis | Upstash Redis Free | TLS and native Redis TCP suit the Python client and Lua limiter. | 256 MB data, 500,000 commands/month, 10 GB bandwidth. Limits can block generation. | Best Redis choice. |
| Redis | Render Free Key Value | Can share Render's private network with the backend. | State disappears on restart, resetting quota history. | Fallback if quota resets are acceptable. |

Sources: [Cloudflare Pages](https://www.cloudflare.com/products/pages/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Render compute](https://render.com/docs/compute-plans), [Render Free](https://render.com/docs/free), [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [Oracle account requirements](https://www.oracle.com/cloud/free/faq/), [Supabase pricing](https://supabase.com/pricing), [Neon pricing](https://neon.com/pricing), [Upstash pricing](https://upstash.com/pricing/redis), and [Upstash compatibility](https://upstash.com/docs/redis/overall/compatibility).

The backend resource gate

Research starts in FastAPI BackgroundTasks, and progress events live in a dictionary of asyncio queues. Run ONE instance with ONE Uvicorn worker initially. Multiple workers can receive different halves of a research/stream interaction and break progress delivery.

Postgres checkpoints survive process loss, but the app does not automatically resume interrupted jobs. A restart or deployment can leave a session marked running after its task disappears. Add recovery that identifies interrupted jobs and offers retry. Durable execution and a shared event transport are later requirements for scaling.

Render is the easiest recommendation, but 512 MB is an unverified fit for the complete workload. Measure normal research, deep research, and PDF export within that limit before launch. Start with one active research job globally and serialize PDF rendering. Per-user quotas do not bound aggregate concurrency or provider usage. If the complete feature set exceeds the limit, select the Oracle VM option.

Request-based functions require redesigning background execution and progress storage. Cloudflare Pages and Vercel are frontend options in this plan.

Keeping the whole service free

| Dependency | Current free allowance | Consequence |
| --- | --- | --- |
| Groq | Published limits for the configured openai/gpt-oss-20b include 30 requests/minute and 8,000 tokens/minute. | Reports use several calls. Pace work, handle 429s, and confirm account-specific limits. |
| Tavily | 1,000 API credits/month. | Credits depend on request type and do not equal completed reports. |
| Firecrawl | 1,000 credits/month; two concurrent requests. | Limit scraping and parallel calls. Deep research already requires a user's saved key; normal mode can use the app fallback key. |
| Supabase default email | Project team addresses only; two messages/hour. | Public email signup requires custom SMTP. Configured Google sign-in is the initial option requiring no sending domain. |
| Optional Brevo SMTP | 300 emails/day on Free. | Domain authentication is required. Free service if you already control a suitable domain; purchasing a domain is a separate cost. |

Sources: [Groq limits](https://console.groq.com/docs/rate-limits), [Tavily pricing](https://www.tavily.com/pricing), [Firecrawl current pricing](https://www.firecrawl.dev/pricing), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Brevo free limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), and [Brevo domain authentication](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC).

Firecrawl's live pricing changed in September 2026; older references to 500 one-time credits are outdated. No fixed number of free reports is promised because sources, tokens, and refinement passes vary.

Select explicit Free plans, disable paid upgrades/top-ups, and accept service suspension at limits. Render documents that without a payment method it disables services instead of charging for excess included usage. Its 750 free instance-hours are shared across the workspace. [Render billing behavior](https://render.com/docs/faq)

Deployment sequence

1. Restrict database access first. Export a backup and record current grants. For backend-only tables, revoke browser-role access and enable RLS with no browser access policies, preserving backend privileges. Protect checkpoints and review default privileges for newly created tables. Verify Supabase Data API access cannot bypass ownership checks, while Auth and backend operations still work.

2. Make deployment configuration effective. Change frontend/src/api/research.js to use VITE_BACKEND_URL for PDF export; it currently calls localhost:8000 directly. Wire backend/main.py to settings.cors_origins; its literal wildcard means CORS_ORIGINS currently has no effect. Allow the real frontend origin and retain Retry-After exposure. Add .env exclusions to .gitignore and the Docker context; inspected environment files are currently untracked.

3. Package the backend. Prepare a Dockerfile with a supported pinned Python version, initially Python 3.12, root requirements.txt, Chromium, and its Linux system dependencies. Pin a known working dependency set. Use the repository root as Docker build context for package-relative backend imports. Exclude environment files, .git, virtual environments, node_modules, local databases, and generated artifacts. Delete temporary PDFs after their responses finish.

   Start command:

   ```sh
   uvicorn backend.main:app --host 0.0.0.0 --port "$PORT" --workers 1
   ```

4. Retain the existing Supabase project. Confirm users and report_versions migrations, export a reproducible baseline schema, and retain the encryption key for saved Firecrawl credentials. update_schema.py alters existing tables and is not a full fresh-database bootstrap. Use the dashboard's TLS session-pooler connection on port 5432 for an IPv4 backend. Avoid transaction pooling on 6543 with the current prepared-statement clients. Review the 5–20 application connections plus separate checkpoint connections against actual limits, and avoid retaining DB connections for whole SSE sessions. [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres)

5. Create Upstash Redis Free near the backend. Copy its native TLS rediss:// connection string and set a production-specific quota prefix. The existing redis.asyncio client needs TCP, not an HTTPS REST endpoint. Check the actual Lua admission script against the hosted database.

6. Deploy one Render Free web service. Configure Docker, backend environment, PORT, and one worker. Use / for Render's frequent liveness checks. Check /health/ready during deployment validation and incident diagnosis; it executes Redis EVAL, so frequent automated probes consume commands and can make Redis outages trigger backend restarts. This endpoint checks Redis only; validate Postgres separately. Render probes every few seconds. [Health checks](https://render.com/docs/health-checks), [probe frequency](https://render.com/docs/troubleshooting-deploys)

7. Deploy Cloudflare Pages. Connect the repository, set root frontend, build command npm run build, and output dist. Use a current Node 22 release compatible with Vite 8 and the committed package-lock.json. Set the three public build variables below before building. Use the resulting pages.dev URL. [Cloudflare React deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)

8. Finish authentication URLs. Set Supabase Site URL and allowed redirects to the final frontend address. Configure Google OAuth's Supabase callback and frontend origin. Verify public sign-in works beyond OAuth test users. Configure SMTP and sender verification before advertising public email signup. Updating VITE_ variables requires rebuilding the frontend.

9. Run launch checks. Verify anonymous API rejection, isolation between two users, normal/deep research, streamed progress, chat, versions, PDF export, quota 429 handling, Redis outage behavior, and redirects. Measure a realistic research-plus-PDF workload under the backend memory cap. Check first access after sleep, stream reconnection, and recovery after restart. These are planned checks, not checks executed while writing this document.

10. Monitor free allowances. Inspect provider dashboards after initial usage, keep encrypted manual database backups, and set retention for old checkpoints without deleting active-session state. Use measured growth to choose retention. Add a global provider budget guard alongside per-user quotas.

Environment placement

| Location | Variables |
| --- | --- |
| Cloudflare public build values | VITE_BACKEND_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Backend secrets | DATABASE_URL, REDIS_URL, GROQ_API_KEY, TAVILY_API_KEY, FIRECRAWL_API_KEY, FIRECRAWL_KEY_ENCRYPTION_KEY |
| Backend Auth configuration | SUPABASE_URL; SUPABASE_JWT_SECRET only for legacy HS256 tokens |
| Backend operations | DEBUG=false, RATE_LIMIT_KEY_PREFIX=research-agent:production, RATE_LIMIT_REPORTS, RATE_LIMIT_CHAT, RATE_LIMIT_WINDOW_SECONDS, CORS_ORIGINS after wiring it to middleware |
| Optional tracing | LANGCHAIN_TRACING_V2=false initially; credentials only if deliberately enabling tracing |

Use CORS_ORIGINS as a JSON list containing the actual HTTPS frontend origin. Point frontend/backend to the same Supabase project. The public Supabase key belongs in the browser; database credentials, encryption keys, provider keys, and service-role secrets do not.

Offers screened out

- Render Free Postgres expires after 30 days. [Render Free](https://render.com/docs/free)
- Koyeb has free compute, but its current FAQ says signup selects Pro and bills a prorated subscription after card verification. It is not the recommended strict-$0 path. [Koyeb FAQ](https://www.koyeb.com/docs/faqs/pricing)
- Hugging Face lists free CPU Basic hardware, but current documentation requires a paid plan to create Docker/Gradio compute Spaces. It is not a new-account, all-free backend. [Spaces overview](https://huggingface.co/docs/hub/spaces-overview)
- Redis Cloud's free plan has no TLS, so it does not meet this app's remote encrypted-connection requirement. [Redis Cloud TLS](https://redis.io/docs/latest/operate/rc/security/database-security/tls-ssl/)

The selected stack stays at $0 infrastructure cost within free allowances. Choose Oracle Always Free for the backend if the complete workload does not fit Render and you can take on VM maintenance.
