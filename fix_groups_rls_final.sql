-- Fix Groups RLS - Remove Conflicting Policies
-- The issue is having TWO policies that conflict with each other

-- 1. Drop the problematic "Center Isolation" policy that uses get_my_center_id()
DROP POLICY IF EXISTS "Center Isolation" ON public.groups;

-- 2. Keep only the working policy "Center Admins Manage Groups"
-- This policy correctly checks staff_profiles for the user's center_id

-- 3. Verify the remaining policy
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

-- 4. Check if get_my_center_id() function exists and what it does
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_my_center_id';

-- 5. Test the RLS policy manually for current user
SELECT 
    auth.uid() as current_user_id,
    (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) as user_center_id;

-- 6. Grant explicit permissions to be safe
GRANT ALL ON public.groups TO authenticated;
