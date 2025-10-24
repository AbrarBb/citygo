import { Card } from "@/components/ui/card";
import MapView from "@/components/map/MapView";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { Skeleton } from "@/components/ui/skeleton";

const LiveBusMap = () => {
  const { buses, loading } = useLiveBuses();

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-[500px] w-full" />
      </Card>
    );
  }

  const activeBuses = buses
    .filter((bus) => bus.current_location?.lat && bus.current_location?.lng)
    .map((bus) => ({
      id: bus.id,
      bus_number: bus.bus_number,
      current_location: bus.current_location!,
      route_name: bus.routes?.name,
    }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Live Bus Tracking</h3>
      <div className="h-[500px]">
        <MapView buses={activeBuses} showTokenInput={true} />
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        Tracking {activeBuses.length} active {activeBuses.length === 1 ? "bus" : "buses"}
      </div>
    </Card>
  );
};

export default LiveBusMap;
