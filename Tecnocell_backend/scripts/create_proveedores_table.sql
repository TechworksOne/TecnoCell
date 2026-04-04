-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  contacto VARCHAR(255) COMMENT 'Nombre de la persona de contacto',
  telefono VARCHAR(20),
  email VARCHAR(255),
  direccion TEXT,
  nit VARCHAR(50),
  empresa VARCHAR(255),
  sitio_web VARCHAR(255),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_nit (nit),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar columna proveedor_id a la tabla compras si no existe
ALTER TABLE compras 
ADD COLUMN IF NOT EXISTS proveedor_id INT,
ADD CONSTRAINT fk_compra_proveedor 
  FOREIGN KEY (proveedor_id) 
  REFERENCES proveedores(id);

-- Insertar proveedores de ejemplo
INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, nit, empresa) VALUES
('Distribuidora TecnoMax', 'Juan Pérez', '2234-5678', 'ventas@tecnomax.com', 'Zona 10, Ciudad de Guatemala', '12345678-9', 'TecnoMax S.A.'),
('Importadora Digital', 'María López', '5567-8901', 'compras@importadoradigital.com', 'Zona 4, Mixco', '98765432-1', 'Importadora Digital Guatemala'),
('Repuestos Express', 'Carlos Gómez', '4456-7890', 'info@repuestosex.com', 'Zona 1, Centro Histórico', '55566677-8', 'Repuestos Express');
