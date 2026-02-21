-- Create a function to safely increment times_sold
CREATE OR REPLACE FUNCTION increment_times_sold(code_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.discount_codes
  SET times_sold = times_sold + 1,
      updated_at = NOW()
  WHERE id = code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
