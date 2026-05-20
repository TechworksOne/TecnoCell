-- Migration: Trazabilidad de devoluciones al cancelar reparaciones
-- Ejecutar una sola vez en producción/desarrollo

ALTER TABLE reparaciones
  ADD COLUMN devolucion_monto        DECIMAL(10,2) DEFAULT 0   NULL AFTER motivo_cancelacion,
  ADD COLUMN monto_retenido          DECIMAL(10,2) DEFAULT 0   NULL AFTER devolucion_monto,
  ADD COLUMN motivo_retencion        TEXT          DEFAULT NULL AFTER monto_retenido,
  ADD COLUMN anticipo_movimiento_id  INT           DEFAULT NULL AFTER motivo_retencion,
  ADD COLUMN devolucion_movimiento_id INT          DEFAULT NULL AFTER anticipo_movimiento_id;
