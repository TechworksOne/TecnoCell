-- ============================================================
-- Migración: Agenda de Entregas de Reparaciones
-- Fecha: 2026-05-20
-- Propósito: Agregar campos de fecha programada de entrega a
--            la tabla reparaciones para el módulo Agenda.
--            NOTA: fecha_entrega ya existe y se usa como fecha
--            real (momento exacto en que el cliente recoge).
--            Aquí se agrega fecha_entrega_programada que es
--            la fecha PROMETIDA al cliente.
-- ============================================================

ALTER TABLE `reparaciones`
  ADD COLUMN `fecha_entrega_programada` DATETIME NULL
    COMMENT 'Fecha/hora prometida al cliente para recoger el equipo'
    AFTER `fecha_entrega`,
  ADD COLUMN `nota_entrega_programada` TEXT NULL
    COMMENT 'Nota u observación sobre la fecha de entrega prometida'
    AFTER `fecha_entrega_programada`;

-- Índice para búsquedas eficientes en la vista de Agenda
CREATE INDEX `idx_rep_fecha_entrega_prog`
  ON `reparaciones` (`fecha_entrega_programada`);
