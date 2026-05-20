-- ============================================================
-- Migración: Trazabilidad de confirmaciones en Caja y Bancos
-- Agrega: confirmado_en, confirmado_por a las tablas de movimientos
-- Ejecutar una sola vez en producción
-- ============================================================

-- Tabla caja_chica
ALTER TABLE caja_chica
  ADD COLUMN IF NOT EXISTS confirmado_en  DATETIME NULL COMMENT 'Fecha y hora en que el movimiento fue confirmado',
  ADD COLUMN IF NOT EXISTS confirmado_por INT      NULL COMMENT 'ID del usuario que confirmó el movimiento (FK users.id)';

-- Tabla movimientos_bancarios
ALTER TABLE movimientos_bancarios
  ADD COLUMN IF NOT EXISTS confirmado_en  DATETIME NULL COMMENT 'Fecha y hora en que el movimiento fue confirmado',
  ADD COLUMN IF NOT EXISTS confirmado_por INT      NULL COMMENT 'ID del usuario que confirmó el movimiento (FK users.id)';

-- Índices opcionales para consultas por confirmador
ALTER TABLE caja_chica
  ADD INDEX IF NOT EXISTS idx_confirmado_por (confirmado_por);

ALTER TABLE movimientos_bancarios
  ADD INDEX IF NOT EXISTS idx_confirmado_por (confirmado_por);

-- Verificar resultado
SELECT 'caja_chica' AS tabla, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'caja_chica'
  AND COLUMN_NAME IN ('confirmado_en', 'confirmado_por')
UNION ALL
SELECT 'movimientos_bancarios' AS tabla, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'movimientos_bancarios'
  AND COLUMN_NAME IN ('confirmado_en', 'confirmado_por');
