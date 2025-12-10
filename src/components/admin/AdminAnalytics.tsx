import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Bus, DollarSign, Leaf, TrendingUp, MapPin, CreditCard, Ticket } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalPassengers: 0,
    activeBuses: 0,
    totalRevenue: 0,
    totalCO2: 0,
    totalTrips: 0,
    totalRoutes: 0,
    totalNFCTaps: 0,
    totalManualTickets: 0,
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        passengersRes,
        busesRes,
        revenueRes,
        co2Res,
        tripsRes,
        routesRes,
        nfcRes,
        ticketsRes,
        dailyNfcRes,
        dailyTicketsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("buses").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("nfc_logs").select("fare").not("fare", "is", null),
        supabase.from("profiles").select("total_co2_saved"),
        supabase.from("nfc_logs").select("*", { count: "exact", head: true }).not("tap_out_time", "is", null),
        supabase.from("routes").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("nfc_logs").select("*", { count: "exact", head: true }),
        supabase.from("manual_tickets").select("*", { count: "exact", head: true }),
        supabase.from("nfc_logs").select("tap_in_time, fare").gte("tap_in_time", thirtyDaysAgo),
        supabase.from("manual_tickets").select("issued_at, fare, payment_method").gte("issued_at", thirtyDaysAgo),
      ]);

      const totalRevenue = revenueRes.data?.reduce((sum, l) => sum + (l.fare || 0), 0) || 0;
      const totalCO2 = co2Res.data?.reduce((sum, p) => sum + (p.total_co2_saved || 0), 0) || 0;

      setStats({
        totalPassengers: passengersRes.count || 0,
        activeBuses: busesRes.count || 0,
        totalRevenue,
        totalCO2,
        totalTrips: tripsRes.count || 0,
        totalRoutes: routesRes.count || 0,
        totalNFCTaps: nfcRes.count || 0,
        totalManualTickets: ticketsRes.count || 0,
      });

      // Process daily data
      const dailyMap = new Map<string, { nfc: number; tickets: number; revenue: number }>();
      
      (dailyNfcRes.data || []).forEach((log) => {
        const date = new Date(log.tap_in_time).toISOString().split("T")[0];
        const existing = dailyMap.get(date) || { nfc: 0, tickets: 0, revenue: 0 };
        existing.nfc++;
        existing.revenue += log.fare || 0;
        dailyMap.set(date, existing);
      });

      (dailyTicketsRes.data || []).forEach((ticket) => {
        const date = new Date(ticket.issued_at).toISOString().split("T")[0];
        const existing = dailyMap.get(date) || { nfc: 0, tickets: 0, revenue: 0 };
        existing.tickets++;
        existing.revenue += ticket.fare || 0;
        dailyMap.set(date, existing);
      });

      const sortedDaily = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          nfc: data.nfc,
          tickets: data.tickets,
          revenue: data.revenue,
        }));

      setDailyData(sortedDaily);

      // Process payment method data
      const paymentMap = new Map<string, number>();
      (dailyTicketsRes.data || []).forEach((ticket) => {
        const method = ticket.payment_method || "unknown";
        paymentMap.set(method, (paymentMap.get(method) || 0) + 1);
      });
      paymentMap.set("nfc", dailyNfcRes.data?.length || 0);

      setPaymentData(
        Array.from(paymentMap.entries()).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(142, 76%, 36%)", "hsl(200, 98%, 39%)", "hsl(180, 100%, 50%)", "hsl(0, 84%, 60%)"];

  const statCards = [
    { icon: Users, label: "Total Passengers", value: stats.totalPassengers.toLocaleString(), color: "text-primary" },
    { icon: Bus, label: "Active Buses", value: stats.activeBuses.toString(), color: "text-secondary" },
    { icon: DollarSign, label: "Total Revenue", value: `৳${stats.totalRevenue.toLocaleString()}`, color: "text-primary" },
    { icon: Leaf, label: "CO₂ Saved", value: `${(stats.totalCO2 / 1000).toFixed(2)} tons`, color: "text-primary" },
    { icon: TrendingUp, label: "Completed Trips", value: stats.totalTrips.toLocaleString(), color: "text-secondary" },
    { icon: MapPin, label: "Active Routes", value: stats.totalRoutes.toString(), color: "text-primary" },
    { icon: CreditCard, label: "NFC Taps", value: stats.totalNFCTaps.toLocaleString(), color: "text-secondary" },
    { icon: Ticket, label: "Manual Tickets", value: stats.totalManualTickets.toLocaleString(), color: "text-primary" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Daily Activity (Last 14 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="nfc" name="NFC Taps" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tickets" name="Manual Tickets" fill="hsl(200, 98%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Daily Revenue (Last 14 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`৳${value.toFixed(2)}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={{ fill: "hsl(142, 76%, 36%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Payment Methods Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Environmental Impact */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Environmental Impact</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-3">
                <Leaf className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">CO₂ Saved</p>
                  <p className="text-sm text-muted-foreground">Total carbon offset</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{(stats.totalCO2 / 1000).toFixed(2)} tons</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  🌳
                </div>
                <div>
                  <p className="font-medium">Equivalent Trees</p>
                  <p className="text-sm text-muted-foreground">Trees needed to absorb same CO₂</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-secondary">{Math.floor(stats.totalCO2 / 21)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  🚗
                </div>
                <div>
                  <p className="font-medium">Car Kilometers Avoided</p>
                  <p className="text-sm text-muted-foreground">Equivalent driving distance saved</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{Math.floor(stats.totalCO2 / 0.12).toLocaleString()} km</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
