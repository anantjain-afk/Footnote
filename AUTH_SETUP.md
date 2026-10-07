# Finish authentication setup

The frontend and backend now use this Supabase project:
`https://dehgmggpjxjyfbfsrypr.supabase.co`.

## Email signup and login

1. Open your project in the Supabase dashboard.
2. Go to **Authentication → URL Configuration**.
3. Set **Site URL** to `http://localhost:5173` for local development.
4. Add `http://localhost:5173` and `http://127.0.0.1:5173` under **Redirect URLs**.
5. Save. Restart both the frontend and backend after changing environment files.
6. Click **Sign Up**, open the confirmation email, and click its link. Then sign in.

If you run Vite on another port, add that address too. For deployment, use your
real site address as Site URL, add it to Redirect URLs, and rebuild the frontend.

## Google sign-in

Google is currently disabled in this Supabase project. The app will explain this
when you click Google until you enable it.

1. In Google Cloud Console, create an OAuth client with application type **Web application**.
2. Configure the consent screen. If the Google app is in testing, add your Google
   account as a test user.
3. Add `http://localhost:5173` as an authorized JavaScript origin.
4. Add this exact **Authorized redirect URI**:
   `https://dehgmggpjxjyfbfsrypr.supabase.co/auth/v1/callback`.
5. In Supabase, open **Authentication → Sign In / Providers → Google**.
6. Enable Google, enter Google's client ID and client secret, and save.
7. Return to the app and click **Google**.

Google's client secret belongs in the Supabase dashboard, not in the frontend.
Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-google

## Run locally

The database connection has been verified. The password's special character is
now encoded correctly in `DATABASE_URL`. If you change that password later,
URL-encode it when updating the connection string. Keep this string private.

From the project root, start the backend:

```sh
source .venv/bin/activate
DEBUG=false uvicorn backend.main:app --reload --port 8000
```

In another terminal, start the frontend:

```sh
cd frontend
npm run dev
```

The browser uses `VITE_SUPABASE_URL` in `frontend/.env`. The backend uses
`SUPABASE_URL` in `backend/.env` to verify tokens. Both must point to the same
project. Keep the existing public anon key in the frontend. Legacy HS256 tokens
use the backend's JWT secret; ES256/RS256 tokens use Supabase's public signing keys.

## Verification

```sh
.venv/bin/python -m unittest discover -s backend/tests -v
cd frontend
node --test tests/eventStream.test.mjs
npm run build
```

With the frontend running at `http://127.0.0.1:5173`, run the browser smoke check
from the project root:

```sh
.venv/bin/python backend/tests/auth_browser_check.py
```

The browser smoke check mocks remote auth and API responses and creates no real
accounts. Actual email delivery and Google consent require the dashboard settings
above and a real user sign-in.
