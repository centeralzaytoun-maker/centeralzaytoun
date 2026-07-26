-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_update_sold_count ON store_sales;
DROP TRIGGER IF EXISTS trigger_handle_returns_with_damaged_count ON store_returns;
DROP FUNCTION IF EXISTS update_sold_count();
DROP FUNCTION IF EXISTS handle_returns_with_damaged_count();

-- Add damaged_count column to store_products (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_products' 
    AND column_name = 'damaged_count'
  ) THEN
    ALTER TABLE store_products ADD COLUMN damaged_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update triggers to track both sold_count and damaged_count

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

-- Update returns trigger to track damaged items
CREATE OR REPLACE FUNCTION handle_returns_with_damaged_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle undamaged returns
  IF NOT NEW.is_damaged THEN
    UPDATE store_products 
    SET stock = stock + NEW.quantity,
        sold_count = GREATEST(sold_count - NEW.quantity, 0)
    WHERE id = NEW.product_id;
  ELSE
    -- Handle damaged returns
    UPDATE store_products 
    SET damaged_count = damaged_count + NEW.quantity,
        sold_count = GREATEST(sold_count - NEW.quantity, 0) -- ← نصلح هنا
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for returns
CREATE OR REPLACE TRIGGER trigger_handle_returns_with_damaged_count
AFTER INSERT ON store_returns
FOR EACH ROW
EXECUTE FUNCTION handle_returns_with_damaged_count();
