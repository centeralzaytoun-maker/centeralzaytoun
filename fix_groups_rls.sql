-- Check and remove conflicting trigger for groups table
-- This trigger might be causing RLS policy violation

-- 1. Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%group%' 
   OR trigger_name LIKE '%center%';

-- 2. Drop the conflicting trigger if it exists
DROP TRIGGER IF EXISTS set_center_id_on_group_insert ON public.groups;

-- 3. Drop the trigger function if it exists
DROP FUNCTION IF EXISTS public.set_center_id_on_group_insert();

-- 4. Verify RLS is enabled on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 5. Check current RLS policies on groups table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'groups';

-- 6. Test the RLS policy manually
-- This should return the center_id for the current user
SELECT center_id FROM public.staff_profiles WHERE id = auth.uid();

-- 7. Grant explicit permissions (if needed)
GRANT ALL ON public.groups TO authenticated;
GRANT ALL ON public.groups TO anon;
