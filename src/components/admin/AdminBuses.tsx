import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bus, User, MapPin, RefreshCw } from "lucide-react";

interface BusData {
  id: string;
  bus_number: string;
  status: string | null;
  capacity: number | null;
  route_id: string | null;
  driver_id: string | null;
  supervisor_id: string | null;
  current_location: any;
  route_name?: string;
  driver_name?: string;
  supervisor_name?: string;
}

interface Supervisor {
  user_id: string;
  full_name: string;
}

interface Driver {
  user_id: string;
  full_name: string;
}

const NONE_VALUE = "__none__";

const AdminBuses = () => {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>(NONE_VALUE);
  const [selectedDriver, setSelectedDriver] = useState<string>(NONE_VALUE);
  const [updating, setUpdating] = useState(false);
  const [assignType, setAssignType] = useState<"supervisor" | "driver">("supervisor");

  useEffect(() => {
    fetchData();

    // Real-time subscription for bus updates
    const channel = supabase
      .channel("buses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "buses" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch buses, supervisors, and drivers (users with driver role)
      const [busesRes, supervisorsRes, driversRes] = await Promise.all([
        supabase.from("buses").select("*").order("created_at", { ascending: false }),
        supabase.rpc("get_available_supervisors"),
        // Get all users with driver role
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "driver"),
      ]);

      if (busesRes.error) throw busesRes.error;

      // Fetch driver profiles
      let driversList: Driver[] = [];
      if (driversRes.data && driversRes.data.length > 0) {
        const driverIds = driversRes.data.map(d => d.user_id);
        const { data: driverProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", driverIds);
        driversList = (driverProfiles || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name
        }));
      }

      // Enrich buses with names
      const enriched = await Promise.all(
        (busesRes.data || []).map(async (bus) => {
          let route_name, driver_name, supervisor_name;

          if (bus.route_id) {
            const { data: route } = await supabase
              .from("routes")
              .select("name")
              .eq("id", bus.route_id)
              .single();
            route_name = route?.name;
          }

          if (bus.driver_id) {
            const { data: driver } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", bus.driver_id)
              .single();
            driver_name = driver?.full_name;
          }

          if (bus.supervisor_id) {
            const { data: supervisor } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", bus.supervisor_id)
              .single();
            supervisor_name = supervisor?.full_name;
          }

          return { ...bus, route_name, driver_name, supervisor_name };
        })
      );

      setBuses(enriched);
      setSupervisors(supervisorsRes.data || []);
      setDrivers(driversList);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load buses");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSupervisor = async () => {
    if (!selectedBus) return;
    setUpdating(true);

    try {
      const supervisorId = selectedSupervisor === NONE_VALUE ? null : selectedSupervisor;
      const { error } = await supabase
        .from("buses")
        .update({ supervisor_id: supervisorId })
        .eq("id", selectedBus.id);

      if (error) throw error;

      toast.success(
        supervisorId
          ? "Supervisor assigned successfully"
          : "Supervisor removed from bus"
      );
      setSelectedBus(null);
      setSelectedSupervisor(NONE_VALUE);
      fetchData();
    } catch (error) {
      console.error("Error assigning supervisor:", error);
      toast.error("Failed to assign supervisor");
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedBus) return;
    setUpdating(true);

    try {
      const driverId = selectedDriver === NONE_VALUE ? null : selectedDriver;
      const { error } = await supabase
        .from("buses")
        .update({ driver_id: driverId })
        .eq("id", selectedBus.id);

      if (error) throw error;

      toast.success(
        driverId
          ? "Driver assigned successfully"
          : "Driver removed from bus"
      );
      setSelectedBus(null);
      setSelectedDriver(NONE_VALUE);
      fetchData();
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("Failed to assign driver");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary text-primary-foreground">Active</Badge>;
      case "on-route":
        return <Badge className="bg-secondary text-secondary-foreground">On Route</Badge>;
      case "idle":
        return <Badge variant="outline">Idle</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Buses ({buses.length})</h3>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bus Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses.map((bus) => (
              <TableRow key={bus.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-primary" />
                    {bus.bus_number}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(bus.status)}</TableCell>
                <TableCell>
                  {bus.route_name ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {bus.route_name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {bus.driver_name ? (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {bus.driver_name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {bus.supervisor_name ? (
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4 text-secondary" />
                      {bus.supervisor_name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>{bus.capacity || 40}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {/* Assign Driver Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBus(bus);
                            setSelectedDriver(bus.driver_id || NONE_VALUE);
                            setAssignType("driver");
                          }}
                        >
                          Assign Driver
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Driver - {bus.bus_number}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          {bus.driver_name && (
                            <p className="text-sm text-muted-foreground">
                              Current: <span className="font-medium text-foreground">{bus.driver_name}</span>
                            </p>
                          )}
                          <Select
                            value={selectedDriver}
                            onValueChange={setSelectedDriver}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>None (Remove)</SelectItem>
                              {drivers.map((d) => (
                                <SelectItem key={d.user_id} value={d.user_id}>
                                  {d.full_name}
                                </SelectItem>
                              ))}
                              {bus.driver_id && !drivers.find(d => d.user_id === bus.driver_id) && (
                                <SelectItem value={bus.driver_id}>
                                  {bus.driver_name} (Current)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full"
                            onClick={handleAssignDriver}
                            disabled={updating}
                          >
                            {updating ? "Updating..." : "Assign Driver"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Assign Supervisor Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedBus(bus);
                            setSelectedSupervisor(bus.supervisor_id || NONE_VALUE);
                            setAssignType("supervisor");
                          }}
                        >
                          Assign Supervisor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Supervisor - {bus.bus_number}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          {bus.supervisor_name && (
                            <p className="text-sm text-muted-foreground">
                              Current: <span className="font-medium text-foreground">{bus.supervisor_name}</span>
                            </p>
                          )}
                          <Select
                            value={selectedSupervisor}
                            onValueChange={setSelectedSupervisor}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select supervisor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>None (Remove)</SelectItem>
                              {supervisors.map((s) => (
                                <SelectItem key={s.user_id} value={s.user_id}>
                                  {s.full_name}
                                </SelectItem>
                              ))}
                              {bus.supervisor_id && !supervisors.find(s => s.user_id === bus.supervisor_id) && (
                                <SelectItem value={bus.supervisor_id}>
                                  {bus.supervisor_name} (Current)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full"
                            onClick={handleAssignSupervisor}
                            disabled={updating}
                          >
                            {updating ? "Updating..." : "Assign Supervisor"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {buses.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No buses found</p>
      )}
    </Card>
  );
};

export default AdminBuses;
