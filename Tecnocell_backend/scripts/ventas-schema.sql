-- ============================================
-- TABLA VENTAS
-- ============================================
-- Sistema de ventas que puede originarse desde:
-- 1. Cotizaciones de productos
-- 2. Cotizaciones de repuestos
-- 3. Venta directa sin cotización previa

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_venta VARCHAR(20) UNIQUE NOT NULL COMMENT 'Número único de venta (ej: V-2025-0001)',
    
    -- Información del cliente (desnormalizado para histórico)
    cliente_id INT NOT NULL,
    cliente_nombre VARCHAR(200) NOT NULL,
    cliente_telefono VARCHAR(20),
    cliente_email VARCHAR(100),
    cliente_nit VARCHAR(20),
    cliente_direccion TEXT,
    
    -- Origen de la venta
    cotizacion_id INT NULL COMMENT 'ID de la cotización origen (si aplica)',
    numero_cotizacion VARCHAR(20) NULL COMMENT 'Número de cotización (desnormalizado)',
    
    -- Tipo de venta según origen
    tipo_venta ENUM('PRODUCTOS', 'REPUESTOS', 'MIXTA') NOT NULL DEFAULT 'PRODUCTOS',
    
    -- Items (JSON) - puede contener productos, repuestos o ambos
    items JSON NOT NULL COMMENT 'Array: [{id, source, refId, nombre, cantidad, precioUnit, subtotal, notas}]',
    
    -- Montos (en centavos para precisión, convertir a quetzales en frontend)
    subtotal INT NOT NULL DEFAULT 0 COMMENT 'Subtotal en centavos',
    impuestos INT NOT NULL DEFAULT 0 COMMENT 'IVA en centavos',
    descuento INT NOT NULL DEFAULT 0 COMMENT 'Descuento en centavos',
    total INT NOT NULL DEFAULT 0 COMMENT 'Total en centavos',
    
    -- Estado de la venta
    estado ENUM('PENDIENTE', 'PAGADA', 'PARCIAL', 'ANULADA') NOT NULL DEFAULT 'PENDIENTE',
    
    -- Información de pago
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO') NULL,
    pagos JSON NULL COMMENT 'Array de pagos: [{metodo, monto, referencia, fecha, comprobanteUrl}]',
    monto_pagado INT NOT NULL DEFAULT 0 COMMENT 'Total pagado en centavos',
    saldo_pendiente INT NOT NULL DEFAULT 0 COMMENT 'Saldo pendiente en centavos',
    
    -- Observaciones
    observaciones TEXT,
    notas_internas TEXT,
    
    -- Facturación (FEL - Factura Electrónica en Línea)
    factura_fel_id VARCHAR(50) NULL COMMENT 'ID de la factura FEL si fue facturada',
    factura_numero VARCHAR(50) NULL COMMENT 'Número de factura FEL',
    factura_serie VARCHAR(20) NULL,
    factura_uuid VARCHAR(100) NULL COMMENT 'UUID de la factura FEL',
    fecha_facturacion DATETIME NULL,
    
    -- Timestamps
    fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT COMMENT 'ID del usuario que creó la venta',
    updated_by INT COMMENT 'ID del usuario que modificó la venta',
    
    -- Foreign Keys
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    -- Índices
    INDEX idx_cliente (cliente_id),
    INDEX idx_cotizacion (cotizacion_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_venta (fecha_venta),
    INDEX idx_numero (numero_venta),
    INDEX idx_tipo_venta (tipo_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIGGER: Auto-generar número de venta
-- ============================================
DELIMITER //

CREATE TRIGGER before_insert_ventas
BEFORE INSERT ON ventas
FOR EACH ROW
BEGIN
    DECLARE next_num INT;
    DECLARE year_suffix VARCHAR(4);
    
    -- Obtener año actual
    SET year_suffix = YEAR(CURDATE());
    
    -- Obtener el siguiente número correlativo para el año
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_venta, '-', -1) AS UNSIGNED)), 0) + 1
    INTO next_num
    FROM ventas
    WHERE numero_venta LIKE CONCAT('V-', year_suffix, '-%');
    
    -- Generar número con formato V-YYYY-NNNN
    SET NEW.numero_venta = CONCAT('V-', year_suffix, '-', LPAD(next_num, 4, '0'));
    
    -- Calcular saldo pendiente
    SET NEW.saldo_pendiente = NEW.total - NEW.monto_pagado;
    
    -- Actualizar estado según pago
    IF NEW.monto_pagado >= NEW.total THEN
        SET NEW.estado = 'PAGADA';
    ELSEIF NEW.monto_pagado > 0 THEN
        SET NEW.estado = 'PARCIAL';
    END IF;
