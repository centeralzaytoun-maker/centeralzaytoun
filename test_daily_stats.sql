-- Test the function with current date
SELECT * FROM get_store_sales_with_refunds(CURRENT_DATE, 'your-center-id-here');

-- Check if function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'get_store_sales_with_refunds';

-- Check if store_sales and store_returns tables exist and have data
SELECT COUNT(*) as sales_count FROM store_sales WHERE DATE(created_at) = CURRENT_DATE;
SELECT COUNT(*) as returns_count FROM store_returns WHERE DATE(created_at) = CURRENT_DATE;
