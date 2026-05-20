-- ============================================================
-- Migración: Órdenes de Trabajo (OT)
-- Agrega trazabilidad de asignación técnica a la tabla reparaciones
-- Ejecutar: mysql -u usuario -p tecnocell_web < migrate-ordenes-trabajo.sql
-- ============================================================

USE tecnocell_web;

-- 1. Agregar columnas de asignación técnica a reparaciones
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS tecnico_asignado_id INT NULL AFTER tecnico_asignado,
  ADD COLUMN IF NOT EXISTS asignado_por        INT NULL AFTER tecnico_asignado_id,
  ADD COLUMN IF NOT EXISTS asignado_en         DATETIME NULL AFTER asignado_por;

-- 2. Agregar índices para consultas frecuentes
ALTER TABLE reparaciones
  ADD INDEX IF NOT EXISTS idx_rep_tecnico_asignado (tecnico_asignado_id),
  ADD INDEX IF NOT EXISTS idx_rep_asignado_en (asignado_en);

-- 3. Foreign keys (seguras: solo se crean si la tabla users existe)
-- Verificar si ya existen antes de agregar para evitar errores en re-ejecución
SET @fk1_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reparaciones'
    AND CONSTRAINT_NAME = 'fk_rep_tecnico_asignado'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @fk2_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reparaciones'
    AND CONSTRAINT_NAME = 'fk_rep_asignado_por'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql1 = IF(@fk1_exists = 0,
  'ALTER TABLE reparaciones ADD CONSTRAINT fk_rep_tecnico_asignado FOREIGN KEY (tecnico_asignado_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1');

SET @sql2 = IF(@fk2_exists = 0,
  'ALTER TABLE reparaciones ADD CONSTRAINT fk_rep_asignado_por FOREIGN KEY (asignado_por) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1');

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 4. Verificar resultado
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'reparaciones'
  AND COLUMN_NAME IN ('tecnico_asignado_id', 'asignado_por', 'asignado_en')
ORDER BY ORDINAL_POSITION;
