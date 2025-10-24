import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Scan, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NFCScannerProps {
  busId: string;
  currentLocation: { lat: number; lng: number } | null;
}

const NFCScanner = ({ busId, currentLocation }: NFCScannerProps) => {
  const [cardId, setCardId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{
    type: "tap-in" | "tap-out";
    time: string;
    cardId: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleTapIn = async () => {
    if (!cardId.trim() || !currentLocation) return;

    setScanning(true);
    try {
      // Get user by card_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, card_balance")
        .eq("card_id", cardId)
        .single();

      if (!profile) {
        toast({
          title: "Card Not Found",
          description: "This Rapid Card is not registered",
          variant: "destructive",
        });
        return;
      }

      // Create NFC log for tap-in
      const { error } = await supabase.from("nfc_logs").insert({
        card_id: cardId,
        bus_id: busId,
        supervisor_id: user?.id,
        user_id: profile.user_id,
        tap_in_time: new Date().toISOString(),
        tap_in_location: currentLocation,
      });

      if (error) throw error;

      setLastScan({
        type: "tap-in",
        time: new Date().toLocaleTimeString(),
        cardId,
      });

      toast({
        title: "Tap In Successful",
        description: `Card ${cardId} - Journey started`,
      });

      setCardId("");
    } catch (error) {
      console.error("Tap in error:", error);
      toast({
        title: "Error",
        description: "Failed to process tap in",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleTapOut = async () => {
    if (!cardId.trim() || !currentLocation) return;

    setScanning(true);
    try {
      // Find the latest tap-in log for this card
      const { data: tapInLog } = await supabase
        .from("nfc_logs")
        .select("*")
        .eq("card_id", cardId)
        .is("tap_out_time", null)
        .order("tap_in_time", { ascending: false })
        .limit(1)
        .single();

      if (!tapInLog) {
        toast({
          title: "No Active Journey",
          description: "Please tap in first",
          variant: "destructive",
        });
        return;
      }

      // Calculate distance (simplified - should use actual route calculation)
      const tapInLoc = tapInLog.tap_in_location as any;
      const distance = calculateDistance(
        tapInLoc.lat,
        tapInLoc.lng,
        currentLocation.lat,
        currentLocation.lng
      );

      // Calculate fare
      const baseFare = 20;
      const farePerKm = 1.5;
      const fare = baseFare + distance * farePerKm;
      const co2Saved = distance * 0.12; // 120g CO2 per km saved

      // Update NFC log with tap-out
      const { error: updateError } = await supabase
        .from("nfc_logs")
        .update({
          tap_out_time: new Date().toISOString(),
          tap_out_location: currentLocation,
          fare,
          distance,
          co2_saved: co2Saved,
        })
        .eq("id", tapInLog.id);

      if (updateError) throw updateError;

      // Deduct fare from card balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("card_balance, points, total_co2_saved")
        .eq("user_id", tapInLog.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            card_balance: (profile.card_balance || 0) - fare,
            points: (profile.points || 0) + Math.floor(distance * 10),
            total_co2_saved: (profile.total_co2_saved || 0) + co2Saved,
          })
          .eq("user_id", tapInLog.user_id);
      }

      setLastScan({
        type: "tap-out",
        time: new Date().toLocaleTimeString(),
        cardId,
      });

      toast({
        title: "Tap Out Successful",
        description: `Fare: ৳${fare.toFixed(2)} | Distance: ${distance.toFixed(1)}km`,
      });

      setCardId("");
    } catch (error) {
      console.error("Tap out error:", error);
      toast({
        title: "Error",
        description: "Failed to process tap out",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Scan className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">NFC Scanner</h3>
      </div>

      <Input
        placeholder="Scan or enter Card ID (e.g., RC-12345678)"
        value={cardId}
        onChange={(e) => setCardId(e.target.value)}
        disabled={scanning}
      />

      <div className="flex gap-3">
        <Button
          onClick={handleTapIn}
          disabled={!cardId || scanning || !currentLocation}
          className="flex-1"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Tap In
        </Button>
        <Button
          onClick={handleTapOut}
          disabled={!cardId || scanning || !currentLocation}
          variant="outline"
          className="flex-1"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Tap Out
        </Button>
      </div>

      {lastScan && (
        <div className="text-sm text-muted-foreground border-t pt-3">
          Last scan: <span className="font-medium">{lastScan.type}</span> at{" "}
          {lastScan.time} - Card {lastScan.cardId}
        </div>
      )}

      {!currentLocation && (
        <p className="text-sm text-destructive">
          GPS location required for NFC scanning
        </p>
      )}
    </Card>
  );
};

export default NFCScanner;
