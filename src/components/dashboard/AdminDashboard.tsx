import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Bus, 
  MapPin, 
  CreditCard, 
  Ticket, 
  FileText,
  BarChart3,
  IdCard
} from "lucide-react";
import AdminBusMap from "@/components/admin/AdminBusMap";
import AdminPassengers from "@/components/admin/AdminPassengers";
import AdminBuses from "@/components/admin/AdminBuses";
import AdminNFCLogs from "@/components/admin/AdminNFCLogs";
import AdminManualTickets from "@/components/admin/AdminManualTickets";
import AdminReports from "@/components/admin/AdminReports";
import AdminRoutesList from "@/components/admin/AdminRoutesList";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminNFCCards from "@/components/admin/AdminNFCCards";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "passengers", label: "Passengers", icon: Users },
    { id: "nfc-cards", label: "NFC Cards", icon: IdCard },
    { id: "buses", label: "Buses", icon: Bus },
    { id: "routes", label: "Routes", icon: MapPin },
    { id: "nfc-logs", label: "NFC Logs", icon: CreditCard },
    { id: "tickets", label: "Manual Tickets", icon: Ticket },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-4"
      >
        <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground">System management & analytics</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AdminAnalytics />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AdminBusMap />
          </motion.div>
        </TabsContent>

        <TabsContent value="analytics">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminAnalytics />
          </motion.div>
        </TabsContent>

        <TabsContent value="passengers">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminPassengers />
          </motion.div>
        </TabsContent>

        <TabsContent value="nfc-cards">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminNFCCards />
          </motion.div>
        </TabsContent>

        <TabsContent value="buses">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminBuses />
          </motion.div>
        </TabsContent>

        <TabsContent value="routes">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminRoutesList />
          </motion.div>
        </TabsContent>

        <TabsContent value="nfc-logs">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminNFCLogs />
          </motion.div>
        </TabsContent>

        <TabsContent value="tickets">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminManualTickets />
          </motion.div>
        </TabsContent>

        <TabsContent value="reports">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminReports />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
