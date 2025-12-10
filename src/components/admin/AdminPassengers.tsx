import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Wallet, User, Leaf } from "lucide-react";

interface Passenger {
  id: string;
  user_id: string;
  full_name: string;
  card_id: string | null;
  card_balance: number | null;
  total_co2_saved: number | null;
  points: number | null;
  created_at: string | null;
  trip_count?: number;
}

const AdminPassengers = () => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceOperation, setBalanceOperation] = useState<"add" | "deduct" | "set">("add");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get trip counts
      const enriched = await Promise.all(
        (data || []).map(async (p) => {
          const { count } = await supabase
            .from("nfc_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", p.user_id)
            .not("tap_out_time", "is", null);
          return { ...p, trip_count: count || 0 };
        })
      );

      setPassengers(enriched);
    } catch (error) {
      console.error("Error fetching passengers:", error);
      toast.error("Failed to load passengers");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedPassenger || !balanceAmount) return;
    setUpdating(true);

    try {
      const amount = parseFloat(balanceAmount);
      const currentBalance = selectedPassenger.card_balance || 0;
      let newBalance: number;

      if (balanceOperation === "set") {
        newBalance = amount;
      } else if (balanceOperation === "deduct") {
        newBalance = Math.max(0, currentBalance - amount);
      } else {
        newBalance = currentBalance + amount;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ card_balance: newBalance })
        .eq("user_id", selectedPassenger.user_id);

      if (error) throw error;

      // Log transaction
      await supabase.from("transactions").insert({
        user_id: selectedPassenger.user_id,
        amount: balanceOperation === "deduct" ? -amount : amount,
        transaction_type: "admin_adjustment",
        payment_method: "admin",
        status: "completed",
        description: `Admin balance ${balanceOperation}: ৳${amount}`,
      });

      toast.success(`Balance updated to ৳${newBalance.toFixed(2)}`);
      setSelectedPassenger(null);
      setBalanceAmount("");
      fetchPassengers();
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error("Failed to update balance");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = passengers.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.card_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Passengers ({passengers.length})</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or card ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Card ID</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Trips</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>CO₂ Saved</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((passenger) => (
              <TableRow key={passenger.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {passenger.full_name}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{passenger.card_id || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Wallet className="w-4 h-4 text-primary" />
                    ৳{(passenger.card_balance || 0).toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>{passenger.trip_count}</TableCell>
                <TableCell>{passenger.points || 0}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Leaf className="w-4 h-4 text-primary" />
                    {(passenger.total_co2_saved || 0).toFixed(2)} kg
                  </div>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPassenger(passenger)}
                      >
                        Update Balance
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Balance - {passenger.full_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">
                          Current Balance: <span className="font-bold text-foreground">৳{(passenger.card_balance || 0).toFixed(2)}</span>
                        </p>
                        <Select
                          value={balanceOperation}
                          onValueChange={(v) => setBalanceOperation(v as typeof balanceOperation)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">Add to Balance</SelectItem>
                            <SelectItem value="deduct">Deduct from Balance</SelectItem>
                            <SelectItem value="set">Set Balance To</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={balanceAmount}
                          onChange={(e) => setBalanceAmount(e.target.value)}
                        />
                        <Button
                          className="w-full"
                          onClick={handleUpdateBalance}
                          disabled={updating || !balanceAmount}
                        >
                          {updating ? "Updating..." : "Update Balance"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No passengers found</p>
      )}
    </Card>
  );
};

export default AdminPassengers;
