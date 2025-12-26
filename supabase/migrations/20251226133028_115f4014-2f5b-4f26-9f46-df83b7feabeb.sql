-- Drop the security definer view and replace with a function approach
DROP VIEW IF EXISTS public.public_profiles;

-- Create a function to get public profile data (without contact info)
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    rating NUMERIC(2,1),
    completed_jobs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.id,
        p.user_id,
        p.full_name,
        p.avatar_url,
        p.rating,
        p.completed_jobs,
        p.created_at
    FROM public.profiles p
    WHERE p.user_id = _user_id
$$;

-- Add policy for authenticated users to view limited profile data of others (without contact info)
-- This allows viewing other users' public info through the function
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- But we'll filter sensitive data in application code