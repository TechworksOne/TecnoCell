-- Migración: cambiar UNIQUE de solo 'nombre' a '(nombre, tipo_equipo)' en equipos_marcas
-- Esto permite que la misma marca exista en diferentes tipos de equipo
-- Ej: 'Apple' en Telefono Y 'Apple' en Laptop

USE tecnocell_web;

-- 1. Eliminar el índice UNIQUE actual sobre 'nombre'
ALTER TABLE equipos_marcas DROP INDEX nombre;

-- 2. Agregar UNIQUE compuesto sobre (nombre, tipo_equipo)
ALTER TABLE equipos_marcas ADD UNIQUE KEY unique_nombre_tipo (nombre, tipo_equipo);
