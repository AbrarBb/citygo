import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CreditCard, MapPin, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface NFCLog {
  id: string;
  card_id: string;
  bus_id: string;
  user_id: string | null;
  tap_in_time: string | null;
  tap_out_time: string | null;
  tap_in_location: any;
  tap_out_location: any;
  fare: number | null;
  distance: number | null;
  co2_saved: number | null;
  bus_number?: string;
}

interface Bus {
  id: string;
  bus_number: string;
}

const AdminNFCLogs = () => {
  const [logs, setLogs] = useState<NFCLog[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedBus, setSelectedBus] = useState<string>("all");

  useEffect(() => {
    fetchBuses();
    fetchLogs();
  }, []);

  const fetchBuses = async () => {
    const { data } = await supabase.from("buses").select("id, bus_number");
    setBuses(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("nfc_logs")
        .select("*")
        .order("tap_in_time", { ascending: false })
        .limit(500);

      if (dateFrom) query = query.gte("tap_in_time", dateFrom);
      if (dateTo) query = query.lte("tap_in_time", dateTo + "T23:59:59");
      if (selectedBus && selectedBus !== "all") query = query.eq("bus_id", selectedBus);

      const { data, error } = await query;
      if (error) throw error;

      // Get bus numbers
      const enriched = (data || []).map((log) => {
        const bus = buses.find((b) => b.id === log.bus_id);
        return { ...log, bus_number: bus?.bus_number };
      });

      setLogs(enriched);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load NFC logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buses.length > 0) {
      fetchLogs();
    }
  }, [dateFrom, dateTo, selectedBus, buses]);

  const filtered = logs.filter(
    (log) =>
      log.card_id.toLowerCase().includes(search.toLowerCase()) ||
      log.bus_number?.toLowerCase().includes(search.toLowerCase())
  );

  const formatLocation = (loc: any) => {
    if (!loc) return "-";
    if (loc.lat && loc.lng) return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    return "-";
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">NFC Logs ({filtered.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by card ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
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
          <Select value={selectedBus} onValueChange={setSelectedBus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Buses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buses</SelectItem>
              {buses.map((bus) => (
                <SelectItem key={bus.id} value={bus.id}>
                  {bus.bus_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead>Card ID</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Tap In</TableHead>
                <TableHead>Tap Out</TableHead>
                <TableHead>Location (In)</TableHead>
                <TableHead>Location (Out)</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>CO₂ Saved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      {log.card_id}
                    </div>
                  </TableCell>
                  <TableCell>{log.bus_number || log.bus_id.slice(0, 8)}</TableCell>
                  <TableCell>
                    {log.tap_in_time ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(log.tap_in_time), "MMM d, HH:mm")}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {log.tap_out_time ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(log.tap_out_time), "MMM d, HH:mm")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">In progress</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {formatLocation(log.tap_in_location)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {formatLocation(log.tap_out_location)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.fare ? `৳${log.fare.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    {log.distance ? `${log.distance.toFixed(2)} km` : "-"}
                  </TableCell>
                  <TableCell>
                    {log.co2_saved ? `${log.co2_saved.toFixed(2)} kg` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No NFC logs found</p>
      )}
    </Card>
  );
};

export default AdminNFCLogs;
