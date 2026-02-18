// 🎯 Script to update existing students with PIN codes
// Run this in Supabase SQL Editor

-- First, check which students don't have access_code
SELECT id, name, unique_id, access_code 
FROM students 
WHERE access_code IS NULL OR access_code = '';

-- Update all students without access_code with random 4-digit PIN
UPDATE students 
SET access_code = LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0')
WHERE access_code IS NULL OR access_code = '';

-- Verify the update
SELECT id, name, unique_id, access_code 
FROM students 
WHERE access_code IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;
