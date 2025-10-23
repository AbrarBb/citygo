import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Bus, Users, DollarSign, Leaf, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const stats = [
    { icon: Users, label: "Total Users", value: "12,458", change: "+12.5%", color: "text-primary" },
    { icon: Bus, label: "Active Buses", value: "48", change: "+3", color: "text-secondary" },
    { icon: DollarSign, label: "Revenue (Month)", value: "৳8.2L", change: "+18.2%", color: "text-accent" },
    { icon: Leaf, label: "CO₂ Saved (Total)", value: "45.2T", change: "+5.8%", color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">System Overview & Analytics</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 bg-gradient-card backdrop-blur-sm border-primary/20 shadow-card hover:shadow-glow transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <stat.icon className={`w-10 h-10 ${stat.color}`} />
                <div className="flex items-center gap-1 text-sm text-primary">
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Active Routes</h3>
            <div className="space-y-3">
              {[
                { route: "Route 12A", buses: 8, status: "Active" },
                { route: "Route 15B", buses: 6, status: "Active" },
                { route: "Route 22C", buses: 5, status: "Maintenance" },
                { route: "Route 8D", buses: 7, status: "Active" },
              ].map((route) => (
                <div
                  key={route.route}
                  className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{route.route}</p>
                    <p className="text-sm text-muted-foreground">{route.buses} buses</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      route.status === "Active"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {route.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: "New user registered", time: "2 min ago" },
                { action: "Bus #BA-1234 completed route", time: "15 min ago" },
                { action: "Payment processed: ৳1,250", time: "28 min ago" },
                { action: "Driver assigned to Route 12A", time: "1 hour ago" },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                >
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;