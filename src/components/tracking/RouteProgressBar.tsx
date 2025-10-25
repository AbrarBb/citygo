import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MapPin, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface RouteProgressBarProps {
  currentStop: number;
  totalStops: number;
  stopsRemaining: number;
  progress: number;
  nextStop: { name: string } | null;
  isOffRoute: boolean;
  distanceToNextStop: number;
}

const RouteProgressBar = ({
  currentStop,
  totalStops,
  stopsRemaining,
  progress,
  nextStop,
  isOffRoute,
  distanceToNextStop,
}: RouteProgressBarProps) => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Route Progress</h3>
          </div>
          {isOffRoute && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-destructive text-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              Off Route
            </motion.div>
          )}
        </div>

        <Progress value={progress} className="h-2" />

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Stop {currentStop + 1} of {totalStops}
          </span>
          <span>{stopsRemaining} stops remaining</span>
        </div>

        {nextStop && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Next Stop</p>
            <p className="font-medium">{nextStop.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {distanceToNextStop > 0 && `${distanceToNextStop.toFixed(1)} km away`}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RouteProgressBar;
