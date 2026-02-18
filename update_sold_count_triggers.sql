CREATE OR REPLACE FUNCTION update_sold_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update sold_count when a sale is made
  UPDATE store_products 
  SET sold_count = sold_count + 1
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sales
CREATE OR REPLACE TRIGGER trigger_update_sold_count
AFTER INSERT ON store_sales
FOR EACH ROW
EXECUTE FUNCTION update_sold_count();

-- Also update sold_count when a return is made (decrement)
CREATE OR REPLACE FUNCTION decrement_sold_count_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only decrement sold_count if product is not damaged
  -- Damaged items should not affect sold_count (they're returned but were valid sales)
  IF NOT NEW.is_damaged THEN
    UPDATE store_products 
    SET sold_count = GREATEST(sold_count - NEW.quantity, 0)
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for returns
CREATE OR REPLACE TRIGGER trigger_decrement_sold_count_on_return
AFTER INSERT ON store_returns
FOR EACH ROW
EXECUTE FUNCTION decrement_sold_count_on_return();
