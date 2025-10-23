import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, History } from "lucide-react";
import { z } from "zod";

const rechargeSchema = z.object({
  amount: z.number().min(50, "Minimum recharge amount is ৳50").max(10000, "Maximum recharge amount is ৳10,000"),
});

const RapidCard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
    fetchTransactions();
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

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleRecharge = async () => {
    try {
      const amount = parseFloat(rechargeAmount);
      
      // Validate input
      rechargeSchema.parse({ amount });

      setLoading(true);

      // Update card balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          card_balance: profile.card_balance + amount,
        })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: user?.id,
        amount: amount,
        transaction_type: "recharge",
        payment_method: "online",
        status: "completed",
        description: "Rapid Card recharge",
      });

      toast({
        title: "Recharge successful!",
        description: `৳${amount} added to your Rapid Card`,
      });

      setRechargeAmount("");
      fetchProfile();
      fetchTransactions();
    } catch (error: any) {
      console.error("Recharge error:", error);
      toast({
        title: "Recharge failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Rapid Card
          </h1>
          <Button onClick={() => navigate("/dashboard/user")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-8 bg-gradient-hero text-white shadow-glow">
            <div className="flex items-center justify-between mb-6">
              <CreditCard className="w-12 h-12" />
              <span className="text-sm opacity-80">Active</span>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">Card ID</p>
              <p className="text-lg font-mono mb-6">{profile?.card_id}</p>
              <p className="text-sm opacity-80 mb-1">Available Balance</p>
              <p className="text-4xl font-bold">৳{profile?.card_balance?.toFixed(2) || "0.00"}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Recharge Card
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (৳)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  min="50"
                  max="10000"
                />
                <p className="text-sm text-muted-foreground">
                  Minimum: ৳50 • Maximum: ৳10,000
                </p>
              </div>
              <div className="flex gap-2">
                {[100, 500, 1000, 2000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setRechargeAmount(amount.toString())}
                    size="sm"
                  >
                    ৳{amount}
                  </Button>
                ))}
              </div>
              <Button
                onClick={handleRecharge}
                disabled={!rechargeAmount || loading}
                className="w-full bg-gradient-primary"
                size="lg"
              >
                {loading ? "Processing..." : "Recharge Now"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Transaction History
            </h3>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              ) : (
                transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium capitalize">{txn.transaction_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        txn.transaction_type === "recharge" 
                          ? "text-primary" 
                          : "text-foreground"
                      }`}>
                        {txn.transaction_type === "recharge" ? "+" : "-"}৳{txn.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">{txn.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default RapidCard;