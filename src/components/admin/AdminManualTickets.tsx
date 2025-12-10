import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Ticket, User, MapPin, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ManualTicket {
  id: string;
  bus_id: string;
  supervisor_id: string;
  passenger_count: number | null;
  fare: number;
  issued_at: string | null;
  location: any;
  ticket_type: string | null;
  payment_method: string | null;
  bus_number?: string;
  supervisor_name?: string;
}

interface Bus {
  id: string;
  bus_number: string;
}

const AdminManualTickets = () => {
  const [tickets, setTickets] = useState<ManualTicket[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedBus, setSelectedBus] = useState<string>("all");

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    const { data } = await supabase.from("buses").select("id, bus_number");
    setBuses(data || []);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("manual_tickets")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(500);

      if (dateFrom) query = query.gte("issued_at", dateFrom);
      if (dateTo) query = query.lte("issued_at", dateTo + "T23:59:59");
      if (selectedBus && selectedBus !== "all") query = query.eq("bus_id", selectedBus);

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with names
      const enriched = await Promise.all(
        (data || []).map(async (ticket) => {
          const bus = buses.find((b) => b.id === ticket.bus_id);
          const { data: supervisor } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", ticket.supervisor_id)
            .single();

          return {
            ...ticket,
            bus_number: bus?.bus_number,
            supervisor_name: supervisor?.full_name,
          };
        })
      );

      setTickets(enriched);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load manual tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buses.length > 0) {
      fetchTickets();
    }
  }, [dateFrom, dateTo, selectedBus, buses]);

  const filtered = tickets.filter(
    (t) =>
      t.supervisor_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.bus_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getPaymentBadge = (method: string | null) => {
    switch (method) {
      case "cash":
        return <Badge variant="outline">Cash</Badge>;
      case "mobile":
        return <Badge className="bg-secondary text-secondary-foreground">Mobile</Badge>;
      default:
        return <Badge variant="secondary">{method || "Unknown"}</Badge>;
    }
  };

  const totalFare = filtered.reduce((sum, t) => sum + t.fare, 0);
  const totalPassengers = filtered.reduce((sum, t) => sum + (t.passenger_count || 1), 0);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Manual Tickets ({filtered.length})</h3>
          <Button variant="outline" size="sm" onClick={fetchTickets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by supervisor..."
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
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
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

        {/* Summary stats */}
        <div className="flex gap-4">
          <div className="bg-muted/30 rounded-lg px-4 py-2">
            <p className="text-sm text-muted-foreground">Total Passengers</p>
            <p className="text-xl font-bold">{totalPassengers}</p>
          </div>
          <div className="bg-muted/30 rounded-lg px-4 py-2">
            <p className="text-sm text-muted-foreground">Total Fare</p>
            <p className="text-xl font-bold text-primary">৳{totalFare.toFixed(2)}</p>
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
                <TableHead>Ticket ID</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Passengers</TableHead>
                <TableHead>Fare</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Issued At</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      {ticket.id.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell>{ticket.bus_number || ticket.bus_id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {ticket.supervisor_name || "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell>{ticket.passenger_count || 1}</TableCell>
                  <TableCell className="font-medium">৳{ticket.fare.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{ticket.ticket_type || "single"}</TableCell>
                  <TableCell>{getPaymentBadge(ticket.payment_method)}</TableCell>
                  <TableCell>
                    {ticket.issued_at
                      ? format(new Date(ticket.issued_at), "MMM d, HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {ticket.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {ticket.location.lat?.toFixed(4)}, {ticket.location.lng?.toFixed(4)}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No manual tickets found</p>
      )}
    </Card>
  );
};

export default AdminManualTickets;
