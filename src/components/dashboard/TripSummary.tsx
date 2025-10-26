import { Card } from "@/components/ui/card";
import { Clock, MapPin, Users, Navigation } from "lucide-react";
import { format } from "date-fns";

interface TripSummaryProps {
  trip: {
    start_time: string;
    end_time?: string;
    distance_km: number;
    passengers_count: number;
    status: string;
    start_location?: { lat: number; lng: number };
    end_location?: { lat: number; lng: number };
  };
}

const TripSummary = ({ trip }: TripSummaryProps) => {
  const duration = trip.end_time
    ? Math.round((new Date(trip.end_time).getTime() - new Date(trip.start_time).getTime()) / 60000)
    : Math.round((Date.now() - new Date(trip.start_time).getTime()) / 60000);

  return (
    <Card className="p-6 bg-gradient-subtle">
      <h3 className="text-lg font-semibold mb-4">
        {trip.status === "completed" ? "Trip Summary" : "Current Trip"}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-semibold">{duration} min</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-primary mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Distance</p>
            <p className="font-semibold">{Number(trip.distance_km).toFixed(1)} km</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-primary mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Passengers</p>
            <p className="font-semibold">{trip.passengers_count}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary mt-1" />
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold capitalize">{trip.status}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Start Time</p>
          <p className="font-medium">{format(new Date(trip.start_time), "PPp")}</p>
        </div>
        {trip.end_time && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">End Time</p>
            <p className="font-medium">{format(new Date(trip.end_time), "PPp")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TripSummary;
