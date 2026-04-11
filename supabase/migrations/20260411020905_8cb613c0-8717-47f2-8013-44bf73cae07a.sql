
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'security_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.security_events;
  END IF;
END $$;
