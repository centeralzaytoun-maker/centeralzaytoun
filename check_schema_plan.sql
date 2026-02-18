-- 1. Check columns in centers table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'centers';

-- 2. Check existing packages and their features
SELECT 
    p.id as package_id, 
    p.name as package_name, 
    string_agg(pf.feature_id, ', ') as features
FROM packages p
LEFT JOIN package_features pf ON p.id = pf.package_id
GROUP BY p.id, p.name;

-- 3. Check the current center's assigned package
SELECT id, name, subscription_plan, package_id 
FROM centers;
