USE tecnocell_web;

-- Eliminar el trigger existente
DROP TRIGGER IF EXISTS before_insert_ventas;

-- Recrear el trigger con collation correcta
DELIMITER $$

CREATE TRIGGER before_insert_ventas
BEFORE INSERT ON ventas
FOR EACH ROW
BEGIN
    DECLARE next_num INT;
    DECLARE year_suffix VARCHAR(4);
    
    -- Obtener el año actual
    SET year_suffix = YEAR(CURDATE());
    
    -- Calcular el siguiente número de venta para este año
    -- USAR COLLATE para forzar la misma collation
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_venta, '-', -1) AS UNSIGNED)), 0) + 1
    INTO next_num
    FROM ventas
    WHERE numero_venta COLLATE utf8mb4_unicode_ci LIKE CONCAT('V-', year_suffix, '-%') COLLATE utf8mb4_unicode_ci;
    
    -- Generar el número de venta con formato V-YYYY-NNNN
    SET NEW.numero_venta = CONCAT('V-', year_suffix, '-', LPAD(next_num, 4, '0'));
    
    -- Calcular saldo pendiente
    SET NEW.saldo_pendiente = NEW.total - NEW.monto_pagado;
    
    -- Determinar estado según el pago
    IF NEW.monto_pagado >= NEW.total THEN
        SET NEW.estado = 'PAGADA';
    ELSEIF NEW.monto_pagado > 0 THEN
        SET NEW.estado = 'PARCIAL';
    END IF;
END$$

DELIMITER ;

SELECT 'Trigger before_insert_ventas recreado con collation correcta' AS resultado;
