-- ============================================
-- TABLA COTIZACIONES
-- ============================================
-- Sistema de cotizaciones para ventas y reparaciones
-- con tiempo de validez y seguimiento de estado

-- Crear tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_cotizacion VARCHAR(20) UNIQUE NOT NULL COMMENT 'Número único de cotización (ej: COT-2025-0001)',
    
    -- Información del cliente
    cliente_id INT NOT NULL,
    cliente_nombre VARCHAR(200) NOT NULL COMMENT 'Nombre completo del cliente (desnormalizado para histórico)',
    cliente_telefono VARCHAR(20),
    cliente_email VARCHAR(100),
    cliente_nit VARCHAR(20),
    cliente_direccion TEXT,
    
    -- Tipo de cotización
    tipo ENUM('VENTA', 'REPARACION') NOT NULL DEFAULT 'VENTA',
    
    -- Validez
    fecha_emision DATE NOT NULL,
    vigencia_dias INT NOT NULL DEFAULT 15 COMMENT 'Días de validez de la cotización',
    fecha_vencimiento DATE NOT NULL COMMENT 'Calculado: fecha_emision + vigencia_dias',
    
    -- Items (JSON)
    items JSON NOT NULL COMMENT 'Array de items: [{id, source, refId, nombre, cantidad, precioUnit, subtotal, aplicarImpuestos, notas}]',
    
    -- Montos
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    impuestos DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'IVA calculado sobre items con aplicarImpuestos=true',
    mano_de_obra DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Solo para tipo REPARACION',
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Configuración
    aplicar_impuestos BOOLEAN NOT NULL DEFAULT false COMMENT 'Si la cotización maneja impuestos',
    
    -- Estado
    estado ENUM('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA') NOT NULL DEFAULT 'BORRADOR',
    
    -- Observaciones
    observaciones TEXT,
    notas_internas TEXT COMMENT 'Notas privadas no visibles en la cotización impresa',
    
    -- Conversión (cuando se convierte en venta o reparación)
    convertida_a ENUM('VENTA', 'REPARACION') NULL,
    referencia_venta_id INT NULL COMMENT 'ID de la venta si fue convertida',
    referencia_reparacion_id INT NULL COMMENT 'ID de la reparación si fue convertida',
    fecha_conversion DATETIME NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT COMMENT 'ID del usuario que creó la cotización',
    updated_by INT COMMENT 'ID del usuario que modificó la cotización',
    
    -- Foreign Keys
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Índices
    INDEX idx_cliente (cliente_id),
    INDEX idx_tipo (tipo),
    INDEX idx_estado (estado),
    INDEX idx_fecha_emision (fecha_emision),
    INDEX idx_fecha_vencimiento (fecha_vencimiento),
    INDEX idx_numero (numero_cotizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIGGER: Auto-calcular fecha de vencimiento
-- ============================================
DELIMITER //

CREATE TRIGGER before_insert_cotizaciones
BEFORE INSERT ON cotizaciones
FOR EACH ROW
BEGIN
    -- Calcular fecha de vencimiento
    SET NEW.fecha_vencimiento = DATE_ADD(NEW.fecha_emision, INTERVAL NEW.vigencia_dias DAY);
    
    -- Generar número de cotización si no existe
    IF NEW.numero_cotizacion IS NULL OR NEW.numero_cotizacion = '' THEN
        SET @year = YEAR(NEW.fecha_emision);
        SET @max_num = (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_cotizacion, '-', -1) AS UNSIGNED)), 0) 
                       FROM cotizaciones 
                       WHERE numero_cotizacion LIKE CONCAT('COT-', @year, '-%'));
        SET NEW.numero_cotizacion = CONCAT('COT-', @year, '-', LPAD(@max_num + 1, 4, '0'));
    END IF;
END//

