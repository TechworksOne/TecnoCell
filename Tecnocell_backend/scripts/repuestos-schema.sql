-- ============================================
-- ESQUEMA DE REPUESTOS PARA TECNOCELL
-- ============================================

-- Tabla principal de repuestos
CREATE TABLE IF NOT EXISTS repuestos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('Pantalla', 'Batería', 'Cámara', 'Flex', 'Placa', 'Back Cover', 'Altavoz', 'Conector', 'Otro') NOT NULL DEFAULT 'Otro',
  marca ENUM('Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Otra') NOT NULL,
  linea VARCHAR(100),
  modelo VARCHAR(100),
  compatibilidad JSON,  -- Array de modelos compatibles: ["iPhone 12", "iPhone 12 Pro"]
  condicion ENUM('Original', 'OEM', 'Genérico', 'Usado') NOT NULL DEFAULT 'Original',
  color VARCHAR(50),
  notas TEXT,
  
  -- Precios en formato ENTERO (centavos de quetzal)
  -- Por ejemplo: 12500 = Q125.00
  precio_publico INT NOT NULL DEFAULT 0 COMMENT 'Precio de venta al público en centavos',
  precio_costo INT NOT NULL DEFAULT 0 COMMENT 'Precio de costo en centavos',
  
  proveedor VARCHAR(100),
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT DEFAULT 1,
  imagenes JSON,  -- Array de URLs: ["url1.jpg", "url2.jpg"]
  tags JSON,  -- Array de strings: ["OLED", "Incell"]
  activo BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_nombre (nombre),
  INDEX idx_tipo (tipo),
  INDEX idx_marca (marca),
  INDEX idx_linea (linea),
  INDEX idx_activo (activo),
  INDEX idx_stock (stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de movimientos de stock de repuestos
CREATE TABLE IF NOT EXISTS repuestos_movimientos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  repuesto_id INT NOT NULL,
  tipo_movimiento ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'REPARACION', 'DEVOLUCION') NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,
  precio_unitario INT DEFAULT 0 COMMENT 'Precio en centavos al momento del movimiento',
  referencia_tipo ENUM('COMPRA', 'VENTA', 'REPARACION', 'AJUSTE_MANUAL') DEFAULT 'AJUSTE_MANUAL',
  referencia_id INT,  -- ID de la compra, venta o reparación relacionada
  usuario_id INT,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (repuesto_id) REFERENCES repuestos(id) ON DELETE CASCADE,
  INDEX idx_repuesto (repuesto_id),
  INDEX idx_tipo (tipo_movimiento),
  INDEX idx_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista para repuestos con stock bajo
CREATE OR REPLACE VIEW v_repuestos_stock_bajo AS
SELECT 
  r.id,
  r.nombre,
  r.tipo,
  r.marca,
  r.linea,
  r.stock,
  r.stock_minimo,
  (r.stock_minimo - r.stock) AS unidades_faltantes,
  r.precio_publico,
  r.precio_costo,
  (r.precio_costo * (r.stock_minimo - r.stock)) AS costo_reposicion_estimado
FROM repuestos r
WHERE r.activo = TRUE 
  AND r.stock < r.stock_minimo
ORDER BY unidades_faltantes DESC;

-- Vista para estadísticas de repuestos
CREATE OR REPLACE VIEW v_estadisticas_repuestos AS
SELECT 
  tipo,
  marca,
  COUNT(*) AS total_items,
  SUM(stock) AS stock_total,
  SUM(CASE WHEN stock < stock_minimo THEN 1 ELSE 0 END) AS items_stock_bajo,
  SUM(precio_costo * stock) / 100 AS valor_inventario_costo,
  SUM(precio_publico * stock) / 100 AS valor_inventario_publico,
  AVG(precio_publico) / 100 AS precio_promedio
FROM repuestos
WHERE activo = TRUE
GROUP BY tipo, marca;