END//

DELIMITER ;

-- ============================================
-- TRIGGER: Actualizar saldo al actualizar venta
-- ============================================
DELIMITER //

CREATE TRIGGER before_update_ventas
BEFORE UPDATE ON ventas
FOR EACH ROW
BEGIN
    -- Calcular saldo pendiente
    SET NEW.saldo_pendiente = NEW.total - NEW.monto_pagado;
    
    -- Actualizar estado según pago (solo si no está anulada)
    IF NEW.estado != 'ANULADA' THEN
        IF NEW.monto_pagado >= NEW.total THEN
            SET NEW.estado = 'PAGADA';
        ELSEIF NEW.monto_pagado > 0 THEN
            SET NEW.estado = 'PARCIAL';
        ELSE
            SET NEW.estado = 'PENDIENTE';
        END IF;
    END IF;
END//

DELIMITER ;

-- ============================================
-- TRIGGER: Actualizar estado de cotización al crear venta
-- ============================================
DELIMITER //

CREATE TRIGGER after_insert_ventas_from_quote
AFTER INSERT ON ventas
FOR EACH ROW
BEGIN
    -- Si la venta viene de una cotización, actualizar estado de cotización
    IF NEW.cotizacion_id IS NOT NULL THEN
        UPDATE cotizaciones
        SET estado = 'CONVERTIDA',
            convertida_a = 'VENTA',
            referencia_venta_id = NEW.id,
            fecha_conversion = NOW()
        WHERE id = NEW.cotizacion_id;
    END IF;
END//

DELIMITER ;

-- ============================================
-- VISTA: Ventas con información completa
-- ============================================
CREATE OR REPLACE VIEW v_ventas_completas AS
SELECT 
    v.id,
    v.numero_venta,
    v.cliente_id,
    v.cliente_nombre,
    v.cliente_telefono,
    v.cliente_nit,
    v.cotizacion_id,
    v.numero_cotizacion,
    v.tipo_venta,
    v.items,
    v.subtotal / 100 as subtotal_quetzales,
    v.impuestos / 100 as impuestos_quetzales,
    v.descuento / 100 as descuento_quetzales,
    v.total / 100 as total_quetzales,
    v.estado,
    v.metodo_pago,
    v.pagos,
    v.monto_pagado / 100 as monto_pagado_quetzales,
    v.saldo_pendiente / 100 as saldo_pendiente_quetzales,
    v.observaciones,
    v.factura_numero,
    v.factura_uuid,
    v.fecha_venta,
    v.created_at,
    v.updated_at,
    c.nombre as cliente_nombre_actual,
    c.telefono as cliente_telefono_actual,
    cot.numero_cotizacion as cotizacion_numero_actual,
    cot.estado as cotizacion_estado
FROM ventas v
LEFT JOIN clientes c ON v.cliente_id = c.id
LEFT JOIN cotizaciones cot ON v.cotizacion_id = cot.id;

