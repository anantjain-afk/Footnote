-- Application data is served through authenticated FastAPI endpoints.
-- Preserve owner/backend access while denying direct browser-role access.
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
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
        EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
            target_table
        );
    END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

COMMIT;
