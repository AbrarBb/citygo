import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Wallet, Calendar } from "lucide-react";
import { z } from "zod";

const bookingSchema = z.object({
  seatNo: z.number().min(1).max(40),
  paymentMethod: z.enum(["rapid_card", "online"]),
});

const Book = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [route, setRoute] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("rapid_card");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRoute();
    fetchProfile();
    fetchBookedSeats();
  }, [user, routeId]);

  const fetchRoute = async () => {
    try {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single();

      if (error) throw error;
      setRoute(data);
    } catch (error) {
      console.error("Error fetching route:", error);
      toast({
        title: "Error",
        description: "Failed to load route details",
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchBookedSeats = async () => {
    try {
      // Get today's date for filtering bookings
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("bookings")
        .select("seat_no")
        .eq("route_id", routeId)
        .eq("booking_status", "confirmed")
        .gte("travel_date", today)
        .not("seat_no", "is", null);

      if (error) throw error;
      
      const seats = data?.map(b => b.seat_no as number).filter(Boolean) || [];
      setBookedSeats(seats);
    } catch (error) {
      console.error("Error fetching booked seats:", error);
    }
  };

  const calculateFare = () => {
    if (!route) return 0;
    const fare = route.base_fare + (route.distance * route.fare_per_km);
    return Math.round(fare * 100) / 100; // Round to 2 decimal places
  };

  const formatFare = (amount: number) => {
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
  };

  const calculateCO2Saved = () => {
    if (!route) return "0";
    return (route.distance * 0.15).toFixed(2);
  };

  const handleBooking = async () => {
    if (!selectedSeat || !route || !user) return;

    try {
      // Validate input
      bookingSchema.parse({
        seatNo: selectedSeat,
        paymentMethod: paymentMethod as any,
      });

      setLoading(true);
      const fare = calculateFare();
      const co2Saved = parseFloat(calculateCO2Saved());

      // Check balance if using rapid card
      if (paymentMethod === "rapid_card" && profile.card_balance < fare) {
        toast({
          title: "Insufficient balance",
          description: "Please recharge your Rapid Card",
          variant: "destructive",
        });
        return;
      }

      // Get a bus assigned to this route
      const { data: buses } = await supabase
        .from("buses")
        .select("id")
        .eq("route_id", route.id)
        .limit(1);

      if (!buses || buses.length === 0) {
        toast({
          title: "No bus available",
          description: "No bus is currently assigned to this route",
          variant: "destructive",
        });
        return;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          route_id: route.id,
          bus_id: buses[0].id,
          seat_no: selectedSeat,
          fare: fare,
          payment_method: paymentMethod,
          payment_status: "completed",
          booking_status: "confirmed",
          co2_saved: co2Saved,
          travel_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Update user profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          card_balance: paymentMethod === "rapid_card" 
            ? profile.card_balance - fare 
            : profile.card_balance,
          points: profile.points + Math.floor(route.distance * 2),
          total_co2_saved: profile.total_co2_saved + co2Saved,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: user.id,
        amount: fare,
        transaction_type: "payment",
        payment_method: paymentMethod,
        reference_id: booking.id,
        status: "completed",
        description: `Booking for ${route.name}`,
      });

      toast({
        title: "Booking confirmed!",
        description: `Your seat ${selectedSeat} is booked for ${route.name}`,
      });

      navigate("/dashboard/user");
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!route) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Book Your Seat
          </h1>
          <Button onClick={() => navigate("/routes")} variant="outline">
            Back to Routes
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 mb-6 bg-gradient-hero text-white">
            <h2 className="text-2xl font-bold mb-2">{route.name}</h2>
            <p className="text-white/80">{route.distance} km • Estimated Fare: ৳{formatFare(calculateFare())}</p>
            <p className="text-sm text-white/60 mt-2">
              CO₂ you'll save: {calculateCO2Saved()} kg
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Select Seat</h3>
              <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted border" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary" />
                  <span>Selected</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 40 }, (_, i) => i + 1).map((seat) => {
                  const isBooked = bookedSeats.includes(seat);
                  const isSelected = selectedSeat === seat;
                  
                  return (
                    <Button
                      key={seat}
                      variant={isSelected ? "default" : isBooked ? "destructive" : "outline"}
                      className={`${isSelected ? "bg-gradient-primary" : ""} ${isBooked ? "opacity-50 cursor-not-allowed bg-destructive/20 hover:bg-destructive/20" : ""}`}
                      onClick={() => !isBooked && setSelectedSeat(seat)}
                      disabled={isBooked}
                    >
                      {seat}
                    </Button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Payment Method</h3>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg mb-3">
                  <RadioGroupItem value="rapid_card" id="rapid_card" />
                  <Label htmlFor="rapid_card" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Rapid Card</p>
                      <p className="text-sm text-muted-foreground">
                        Balance: ৳{formatFare(profile?.card_balance || 0)}
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Online Payment</p>
                      <p className="text-sm text-muted-foreground">bKash / Nagad</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="mt-6 space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between">
                  <span>Seat:</span>
                  <span className="font-bold">{selectedSeat || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fare:</span>
                  <span className="font-bold">৳{formatFare(calculateFare())}</span>
                </div>
                <div className="flex justify-between text-sm text-primary">
                  <span>Points to earn:</span>
                  <span className="font-bold">+{Math.floor(route.distance * 2)}</span>
                </div>
              </div>

              <Button
                onClick={handleBooking}
                disabled={!selectedSeat || loading}
                className="w-full mt-6 bg-gradient-primary"
                size="lg"
              >
                {loading ? "Processing..." : "Confirm Booking"}
              </Button>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Book;