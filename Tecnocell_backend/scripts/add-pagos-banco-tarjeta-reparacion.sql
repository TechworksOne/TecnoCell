-- ============================================================
-- Migración: Pagos banco/tarjeta en completar reparación
-- Ejecutar una sola vez. Segura para re-ejecutar.
-- ============================================================

-- 1. Nuevas columnas en reparaciones para banco/tarjeta/interés
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_id   INT          DEFAULT NULL  COMMENT 'FK a cuentas_bancarias para pago por banco/tarjeta',
  ADD COLUMN IF NOT EXISTS porcentaje_interes   DECIMAL(5,2) DEFAULT 0.00  COMMENT '% de recargo por tarjeta',
  ADD COLUMN IF NOT EXISTS interes_monto        INT          DEFAULT 0     COMMENT 'Monto del recargo en centavos',
  ADD COLUMN IF NOT EXISTS referencia_pago      VARCHAR(255) DEFAULT NULL  COMMENT 'Nro autorización / referencia transferencia';
