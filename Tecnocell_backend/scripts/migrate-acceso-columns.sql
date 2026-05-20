-- Migración: Añadir columnas de método de acceso a la tabla reparaciones
-- Fecha: 2026-05-19
-- Ejecutar en la base de datos: tecnocell_web

USE tecnocell_web;

ALTER TABLE reparaciones
  ADD COLUMN acceso_tipo VARCHAR(20) NOT NULL DEFAULT 'ninguno' AFTER patron_contrasena,
  ADD COLUMN acceso_valor TEXT NULL AFTER acceso_tipo;

-- Valores esperados para acceso_tipo: 'ninguno', 'pin', 'patron'
-- acceso_valor: NULL si ninguno, texto libre si pin, '1-2-5-8' si patron

-- Migrar registros existentes con patron_contrasena => acceso_tipo='pin', acceso_valor=patron_contrasena
UPDATE reparaciones
SET acceso_tipo  = 'pin',
    acceso_valor = patron_contrasena
WHERE patron_contrasena IS NOT NULL
  AND patron_contrasena <> '';
