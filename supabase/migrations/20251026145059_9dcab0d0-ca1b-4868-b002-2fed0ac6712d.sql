-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function to use role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, full_name, card_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'RC-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)
  );
  
  -- Assign role from metadata, default to 'user' if not specified
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'::app_role)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically handle new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();