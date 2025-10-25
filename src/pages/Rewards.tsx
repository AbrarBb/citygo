import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Gift, ArrowLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  category: string;
  active: boolean;
}

interface Profile {
  points: number;
}

const Rewards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [rewardsData, profileData] = await Promise.all([
        supabase.from("rewards").select("*").eq("active", true).order("points_required"),
        supabase.from("profiles").select("points").eq("user_id", user?.id).single(),
      ]);

      if (rewardsData.error) throw rewardsData.error;
      if (profileData.error) throw profileData.error;

      setRewards(rewardsData.data || []);
      setProfile(profileData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load rewards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (!profile || profile.points < reward.points_required) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.points_required} points to redeem this reward`,
        variant: "destructive",
      });
      return;
    }

    setRedeeming(reward.id);
    try {
      // Create redemption record
      const { error: redemptionError } = await supabase
        .from("reward_redemptions")
        .insert({
          user_id: user?.id,
          reward_id: reward.id,
          points_spent: reward.points_required,
          status: "pending",
        });

      if (redemptionError) throw redemptionError;

      // Update user points
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: profile.points - reward.points_required })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      toast({
        title: "Reward Redeemed!",
        description: `${reward.name} has been redeemed successfully`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRedeeming(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      transport: "bg-primary/20 text-primary",
      shopping: "bg-accent/20 text-accent",
      food: "bg-secondary/20 text-secondary",
      entertainment: "bg-primary/20 text-primary",
    };
    return colors[category?.toLowerCase()] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold mb-2">Rewards</h1>
          <p className="text-muted-foreground">Redeem your points for amazing rewards</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-8 bg-gradient-hero text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 mb-1">Your Points</p>
                <h2 className="text-4xl font-bold">{profile?.points || 0}</h2>
              </div>
              <Star className="w-16 h-16 text-white/30" />
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward, index) => {
            const canAfford = (profile?.points || 0) >= reward.points_required;
            const isRedeeming = redeeming === reward.id;

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-6 h-full flex flex-col ${!canAfford && "opacity-60"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <Gift className="w-10 h-10 text-primary" />
                    {reward.category && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                          reward.category
                        )}`}
                      >
                        {reward.category}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-2">{reward.name}</h3>
                  <p className="text-muted-foreground mb-4 flex-grow">{reward.description}</p>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary">
                        {reward.points_required}
                      </span>
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>

                    <Button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || isRedeeming}
                      className="w-full"
                    >
                      {isRedeeming ? "Redeeming..." : canAfford ? "Redeem Now" : "Not Enough Points"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {rewards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">No rewards available at the moment</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Rewards;
