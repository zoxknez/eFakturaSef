-- Add currentStock field to Product table
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "current_stock" DECIMAL(15,3) DEFAULT 0 NOT NULL;

-- Add autoStockDeduction setting to Company table
ALTER TABLE "companies" 
ADD COLUMN IF NOT EXISTS "auto_stock_deduction" BOOLEAN DEFAULT false NOT NULL;

-- Create index on currentStock for low stock alerts
CREATE INDEX IF NOT EXISTS "idx_products_current_stock" ON "products"("current_stock") 
WHERE "track_inventory" = true;

-- Comment for documentation
COMMENT ON COLUMN "products"."current_stock" IS 'Current inventory level for tracked products';
COMMENT ON COLUMN "companies"."auto_stock_deduction" IS 'Enable automatic stock deduction when invoice is created';
