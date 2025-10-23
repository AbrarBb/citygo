import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Leaf, Award, MapPin, CreditCard, TrendingUp, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";

const UserDashboard = () => {
  const stats = [
    {
      icon: Leaf,
      title: "CO₂ Saved",
      value: "127.5 kg",
      subtitle: "~6 trees equivalent",
      color: "text-primary",
    },
    {
      icon: Award,
      title: "Reward Points",
      value: "2,450",
      subtitle: "450 pts to next reward",
      color: "text-secondary",
    },
    {
      icon: Bus,
      title: "Total Trips",
      value: "89",
      subtitle: "This month: 12",
      color: "text-accent",
    },
    {
      icon: CreditCard,
      title: "Rapid Card",
      value: "৳485.00",
      subtitle: "Active",
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
        <h1 className="text-4xl font-bold mb-2">Welcome back, Passenger!</h1>
        <p className="text-muted-foreground">Your sustainable journey continues</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 bg-gradient-card backdrop-blur-sm border-primary/20 shadow-card hover:shadow-glow transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <stat.icon className={`w-10 h-10 ${stat.color}`} />
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-foreground/80 mb-1">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-8 bg-gradient-hero text-white shadow-glow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-3">Your Impact Matters</h2>
              <p className="text-white/90 mb-4">
                You've prevented 127.5 kg of CO₂ emissions. That's equivalent to planting 6 trees! 
                Keep riding with CityGo to make our city greener.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  View Routes
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  Book Now
                </Button>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="hidden md:block"
            >
              <Leaf className="w-32 h-32 text-white/30" />
            </motion.div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Recent Trips
            </h3>
            <div className="space-y-4">
              {[1, 2, 3].map((trip) => (
                <div key={trip} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Mirpur → Motijheel</p>
                    <p className="text-sm text-muted-foreground">Route 12A • Yesterday</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">৳45.00</p>
                    <p className="text-xs text-muted-foreground">2.3 kg CO₂ saved</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-secondary" />
              Available Rewards
            </h3>
            <div className="space-y-4">
              {[
                { name: "Free Coffee", points: 500, available: true },
                { name: "20% Off Next Ride", points: 1000, available: true },
                { name: "Monthly Pass", points: 3000, available: false },
              ].map((reward) => (
                <div
                  key={reward.name}
                  className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{reward.name}</p>
                    <p className="text-sm text-muted-foreground">{reward.points} points</p>
                  </div>
                  <Button
                    size="sm"
                    variant={reward.available ? "default" : "outline"}
                    disabled={!reward.available}
                    className={reward.available ? "bg-gradient-primary" : ""}
                  >
                    {reward.available ? "Redeem" : "Locked"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UserDashboard;