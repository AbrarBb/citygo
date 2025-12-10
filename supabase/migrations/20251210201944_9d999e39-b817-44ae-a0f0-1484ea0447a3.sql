-- Create function to get available supervisors (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_available_supervisors()
RETURNS TABLE (
  user_id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM profiles p
  INNER JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE ur.role = 'supervisor'
  AND p.user_id NOT IN (
    SELECT b.supervisor_id FROM buses b 
    WHERE b.supervisor_id IS NOT NULL 
    AND b.status = 'active'
  )
$$;