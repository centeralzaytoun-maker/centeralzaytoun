-- Link wallet_transactions.created_by to staff_profiles.id
-- This allows Supabase to automatically join these tables using:
-- .select('*, staff_profiles:created_by(full_name)')

DO $$
BEGIN
    -- Only add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'wallet_transactions_created_by_fkey'
    ) THEN
        -- Link created_by to staff_profiles
        ALTER TABLE public.wallet_transactions
        ADD CONSTRAINT wallet_transactions_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.staff_profiles (id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Successfully added Foreign Key: wallet_transactions.created_by -> staff_profiles.id';
    ELSE
        RAISE NOTICE 'Constraint wallet_transactions_created_by_fkey already exists';
    END IF;
END $$;
