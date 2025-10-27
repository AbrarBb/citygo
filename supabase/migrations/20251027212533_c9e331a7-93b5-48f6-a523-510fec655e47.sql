-- Enable realtime for buses table
ALTER PUBLICATION supabase_realtime ADD TABLE buses;

-- Make sure buses table uses REPLICA IDENTITY FULL for complete row data
ALTER TABLE buses REPLICA IDENTITY FULL;