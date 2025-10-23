import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus, UserCircle, Shield, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [role, setRole] = useState("user");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo, redirect to dashboard based on role
    navigate(`/dashboard/${role}`);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/dashboard/${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 backdrop-blur-lg bg-card/95 shadow-glow border-primary/20">
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block mb-4"
            >
              <Bus className="w-16 h-16 text-primary" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CityGo
            </h1>
            <p className="text-muted-foreground mt-2">Smart Bus, Smarter Travel</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Login As</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4" />
                          Passenger
                        </div>
                      </SelectItem>
                      <SelectItem value="driver">
                        <div className="flex items-center gap-2">
                          <Bus className="w-4 h-4" />
                          Driver
                        </div>
                      </SelectItem>
                      <SelectItem value="supervisor">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          Supervisor
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input id="signup-name" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="your@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role">Register As</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Passenger</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;