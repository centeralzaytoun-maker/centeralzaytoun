-- Force Refresh RLS Policies for Groups Table
-- This will completely reset and recreate the policies

-- 1. Disable RLS temporarily
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "Center Admins Manage Groups" ON public.groups;
DROP POLICY IF EXISTS "Center Isolation" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups in their center" ON public.groups;
DROP POLICY IF EXISTS "Users can manage groups in their center" ON public.groups;

-- 3. Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 4. Create a single, working policy
CREATE POLICY "Groups RLS Policy" ON public.groups
FOR ALL USING (
    center_id IN (
        SELECT center_id FROM public.staff_profiles 
        WHERE id = auth.uid()
    )
);

-- 5. Verify the new policy
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'groups';

-- 6. Grant permissions
GRANT ALL ON public.groups TO authenticated;
GRANT SELECT ON public.groups TO anon;

-- 7. Test the policy with current user
-- This should return the center_id for the authenticated user
SELECT 
    auth.uid() as current_auth_uid,
    (SELECT center_id FROM public.staff_profiles WHERE id = auth.uid()) as user_center_id;

-- 8. Clean up any test data
DELETE FROM public.groups WHERE name = 'Test Group from SQL';
