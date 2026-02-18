-- Alternative approach: Calculate actual sold count based on returns
CREATE OR REPLACE FUNCTION calculate_actual_sold_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate actual sold count: total sold - damaged returns
  UPDATE store_products 
  SET sold_count = (
    SELECT COUNT(*) 
    FROM store_sales 
    WHERE product_id = NEW.product_id
  ) - (
    SELECT COALESCE(SUM(quantity), 0) 
    FROM store_returns 
    WHERE product_id = NEW.product_id AND is_damaged = true
  )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to recalculate on each return
CREATE OR REPLACE TRIGGER trigger_calculate_actual_sold_count
AFTER INSERT ON store_returns
FOR EACH ROW
EXECUTE FUNCTION calculate_actual_sold_count();