CREATE TRIGGER before_update_cotizaciones
BEFORE UPDATE ON cotizaciones
FOR EACH ROW
BEGIN
    -- Recalcular fecha de vencimiento si cambió fecha_emision o vigencia_dias
    IF NEW.fecha_emision != OLD.fecha_emision OR NEW.vigencia_dias != OLD.vigencia_dias THEN
        SET NEW.fecha_vencimiento = DATE_ADD(NEW.fecha_emision, INTERVAL NEW.vigencia_dias DAY);
    END IF;
    
    -- Auto-marcar como vencida si pasó la fecha
    IF NEW.estado IN ('ENVIADA', 'BORRADOR') AND NEW.fecha_vencimiento < CURDATE() THEN
        SET NEW.estado = 'VENCIDA';
    END IF;
END//

DELIMITER ;

-- ============================================
-- VISTA: Resumen de cotizaciones por cliente
-- ============================================
CREATE OR REPLACE VIEW v_resumen_cotizaciones AS
SELECT 
    c.id AS cliente_id,
    c.nombre,
    c.apellido,
    COUNT(cot.id) AS total_cotizaciones,
    SUM(CASE WHEN cot.estado = 'ENVIADA' THEN 1 ELSE 0 END) AS cotizaciones_enviadas,
    SUM(CASE WHEN cot.estado = 'APROBADA' THEN 1 ELSE 0 END) AS cotizaciones_aprobadas,
    SUM(CASE WHEN cot.estado = 'RECHAZADA' THEN 1 ELSE 0 END) AS cotizaciones_rechazadas,
    SUM(CASE WHEN cot.estado = 'VENCIDA' THEN 1 ELSE 0 END) AS cotizaciones_vencidas,
    SUM(CASE WHEN cot.estado = 'CONVERTIDA' THEN 1 ELSE 0 END) AS cotizaciones_convertidas,
    SUM(cot.total) AS total_cotizado,
    SUM(CASE WHEN cot.estado = 'CONVERTIDA' THEN cot.total ELSE 0 END) AS total_convertido,
    MAX(cot.fecha_emision) AS ultima_cotizacion,
    ROUND(SUM(CASE WHEN cot.estado = 'CONVERTIDA' THEN cot.total ELSE 0 END) / NULLIF(SUM(cot.total), 0) * 100, 2) AS tasa_conversion
FROM clientes c
LEFT JOIN cotizaciones cot ON c.id = cot.cliente_id
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellido;

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL - COMENTAR SI NO SE NECESITA)
-- ============================================
-- Ejemplo de cotización de venta
-- INSERT INTO cotizaciones (
--     cliente_id, cliente_nombre, cliente_telefono, tipo, fecha_emision, vigencia_dias,
--     items, subtotal, impuestos, total, estado, created_by
-- ) VALUES (
--     1, 'Juan Pérez', '12345678', 'VENTA', CURDATE(), 15,
--     '[{"id":"1","source":"PRODUCTO","refId":"prod-1","nombre":"iPhone 14","cantidad":1,"precioUnit":800,"subtotal":800,"aplicarImpuestos":true}]',
--     800.00, 96.00, 896.00, 'ENVIADA', 1
-- );

-- ============================================
-- PROCEDIMIENTO: Obtener cotizaciones próximas a vencer
-- ============================================
DELIMITER //

CREATE PROCEDURE sp_cotizaciones_proximas_vencer(
    IN dias_anticipacion INT
)
BEGIN
    SELECT 
        cot.id,
        cot.numero_cotizacion,
        cot.cliente_nombre,
        cot.cliente_telefono,
        cot.fecha_emision,
        cot.fecha_vencimiento,
        DATEDIFF(cot.fecha_vencimiento, CURDATE()) AS dias_restantes,
        cot.total,
        cot.estado
    FROM cotizaciones cot
    WHERE cot.estado IN ('ENVIADA', 'BORRADOR')
        AND cot.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL dias_anticipacion DAY)
    ORDER BY cot.fecha_vencimiento ASC;
END//

DELIMITER ;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Tabla cotizaciones creada exitosamente' AS mensaje;
DESCRIBE cotizaciones;
