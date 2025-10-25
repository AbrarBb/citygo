import { Card } from "@/components/ui/card";
import { Clock, Navigation, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface ETADisplayProps {
  eta: string;
  distance: number;
  busNumber: string;
  status?: "on_time" | "delayed" | "early";
}

const ETADisplay = ({ eta, distance, busNumber, status = "on_time" }: ETADisplayProps) => {
  const statusColors = {
    on_time: "text-primary",
    delayed: "text-destructive",
    early: "text-accent",
  };

  const statusLabels = {
    on_time: "On Time",
    delayed: "Delayed",
    early: "Early",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 bg-gradient-card backdrop-blur-sm border-primary/20 shadow-glow">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Bus #{busNumber}</h3>
            <span className={`text-sm font-medium ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ETA</p>
                <p className="text-xl font-bold">{eta}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-accent/20 p-3 rounded-lg">
                <Navigation className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-xl font-bold">{distance.toFixed(1)} km</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <TrendingUp className="w-4 h-4" />
            <span>Live tracking active</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ETADisplay;
