-- ============================================
-- AGREGAR COLUMNA CONVERTIDA A COTIZACIONES
-- ============================================
-- Agrega una columna simple para marcar si una cotización fue convertida

ALTER TABLE cotizaciones 
ADD COLUMN convertida TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Indica si la cotización fue convertida (0=No, 1=Sí)';

-- Índice para búsquedas rápidas
CREATE INDEX idx_convertida ON cotizaciones(convertida);

-- Actualizar cotizaciones existentes que tienen estado CONVERTIDA
UPDATE cotizaciones 
SET convertida = 1 
WHERE estado = 'CERRADA' OR estado = 'CONVERTIDA';
