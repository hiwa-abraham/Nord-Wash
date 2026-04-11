-- Remove orders table from realtime publication to prevent PII broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;