-- Stored Procedure: Registrar movimiento de stock
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_registrar_movimiento_repuesto(
  IN p_repuesto_id INT,
  IN p_tipo_movimiento VARCHAR(20),
  IN p_cantidad INT,
  IN p_precio_unitario INT,
  IN p_referencia_tipo VARCHAR(20),
  IN p_referencia_id INT,
  IN p_usuario_id INT,
  IN p_notas TEXT
)
BEGIN
  DECLARE v_stock_actual INT;
  DECLARE v_stock_nuevo INT;
  
  -- Obtener stock actual
  SELECT stock INTO v_stock_actual FROM repuestos WHERE id = p_repuesto_id;
  
  -- Calcular nuevo stock
  IF p_tipo_movimiento IN ('ENTRADA', 'DEVOLUCION') THEN
    SET v_stock_nuevo = v_stock_actual + p_cantidad;
  ELSEIF p_tipo_movimiento IN ('SALIDA', 'VENTA', 'REPARACION') THEN
    SET v_stock_nuevo = v_stock_actual - p_cantidad;
  ELSE  -- AJUSTE
    SET v_stock_nuevo = p_cantidad;
  END IF;
  
  -- Validar que no sea negativo
  IF v_stock_nuevo < 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Stock insuficiente para realizar el movimiento';
  END IF;
  
  -- Registrar movimiento
  INSERT INTO repuestos_movimientos (
    repuesto_id, tipo_movimiento, cantidad, 
    stock_anterior, stock_nuevo, precio_unitario,
    referencia_tipo, referencia_id, usuario_id, notas
  ) VALUES (
    p_repuesto_id, p_tipo_movimiento, p_cantidad,
    v_stock_actual, v_stock_nuevo, p_precio_unitario,
    p_referencia_tipo, p_referencia_id, p_usuario_id, p_notas
  );
  
  -- Actualizar stock en tabla repuestos
  UPDATE repuestos SET stock = v_stock_nuevo WHERE id = p_repuesto_id;
  
  SELECT 'Movimiento registrado exitosamente' AS mensaje, v_stock_nuevo AS nuevo_stock;
END //
DELIMITER ;

-- Trigger: Validar precios antes de insertar
DELIMITER //
CREATE TRIGGER IF NOT EXISTS before_insert_repuesto
BEFORE INSERT ON repuestos
FOR EACH ROW
BEGIN
  -- Normalizar strings
  SET NEW.nombre = TRIM(NEW.nombre);
  IF NEW.linea IS NOT NULL THEN
    SET NEW.linea = TRIM(NEW.linea);
  END IF;
  IF NEW.modelo IS NOT NULL THEN
    SET NEW.modelo = TRIM(NEW.modelo);
  END IF;
  
  -- Validar que precio_publico >= precio_costo (si ambos son mayores a 0)
  IF NEW.precio_publico > 0 AND NEW.precio_costo > 0 AND NEW.precio_publico <= NEW.precio_costo THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El precio público debe ser mayor al precio de costo';
  END IF;
  
  -- Asegurar que stock no sea negativo
  IF NEW.stock < 0 THEN
    SET NEW.stock = 0;
  END IF;
END //
DELIMITER ;

-- Trigger: Validar precios antes de actualizar
DELIMITER //
CREATE TRIGGER IF NOT EXISTS before_update_repuesto
BEFORE UPDATE ON repuestos
FOR EACH ROW
BEGIN
  -- Normalizar strings
  SET NEW.nombre = TRIM(NEW.nombre);
  IF NEW.linea IS NOT NULL THEN
    SET NEW.linea = TRIM(NEW.linea);
  END IF;
  IF NEW.modelo IS NOT NULL THEN
    SET NEW.modelo = TRIM(NEW.modelo);
  END IF;
  
  -- Validar que precio_publico >= precio_costo (si ambos son mayores a 0)
  IF NEW.precio_publico > 0 AND NEW.precio_costo > 0 AND NEW.precio_publico <= NEW.precio_costo THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El precio público debe ser mayor al precio de costo';
  END IF;
  
  -- Asegurar que stock no sea negativo
  IF NEW.stock < 0 THEN
    SET NEW.stock = 0;
  END IF;
END //
DELIMITER ;

-- Insertar datos de ejemplo (opcional, comentar si no se desea)
INSERT INTO repuestos (nombre, tipo, marca, linea, condicion, precio_publico, precio_costo, stock, activo) VALUES
('Pantalla iPhone 12 Original', 'Pantalla', 'Apple', 'iPhone 12', 'Original', 125000, 95000, 5, TRUE),
('Batería Samsung Galaxy S21', 'Batería', 'Samsung', 'Galaxy S21', 'OEM', 45000, 28000, 10, TRUE),
('Cámara Trasera Xiaomi Redmi Note 10', 'Cámara', 'Xiaomi', 'Redmi Note', 'Genérico', 35000, 22000, 3, TRUE);

SELECT 'Schema de repuestos creado exitosamente' AS resultado;
