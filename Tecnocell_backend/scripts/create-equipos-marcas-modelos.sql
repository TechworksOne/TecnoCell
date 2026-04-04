-- Crear tablas para marcas y modelos de equipos de reparación
USE tecnocell_web;

-- Tabla de marcas de equipos
CREATE TABLE IF NOT EXISTS equipos_marcas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo_equipo ENUM('Telefono', 'Laptop', 'Tablet', 'Consola', 'Otro') NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tipo (tipo_equipo),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de modelos de equipos
CREATE TABLE IF NOT EXISTS equipos_modelos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  marca_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (marca_id) REFERENCES equipos_marcas(id) ON DELETE CASCADE,
  INDEX idx_marca (marca_id),
  INDEX idx_activo (activo),
  UNIQUE KEY unique_modelo_marca (marca_id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar marcas iniciales para Teléfonos
INSERT INTO equipos_marcas (nombre, tipo_equipo) VALUES
('Apple', 'Telefono'),
('Samsung', 'Telefono'),
('Xiaomi', 'Telefono'),
('Huawei', 'Telefono'),
('Motorola', 'Telefono'),
('OnePlus', 'Telefono');

-- Insertar modelos de Apple (iPhone)
INSERT INTO equipos_modelos (marca_id, nombre) VALUES
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 15 Pro Max'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 15 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 15 Plus'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 15'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 14 Pro Max'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 14 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 14 Plus'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 14'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 13 Pro Max'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 13 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 13'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 13 mini'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 12 Pro Max'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 12 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 12'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 11 Pro Max'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 11 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone 11'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Apple' AND tipo_equipo = 'Telefono'), 'iPhone SE (3ra gen)');

-- Insertar modelos de Samsung
INSERT INTO equipos_modelos (marca_id, nombre) VALUES
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy S24 Ultra'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy S24+'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy S24'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy S23 Ultra'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy S23+'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy S23'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy A54'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy A34'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy Z Fold 5'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Samsung' AND tipo_equipo = 'Telefono'), 'Galaxy Z Flip 5');

-- Insertar modelos de Xiaomi
INSERT INTO equipos_modelos (marca_id, nombre) VALUES
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'Xiaomi 14 Ultra'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'Xiaomi 14 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'Xiaomi 13 Ultra'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'Redmi Note 13 Pro+'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'Redmi Note 13 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'POCO X6 Pro'),
((SELECT id FROM equipos_marcas WHERE nombre = 'Xiaomi' AND tipo_equipo = 'Telefono'), 'POCO F6');

SELECT 'Tablas equipos_marcas y equipos_modelos creadas exitosamente' AS resultado;
SELECT COUNT(*) as total_marcas FROM equipos_marcas;
SELECT COUNT(*) as total_modelos FROM equipos_modelos;
