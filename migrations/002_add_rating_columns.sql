-- Add product_rating column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_rating FLOAT DEFAULT 0;

-- Add vendor_rating column to business_profile table
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS vendor_rating FLOAT DEFAULT 0;
