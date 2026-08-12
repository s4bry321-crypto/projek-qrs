-- Seed script for StayFlow

-- Insert a default property (owner_id is null since we don't have a user yet)
INSERT INTO properties (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Grand Hotel');

-- Insert some default room types
INSERT INTO room_types (id, property_id, name, description, base_price, capacity)
VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Deluxe Room', 'A nice deluxe room', 150.00, 2),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Suite', 'A luxury suite', 300.00, 4);

-- Insert some default rooms
INSERT INTO rooms (id, property_id, room_number, status)
VALUES
('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', '101', 'available'),
('33333333-3333-3333-3333-333333333332', '00000000-0000-0000-0000-000000000001', '102', 'available');

-- Add prompt settings
INSERT INTO prompt_settings (id, property_id, personality, faq, property_info, version)
VALUES
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Helpful and polite.', 'Q: What time is check-in? A: 3 PM.', 'Grand Hotel located in the city center.', 1);
