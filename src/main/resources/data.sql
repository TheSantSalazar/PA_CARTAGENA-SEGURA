INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$2kA4fGz5Zt2GnC1x4L8tTOM58zI6Vh3d2SYjIRz8C.LHiU0YdFDqC', 'ADMIN');

INSERT INTO incidents (type, description, latitude, longitude, status, created_at)
VALUES ('Choque', 'Accidente leve entre dos vehículos', 10.39972, -75.51444, 'PENDIENTE', CURRENT_TIMESTAMP);
