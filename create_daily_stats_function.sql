-- Execute this in Supabase SQL Editor to create the function

-- Drop existing function first
DROP FUNCTION IF EXISTS get_store_sales_with_refunds(date, uuid);

CREATE OR REPLACE FUNCTION get_store_sales_with_refunds(target_date DATE, target_center_id UUID)
RETURNS TABLE (
  total_sales DECIMAL,
  total_refunds DECIMAL,
  net_sales DECIMAL,
  sales_count BIGINT,
  refunds_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.price_sold), 0) as total_sales,
    COALESCE((SELECT SUM(r.refund_amount) 
             FROM store_returns r 
             WHERE DATE(r.created_at) = target_date 
             AND r.center_id = target_center_id), 0) as total_refunds,
    COALESCE(SUM(s.price_sold), 0) - 
    COALESCE((SELECT SUM(r.refund_amount) 
             FROM store_returns r 
             WHERE DATE(r.created_at) = target_date 
             AND r.center_id = target_center_id), 0) as net_sales,
    COUNT(s.id) as sales_count,
    (SELECT COUNT(r.id) 
     FROM store_returns r 
     WHERE DATE(r.created_at) = target_date 
     AND r.center_id = target_center_id) as refunds_count
  FROM store_sales s 
  WHERE DATE(s.created_at) = target_date
  AND s.center_id = target_center_id;
END;
$$;

-- Test the function
SELECT * FROM get_store_sales_with_refunds(CURRENT_DATE, 'afda26e2-b06a-4766-811e-3fcb8c8db781');
