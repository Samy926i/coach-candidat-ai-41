-- Add LinkedIn-specific columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_public_profile_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_headline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_industry text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_summary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_connections_count integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_data jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_linked_at timestamp with time zone;

-- Create or update trigger to handle LinkedIn data on auth
CREATE OR REPLACE FUNCTION public.handle_linkedin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer set search_path = public
AS $$
BEGIN
  -- Check if this is a LinkedIn OAuth signup/signin
  IF NEW.raw_user_meta_data->>'provider' = 'linkedin_oidc' THEN
    -- Insert or update profile with LinkedIn data
    INSERT INTO public.profiles (
      user_id, 
      full_name, 
      email,
      linkedin_id,
      linkedin_public_profile_url,
      linkedin_headline,
      linkedin_location,
      linkedin_industry,
      linkedin_summary,
      linkedin_data,
      linkedin_linked_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
      NEW.email,
      NEW.raw_user_meta_data->>'sub',
      NEW.raw_user_meta_data->>'public_profile_url',
      NEW.raw_user_meta_data->>'headline',
      NEW.raw_user_meta_data->>'location',
      NEW.raw_user_meta_data->>'industry',
      NEW.raw_user_meta_data->>'summary',
      NEW.raw_user_meta_data,
      now()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      linkedin_id = EXCLUDED.linkedin_id,
      linkedin_public_profile_url = EXCLUDED.linkedin_public_profile_url,
      linkedin_headline = EXCLUDED.linkedin_headline,
      linkedin_location = EXCLUDED.linkedin_location,
      linkedin_industry = EXCLUDED.linkedin_industry,
      linkedin_summary = EXCLUDED.linkedin_summary,
      linkedin_data = EXCLUDED.linkedin_data,
      linkedin_linked_at = EXCLUDED.linkedin_linked_at,
      updated_at = now();
  ELSE
    -- Handle regular signups (email, Google, etc.)
    INSERT INTO public.profiles (
      user_id, 
      full_name, 
      email
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_linkedin_profile();

-- Also handle updates for linking accounts
CREATE OR REPLACE FUNCTION public.handle_linkedin_account_linking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer set search_path = public
AS $$
BEGIN
  -- Check if LinkedIn data was added to an existing account
  IF NEW.raw_user_meta_data ? 'linkedin_oidc' AND 
     (OLD.raw_user_meta_data IS NULL OR NOT (OLD.raw_user_meta_data ? 'linkedin_oidc')) THEN
    
    -- Update existing profile with LinkedIn data
    UPDATE public.profiles SET
      linkedin_id = NEW.raw_user_meta_data->'linkedin_oidc'->>'sub',
      linkedin_public_profile_url = NEW.raw_user_meta_data->'linkedin_oidc'->>'public_profile_url',
      linkedin_headline = NEW.raw_user_meta_data->'linkedin_oidc'->>'headline',
      linkedin_location = NEW.raw_user_meta_data->'linkedin_oidc'->>'location',
      linkedin_industry = NEW.raw_user_meta_data->'linkedin_oidc'->>'industry',
      linkedin_summary = NEW.raw_user_meta_data->'linkedin_oidc'->>'summary',
      linkedin_data = NEW.raw_user_meta_data->'linkedin_oidc',
      linkedin_linked_at = now(),
      updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_linkedin_account_linking();