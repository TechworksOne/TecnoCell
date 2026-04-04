-- Tabla de compras a proveedores
CREATE TABLE IF NOT EXISTS compras (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero_compra VARCHAR(50) UNIQUE NOT NULL,
  fecha_compra DATE NOT NULL,
  proveedor_nombre VARCHAR(200) NOT NULL,
  proveedor_telefono VARCHAR(20),
  proveedor_nit VARCHAR(20),
  proveedor_direccion TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notas TEXT,
  estado ENUM('BORRADOR', 'CONFIRMADA', 'RECIBIDA', 'CANCELADA') DEFAULT 'BORRADOR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  INDEX idx_numero_compra (numero_compra),
  INDEX idx_fecha (fecha_compra),
  INDEX idx_proveedor (proveedor_nombre),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items de cada compra
CREATE TABLE IF NOT EXISTS compra_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  compra_id INT NOT NULL,
  producto_id INT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  nombre_producto VARCHAR(200) NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  aplica_serie BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  INDEX idx_compra (compra_id),
  INDEX idx_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de números de serie/IMEI de productos
CREATE TABLE IF NOT EXISTS producto_series (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  numero_serie VARCHAR(100) NOT NULL UNIQUE,
  compra_id INT,
  compra_item_id INT,
  estado ENUM('DISPONIBLE', 'VENDIDO', 'DEFECTUOSO', 'EN_REPARACION') DEFAULT 'DISPONIBLE',
  venta_id INT NULL,
  fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_venta TIMESTAMP NULL,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE SET NULL,
  FOREIGN KEY (compra_item_id) REFERENCES compra_items(id) ON DELETE SET NULL,
  INDEX idx_producto (producto_id),
  INDEX idx_sku (sku),
  INDEX idx_numero_serie (numero_serie),
  INDEX idx_estado (estado),
  INDEX idx_compra (compra_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios de las tablas
ALTER TABLE compras COMMENT = 'Registro de compras a proveedores con control de estado';
ALTER TABLE compra_items COMMENT = 'Detalle de productos comprados en cada compra';
ALTER TABLE producto_series COMMENT = 'Números de serie/IMEI de productos que los requieren';
