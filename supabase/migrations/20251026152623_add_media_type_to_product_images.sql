/*
  # Add media_type column to product_images

  1. Changes
    - Add `media_type` column to `product_images` table
      - Type: text with constraint to accept only 'image' or 'video'
      - Default: 'image'
      - Not null
    
  2. Notes
    - This column allows products to support both images and videos
    - Existing records will be set to 'image' by default
    - The application uses this field to determine how to display media
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_images' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE product_images 
    ADD COLUMN media_type text NOT NULL DEFAULT 'image' 
    CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;
