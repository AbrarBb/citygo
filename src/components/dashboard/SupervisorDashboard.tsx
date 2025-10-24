import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import NFCScanner from "./NFCScanner";

const SupervisorDashboard = () => {
  const [busInfo, setBusInfo] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchBusInfo();
  }, [user]);

  const fetchBusInfo = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("buses")
      .select("*, routes(name)")
      .eq("supervisor_id", user.id)
      .single();
    
    if (data) setBusInfo(data);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold mb-2">Supervisor Dashboard</h1>
        <p className="text-muted-foreground">
          {busInfo ? `Bus #${busInfo.bus_number} • ${busInfo.routes?.name || "No Route"}` : "Loading..."}
        </p>
      </motion.div>

      {busInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <NFCScanner 
            busId={busInfo.id} 
            currentLocation={busInfo.current_location}
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: "Passengers Scanned", value: "89", color: "text-primary" },
          { icon: CreditCard, label: "Total Fare", value: "৳3,245", color: "text-secondary" },
          { icon: CheckCircle, label: "Valid Cards", value: "87", color: "text-accent" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="p-6 text-center">
              <stat.icon className={`w-12 h-12 mx-auto mb-3 ${stat.color}`} />
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Recent Scans</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((scan) => (
              <div
                key={scan}
                className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
              >
                <div>
                  <p className="font-medium">Card #RC-{1000 + scan * 111}</p>
                  <p className="text-sm text-muted-foreground">Tap In • Stop {scan}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default SupervisorDashboard;