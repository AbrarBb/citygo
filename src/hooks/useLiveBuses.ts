import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Bus {
  id: string;
  bus_number: string;
  current_location: any;
  route_id: string | null;
  routes?: { name: string };
}

export const useLiveBuses = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("buses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buses",
        },
        () => {
          fetchBuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from("buses")
        .select("id, bus_number, current_location, route_id, routes(name)")
        .eq("status", "active");

      if (error) throw error;
      
      console.log("Fetched active buses:", data);
      setBuses(data || []);
    } catch (error) {
      console.error("Error fetching buses:", error);
    } finally {
      setLoading(false);
    }
  };

  return { buses, loading };
};
