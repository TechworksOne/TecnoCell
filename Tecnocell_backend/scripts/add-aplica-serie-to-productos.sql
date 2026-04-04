-- Agregar campo aplica_serie a la tabla productos
-- Este campo indica si el producto requiere número de serie/IMEI

ALTER TABLE productos
ADD COLUMN aplica_serie BOOLEAN DEFAULT FALSE AFTER stock_minimo,
ADD COLUMN sku_generado BOOLEAN DEFAULT FALSE AFTER aplica_serie;

-- Comentario de las columnas
ALTER TABLE productos 
MODIFY COLUMN aplica_serie BOOLEAN DEFAULT FALSE COMMENT 'Indica si el producto requiere número de serie/IMEI',
MODIFY COLUMN sku_generado BOOLEAN DEFAULT FALSE COMMENT 'Indica si el SKU fue generado automáticamente';
