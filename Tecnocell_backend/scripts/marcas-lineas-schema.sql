-- ============================================
-- ESQUEMA DE MARCAS Y LÍNEAS PARA REPUESTOS
-- ============================================

-- Tabla de Marcas
CREATE TABLE IF NOT EXISTS marcas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  logo_url VARCHAR(255),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_nombre (nombre),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Líneas (asociadas a marcas)
CREATE TABLE IF NOT EXISTS lineas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  marca_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE,
  UNIQUE KEY unique_marca_linea (marca_id, nombre),
  INDEX idx_marca (marca_id),
  INDEX idx_nombre (nombre),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS INICIALES - MARCAS
-- ============================================

INSERT INTO marcas (nombre, descripcion) VALUES
('Apple', 'Dispositivos Apple - iPhone, iPad, MacBook, Apple Watch'),
('Samsung', 'Dispositivos Samsung - Galaxy S, Galaxy A, Galaxy Note, Galaxy Tab'),
('Xiaomi', 'Dispositivos Xiaomi - Mi, Redmi, POCO'),
('Motorola', 'Dispositivos Motorola - Moto G, Moto E, Edge'),
('Huawei', 'Dispositivos Huawei - P Series, Mate, Nova, Y Series'),
('LG', 'Dispositivos LG'),
('Nokia', 'Dispositivos Nokia'),
('Oppo', 'Dispositivos Oppo'),
('Vivo', 'Dispositivos Vivo'),
('Realme', 'Dispositivos Realme'),
('OnePlus', 'Dispositivos OnePlus'),
('Sony', 'Dispositivos Sony Xperia'),
('Google', 'Dispositivos Google Pixel'),
('Otra', 'Otras marcas');

-- ============================================
-- DATOS INICIALES - LÍNEAS POR MARCA
-- ============================================

-- Apple (marca_id = 1)
INSERT INTO lineas (marca_id, nombre) VALUES
(1, 'iPhone SE'),
(1, 'iPhone 7'),
(1, 'iPhone 8'),
(1, 'iPhone X'),
(1, 'iPhone XR'),
(1, 'iPhone XS'),
(1, 'iPhone 11'),
(1, 'iPhone 12'),
(1, 'iPhone 13'),
(1, 'iPhone 14'),
(1, 'iPhone 15'),
(1, 'iPhone 16'),
(1, 'iPad'),
(1, 'iPad Mini'),
(1, 'iPad Air'),
(1, 'iPad Pro'),
(1, 'MacBook'),
(1, 'MacBook Air'),
(1, 'MacBook Pro'),
(1, 'iMac'),
(1, 'Apple Watch');

-- Samsung (marca_id = 2)
INSERT INTO lineas (marca_id, nombre) VALUES
(2, 'Galaxy A03'),
(2, 'Galaxy A04'),
(2, 'Galaxy A05'),
(2, 'Galaxy A10'),
(2, 'Galaxy A12'),
(2, 'Galaxy A13'),
(2, 'Galaxy A14'),
(2, 'Galaxy A15'),
(2, 'Galaxy A20'),
(2, 'Galaxy A30'),
(2, 'Galaxy A50'),
(2, 'Galaxy A51'),
(2, 'Galaxy A52'),
(2, 'Galaxy A53'),
(2, 'Galaxy A54'),
(2, 'Galaxy S20'),
(2, 'Galaxy S21'),
(2, 'Galaxy S22'),
(2, 'Galaxy S23'),
(2, 'Galaxy S24'),
(2, 'Galaxy Note 10'),
(2, 'Galaxy Note 20'),
(2, 'Galaxy Z Flip'),
(2, 'Galaxy Z Fold'),
(2, 'Galaxy Tab A'),
(2, 'Galaxy Tab S');

-- Xiaomi (marca_id = 3)
INSERT INTO lineas (marca_id, nombre) VALUES
(3, 'Redmi 9'),
(3, 'Redmi 10'),
(3, 'Redmi 11'),
(3, 'Redmi 12'),
(3, 'Redmi 13'),
(3, 'Redmi Note 9'),
(3, 'Redmi Note 10'),
(3, 'Redmi Note 11'),
(3, 'Redmi Note 12'),
(3, 'Redmi Note 13'),
(3, 'Mi 11'),
(3, 'Mi 12'),
(3, 'Mi 13'),
(3, 'POCO X3'),
(3, 'POCO X4'),
(3, 'POCO X5'),
(3, 'POCO F3'),
(3, 'POCO F4'),
(3, 'POCO F5'),
(3, 'POCO M3'),
(3, 'POCO M4'),
(3, 'POCO M5');

-- Motorola (marca_id = 4)
INSERT INTO lineas (marca_id, nombre) VALUES
(4, 'Moto E'),
(4, 'Moto E6'),
(4, 'Moto E7'),
(4, 'Moto G'),
(4, 'Moto G Play'),
(4, 'Moto G Power'),
(4, 'Moto G Stylus'),
(4, 'Moto G10'),
(4, 'Moto G20'),
(4, 'Moto G30'),
(4, 'Moto G40'),
(4, 'Moto G50'),
(4, 'Moto G60'),
(4, 'Moto G100'),
(4, 'Edge'),
(4, 'Edge 20'),
(4, 'Edge 30'),
(4, 'Edge 40'),
(4, 'One'),
(4, 'Razr');

-- Huawei (marca_id = 5)
INSERT INTO lineas (marca_id, nombre) VALUES
(5, 'P20'),
(5, 'P30'),
(5, 'P40'),
(5, 'P50'),
(5, 'Mate 20'),
(5, 'Mate 30'),
(5, 'Mate 40'),
(5, 'Nova 5'),
(5, 'Nova 7'),
(5, 'Nova 8'),
(5, 'Nova 9'),
(5, 'Y5'),
(5, 'Y6'),
(5, 'Y7'),
(5, 'Y9'),
(5, 'Honor 8'),
(5, 'Honor 9'),
(5, 'Honor 10');

-- Vista: Líneas con nombre de marca
CREATE OR REPLACE VIEW v_lineas_con_marca AS
SELECT 
  l.id,
  l.nombre AS linea_nombre,
  l.marca_id,
  m.nombre AS marca_nombre,
  l.descripcion,
  l.activo,
  l.created_at,
  l.updated_at
FROM lineas l
INNER JOIN marcas m ON l.marca_id = m.id
WHERE l.activo = TRUE AND m.activo = TRUE
ORDER BY m.nombre, l.nombre;

-- Vista: Conteo de líneas por marca
CREATE OR REPLACE VIEW v_marcas_con_lineas AS
SELECT 
  m.id AS marca_id,
  m.nombre AS marca_nombre,
  m.descripcion AS marca_descripcion,
  m.activo AS marca_activo,
  COUNT(l.id) AS total_lineas,
  GROUP_CONCAT(l.nombre ORDER BY l.nombre SEPARATOR ', ') AS lineas
FROM marcas m
LEFT JOIN lineas l ON m.id = l.marca_id AND l.activo = TRUE
WHERE m.activo = TRUE
GROUP BY m.id, m.nombre, m.descripcion, m.activo
ORDER BY m.nombre;

SELECT 'Schema de marcas y líneas creado exitosamente' AS resultado;