-- ============================================
-- VISTA: Estadísticas de ventas
-- ============================================
CREATE OR REPLACE VIEW v_estadisticas_ventas AS
SELECT 
    COUNT(*) as total_ventas,
    SUM(CASE WHEN estado = 'PAGADA' THEN 1 ELSE 0 END) as ventas_pagadas,
    SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as ventas_pendientes,
    SUM(CASE WHEN estado = 'PARCIAL' THEN 1 ELSE 0 END) as ventas_parciales,
    SUM(total) / 100 as total_vendido_quetzales,
    SUM(monto_pagado) / 100 as total_cobrado_quetzales,
    SUM(saldo_pendiente) / 100 as total_pendiente_quetzales,
    AVG(total) / 100 as promedio_venta_quetzales,
    SUM(CASE WHEN DATE(fecha_venta) = CURDATE() THEN 1 ELSE 0 END) as ventas_hoy,
    SUM(CASE WHEN DATE(fecha_venta) = CURDATE() THEN total ELSE 0 END) / 100 as total_hoy_quetzales,
    SUM(CASE WHEN MONTH(fecha_venta) = MONTH(CURDATE()) AND YEAR(fecha_venta) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as ventas_mes_actual,
    SUM(CASE WHEN MONTH(fecha_venta) = MONTH(CURDATE()) AND YEAR(fecha_venta) = YEAR(CURDATE()) THEN total ELSE 0 END) / 100 as total_mes_actual_quetzales
FROM ventas
WHERE estado != 'ANULADA';

-- ============================================
-- STORED PROCEDURE: Registrar pago de venta
-- ============================================
DELIMITER //

CREATE PROCEDURE sp_registrar_pago_venta(
    IN p_venta_id INT,
    IN p_monto INT,
    IN p_metodo VARCHAR(20),
    IN p_referencia VARCHAR(100),
    IN p_comprobante_url TEXT,
    IN p_usuario_id INT
)
BEGIN
    DECLARE current_pagos JSON;
    DECLARE new_pago JSON;
    DECLARE nuevo_monto_pagado INT;
    
    -- Obtener pagos actuales
    SELECT pagos, monto_pagado INTO current_pagos, nuevo_monto_pagado
    FROM ventas WHERE id = p_venta_id;
    
    -- Crear nuevo pago
    SET new_pago = JSON_OBJECT(
        'metodo', p_metodo,
        'monto', p_monto,
        'referencia', p_referencia,
        'comprobanteUrl', p_comprobante_url,
        'fecha', NOW(),
        'usuario_id', p_usuario_id
    );
    
    -- Agregar pago al array
    IF current_pagos IS NULL THEN
        SET current_pagos = JSON_ARRAY(new_pago);
    ELSE
        SET current_pagos = JSON_ARRAY_APPEND(current_pagos, '$', new_pago);
    END IF;
    
    -- Actualizar venta
    SET nuevo_monto_pagado = nuevo_monto_pagado + p_monto;
    
    UPDATE ventas
    SET pagos = current_pagos,
        monto_pagado = nuevo_monto_pagado,
        metodo_pago = IF(JSON_LENGTH(current_pagos) > 1, 'MIXTO', p_metodo),
        updated_by = p_usuario_id
    WHERE id = p_venta_id;
    
    SELECT 'Pago registrado exitosamente' as mensaje;
END//

DELIMITER ;

-- ============================================
-- STORED PROCEDURE: Anular venta
-- ============================================
DELIMITER //

CREATE PROCEDURE sp_anular_venta(
    IN p_venta_id INT,
    IN p_motivo TEXT,
    IN p_usuario_id INT
)
BEGIN
    DECLARE v_cotizacion_id INT;
    
    -- Obtener cotización relacionada
    SELECT cotizacion_id INTO v_cotizacion_id
    FROM ventas WHERE id = p_venta_id;
    
    -- Anular venta
    UPDATE ventas
    SET estado = 'ANULADA',
        notas_internas = CONCAT(COALESCE(notas_internas, ''), '\nANULADA: ', p_motivo, ' - ', NOW()),
        updated_by = p_usuario_id
    WHERE id = p_venta_id;
    
    -- Revertir estado de cotización si existía
    IF v_cotizacion_id IS NOT NULL THEN
        UPDATE cotizaciones
        SET estado = 'ENVIADA',
            convertida_a = NULL,
            referencia_venta_id = NULL,
            fecha_conversion = NULL
        WHERE id = v_cotizacion_id;
    END IF;
    
    SELECT 'Venta anulada exitosamente' as mensaje;
END//

DELIMITER ;
