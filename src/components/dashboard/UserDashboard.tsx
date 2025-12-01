import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Leaf, Award, MapPin, CreditCard, TrendingUp, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LiveBusMap } from "./LiveBusMap";
import CO2ImpactCard from "./CO2ImpactCard";

const UserDashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBookings();
      fetchRewards();
    }
  }, [user]);

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

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, routes(name)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("active", true)
        .order("points_required", { ascending: true })
        .limit(3);

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error("Error fetching rewards:", error);
    }
  };

  const stats = [
    {
      icon: Leaf,
      title: "CO₂ Saved",
      value: `${profile?.total_co2_saved?.toFixed(2) || "0.00"} kg`,
      subtitle: `~${Math.floor((profile?.total_co2_saved || 0) / 21)} trees equivalent`,
      color: "text-primary",
    },
    {
      icon: Award,
      title: "Reward Points",
      value: profile?.points || 0,
      subtitle: "Redeem for rewards",
      color: "text-secondary",
    },
    {
      icon: Bus,
      title: "Total Trips",
      value: bookings.length,
      subtitle: "Recent bookings",
      color: "text-accent",
    },
    {
      icon: CreditCard,
      title: "Rapid Card",
      value: `৳${profile?.card_balance?.toFixed(2) || "0.00"}`,
      subtitle: profile?.card_id || "N/A",
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold mb-2">Welcome back, {profile?.full_name || "Passenger"}!</h1>
        <p className="text-muted-foreground">Your sustainable journey continues</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 bg-gradient-card backdrop-blur-sm border-primary/20 shadow-card hover:shadow-glow transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <stat.icon className={`w-10 h-10 ${stat.color}`} />
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-foreground/80 mb-1">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <CO2ImpactCard totalCO2Saved={profile?.total_co2_saved || 0} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <LiveBusMap />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-8 bg-gradient-hero text-white shadow-glow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-3">Your Impact Matters</h2>
              <p className="text-white/90 mb-4">
                You've prevented {profile?.total_co2_saved?.toFixed(2) || "0.00"} kg of CO₂ emissions. 
                That's equivalent to planting {Math.floor((profile?.total_co2_saved || 0) / 21)} trees! 
                Keep riding with CityGo to make our city greener.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => navigate("/routes")}
                >
                  Browse Routes
                </Button>
                <Button 
                  className="bg-white/20 text-white border border-white/50 hover:bg-white/30"
                  onClick={() => navigate("/rapid-card")}
                >
                  Manage Card
                </Button>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="hidden md:block"
            >
              <Leaf className="w-32 h-32 text-white/30" />
            </motion.div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Recent Trips
            </h3>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No bookings yet. Start your journey!
                </p>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{(booking.routes as any)?.name || "Route"}</p>
                      <p className="text-sm text-muted-foreground">
                        Seat {booking.seat_no} • {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">৳{booking.fare}</p>
                      <p className="text-xs text-muted-foreground">{booking.co2_saved?.toFixed(2)} kg CO₂ saved</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-secondary" />
              Available Rewards
            </h3>
            <div className="space-y-4">
              {rewards.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No rewards available
                </p>
              ) : (
                rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{reward.name}</p>
                      <p className="text-sm text-muted-foreground">{reward.points_required} points</p>
                    </div>
                    <Button
                      size="sm"
                      variant={(profile?.points || 0) >= reward.points_required ? "default" : "outline"}
                      disabled={(profile?.points || 0) < reward.points_required}
                      className={(profile?.points || 0) >= reward.points_required ? "bg-gradient-primary" : ""}
                    >
                      {(profile?.points || 0) >= reward.points_required ? "Redeem" : "Locked"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UserDashboard;