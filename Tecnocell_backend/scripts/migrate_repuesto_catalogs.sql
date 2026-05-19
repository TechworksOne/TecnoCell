-- =============================================================================
-- Migración: Catálogos jerárquicos de repuestos
-- Tablas: repuesto_tipos, repuesto_marcas, repuesto_lineas
-- Ejecutar en la base de datos tecnocell_web
-- =============================================================================

-- ── 1. Crear tabla repuesto_tipos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `repuesto_tipos` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `nombre`     VARCHAR(100) NOT NULL,
  `activo`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repuesto_tipos_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Crear tabla repuesto_marcas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `repuesto_marcas` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `tipo_id`    INT(11)      NOT NULL,
  `nombre`     VARCHAR(100) NOT NULL,
  `activo`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repuesto_marcas_tipo_nombre` (`tipo_id`, `nombre`),
  CONSTRAINT `fk_rmarca_tipo` FOREIGN KEY (`tipo_id`)
    REFERENCES `repuesto_tipos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Crear tabla repuesto_lineas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `repuesto_lineas` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `tipo_id`    INT(11)      NOT NULL,
  `marca_id`   INT(11)      NOT NULL,
  `nombre`     VARCHAR(100) NOT NULL,
  `activo`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repuesto_lineas` (`tipo_id`, `marca_id`, `nombre`),
  CONSTRAINT `fk_rlinea_tipo`  FOREIGN KEY (`tipo_id`)  REFERENCES `repuesto_tipos`  (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rlinea_marca` FOREIGN KEY (`marca_id`) REFERENCES `repuesto_marcas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Alterar tabla repuestos: cambiar ENUMs por VARCHAR ────────────────────
--    Esto permite almacenar cualquier tipo/marca proveniente del catálogo.
ALTER TABLE `repuestos`
  MODIFY COLUMN `tipo`  VARCHAR(100) NOT NULL DEFAULT 'Otro',
  MODIFY COLUMN `marca` VARCHAR(100) NOT NULL DEFAULT '';

-- ── 5. Seed: repuesto_tipos ──────────────────────────────────────────────────
INSERT IGNORE INTO `repuesto_tipos` (`nombre`) VALUES
  ('Pantalla'),
  ('Batería'),
  ('Cámara'),
  ('Flex'),
  ('Placa'),
  ('Back Cover'),
  ('Altavoz'),
  ('Conector'),
  ('Otro');

-- ── 6. Seed: repuesto_marcas (todas las marcas para cada tipo) ───────────────
--    Genera la combinación de 9 tipos × 14 marcas = 126 filas.
INSERT IGNORE INTO `repuesto_marcas` (`tipo_id`, `nombre`)
SELECT t.id, m.nombre
FROM `repuesto_tipos` t
CROSS JOIN (
  SELECT 'Apple'    AS nombre UNION ALL
  SELECT 'Samsung'            UNION ALL
  SELECT 'Xiaomi'             UNION ALL
  SELECT 'Motorola'           UNION ALL
  SELECT 'Huawei'             UNION ALL
  SELECT 'LG'                 UNION ALL
  SELECT 'Nokia'              UNION ALL
  SELECT 'Oppo'               UNION ALL
  SELECT 'Vivo'               UNION ALL
  SELECT 'Realme'             UNION ALL
  SELECT 'OnePlus'            UNION ALL
  SELECT 'Sony'               UNION ALL
  SELECT 'Google'             UNION ALL
  SELECT 'Otra'
) m
ORDER BY t.id, m.nombre;

-- ── 7. Seed: repuesto_lineas para Pantalla + Apple (iPhone) ─────────────────
INSERT IGNORE INTO `repuesto_lineas` (`tipo_id`, `marca_id`, `nombre`)
SELECT t.id, rm.id, linea.nombre
FROM `repuesto_tipos` t
JOIN `repuesto_marcas` rm ON rm.tipo_id = t.id AND rm.nombre = 'Apple'
CROSS JOIN (
  SELECT 'iPhone SE'  AS nombre UNION ALL SELECT 'iPhone 7'  UNION ALL
  SELECT 'iPhone 8'             UNION ALL SELECT 'iPhone X'  UNION ALL
  SELECT 'iPhone XR'            UNION ALL SELECT 'iPhone XS' UNION ALL
  SELECT 'iPhone 11'            UNION ALL SELECT 'iPhone 12' UNION ALL
  SELECT 'iPhone 13'            UNION ALL SELECT 'iPhone 14' UNION ALL
  SELECT 'iPhone 15'            UNION ALL SELECT 'iPhone 16' UNION ALL
  SELECT 'iPad'                 UNION ALL SELECT 'iPad Mini' UNION ALL
  SELECT 'iPad Air'             UNION ALL SELECT 'iPad Pro'  UNION ALL
  SELECT 'MacBook'              UNION ALL SELECT 'MacBook Air' UNION ALL
  SELECT 'MacBook Pro'          UNION ALL SELECT 'iMac'      UNION ALL
  SELECT 'Apple Watch'
) linea
WHERE t.nombre = 'Pantalla';

-- ── 8. Seed: repuesto_lineas para Pantalla + Samsung ────────────────────────
INSERT IGNORE INTO `repuesto_lineas` (`tipo_id`, `marca_id`, `nombre`)
SELECT t.id, rm.id, linea.nombre
FROM `repuesto_tipos` t
JOIN `repuesto_marcas` rm ON rm.tipo_id = t.id AND rm.nombre = 'Samsung'
CROSS JOIN (
  SELECT 'Galaxy A03' AS nombre UNION ALL SELECT 'Galaxy A04' UNION ALL
  SELECT 'Galaxy A05'           UNION ALL SELECT 'Galaxy A10' UNION ALL
  SELECT 'Galaxy A12'           UNION ALL SELECT 'Galaxy A13' UNION ALL
  SELECT 'Galaxy A14'           UNION ALL SELECT 'Galaxy A15' UNION ALL
  SELECT 'Galaxy A20'           UNION ALL SELECT 'Galaxy A30' UNION ALL
  SELECT 'Galaxy A50'           UNION ALL SELECT 'Galaxy A51' UNION ALL
  SELECT 'Galaxy A52'           UNION ALL SELECT 'Galaxy A53' UNION ALL
  SELECT 'Galaxy A54'           UNION ALL SELECT 'Galaxy S20' UNION ALL
  SELECT 'Galaxy S21'           UNION ALL SELECT 'Galaxy S22' UNION ALL
  SELECT 'Galaxy S23'           UNION ALL SELECT 'Galaxy S24' UNION ALL
  SELECT 'Galaxy S25'           UNION ALL SELECT 'Galaxy Note 20' UNION ALL
  SELECT 'Galaxy Z Flip'        UNION ALL SELECT 'Galaxy Z Fold' UNION ALL
  SELECT 'Galaxy Tab'
) linea
WHERE t.nombre = 'Pantalla';

-- ── 9. Seed: repuesto_lineas para Batería + Apple ───────────────────────────
INSERT IGNORE INTO `repuesto_lineas` (`tipo_id`, `marca_id`, `nombre`)
SELECT t.id, rm.id, linea.nombre
FROM `repuesto_tipos` t
JOIN `repuesto_marcas` rm ON rm.tipo_id = t.id AND rm.nombre = 'Apple'
CROSS JOIN (
  SELECT 'iPhone SE'  AS nombre UNION ALL SELECT 'iPhone 7'  UNION ALL
  SELECT 'iPhone 8'             UNION ALL SELECT 'iPhone X'  UNION ALL
  SELECT 'iPhone XR'            UNION ALL SELECT 'iPhone XS' UNION ALL
  SELECT 'iPhone 11'            UNION ALL SELECT 'iPhone 12' UNION ALL
  SELECT 'iPhone 13'            UNION ALL SELECT 'iPhone 14' UNION ALL
  SELECT 'iPhone 15'            UNION ALL SELECT 'iPhone 16' UNION ALL
  SELECT 'iPad'                 UNION ALL SELECT 'iPad Mini' UNION ALL
  SELECT 'iPad Air'             UNION ALL SELECT 'iPad Pro'  UNION ALL
  SELECT 'MacBook Air'          UNION ALL SELECT 'MacBook Pro'
) linea
WHERE t.nombre = 'Batería';

-- ── 10. Seed: repuesto_lineas para Cámara + Apple ───────────────────────────
INSERT IGNORE INTO `repuesto_lineas` (`tipo_id`, `marca_id`, `nombre`)
SELECT t.id, rm.id, linea.nombre
FROM `repuesto_tipos` t
JOIN `repuesto_marcas` rm ON rm.tipo_id = t.id AND rm.nombre = 'Apple'
CROSS JOIN (
  SELECT 'iPhone 11' AS nombre UNION ALL SELECT 'iPhone 12' UNION ALL
  SELECT 'iPhone 13'           UNION ALL SELECT 'iPhone 14' UNION ALL
  SELECT 'iPhone 15'           UNION ALL SELECT 'iPhone 16' UNION ALL
  SELECT 'iPad Air'            UNION ALL SELECT 'iPad Pro'
) linea
WHERE t.nombre = 'Cámara';
