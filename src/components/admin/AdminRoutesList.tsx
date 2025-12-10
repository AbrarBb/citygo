import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, RefreshCw, Edit, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Route {
  id: string;
  name: string;
  stops: any;
  distance: number;
  base_fare: number | null;
  fare_per_km: number | null;
  start_time: string | null;
  end_time: string | null;
  active: boolean | null;
}

const AdminRoutesList = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    base_fare: "",
    fare_per_km: "",
    start_time: "",
    end_time: "",
    active: true,
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (route: Route) => {
    setEditingRoute(route);
    setEditForm({
      name: route.name,
      base_fare: route.base_fare?.toString() || "20",
      fare_per_km: route.fare_per_km?.toString() || "1.5",
      start_time: route.start_time || "",
      end_time: route.end_time || "",
      active: route.active ?? true,
    });
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("routes")
        .update({
          name: editForm.name,
          base_fare: parseFloat(editForm.base_fare),
          fare_per_km: parseFloat(editForm.fare_per_km),
          start_time: editForm.start_time || null,
          end_time: editForm.end_time || null,
          active: editForm.active,
        })
        .eq("id", editingRoute.id);

      if (error) throw error;

      toast.success("Route updated successfully");
      setEditingRoute(null);
      fetchRoutes();
    } catch (error) {
      console.error("Error updating route:", error);
      toast.error("Failed to update route");
    } finally {
      setUpdating(false);
    }
  };

  const getStopsCount = (stops: any) => {
    if (Array.isArray(stops)) return stops.length;
    return 0;
  };

  const filtered = routes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Routes ({routes.length})</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRoutes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/admin/routes")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Route
            </Button>
          </div>
        </div>

        <div className="relative w-64">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
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
                <TableHead>Name</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Base Fare</TableHead>
                <TableHead>Fare/km</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {route.name}
                    </div>
                  </TableCell>
                  <TableCell>{getStopsCount(route.stops)} stops</TableCell>
                  <TableCell>{route.distance.toFixed(2)} km</TableCell>
                  <TableCell>৳{route.base_fare || 20}</TableCell>
                  <TableCell>৳{route.fare_per_km || 1.5}/km</TableCell>
                  <TableCell className="text-sm">
                    {route.start_time && route.end_time
                      ? `${route.start_time} - ${route.end_time}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {route.active ? (
                      <Badge className="bg-primary text-primary-foreground">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(route)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Route</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Route Name</Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Base Fare (৳)</Label>
                              <Input
                                type="number"
                                value={editForm.base_fare}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, base_fare: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>Fare per km (৳)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={editForm.fare_per_km}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, fare_per_km: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Start Time</Label>
                              <Input
                                type="time"
                                value={editForm.start_time}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, start_time: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label>End Time</Label>
                              <Input
                                type="time"
                                value={editForm.end_time}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, end_time: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editForm.active}
                              onCheckedChange={(checked) =>
                                setEditForm({ ...editForm, active: checked })
                              }
                            />
                            <Label>Active</Label>
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleUpdateRoute}
                            disabled={updating}
                          >
                            {updating ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No routes found</p>
      )}
    </Card>
  );
};

export default AdminRoutesList;
