-- Seed some example stores with domain as canonical identifier
INSERT INTO public.stores (name, slug, domain, logo_url, website_url, description) VALUES
  ('Nike', 'nike', 'nike.com', '/placeholder.svg?height=80&width=80', 'https://nike.com', 'Athletic footwear and apparel'),
  ('Adidas', 'adidas', 'adidas.no', '/placeholder.svg?height=80&width=80', 'https://adidas.com', 'Sportswear and equipment'),
  ('H&M', 'hm', 'hm.com', '/placeholder.svg?height=80&width=80', 'https://hm.com', 'Fashion and clothing'),
  ('Zara', 'zara', 'zara.com', '/placeholder.svg?height=80&width=80', 'https://zara.com', 'Fashion retail'),
  ('ASOS', 'asos', 'asos.com', '/placeholder.svg?height=80&width=80', 'https://asos.com', 'Online fashion retailer'),
  ('Booking.com', 'booking', 'booking.com', '/placeholder.svg?height=80&width=80', 'https://booking.com', 'Hotel and accommodation booking'),
  ('Bilkomponenter.no', 'bilkomponenter', 'bilkomponenter.no', '/placeholder.svg?height=80&width=80', 'https://bilkomponenter.no', 'Bildeler og tilbehør')
ON CONFLICT (slug) DO NOTHING;
