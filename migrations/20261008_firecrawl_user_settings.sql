-- Application profiles are separate from Supabase's managed auth.users table.
-- The backend alone reads this table; browsers receive only a boolean status.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firecrawl_api_key TEXT
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS firecrawl_api_key TEXT;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
