-- Tabla de interacciones con clientes
CREATE TABLE IF NOT EXISTS interacciones_clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  tipo ENUM('cotizacion', 'venta', 'reparacion', 'visita') NOT NULL,
  referencia_id INT NULL COMMENT 'ID de la cotización/venta/reparación relacionada',
  monto DECIMAL(10,2) NULL COMMENT 'Monto de la transacción si aplica',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL COMMENT 'Usuario que registró la interacción',
  
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_cliente_tipo (cliente_id, tipo),
  INDEX idx_fecha (created_at),
  INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista para resumen rápido de interacciones por cliente
CREATE OR REPLACE VIEW v_resumen_clientes AS
SELECT 
  c.id as cliente_id,
  c.nombre,
  c.apellido,
  COUNT(i.id) as total_interacciones,
  SUM(CASE WHEN i.tipo = 'cotizacion' THEN 1 ELSE 0 END) as total_cotizaciones,
  SUM(CASE WHEN i.tipo = 'venta' THEN 1 ELSE 0 END) as total_ventas,
  SUM(CASE WHEN i.tipo = 'reparacion' THEN 1 ELSE 0 END) as total_reparaciones,
  SUM(CASE WHEN i.tipo = 'visita' THEN 1 ELSE 0 END) as total_visitas,
  COALESCE(SUM(CASE WHEN i.tipo = 'venta' THEN i.monto ELSE 0 END), 0) as total_gastado,
  MAX(i.created_at) as ultima_interaccion
FROM clientes c
LEFT JOIN interacciones_clientes i ON c.id = i.cliente_id
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellido;
