import { Button } from "@/components/ui/button";
import { Home, MapPin, CreditCard, Award, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const DashboardNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: MapPin, label: "Routes", path: "/routes" },
    { icon: CreditCard, label: "Rapid Card", path: "/rapid-card" },
    { icon: Award, label: "Rewards", path: "/rewards" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="bg-card/50 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CityGo
          </h2>
          <div className="flex gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
