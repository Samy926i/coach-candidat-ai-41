-- Insert profile for existing user (if not exists)
INSERT INTO public.profiles (user_id, full_name, email)
SELECT 
  '4a73194b-6cb8-4d34-9579-2973912888ca',
  'Rémi Al Ajroudi',
  'remiajroudi@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = '4a73194b-6cb8-4d34-9579-2973912888ca'
);