import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Nfc, Users, CreditCard, CheckCircle } from "lucide-react";
import { useState } from "react";

const SupervisorDashboard = () => {
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold mb-2">Supervisor Dashboard</h1>
        <p className="text-muted-foreground">Bus #BA-1234 • Route 12A</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-8 text-center bg-gradient-primary text-white">
          <motion.div
            animate={scanning ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Nfc className="w-24 h-24 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-4">Scan Rapid Card</h2>
          <Button
            size="lg"
            onClick={handleScan}
            disabled={scanning}
            className="bg-white text-primary hover:bg-white/90 gap-2 px-8"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                Scanning...
              </>
            ) : (
              <>
                <Nfc className="w-5 h-5" />
                Tap to Scan
              </>
            )}
          </Button>
        </Card>
      </motion.div>

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