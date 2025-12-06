-- Phase 1: Add offline sync columns to nfc_logs
ALTER TABLE public.nfc_logs ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT true;
ALTER TABLE public.nfc_logs ADD COLUMN IF NOT EXISTS offline_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_nfc_logs_offline_id ON public.nfc_logs(offline_id) WHERE offline_id IS NOT NULL;

-- Phase 2: Create manual_tickets table
CREATE TABLE IF NOT EXISTS public.manual_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  supervisor_id UUID NOT NULL,
  passenger_count INTEGER DEFAULT 1,
  fare NUMERIC NOT NULL,
  ticket_type TEXT DEFAULT 'single',
  issued_at TIMESTAMPTZ DEFAULT now(),
  location JSONB,
  payment_method TEXT DEFAULT 'cash',
  offline_id TEXT UNIQUE,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on manual_tickets
ALTER TABLE public.manual_tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for manual_tickets
CREATE POLICY "Supervisors can create manual tickets"
ON public.manual_tickets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view own tickets"
ON public.manual_tickets FOR SELECT
USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can update own tickets"
ON public.manual_tickets FOR UPDATE
USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'));

-- Phase 3: Create supervisor_reports table
CREATE TABLE IF NOT EXISTS public.supervisor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  report_date DATE NOT NULL,
  total_tap_ins INTEGER DEFAULT 0,
  total_tap_outs INTEGER DEFAULT 0,
  total_manual_tickets INTEGER DEFAULT 0,
  total_fare_collected NUMERIC DEFAULT 0,
  total_distance_km NUMERIC DEFAULT 0,
  total_co2_saved NUMERIC DEFAULT 0,
  passenger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supervisor_id, bus_id, report_date)
);

-- Enable RLS on supervisor_reports
ALTER TABLE public.supervisor_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for supervisor_reports
CREATE POLICY "Supervisors can view own reports"
ON public.supervisor_reports FOR SELECT
USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create reports"
ON public.supervisor_reports FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all reports"
ON public.supervisor_reports FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Phase 4: Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.nfc_logs;

-- Phase 5: Add RLS policy for supervisors to view nfc_logs they created
CREATE POLICY "Supervisors can view logs they created"
ON public.nfc_logs FOR SELECT
USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'));