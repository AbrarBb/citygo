import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, User, Bus, RefreshCw, Leaf, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: string;
  supervisor_id: string;
  bus_id: string;
  report_date: string;
  total_tap_ins: number | null;
  total_tap_outs: number | null;
  total_manual_tickets: number | null;
  total_fare_collected: number | null;
  total_distance_km: number | null;
  total_co2_saved: number | null;
  passenger_count: number | null;
  bus_number?: string;
  supervisor_name?: string;
}

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("supervisor_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(100);

      if (dateFrom) query = query.gte("report_date", dateFrom);
      if (dateTo) query = query.lte("report_date", dateTo);

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with names
      const enriched = await Promise.all(
        (data || []).map(async (report) => {
          const [busRes, supervisorRes] = await Promise.all([
            supabase.from("buses").select("bus_number").eq("id", report.bus_id).single(),
            supabase.from("profiles").select("full_name").eq("user_id", report.supervisor_id).single(),
          ]);

          return {
            ...report,
            bus_number: busRes.data?.bus_number,
            supervisor_name: supervisorRes.data?.full_name,
          };
        })
      );

      setReports(enriched);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const totalPassengers = reports.reduce((sum, r) => sum + (r.passenger_count || 0), 0);
  const totalFare = reports.reduce((sum, r) => sum + (r.total_fare_collected || 0), 0);
  const totalCO2 = reports.reduce((sum, r) => sum + (r.total_co2_saved || 0), 0);
  const totalDistance = reports.reduce((sum, r) => sum + (r.total_distance_km || 0), 0);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Supervisor Reports ({reports.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
            placeholder="To"
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Passengers</p>
            </div>
            <p className="text-2xl font-bold">{totalPassengers.toLocaleString()}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Fare</p>
            </div>
            <p className="text-2xl font-bold">৳{totalFare.toFixed(2)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground">CO₂ Saved</p>
            </div>
            <p className="text-2xl font-bold">{totalCO2.toFixed(2)} kg</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bus className="w-5 h-5 text-secondary" />
              <p className="text-sm text-muted-foreground">Total Distance</p>
            </div>
            <p className="text-2xl font-bold">{totalDistance.toFixed(2)} km</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Passengers</TableHead>
                <TableHead>Tap Ins</TableHead>
                <TableHead>Tap Outs</TableHead>
                <TableHead>Manual Tickets</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>CO₂ Saved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {format(new Date(report.report_date), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {report.supervisor_name || "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Bus className="w-4 h-4 text-muted-foreground" />
                      {report.bus_number || report.bus_id.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell>{report.passenger_count || 0}</TableCell>
                  <TableCell>{report.total_tap_ins || 0}</TableCell>
                  <TableCell>{report.total_tap_outs || 0}</TableCell>
                  <TableCell>{report.total_manual_tickets || 0}</TableCell>
                  <TableCell className="font-medium">
                    ৳{(report.total_fare_collected || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>{(report.total_distance_km || 0).toFixed(2)} km</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Leaf className="w-4 h-4 text-primary" />
                      {(report.total_co2_saved || 0).toFixed(2)} kg
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No reports found</p>
      )}
    </Card>
  );
};

export default AdminReports;
