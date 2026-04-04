-- Arreglar collation de la tabla ventas
-- Todas las columnas deben usar utf8mb4_unicode_ci

USE tecnocell_web;

-- Convertir toda la tabla a utf8mb4_unicode_ci
ALTER TABLE ventas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verificar las columnas específicas de texto
ALTER TABLE ventas 
  MODIFY COLUMN numero_venta VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN cliente_nombre VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN cliente_telefono VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN cliente_email VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN cliente_nit VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN cliente_direccion TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN numero_cotizacion VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN tipo_venta ENUM('PRODUCTOS','REPUESTOS','MIXTA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PRODUCTOS',
  MODIFY COLUMN items LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY COLUMN estado ENUM('PENDIENTE','PAGADA','PARCIAL','ANULADA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  MODIFY COLUMN metodo_pago ENUM('EFECTIVO','TARJETA','TRANSFERENCIA','MIXTO') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN pagos LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN observaciones TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN notas_internas TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN factura_numero VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY COLUMN factura_uuid VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT 'Collation de tabla ventas corregida exitosamente' AS resultado;
