-- Test RLS Policy with Actual User ID
-- Replace with your actual user ID from the frontend logs

-- 1. Test with the actual user ID from frontend
-- From your logs: 'c36c3760-4e05-4feb-ac41-e124f72e392e'

-- Test the RLS policy manually
SELECT 
    'Testing with actual user ID' as test_description,
    'c36c3760-4e05-4feb-ac41-e124f72e392e' as test_user_id,
    (SELECT center_id FROM public.staff_profiles WHERE id = 'c36c3760-4e05-4feb-ac41-e124f72e392e') as user_center_id;

-- 2. Check if the user can access their own center data
SELECT 
    'Can user access groups in their center?' as question,
    COUNT(*) as accessible_groups
FROM public.groups 
WHERE center_id = (SELECT center_id FROM public.staff_profiles WHERE id = 'c36c3760-4e05-4feb-ac41-e124f72e392e');

-- 3. Test the exact RLS policy condition
SELECT 
    'RLS Policy Test' as test_description,
    'c36c3760-4e05-4feb-ac41-e124f72e392e' as current_user,
    (SELECT center_id FROM public.staff_profiles WHERE id = 'c36c3760-4e05-4feb-ac41-e124f72e392e') as expected_center_id,
    'afda26e2-b06a-4766-811e-3fcb8c8db781' as actual_center_id;

-- 4. Drop the problematic policy (this should work)
DROP POLICY IF EXISTS "Center Isolation" ON public.groups;

-- 5. Verify only one policy remains
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'groups';

-- 6. Grant explicit permissions to authenticated users
GRANT ALL ON public.groups TO authenticated;

-- 7. Test insert with explicit user context (this should work after policy fix)
-- This simulates what the frontend is trying to do
INSERT INTO public.groups (name, course_id, center_id) 
VALUES (
    'Test Group from SQL', 
    '07cdd9f8-2440-4593-814f-ec263b5eb40f', 
    (SELECT center_id FROM public.staff_profiles WHERE id = 'c36c3760-4e05-4feb-ac41-e124f72e392e')
)
ON CONFLICT DO NOTHING;

-- 8. Check if insert worked
SELECT * FROM public.groups WHERE name = 'Test Group from SQL';
