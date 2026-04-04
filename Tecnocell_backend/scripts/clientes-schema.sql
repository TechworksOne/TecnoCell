-- Tabla de clientes con campos completos
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  telefono VARCHAR(20),
  nit VARCHAR(20),
  email VARCHAR(100),
  direccion TEXT,
  metodo_pago_preferido ENUM('efectivo', 'tarjeta', 'credito-tecnocell') DEFAULT 'efectivo',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT true,
  INDEX idx_telefono (telefono),
  INDEX idx_nit (nit),
  INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar datos de la tabla antigua 'customers' si existe
INSERT INTO clientes (nombre, telefono, nit, email, direccion, created_at)
SELECT 
  name as nombre,
  phone as telefono,
  nit,
  email,
  address as direccion,
  created_at
FROM customers
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE clientes.telefono = customers.phone)
ON DUPLICATE KEY UPDATE nombre = nombre;
