-- ================================================================
-- SYSTEM UNLOCK SCRIPT
-- ================================================================
-- This script ensures the necessary metadata exists and assigns
-- a full-access plan to your center.

-- 1. Populate the master 'features' table (referenced by FK)
-- We assume table 'features' exists with column 'id'.
INSERT INTO public.features (id) VALUES 
('page_store'),
('page_wallets'),
('page_finance'),
('page_students'),
('page_sessions'),
('page_attendance'),
('page_staff'),
('page_settings'),
('page_dashboard'),
('page_reports'),
('page_courses'),
('page_groups')
ON CONFLICT (id) DO NOTHING;

-- 2. Create/Get a Platinum Package
DO $$
DECLARE
    v_pkg_id UUID;
BEGIN
    -- Check for existing package
    SELECT id INTO v_pkg_id FROM public.packages WHERE name = 'Platinum' LIMIT 1;
    
    -- Create if missing
    IF v_pkg_id IS NULL THEN
        INSERT INTO public.packages (name, price, duration_days, max_students, is_active)
        VALUES ('Platinum', 0, 3650, 100000, true)
        RETURNING id INTO v_pkg_id;
        RAISE NOTICE 'Created new Platinum package: %', v_pkg_id;
    ELSE
        RAISE NOTICE 'Using existing Platinum package: %', v_pkg_id;
    END IF;

    -- 3. Map ALL features to this package
    INSERT INTO public.package_features (package_id, feature_id)
    SELECT v_pkg_id, id FROM public.features
    ON CONFLICT (package_id, feature_id) DO NOTHING;

    -- 4. Assign this package to ALL centers (or specific one if needed)
    UPDATE public.centers 
    SET package_id = v_pkg_id,
        subscription_end_date = NOW() + INTERVAL '10 years',
        is_active = true;
        
    RAISE NOTICE 'Updated centers to use Platinum package.';
END $$;
