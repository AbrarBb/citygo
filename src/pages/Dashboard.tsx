import { useParams } from "react-router-dom";
import UserDashboard from "@/components/dashboard/UserDashboard";
import DriverDashboard from "@/components/dashboard/DriverDashboard";
import SupervisorDashboard from "@/components/dashboard/SupervisorDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { role } = useParams();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/auth");
  };

  const renderDashboard = () => {
    switch (role) {
      case "user":
        return <UserDashboard />;
      case "driver":
        return <DriverDashboard />;
      case "supervisor":
        return <SupervisorDashboard />;
      case "admin":
        return <AdminDashboard />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CityGo
          </h1>
          <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {renderDashboard()}
      </main>
    </div>
  );
};

export default Dashboard;