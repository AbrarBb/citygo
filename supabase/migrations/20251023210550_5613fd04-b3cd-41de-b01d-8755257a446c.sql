-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'driver', 'supervisor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  points INTEGER DEFAULT 0,
  total_co2_saved DECIMAL(10, 2) DEFAULT 0,
  card_balance DECIMAL(10, 2) DEFAULT 0,
  card_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stops JSONB NOT NULL,
  distance DECIMAL(10, 2) NOT NULL,
  start_time TIME,
  end_time TIME,
  base_fare DECIMAL(10, 2) DEFAULT 20.00,
  fare_per_km DECIMAL(10, 2) DEFAULT 1.50,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create buses table
CREATE TABLE public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_number TEXT NOT NULL UNIQUE,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 40,
  status TEXT DEFAULT 'idle',
  current_location JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  seat_no INTEGER,
  fare DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('rapid_card', 'online', 'cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  booking_status TEXT DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed')),
  co2_saved DECIMAL(10, 2) DEFAULT 0,
  booking_date TIMESTAMPTZ DEFAULT now(),
  travel_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('recharge', 'payment', 'refund', 'reward')),
  payment_method TEXT,
  reference_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create nfc_logs table
CREATE TABLE public.nfc_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tap_in_time TIMESTAMPTZ,
  tap_in_location JSONB,
  tap_out_time TIMESTAMPTZ,
  tap_out_location JSONB,
  fare DECIMAL(10, 2),
  distance DECIMAL(10, 2),
  co2_saved DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create reward_redemptions table
CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'redeemed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles RLS policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Routes RLS policies  
CREATE POLICY "Anyone can view active routes"
  ON public.routes FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage routes"
  ON public.routes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Buses RLS policies
CREATE POLICY "Anyone can view buses"
  ON public.buses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can update assigned buses"
  ON public.buses FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins can manage all buses"
  ON public.buses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Bookings RLS policies
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Transactions RLS policies
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- NFC logs RLS policies
CREATE POLICY "Users can view own nfc logs"
  ON public.nfc_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can create nfc logs"
  ON public.nfc_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can update nfc logs"
  ON public.nfc_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = supervisor_id OR public.has_role(auth.uid(), 'admin'));

-- Rewards RLS policies
CREATE POLICY "Anyone can view active rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage rewards"
  ON public.rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reward redemptions RLS policies
CREATE POLICY "Users can view own redemptions"
  ON public.reward_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON public.reward_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all redemptions"
  ON public.reward_redemptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buses_updated_at
  BEFORE UPDATE ON public.buses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, full_name, card_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'RC-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample routes
INSERT INTO public.routes (name, stops, distance, base_fare, fare_per_km) VALUES
  ('Route 12A', '["Mirpur", "Agargaon", "Farmgate", "Shahbagh", "Motijheel"]'::jsonb, 15.5, 20.00, 1.50),
  ('Route 15B', '["Uttara", "Mohakhali", "Gulshan", "Badda", "Rampura"]'::jsonb, 18.2, 20.00, 1.50),
  ('Route 22C', '["Gazipur", "Tongi", "Abdullahpur", "Airport", "Banani"]'::jsonb, 22.0, 25.00, 1.50),
  ('Route 8D', '["Dhanmondi", "Science Lab", "Shahbagh", "Press Club", "Gulistan"]'::jsonb, 8.5, 15.00, 1.50);

-- Insert sample rewards
INSERT INTO public.rewards (name, description, points_required, category) VALUES
  ('Free Coffee', 'Get a free coffee from our partner cafes', 500, 'food'),
  ('20% Off Next Ride', 'Get 20% discount on your next bus ride', 1000, 'travel'),
  ('Monthly Pass', 'Unlimited rides for 30 days', 3000, 'travel'),
  ('Eco Badge', 'Special eco-warrior digital badge', 2000, 'achievement');