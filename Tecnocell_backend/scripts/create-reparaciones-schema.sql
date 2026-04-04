-- Sistema de Reparaciones con almacenamiento de imágenes
USE tecnocell_web;

-- Tabla principal de reparaciones
CREATE TABLE IF NOT EXISTS reparaciones (
  id VARCHAR(50) PRIMARY KEY,
  
  -- Cliente
  cliente_id INT NULL,
  cliente_nombre VARCHAR(200) NOT NULL,
  cliente_telefono VARCHAR(20),
  cliente_email VARCHAR(200),
  
  -- Equipo
  tipo_equipo ENUM('Telefono', 'Tablet', 'Laptop', 'Consola', 'Otro') NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(150),
  color VARCHAR(50),
  imei_serie VARCHAR(100),
  patron_contrasena VARCHAR(255),
  estado_fisico TEXT,
  diagnostico_inicial TEXT,
  
  -- Estado actual
  estado ENUM('RECIBIDA', 'EN_PROCESO', 'ESPERANDO_PIEZA', 'COMPLETADA', 'ENTREGADA', 'CANCELADA') NOT NULL DEFAULT 'RECIBIDA',
  sub_etapa ENUM('DIAGNOSTICO', 'DESARMADO', 'REPARACION', 'ARMADO', 'PRUEBAS', 'CALIBRACION') NULL,
  prioridad ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'MEDIA',
  tecnico_asignado VARCHAR(100),
  
  -- Costos (en centavos para evitar decimales)
  mano_obra INT DEFAULT 0,
  subtotal INT DEFAULT 0,
  impuestos INT DEFAULT 0,
  total INT DEFAULT 0,
  
  -- Anticipo y saldos (en centavos)
  monto_anticipo INT DEFAULT 0,
  saldo_anticipo INT DEFAULT 0,
  metodo_anticipo ENUM('efectivo', 'transferencia'),
  total_invertido INT DEFAULT 0,
  diferencia_reparacion INT DEFAULT 0,
  total_ganancia INT DEFAULT 0,
  
  -- Control y entrega
  sticker_serie_interna VARCHAR(50) UNIQUE,
  sticker_ubicacion ENUM('chasis', 'bandeja_sim', 'bateria', 'otro'),
  fecha_ingreso DATE NOT NULL,
  fecha_cierre DATE,
  garantia_dias INT DEFAULT 30,
  
  -- Observaciones
  observaciones TEXT,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  
  INDEX idx_cliente_nombre (cliente_nombre),
  INDEX idx_estado (estado),
  INDEX idx_fecha_ingreso (fecha_ingreso),
  INDEX idx_sticker (sticker_serie_interna),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de estados
CREATE TABLE IF NOT EXISTS reparaciones_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reparacion_id VARCHAR(50) NOT NULL,
  
  -- Estado
  estado ENUM('RECIBIDA', 'EN_PROCESO', 'ESPERANDO_PIEZA', 'COMPLETADA', 'ENTREGADA', 'CANCELADA') NOT NULL,
  sub_etapa ENUM('DIAGNOSTICO', 'DESARMADO', 'REPARACION', 'ARMADO', 'PRUEBAS', 'CALIBRACION') NULL,
  
  -- Descripción
  nota TEXT NOT NULL,
  
  -- Información adicional para esperando pieza
  pieza_necesaria VARCHAR(255),
  proveedor VARCHAR(255),
  costo_repuesto INT,
  
  -- Información de sticker (cuando se completa)
  sticker_numero VARCHAR(50),
  sticker_ubicacion ENUM('chasis', 'bandeja_sim', 'bateria', 'otro'),
  
  -- Información de entrega
  diferencia_reparacion INT,
  
  -- Auditoría
  user_nombre VARCHAR(100) DEFAULT 'Sistema',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reparacion_id) REFERENCES reparaciones(id) ON DELETE CASCADE,
  INDEX idx_reparacion (reparacion_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de imágenes de reparaciones
CREATE TABLE IF NOT EXISTS reparaciones_imagenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reparacion_id VARCHAR(50) NOT NULL,
  historial_id INT NULL,
  
  -- Tipo de imagen
  tipo ENUM('recepcion', 'historial', 'final', 'comprobante') NOT NULL,
  
  -- Información del archivo
  filename VARCHAR(255) NOT NULL,
  url_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reparacion_id) REFERENCES reparaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (historial_id) REFERENCES reparaciones_historial(id) ON DELETE CASCADE,
  INDEX idx_reparacion (reparacion_id),
  INDEX idx_historial (historial_id),
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de accesorios recibidos
CREATE TABLE IF NOT EXISTS reparaciones_accesorios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reparacion_id VARCHAR(50) NOT NULL,
  
  -- Accesorios
  chip BOOLEAN DEFAULT FALSE,
  estuche BOOLEAN DEFAULT FALSE,
  memoria_sd BOOLEAN DEFAULT FALSE,
  cargador BOOLEAN DEFAULT FALSE,
  otros TEXT,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reparacion_id) REFERENCES reparaciones(id) ON DELETE CASCADE,
  UNIQUE KEY unique_reparacion (reparacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de repuestos utilizados en reparaciones
CREATE TABLE IF NOT EXISTS reparaciones_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reparacion_id VARCHAR(50) NOT NULL,
  
  -- Item (puede ser producto o repuesto)
  item_id VARCHAR(50),
  item_tipo ENUM('producto', 'repuesto', 'manual') NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unit INT NOT NULL,
  subtotal INT NOT NULL,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reparacion_id) REFERENCES reparaciones(id) ON DELETE CASCADE,
  INDEX idx_reparacion (reparacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tablas de reparaciones creadas exitosamente' AS resultado;

-- Mostrar estructura creada
SELECT 'Verificando tablas...' AS paso;
SHOW TABLES LIKE 'reparaciones%';
