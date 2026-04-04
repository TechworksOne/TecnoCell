-- Script para insertar las categorías iniciales de Tecnocell

-- Insertar categorías
INSERT INTO categorias (nombre, orden) VALUES
('Teléfonos', 1),
('Chips y SIM', 2),
('Vidrios Templados', 3),
('Accesorios de Computadora', 4),
('Hidrogel Antiespías', 5),
('Protección', 6),
('Audio', 7),
('Accesorios Móviles', 8);

-- Insertar subcategorías para Teléfonos
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'iPhone', 1),
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'Samsung', 2),
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'Xiaomi', 3),
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'Huawei', 4),
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'LG', 5),
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'Motorola', 6),
((SELECT id FROM categorias WHERE nombre = 'Teléfonos'), 'Otros', 7);

-- Insertar subcategorías para Chips y SIM
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Chips y SIM'), 'Claro', 1),
((SELECT id FROM categorias WHERE nombre = 'Chips y SIM'), 'Tigo', 2),
((SELECT id FROM categorias WHERE nombre = 'Chips y SIM'), 'Movistar', 3),
((SELECT id FROM categorias WHERE nombre = 'Chips y SIM'), 'Chips Prepago', 4),
((SELECT id FROM categorias WHERE nombre = 'Chips y SIM'), 'Chips Postpago', 5);

-- Insertar subcategorías para Vidrios Templados
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Vidrios Templados'), 'iPhone', 1),
((SELECT id FROM categorias WHERE nombre = 'Vidrios Templados'), 'Samsung', 2),
((SELECT id FROM categorias WHERE nombre = 'Vidrios Templados'), 'Xiaomi', 3),
((SELECT id FROM categorias WHERE nombre = 'Vidrios Templados'), 'Universales', 4),
((SELECT id FROM categorias WHERE nombre = 'Vidrios Templados'), 'Curvo', 5),
((SELECT id FROM categorias WHERE nombre = 'Vidrios Templados'), 'Plano', 6);

-- Insertar subcategorías para Accesorios de Computadora
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'Mouse', 1),
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'Teclados', 2),
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'Audífonos', 3),
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'Cables', 4),
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'USB', 5),
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'Webcam', 6),
((SELECT id FROM categorias WHERE nombre = 'Accesorios de Computadora'), 'Parlantes', 7);

-- Insertar subcategorías para Hidrogel Antiespías
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Hidrogel Antiespías'), 'iPhone', 1),
((SELECT id FROM categorias WHERE nombre = 'Hidrogel Antiespías'), 'Samsung', 2),
((SELECT id FROM categorias WHERE nombre = 'Hidrogel Antiespías'), 'Xiaomi', 3),
((SELECT id FROM categorias WHERE nombre = 'Hidrogel Antiespías'), 'Universales', 4),
((SELECT id FROM categorias WHERE nombre = 'Hidrogel Antiespías'), 'Mate', 5),
((SELECT id FROM categorias WHERE nombre = 'Hidrogel Antiespías'), 'Transparente', 6);

-- Insertar subcategorías para Protección
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Protección'), 'Cases', 1),
((SELECT id FROM categorias WHERE nombre = 'Protección'), 'Fundas', 2),
((SELECT id FROM categorias WHERE nombre = 'Protección'), 'Cargadores', 3),
((SELECT id FROM categorias WHERE nombre = 'Protección'), 'Cables USB', 4),
((SELECT id FROM categorias WHERE nombre = 'Protección'), 'Protectores', 5),
((SELECT id FROM categorias WHERE nombre = 'Protección'), 'Soportes', 6);

-- Insertar subcategorías para Audio
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Audio'), 'Audífonos', 1),
((SELECT id FROM categorias WHERE nombre = 'Audio'), 'Parlantes', 2),
((SELECT id FROM categorias WHERE nombre = 'Audio'), 'Microfonos', 3),
((SELECT id FROM categorias WHERE nombre = 'Audio'), 'Auriculares', 4),
((SELECT id FROM categorias WHERE nombre = 'Audio'), 'Bluetooth', 5);

-- Insertar subcategorías para Accesorios Móviles
INSERT INTO subcategorias (categoria_id, nombre, orden) VALUES
((SELECT id FROM categorias WHERE nombre = 'Accesorios Móviles'), 'Power Banks', 1),
((SELECT id FROM categorias WHERE nombre = 'Accesorios Móviles'), 'Cargadores', 2),
((SELECT id FROM categorias WHERE nombre = 'Accesorios Móviles'), 'Cables', 3),
((SELECT id FROM categorias WHERE nombre = 'Accesorios Móviles'), 'Soportes', 4),
((SELECT id FROM categorias WHERE nombre = 'Accesorios Móviles'), 'Ring Light', 5),
((SELECT id FROM categorias WHERE nombre = 'Accesorios Móviles'), 'Selfie Stick', 6);

-- Verificar que se insertaron correctamente
SELECT 
    c.nombre AS categoria,
    COUNT(s.id) AS total_subcategorias
FROM categorias c
LEFT JOIN subcategorias s ON c.id = s.categoria_id
GROUP BY c.id, c.nombre
ORDER BY c.orden;
