const AIR_QUALITY_API_KEY = "AIzaSyBGSuh-s9YwRAgNYvgN9-AEDvxKgIIC7rs";
const AIR_QUALITY_BASE_URL = "https://airquality.googleapis.com/v1";

export interface AirQualityData {
  aqi: number;
  category: string;
  dominantPollutant: string;
  healthRecommendations: string;
}

export interface CO2SavingsData {
  totalCO2Saved: number;
  equivalentTrees: number;
  equivalentCarKm: number;
  airQualityImprovement: string;
}

/**
 * Fetch current air quality data for a specific location
 */
export const fetchAirQuality = async (
  lat: number,
  lng: number
): Promise<AirQualityData | null> => {
  try {
    const response = await fetch(
      `${AIR_QUALITY_BASE_URL}/currentConditions:lookup?key=${AIR_QUALITY_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: {
            latitude: lat,
            longitude: lng,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Air Quality API error:", response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Extract AQI data
    const aqi = data.indexes?.[0]?.aqi || 0;
    const category = data.indexes?.[0]?.category || "Unknown";
    const dominantPollutant = data.indexes?.[0]?.dominantPollutant || "N/A";
    
    // Health recommendations
    const healthRecommendations = 
      category === "Good" ? "Air quality is satisfactory, and air pollution poses little or no risk."
      : category === "Moderate" ? "Air quality is acceptable. However, there may be a risk for some people."
      : "Air quality is unhealthy. Everyone may begin to experience health effects.";

    return {
      aqi,
      category,
      dominantPollutant,
      healthRecommendations,
    };
  } catch (error) {
    console.error("Error fetching air quality:", error);
    return null;
  }
};

/**
 * Calculate CO2 savings based on trips
 * Bus emits ~0.089 kg CO2 per passenger-km
 * Car emits ~0.192 kg CO2 per km
 * CO2 saved = (car emissions - bus emissions) * distance
 */
export const calculateCO2Savings = (
  distanceKm: number,
  numberOfTrips: number = 1
): CO2SavingsData => {
  const CAR_CO2_PER_KM = 0.192; // kg
  const BUS_CO2_PER_KM = 0.089; // kg
  const CO2_SAVED_PER_KM = CAR_CO2_PER_KM - BUS_CO2_PER_KM;
  
  const totalCO2Saved = distanceKm * numberOfTrips * CO2_SAVED_PER_KM;
  
  // 1 tree absorbs ~21 kg CO2 per year
  const equivalentTrees = totalCO2Saved / 21;
  
  // Equivalent car kilometers avoided
  const equivalentCarKm = distanceKm * numberOfTrips;
  
  // Air quality improvement message
  const airQualityImprovement = 
    totalCO2Saved > 100 
      ? "Significant positive impact on air quality"
      : totalCO2Saved > 50
      ? "Moderate positive impact on air quality"
      : "Small but meaningful contribution to cleaner air";

  return {
    totalCO2Saved,
    equivalentTrees,
    equivalentCarKm,
    airQualityImprovement,
  };
};

/**
 * Get air quality for common Dhaka locations
 */
export const getDhakaAirQuality = async (): Promise<AirQualityData | null> => {
  // Dhaka center coordinates
  return fetchAirQuality(23.8103, 90.4125);
};
