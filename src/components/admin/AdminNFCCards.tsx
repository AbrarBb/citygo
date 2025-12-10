import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, CreditCard, User, Plus, Edit, RefreshCw } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  card_id: string | null;
  card_balance: number | null;
  created_at: string | null;
}

const AdminNFCCards = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [cardId, setCardId] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [isIssuing, setIsIssuing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNewCard, setIsNewCard] = useState(false);

  // For issuing new card to user without one
  const [usersWithoutCard, setUsersWithoutCard] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setUsers(data || []);
      setUsersWithoutCard((data || []).filter(u => !u.card_id));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const generateCardId = () => {
    const chars = "0123456789abcdef";
    let id = "RC-";
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  };

  const handleIssueCard = async () => {
    if (!selectedUserId && !selectedUser) {
      toast.error("Please select a user");
      return;
    }
    
    if (!cardId.trim()) {
      toast.error("Card ID is required");
      return;
    }

    setIsIssuing(true);
    try {
      const userId = selectedUser?.user_id || selectedUserId;
      const balance = parseFloat(initialBalance) || 0;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          card_id: cardId.trim(),
          card_balance: balance
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Log transaction if there's initial balance
      if (balance > 0) {
        await supabase.from("transactions").insert({
          user_id: userId,
          amount: balance,
          transaction_type: "card_issue",
          payment_method: "admin",
          status: "completed",
          description: `NFC Card issued: ${cardId.trim()} with initial balance ৳${balance}`,
        });
      }

      toast.success(isNewCard ? "NFC Card issued successfully" : "Card ID updated successfully");
      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedUserId("");
      setCardId("");
      setInitialBalance("0");
      fetchUsers();
    } catch (error) {
      console.error("Error issuing card:", error);
      toast.error("Failed to issue card");
    } finally {
      setIsIssuing(false);
    }
  };

  const openIssueDialog = (user?: UserProfile) => {
    if (user) {
      setSelectedUser(user);
      setCardId(user.card_id || "");
      setIsNewCard(!user.card_id);
    } else {
      setSelectedUser(null);
      setIsNewCard(true);
      setCardId("");
    }
    setInitialBalance("0");
    setSelectedUserId("");
    setDialogOpen(true);
  };

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.card_id?.toLowerCase().includes(search.toLowerCase())
  );

  const usersWithCards = filtered.filter(u => u.card_id);
  const usersWithoutCards = filtered.filter(u => !u.card_id);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">NFC Card Management</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => openIssueDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Issue New Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedUser 
                      ? (isNewCard ? `Issue Card to ${selectedUser.full_name}` : `Edit Card - ${selectedUser.full_name}`)
                      : "Issue New NFC Card"
                    }
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {!selectedUser && (
                    <div>
                      <Label>Select User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user without card" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersWithoutCard.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label>Card ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={cardId}
                        onChange={(e) => setCardId(e.target.value)}
                        placeholder="RC-xxxxxxxx"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCardId(generateCardId())}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: RC-XXXXXXXX (8 hex characters)
                    </p>
                  </div>

                  {isNewCard && (
                    <div>
                      <Label>Initial Balance (৳)</Label>
                      <Input
                        type="number"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  )}

                  {selectedUser && (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <p>Current Balance: <span className="font-medium text-foreground">৳{(selectedUser.card_balance || 0).toFixed(2)}</span></p>
                      {selectedUser.card_id && (
                        <p>Current Card ID: <span className="font-mono text-foreground">{selectedUser.card_id}</span></p>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleIssueCard}
                    disabled={isIssuing || (!selectedUser && !selectedUserId) || !cardId.trim()}
                  >
                    {isIssuing ? "Processing..." : (isNewCard ? "Issue Card" : "Update Card ID")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or card ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-primary/10 rounded-lg px-4 py-2">
            <p className="text-sm text-muted-foreground">Cards Issued</p>
            <p className="text-xl font-bold text-primary">{users.filter(u => u.card_id).length}</p>
          </div>
          <div className="bg-muted/30 rounded-lg px-4 py-2">
            <p className="text-sm text-muted-foreground">Users Without Card</p>
            <p className="text-xl font-bold">{users.filter(u => !u.card_id).length}</p>
          </div>
        </div>
      </div>

      {/* Users with Cards */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Registered Cards ({usersWithCards.length})
        </h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Card ID</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersWithCards.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {user.full_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      {user.card_id}
                    </div>
                  </TableCell>
                  <TableCell>৳{(user.card_balance || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className="bg-primary text-primary-foreground">Active</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openIssueDialog(user)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {usersWithCards.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No cards issued yet</p>
        )}
      </div>

      {/* Users without Cards */}
      <div>
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-muted-foreground" />
          Users Without Card ({usersWithoutCards.length})
        </h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersWithoutCards.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {user.full_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString()
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openIssueDialog(user)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Issue Card
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {usersWithoutCards.length === 0 && (
          <p className="text-center text-muted-foreground py-4">All users have cards</p>
        )}
      </div>
    </Card>
  );
};

export default AdminNFCCards;
