-- ============================================================
-- Migración: Ampliar métodos de pago en ventas y reparaciones
-- Ejecutar una sola vez en producción/desarrollo
-- Fecha: 2026-05-03
-- ============================================================

-- 1. Ampliar ENUM en ventas.metodo_pago
--    Agrega TARJETA_BAC, TARJETA_NEONET, TARJETA_OTRA
--    Mantiene valores existentes: EFECTIVO, TARJETA, TRANSFERENCIA, MIXTO
ALTER TABLE ventas
  MODIFY COLUMN metodo_pago
    ENUM('EFECTIVO','TARJETA','TARJETA_BAC','TARJETA_NEONET','TARJETA_OTRA','TRANSFERENCIA','MIXTO')
    DEFAULT NULL;

-- 2. Ampliar ENUM en reparaciones.metodo_anticipo
--    Agrega tarjeta_bac, tarjeta_neonet, tarjeta_otra
--    Mantiene valores existentes: efectivo, transferencia
ALTER TABLE reparaciones
  MODIFY COLUMN metodo_anticipo
    ENUM('efectivo','transferencia','tarjeta_bac','tarjeta_neonet','tarjeta_otra')
    DEFAULT NULL;

-- Verificar resultado
SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('ventas', 'reparaciones')
  AND COLUMN_NAME IN ('metodo_pago', 'metodo_anticipo');
