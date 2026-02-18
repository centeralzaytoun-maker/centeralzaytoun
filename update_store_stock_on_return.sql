CREATE OR REPLACE FUNCTION update_store_stock_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update stock if product is not damaged
  IF NOT NEW.is_damaged THEN
    UPDATE store_products 
    SET stock = stock + NEW.quantity,
        sold_count = GREATEST(sold_count - NEW.quantity, 0)
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE OR REPLACE TRIGGER trigger_update_store_stock_on_return
AFTER INSERT ON store_returns
FOR EACH ROW
EXECUTE FUNCTION update_store_stock_on_return();
