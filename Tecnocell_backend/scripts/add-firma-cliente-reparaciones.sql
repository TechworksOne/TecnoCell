-- ============================================================
-- Migración: Firma del cliente en reparaciones
-- Ejecutar una sola vez. Segura para re-ejecutar.
-- ============================================================

ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS firma_cliente_url       VARCHAR(255) DEFAULT NULL  COMMENT 'Ruta relativa al PNG de la firma del cliente',
  ADD COLUMN IF NOT EXISTS firma_estado            VARCHAR(30)  DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE | FIRMADO',
  ADD COLUMN IF NOT EXISTS firmado_at              DATETIME     DEFAULT NULL  COMMENT 'Fecha y hora de la firma',
  ADD COLUMN IF NOT EXISTS firmado_por_usuario_id  INT          DEFAULT NULL  COMMENT 'FK users.id del técnico que registró la firma (req.user.id)';
