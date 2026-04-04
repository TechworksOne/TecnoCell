-- ============================================
-- ACTUALIZAR TRIGGER: after_insert_ventas_from_quote
-- ============================================
-- Actualiza el trigger para cambiar también la columna convertida

DROP TRIGGER IF EXISTS after_insert_ventas_from_quote;

DELIMITER //

CREATE TRIGGER after_insert_ventas_from_quote
AFTER INSERT ON ventas
FOR EACH ROW
BEGIN
    -- Si la venta viene de una cotización, actualizar estado y marcar como convertida
    IF NEW.cotizacion_id IS NOT NULL THEN
        UPDATE cotizaciones
        SET estado = 'CONVERTIDA',
            convertida = 1,
            convertida_a = 'VENTA',
            referencia_venta_id = NEW.id,
            fecha_conversion = NOW()
        WHERE id = NEW.cotizacion_id;
    END IF;
END//

DELIMITER ;
