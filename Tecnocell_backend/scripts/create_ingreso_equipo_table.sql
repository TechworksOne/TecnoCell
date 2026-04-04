-- Tabla para checklist de ingreso de equipos en reparación
CREATE TABLE IF NOT EXISTS ingreso_equipo_checklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reparacion_id VARCHAR(50) NOT NULL,
  tipo_equipo ENUM('Telefono', 'Computadora', 'Tablet', 'Consola', 'Otro') NOT NULL,
  
  -- Checks generales (JSON)
  checks JSON NOT NULL,
  
  -- Fotos del equipo al momento del ingreso
  fotos JSON DEFAULT NULL,
  
  -- Observaciones adicionales
  observaciones TEXT DEFAULT NULL,
  
  -- Fechas
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (reparacion_id) REFERENCES reparaciones(id) ON DELETE CASCADE,
  
  -- Índices
  INDEX idx_reparacion (reparacion_id),
  INDEX idx_tipo_equipo (tipo_equipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios explicativos
ALTER TABLE ingreso_equipo_checklist 
  COMMENT = 'Checklist de ingreso de equipos con checks específicos por tipo de dispositivo';

-- Ejemplos de estructura JSON para checks:

-- TELEFONO:
-- {
--   "equipoEnciende": true,
--   "daFlash": true,
--   "bocinaSuperior": true,
--   "bocinaInferior": true,
--   "faceId": false,
--   "touchId": true,
--   "camara05x": true,
--   "camara10x": true,
--   "camara30x": false,
--   "camaraFrontal": true,
--   "microfono": true,
--   "vibracion": true,
--   "wifi": true,
--   "bluetooth": true,
--   "pantallaCompleta": true,
--   "tactil": true,
--   "botonSubirVolumen": true,
--   "botonBajarVolumen": true,
--   "botonPower": true,
--   "puertoCarga": true,
--   "cargaInalambrica": false,
--   "entradaAudifono": true
-- }

-- TABLET:
-- {
--   "equipoEnciende": true,
--   "tactil": true,
--   "camara05x": true,
--   "camara10x": true,
--   "camara30x": false,
--   "camaraFrontal": true,
--   "bocinas": true,
--   "microfono": true,
--   "wifi": true,
--   "bluetooth": true,
--   "botonSubirVolumen": true,
--   "botonBajarVolumen": true,
--   "botonPower": true,
--   "puertoCarga": true,
--   "cargaInalambrica": false,
--   "bateria": true
-- }

-- COMPUTADORA:
-- {
--   "equipoEnciende": true,
--   "pantalla": true,
--   "teclado": true,
--   "touchpad": true,
--   "puertosUSB": true,
--   "puertoHDMI": true,
--   "wifi": true,
--   "bluetooth": true,
--   "camara": true,
--   "microfono": true,
--   "bocinas": true,
--   "bateria": true,
--   "cargador": true,
--   "ventilador": true
-- }
