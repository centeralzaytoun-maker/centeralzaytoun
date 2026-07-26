-- ================================================================
-- UNLOCK ALL FEATURES SCRIPT
-- This script ensures the 'packages' system exists and creates a 
-- 'Platinum' package with access to EVERYTHING, then assigns it
-- to all centers.
-- ================================================================

DO $$
DECLARE
    platinum_pkg_id UUID;
    v_center_record RECORD;
BEGIN
    -- 1. Ensure 'packages' table exists
    CREATE TABLE IF NOT EXISTS public.packages (
        id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Ensure 'package_features' table exists
    CREATE TABLE IF NOT EXISTS public.package_features (
        id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
        package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
        feature_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(package_id, feature_id)
    );

    -- 3. Create or Get 'Platinum' Package
    SELECT id INTO platinum_pkg_id FROM public.packages WHERE name = 'Platinum' LIMIT 1;
    
    IF platinum_pkg_id IS NULL THEN
        INSERT INTO public.packages (name, price, description)
        VALUES ('Platinum', 9999.00, 'All features unlocked')
        RETURNING id INTO platinum_pkg_id;
        RAISE NOTICE 'Created Platinum Package: %', platinum_pkg_id;
    ELSE
        RAISE NOTICE 'Found Platinum Package: %', platinum_pkg_id;
    END IF;

    -- 4. Add ALL features to Platinum Package
    -- Add more features here if needed
    INSERT INTO public.package_features (package_id, feature_id)
    VALUES 
        (platinum_pkg_id, 'page_store'),
        (platinum_pkg_id, 'page_wallets'),
        (platinum_pkg_id, 'page_finance'),
        (platinum_pkg_id, 'page_dashboard'),
        (platinum_pkg_id, 'page_students'),
        (platinum_pkg_id, 'page_sessions'),
        (platinum_pkg_id, 'page_attendance'),
        (platinum_pkg_id, 'page_staff'),
        (platinum_pkg_id, 'page_settings'),
        (platinum_pkg_id, 'page_reports'),
        (platinum_pkg_id, 'page_groups'),
        (platinum_pkg_id, 'page_courses')
    ON CONFLICT (package_id, feature_id) DO NOTHING;
    
    RAISE NOTICE 'Added features to Platinum Package.';

    -- 5. Ensure 'centers' table has 'package_id' column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'centers' AND column_name = 'package_id'
    ) THEN
        ALTER TABLE public.centers ADD COLUMN package_id UUID REFERENCES public.packages(id);
        RAISE NOTICE 'Added package_id column to centers table.';
    END IF;

    -- 6. Update ALL centers to use Platinum Package
    UPDATE public.centers 
    SET package_id = platinum_pkg_id
    WHERE package_id IS NULL OR package_id != platinum_pkg_id;
    
    RAISE NOTICE 'Updated all centers to Platinum Package.';

END $$;
