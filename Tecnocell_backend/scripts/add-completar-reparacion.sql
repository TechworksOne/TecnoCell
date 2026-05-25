-- ============================================================
-- Migración: Completar reparación con repuestos, regalías y pago
-- Ejecutar una sola vez. Usa IF NOT EXISTS para ser idempotente.
-- ============================================================

-- 1. Nuevas columnas en reparaciones
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS monto_pago_final      INT          DEFAULT 0     COMMENT 'Pago final al completar (centavos)',
  ADD COLUMN IF NOT EXISTS metodo_pago_final     VARCHAR(50)  DEFAULT NULL  COMMENT 'efectivo|transferencia|tarjeta|otro',
  ADD COLUMN IF NOT EXISTS fecha_pago_final      DATE         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observacion_pago_final TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estado_pago           VARCHAR(20)  DEFAULT 'pendiente' COMMENT 'pendiente|parcial|pagado',
  ADD COLUMN IF NOT EXISTS total_pagado          INT          DEFAULT 0     COMMENT 'anticipo + pago final (centavos)',
  ADD COLUMN IF NOT EXISTS ganancia_neta         INT          DEFAULT 0     COMMENT 'total - repuestos - regalias (centavos)',
  ADD COLUMN IF NOT EXISTS costo_repuestos_total INT          DEFAULT 0     COMMENT 'Suma costos repuestos usados (centavos)',
  ADD COLUMN IF NOT EXISTS costo_regalias_total  INT          DEFAULT 0     COMMENT 'Suma costos regalías entregadas (centavos)';

-- 2. Tabla repuestos usados en reparación
CREATE TABLE IF NOT EXISTS reparacion_repuestos (
  id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reparacion_id VARCHAR(50)  NOT NULL,
  repuesto_id   INT          NOT NULL,
  nombre        VARCHAR(255) NOT NULL,
  cantidad      INT          NOT NULL DEFAULT 1,
  costo_unitario INT         NOT NULL DEFAULT 0 COMMENT 'Centavos',
  subtotal      INT          NOT NULL DEFAULT 0 COMMENT 'Centavos',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reparacion (reparacion_id)
);

-- 3. Tabla regalías entregadas en reparación
CREATE TABLE IF NOT EXISTS reparacion_regalias (
  id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reparacion_id   VARCHAR(50)  NOT NULL,
  item_id         INT          NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  tipo_inventario VARCHAR(20)  NOT NULL DEFAULT 'repuesto' COMMENT 'repuesto|producto',
  cantidad        INT          NOT NULL DEFAULT 1,
  costo_unitario  INT          NOT NULL DEFAULT 0 COMMENT 'Centavos',
  subtotal        INT          NOT NULL DEFAULT 0 COMMENT 'Centavos',
  nota            TEXT         DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reparacion (reparacion_id)
);
