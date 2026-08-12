-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_handovers ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has access to property
CREATE OR REPLACE FUNCTION user_has_property_access(check_property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.uid() IN (SELECT owner_id FROM properties WHERE id = check_property_id)
        OR
        check_property_id::text = (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'property_id')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for property-bound tables

-- Properties (User can view if they own it or if it is in their JWT)
CREATE POLICY "Property access" ON properties FOR ALL USING (
    owner_id = auth.uid() OR id::text = (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'property_id')
);

-- Staff
CREATE POLICY "Staff access" ON staff FOR ALL USING (user_has_property_access(property_id));

-- Room Types
CREATE POLICY "Room Types access" ON room_types FOR ALL USING (user_has_property_access(property_id));

-- Rooms
CREATE POLICY "Rooms access" ON rooms FOR ALL USING (user_has_property_access(property_id));

-- Guests
CREATE POLICY "Guests access" ON guests FOR ALL USING (user_has_property_access(property_id));

-- Bookings
CREATE POLICY "Bookings access" ON bookings FOR ALL USING (user_has_property_access(property_id));

-- Housekeeping
CREATE POLICY "Housekeeping access" ON housekeeping_tasks FOR ALL USING (user_has_property_access(property_id));

-- Invoices
CREATE POLICY "Invoices access" ON invoices FOR ALL USING (user_has_property_access(property_id));

-- Payments
CREATE POLICY "Payments access" ON payments FOR ALL USING (user_has_property_access(property_id));

-- WhatsApp Connection
CREATE POLICY "WhatsApp connection access" ON whatsapp_connection FOR ALL USING (user_has_property_access(property_id));

-- Chat Messages
CREATE POLICY "Chat messages access" ON chat_messages FOR ALL USING (user_has_property_access(property_id));

-- Message Queue
CREATE POLICY "Message queue access" ON message_queue FOR ALL USING (user_has_property_access(property_id));

-- Prompt Settings
CREATE POLICY "Prompt settings access" ON prompt_settings FOR ALL USING (user_has_property_access(property_id));

-- Subscriptions
CREATE POLICY "Subscriptions access" ON subscriptions FOR ALL USING (user_has_property_access(property_id));

-- Notifications
CREATE POLICY "Notifications access" ON notifications FOR ALL USING (user_has_property_access(property_id));

-- Audit Logs
CREATE POLICY "Audit Logs access" ON audit_logs FOR ALL USING (user_has_property_access(property_id));

-- Conversation Memory
CREATE POLICY "Conversation Memory access" ON conversation_memory FOR ALL USING (user_has_property_access(property_id));

-- Human Handovers
CREATE POLICY "Human Handovers access" ON human_handovers FOR ALL USING (user_has_property_access(property_id));

-- Super Admin Tenants (Handled by Node.js backend using service role key, so no RLS bypass needed for standard users)
-- No policies created implies default deny for anon/authenticated users.
