import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, TreePine, Car, Wind } from "lucide-react";
import { fetchAirQuality, AirQualityData } from "@/services/airQuality";

interface CO2ImpactCardProps {
  totalCO2Saved: number;
  location?: { lat: number; lng: number };
}

const CO2ImpactCard = ({ totalCO2Saved, location }: CO2ImpactCardProps) => {
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAirQuality = async () => {
      if (location) {
        const data = await fetchAirQuality(location.lat, location.lng);
        setAirQuality(data);
      } else {
        // Default to Dhaka center
        const data = await fetchAirQuality(23.8103, 90.4125);
        setAirQuality(data);
      }
      setLoading(false);
    };

    loadAirQuality();
  }, [location]);

  // Calculate equivalent metrics
  const equivalentTrees = (totalCO2Saved / 21).toFixed(1);
  const equivalentCarKm = (totalCO2Saved / 0.192).toFixed(0);

  const getAQIColor = (category: string) => {
    switch (category) {
      case "Good":
        return "bg-green-500";
      case "Moderate":
        return "bg-yellow-500";
      case "Unhealthy for Sensitive Groups":
        return "bg-orange-500";
      case "Unhealthy":
        return "bg-red-500";
      case "Very Unhealthy":
        return "bg-purple-500";
      case "Hazardous":
        return "bg-maroon-500";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-500" />
          Environmental Impact
        </h3>
        {airQuality && (
          <Badge className={getAQIColor(airQuality.category)}>
            AQI: {airQuality.aqi} - {airQuality.category}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wind className="w-4 h-4" />
            <span className="text-sm">CO₂ Saved</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {totalCO2Saved.toFixed(2)} kg
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TreePine className="w-4 h-4" />
            <span className="text-sm">Trees Equivalent</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {equivalentTrees} trees/year
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="w-4 h-4" />
            <span className="text-sm">Car KM Avoided</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {equivalentCarKm} km
          </p>
        </div>
      </div>

      {airQuality && (
        <div className="bg-primary/10 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">Current Air Quality</h4>
          <p className="text-sm text-muted-foreground">
            {airQuality.healthRecommendations}
          </p>
          <p className="text-xs text-muted-foreground">
            Dominant pollutant: {airQuality.dominantPollutant}
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </Card>
  );
};

export default CO2ImpactCard;
