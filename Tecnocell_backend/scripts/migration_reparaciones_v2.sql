-- ============================================================
-- Migración: Módulo Reparaciones v2
-- Agrega: monto_pagado_adicional, metodo_pago_adicional,
--         fecha_cancelacion, motivo_cancelacion
-- Ejecutar una sola vez. Usa IF NOT EXISTS para ser idempotente.
-- ============================================================

-- 1. Monto del pago de saldo pendiente (en centavos, igual que monto_anticipo)
ALTER TABLE `reparaciones`
  ADD COLUMN IF NOT EXISTS `monto_pagado_adicional` int(11) NOT NULL DEFAULT 0
    COMMENT 'Pago del saldo restante (centavos)'
    AFTER `saldo_anticipo`;

-- 2. Método de pago del saldo pendiente
ALTER TABLE `reparaciones`
  ADD COLUMN IF NOT EXISTS `metodo_pago_adicional` enum('efectivo','tarjeta') DEFAULT NULL
    COMMENT 'Método del pago de saldo'
    AFTER `monto_pagado_adicional`;

-- 3. Fecha de cancelación
ALTER TABLE `reparaciones`
  ADD COLUMN IF NOT EXISTS `fecha_cancelacion` date DEFAULT NULL
    COMMENT 'Fecha en que se canceló la reparación'
    AFTER `fecha_cierre`;

-- 4. Motivo de cancelación
ALTER TABLE `reparaciones`
  ADD COLUMN IF NOT EXISTS `motivo_cancelacion` text DEFAULT NULL
    COMMENT 'Motivo de la cancelación'
    AFTER `fecha_cancelacion`;
