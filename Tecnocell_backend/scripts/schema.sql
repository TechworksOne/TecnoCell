-- =====================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS TECNOCELL
-- =====================================================

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS tecnocell_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE tecnocell_db;

-- Eliminar tablas existentes si es necesario (descomentar si quieres resetear)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS customers;

-- =====================================================
-- TABLA: users (Usuarios del sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: customers (Clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  nit VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_phone (phone),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERTAR USUARIOS INICIALES (contraseña: admin123)
-- =====================================================
-- Password hasheado con bcrypt: admin123
-- Verificar si ya existen usuarios antes de insertar
INSERT IGNORE INTO users (username, email, password, name, role, active) VALUES
('admin', 'admin@tecnocell.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Administrador', 'admin', TRUE),
('empleado', 'empleado@tecnocell.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Empleado de Tienda', 'employee', TRUE);

-- =====================================================
-- INSERTAR CLIENTES DE EJEMPLO
-- =====================================================
INSERT IGNORE INTO customers (name, phone, email, address, nit) VALUES
('Juan Pérez', '5551-2345', 'juan.perez@email.com', 'Zona 1, Ciudad de Guatemala', '12345678-9'),
('María García', '5555-6789', 'maria.garcia@email.com', 'Zona 10, Ciudad de Guatemala', '98765432-1'),
('Carlos López', '5559-8765', 'carlos.lopez@email.com', 'Mixco, Guatemala', 'CF'),
('Ana Rodríguez', '5554-3210', 'ana.rodriguez@email.com', 'Villa Nueva, Guatemala', '55555555-5');

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'Base de datos creada exitosamente' AS status;
SELECT COUNT(*) AS total_usuarios FROM users;
SELECT COUNT(*) AS total_clientes FROM customers;
