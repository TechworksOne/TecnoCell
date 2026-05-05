-- ============================================================
-- Migración: Garantía y Reingreso por Garantía
-- Fecha: 2026-05-04
-- ============================================================

-- Agregar columnas al módulo de reparaciones
ALTER TABLE `reparaciones`
  ADD COLUMN `fecha_entrega`    DATETIME NULL      COMMENT 'Fecha/hora exacta de entrega al cliente' AFTER `fecha_cierre`,
  ADD COLUMN `es_garantia`      TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = reparación activa por reingreso de garantía' AFTER `garantia_meses`,
  ADD COLUMN `motivo_garantia`  TEXT NULL           COMMENT 'Motivo del reingreso por garantía' AFTER `es_garantia`,
  ADD COLUMN `repuesto_garantia` TEXT NULL          COMMENT 'Repuesto afectado indicado al reingresar' AFTER `motivo_garantia`,
  ADD COLUMN `fecha_reingreso`  DATETIME NULL       COMMENT 'Fecha/hora del último reingreso por garantía' AFTER `repuesto_garantia`;
