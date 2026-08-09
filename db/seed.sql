-- Initial role data
INSERT INTO roles (name, level, description)
VALUES
  ('VIEWER', 1, 'Read-only access'),
  ('STAFF', 2, 'Read/write access'),
  ('ADMIN', 3, 'Full administration access')
ON CONFLICT (name) DO NOTHING;
