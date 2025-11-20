-- crea usuario admin (password ya bcrypt)
INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$2kA4fGz5Zt2GnC1x4L8tTOM58zI6Vh3d2SYjIRz8C.LHiU0YdFDqC', 'ADMIN');

-- Si tu tabla incidents tiene latitude/longitude/created_at, incluye esas columnas
INSERT INTO incidents (type, description, location, status)
VALUES ('Choque', 'Accidente leve entre dos vehículos', '10.39972,-75.51444', 'PENDING');
