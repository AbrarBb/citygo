import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bus, Leaf, Award, MapPin, CreditCard, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: "Real-Time Tracking",
      description: "Track your bus in real-time with live GPS updates",
    },
    {
      icon: CreditCard,
      title: "NFC Rapid Card",
      description: "Tap and go with our contactless smart card system",
    },
    {
      icon: Leaf,
      title: "Eco-Friendly",
      description: "Track your CO₂ savings and contribute to a greener city",
    },
    {
      icon: Award,
      title: "Reward Points",
      description: "Earn points with every trip and redeem exciting rewards",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Sustainable Urban Transport</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Smart Bus,
                <br />
                <span className="text-accent">Smarter Travel</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
                Track buses in real-time, pay with NFC, earn rewards, and contribute to a greener Dhaka
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-white text-primary hover:bg-white/90 shadow-glow text-lg px-8"
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow text-lg px-8"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-16"
            >
              <div className="relative">
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="inline-block"
                >
                  <Bus className="w-32 h-32 md:w-48 md:h-48 text-white/30" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 -z-10"
                >
                  <div className="w-full h-full bg-white/20 rounded-full blur-3xl" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Choose <span className="bg-gradient-primary bg-clip-text text-transparent">CityGo</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the future of urban transportation with our smart features
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 h-full bg-gradient-card backdrop-blur-sm border-primary/20 shadow-card hover:shadow-glow transition-all hover:-translate-y-2">
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="p-12 bg-gradient-hero text-white shadow-glow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <Leaf className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-4xl font-bold mb-2">45.2 Tons</h3>
                  <p className="text-white/80">CO₂ Saved This Year</p>
                </div>
                <div>
                  <Users className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-4xl font-bold mb-2">12,458</h3>
                  <p className="text-white/80">Active Users</p>
                </div>
                <div>
                  <Bus className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-4xl font-bold mb-2">48</h3>
                  <p className="text-white/80">Smart Buses</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Go Green?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of commuters making Dhaka cleaner, one trip at a time
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8"
          >
            Start Your Journey
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-card/50 backdrop-blur-lg border-t py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            CityGo
          </h3>
          <p className="text-muted-foreground mb-4">
            Smart Bus, Smarter Travel
          </p>
          <p className="text-sm text-muted-foreground">
            © 2025 CityGo. All rights reserved. Building a sustainable future for Dhaka.
          </p>
        </div>
      </footer>
    </div>
  );
};

const Users = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

export default Index;