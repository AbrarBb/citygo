import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Bus, Users, DollarSign, Leaf, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminBusMap from "@/components/admin/AdminBusMap";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBuses: 0,
    totalRevenue: 0,
    totalCO2Saved: 0,
  });
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersData, busesData, transactionsData, profilesData, routesData] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("buses").select("*").eq("status", "active"),
          supabase.from("transactions").select("amount"),
          supabase.from("profiles").select("total_co2_saved"),
          supabase.from("routes").select("id, name, active").limit(4),
        ]);

      const totalUsers = usersData.count || 0;
      const activeBuses = busesData.data?.length || 0;
      const totalRevenue =
        transactionsData.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalCO2Saved =
        profilesData.data?.reduce((sum, p) => sum + Number(p.total_co2_saved), 0) || 0;

      setStats({
        totalUsers,
        activeBuses,
        totalRevenue,
        totalCO2Saved,
      });

      setRoutes(routesData.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsDisplay = [
    {
      icon: Users,
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      color: "text-primary",
    },
    {
      icon: Bus,
      label: "Active Buses",
      value: stats.activeBuses.toString(),
      color: "text-secondary",
    },
    {
      icon: DollarSign,
      label: "Total Revenue",
      value: `৳${(stats.totalRevenue / 1000).toFixed(1)}K`,
      color: "text-accent",
    },
    {
      icon: Leaf,
      label: "CO₂ Saved (Total)",
      value: `${(stats.totalCO2Saved / 1000).toFixed(1)} tons`,
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
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">System Overview & Analytics</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsDisplay.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 bg-gradient-card backdrop-blur-sm border-primary/20 shadow-card hover:shadow-glow transition-shadow">
                  <stat.icon className={`w-10 h-10 ${stat.color} mb-4`} />
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
            <h3 className="text-xl font-bold mb-4">Routes</h3>
            <div className="space-y-3">
              {routes.length > 0 ? (
                routes.map((route) => (
                  <div
                    key={route.id}
                    className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{route.name}</p>
                      <p className="text-sm text-muted-foreground">Route ID: {route.id.slice(0, 8)}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        route.active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {route.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No routes available</p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">System Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">Total Users</p>
                <p className="font-medium">{stats.totalUsers}</p>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">Active Buses</p>
                <p className="font-medium">{stats.activeBuses}</p>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">Total Revenue</p>
                <p className="font-medium">৳{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">CO₂ Saved</p>
                <p className="font-medium">{stats.totalCO2Saved.toFixed(2)} kg</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
        </>
      )}

      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <AdminBusMap />
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;