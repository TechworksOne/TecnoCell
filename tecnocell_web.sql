-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 16-03-2026 a las 20:26:02
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `tecnocell_web`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_anular_venta` (IN `p_venta_id` INT, IN `p_motivo` TEXT, IN `p_usuario_id` INT)   BEGIN
    DECLARE v_cotizacion_id INT;
    
    
    SELECT cotizacion_id INTO v_cotizacion_id
    FROM ventas WHERE id = p_venta_id;
    
    
    UPDATE ventas
    SET estado = 'ANULADA',
        notas_internas = CONCAT(COALESCE(notas_internas, ''), '\nANULADA: ', p_motivo, ' - ', NOW()),
        updated_by = p_usuario_id
    WHERE id = p_venta_id;
    
    
    IF v_cotizacion_id IS NOT NULL THEN
        UPDATE cotizaciones
        SET estado = 'ENVIADA',
            convertida_a = NULL,
            referencia_venta_id = NULL,
            fecha_conversion = NULL
        WHERE id = v_cotizacion_id;
    END IF;
    
    SELECT 'Venta anulada exitosamente' as mensaje;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cotizaciones_proximas_vencer` (IN `dias_anticipacion` INT)   BEGIN
    SELECT 
        cot.id,
        cot.numero_cotizacion,
        cot.cliente_nombre,
        cot.cliente_telefono,
        cot.fecha_emision,
        cot.fecha_vencimiento,
        DATEDIFF(cot.fecha_vencimiento, CURDATE()) AS dias_restantes,
        cot.total,
        cot.estado
    FROM cotizaciones cot
    WHERE cot.estado IN ('ENVIADA', 'BORRADOR')
        AND cot.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL dias_anticipacion DAY)
    ORDER BY cot.fecha_vencimiento ASC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_movimiento_repuesto` (IN `p_repuesto_id` INT, IN `p_tipo_movimiento` VARCHAR(20), IN `p_cantidad` INT, IN `p_precio_unitario` INT, IN `p_referencia_tipo` VARCHAR(20), IN `p_referencia_id` INT, IN `p_usuario_id` INT, IN `p_notas` TEXT)   BEGIN
  DECLARE v_stock_actual INT;
  DECLARE v_stock_nuevo INT;
  
  
  SELECT stock INTO v_stock_actual FROM repuestos WHERE id = p_repuesto_id;
  
  
  IF p_tipo_movimiento IN ('ENTRADA', 'DEVOLUCION') THEN
    SET v_stock_nuevo = v_stock_actual + p_cantidad;
  ELSEIF p_tipo_movimiento IN ('SALIDA', 'VENTA', 'REPARACION') THEN
    SET v_stock_nuevo = v_stock_actual - p_cantidad;
  ELSE  
    SET v_stock_nuevo = p_cantidad;
  END IF;
  
  
  IF v_stock_nuevo < 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Stock insuficiente para realizar el movimiento';
  END IF;
  
  
  INSERT INTO repuestos_movimientos (
    repuesto_id, tipo_movimiento, cantidad, 
    stock_anterior, stock_nuevo, precio_unitario,
    referencia_tipo, referencia_id, usuario_id, notas
  ) VALUES (
    p_repuesto_id, p_tipo_movimiento, p_cantidad,
    v_stock_actual, v_stock_nuevo, p_precio_unitario,
    p_referencia_tipo, p_referencia_id, p_usuario_id, p_notas
  );
  
  
  UPDATE repuestos SET stock = v_stock_nuevo WHERE id = p_repuesto_id;
  
  SELECT 'Movimiento registrado exitosamente' AS mensaje, v_stock_nuevo AS nuevo_stock;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_registrar_pago_venta` (IN `p_venta_id` INT, IN `p_monto` INT, IN `p_metodo` VARCHAR(20), IN `p_referencia` VARCHAR(100), IN `p_comprobante_url` TEXT, IN `p_usuario_id` INT)   BEGIN
    DECLARE current_pagos JSON;
    DECLARE new_pago JSON;
    DECLARE nuevo_monto_pagado INT;
    
    
    SELECT pagos, monto_pagado INTO current_pagos, nuevo_monto_pagado
    FROM ventas WHERE id = p_venta_id;
    
    
    SET new_pago = JSON_OBJECT(
        'metodo', p_metodo,
        'monto', p_monto,
        'referencia', p_referencia,
        'comprobanteUrl', p_comprobante_url,
        'fecha', NOW(),
        'usuario_id', p_usuario_id
    );
    
    
    IF current_pagos IS NULL THEN
        SET current_pagos = JSON_ARRAY(new_pago);
    ELSE
        SET current_pagos = JSON_ARRAY_APPEND(current_pagos, '$', new_pago);
    END IF;
    
    
    SET nuevo_monto_pagado = nuevo_monto_pagado + p_monto;
    
    UPDATE ventas
    SET pagos = current_pagos,
        monto_pagado = nuevo_monto_pagado,
        metodo_pago = IF(JSON_LENGTH(current_pagos) > 1, 'MIXTO', p_metodo),
        updated_by = p_usuario_id
    WHERE id = p_venta_id;
    
    SELECT 'Pago registrado exitosamente' as mensaje;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `icono` varchar(50) DEFAULT NULL,
  `orden` int(11) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `icono`, `orden`, `activo`, `created_at`) VALUES
(1, 'vidrios', NULL, 99, 1, '2025-12-30 03:18:39'),
(2, 'telefonos', NULL, 99, 1, '2025-12-30 03:33:24'),
(3, 'COMPUTADORAS', NULL, 99, 1, '2025-12-31 21:46:43'),
(4, 'ESTUCHES', NULL, 99, 1, '2026-01-07 04:17:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `metodo_pago_preferido` enum('efectivo','tarjeta','credito-tecnocell') DEFAULT 'efectivo',
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `nombre`, `apellido`, `telefono`, `nit`, `email`, `direccion`, `metodo_pago_preferido`, `notas`, `created_at`, `updated_at`, `activo`) VALUES
(1, 'Juan Pérez', NULL, '5551-2345', '12345678-9', 'juan.perez@email.com', 'Zona 1, Ciudad de Guatemala', 'efectivo', NULL, '2025-12-19 01:50:58', '2025-12-30 17:07:01', 1),
(2, 'María García', NULL, '5555-6789', '98765432-1', 'maria.garcia@email.com', 'Zona 10, Ciudad de Guatemala', 'efectivo', NULL, '2025-12-19 01:50:58', '2025-12-30 17:07:01', 1),
(3, 'Carlos López', NULL, '5559-8765', 'CF', 'carlos.lopez@email.com', 'Mixco, Guatemala', 'efectivo', NULL, '2025-12-19 01:50:58', '2025-12-30 17:07:01', 1),
(4, 'Ana Rodríguez', NULL, '5554-3210', '55555555-5', 'ana.rodriguez@email.com', 'Villa Nueva, Guatemala', 'efectivo', NULL, '2025-12-19 01:50:58', '2025-12-30 17:07:01', 1),
(8, 'Brennere', 'Granados', '5567-2789', '52525252', 'brenner@gmail.com', 'Zacapa,zacapa', 'efectivo', 'sss', '2025-12-30 17:31:11', '2025-12-30 17:31:11', 1),
(9, 'Zoila Magdalena ', 'Sosa Madrid', '3237-2976', '1559578-1', NULL, 'Las vegas', 'tarjeta', 'Cliente guapa', '2025-12-31 21:52:54', '2025-12-31 21:52:54', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cotizaciones`
--

CREATE TABLE `cotizaciones` (
  `id` int(11) NOT NULL,
  `numero_cotizacion` varchar(20) NOT NULL COMMENT 'N├║mero ├║nico de cotizaci├│n (ej: COT-2025-0001)',
  `cliente_id` int(11) NOT NULL,
  `cliente_nombre` varchar(200) NOT NULL COMMENT 'Nombre completo del cliente (desnormalizado para hist├│rico)',
  `cliente_telefono` varchar(20) DEFAULT NULL,
  `cliente_email` varchar(100) DEFAULT NULL,
  `cliente_nit` varchar(20) DEFAULT NULL,
  `cliente_direccion` text DEFAULT NULL,
  `tipo` enum('VENTA','REPARACION') NOT NULL DEFAULT 'VENTA',
  `fecha_emision` date NOT NULL,
  `vigencia_dias` int(11) NOT NULL DEFAULT 15 COMMENT 'D├¡as de validez de la cotizaci├│n',
  `fecha_vencimiento` date NOT NULL COMMENT 'Calculado: fecha_emision + vigencia_dias',
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Array de items: [{id, source, refId, nombre, cantidad, precioUnit, subtotal, aplicarImpuestos, notas}]' CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `impuestos` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'IVA calculado sobre items con aplicarImpuestos=true',
  `mano_de_obra` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Solo para tipo REPARACION',
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `aplicar_impuestos` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Si la cotizaci├│n maneja impuestos',
  `estado` enum('BORRADOR','ENVIADA','APROBADA','RECHAZADA','VENCIDA','CONVERTIDA') NOT NULL DEFAULT 'BORRADOR',
  `observaciones` text DEFAULT NULL,
  `notas_internas` text DEFAULT NULL COMMENT 'Notas privadas no visibles en la cotizaci├│n impresa',
  `convertida_a` enum('VENTA','REPARACION') DEFAULT NULL,
  `referencia_venta_id` int(11) DEFAULT NULL COMMENT 'ID de la venta si fue convertida',
  `referencia_reparacion_id` int(11) DEFAULT NULL COMMENT 'ID de la reparaci├│n si fue convertida',
  `fecha_conversion` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL COMMENT 'ID del usuario que cre├│ la cotizaci├│n',
  `updated_by` int(11) DEFAULT NULL COMMENT 'ID del usuario que modific├│ la cotizaci├│n',
  `convertida` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Indica si la cotizaci├│n fue convertida (0=No, 1=S├¡)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cotizaciones`
--

INSERT INTO `cotizaciones` (`id`, `numero_cotizacion`, `cliente_id`, `cliente_nombre`, `cliente_telefono`, `cliente_email`, `cliente_nit`, `cliente_direccion`, `tipo`, `fecha_emision`, `vigencia_dias`, `fecha_vencimiento`, `items`, `subtotal`, `impuestos`, `mano_de_obra`, `total`, `aplicar_impuestos`, `estado`, `observaciones`, `notas_internas`, `convertida_a`, `referencia_venta_id`, `referencia_reparacion_id`, `fecha_conversion`, `created_at`, `updated_at`, `created_by`, `updated_by`, `convertida`) VALUES
(1, 'COT-2025-1.00', 8, 'Brennere Granados', '5567-2789', 'brenner@gmail.com', '52525252', 'Zacapa,zacapa', 'VENTA', '2025-12-31', 15, '2026-01-15', '[{\"id\":\"1767173929364-0.995002219867352\",\"source\":\"PRODUCTO\",\"refId\":\"1\",\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false},{\"id\":\"1767173929364-0.49954896681304695\",\"source\":\"PRODUCTO\",\"refId\":\"2\",\"nombre\":\"Vidrios iphone 12 normal \",\"cantidad\":2,\"precioUnit\":20,\"subtotal\":40,\"aplicarImpuestos\":false}]', 60.00, 0.00, 0.00, 60.00, 0, 'CONVERTIDA', NULL, NULL, 'VENTA', 7, NULL, '2026-01-04 21:50:48', '2025-12-31 09:39:01', '2026-01-05 03:50:48', 1, NULL, 1),
(2, 'COT-2025-2.00', 1, 'Juan Pérez ', '5551-2345', 'juan.perez@email.com', '12345678-9', 'Zona 1, Ciudad de Guatemala', 'VENTA', '2025-12-31', 15, '2026-01-15', '[{\"id\":\"1767174458841-0.35695694183751536\",\"source\":\"PRODUCTO\",\"refId\":\"2\",\"nombre\":\"Vidrios iphone 12 normal \",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false}]', 20.00, 0.00, 0.00, 20.00, 0, 'CONVERTIDA', NULL, NULL, 'VENTA', 8, NULL, '2026-01-04 21:51:11', '2025-12-31 09:47:42', '2026-01-05 03:51:11', 1, NULL, 1),
(3, 'COT-2025-3.00', 1, 'Juan Pérez ', '5551-2345', 'juan.perez@email.com', '12345678-9', 'Zona 1, Ciudad de Guatemala', 'VENTA', '2025-12-31', 15, '2026-01-15', '[{\"id\":\"1767174632080-0.8539196625606006\",\"source\":\"PRODUCTO\",\"refId\":\"2\",\"nombre\":\"Vidrios iphone 12 normal \",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false}]', 20.00, 0.00, 0.00, 20.00, 0, 'BORRADOR', NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-31 09:50:35', '2025-12-31 09:50:35', 1, NULL, 0),
(4, 'COT-2025-4.00', 2, 'María García ', '5555-6789', 'maria.garcia@email.com', '98765432-1', 'Zona 10, Ciudad de Guatemala', 'VENTA', '2025-12-31', 20, '2026-01-20', '[{\"id\":\"1767204067326-0.6396039577662833\",\"source\":\"PRODUCTO\",\"refId\":\"1\",\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false}]', 20.00, 0.00, 0.00, 20.00, 0, 'CONVERTIDA', 'venta c9ntado ', NULL, 'VENTA', 2, NULL, '2026-01-03 19:10:33', '2025-12-31 18:01:20', '2026-01-04 01:10:33', 1, NULL, 1),
(5, 'COT-2025-5.00', 9, 'Zoila Magdalena  Sosa Madrid', '3237-2976', NULL, '1559578-1', 'Las vegas', 'VENTA', '2025-12-31', 16, '2026-01-16', '[{\"id\":\"1767218013891-0.3651246755355455\",\"source\":\"PRODUCTO\",\"refId\":\"3\",\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":3,\"precioUnit\":400,\"subtotal\":1200,\"aplicarImpuestos\":false}]', 1200.00, 0.00, 0.00, 1200.00, 0, 'BORRADOR', 'cliente se compromete a venir en 3 días', NULL, NULL, NULL, NULL, NULL, '2025-12-31 21:54:02', '2025-12-31 21:54:02', 1, NULL, 0),
(6, 'COT-2026-1.00', 9, 'Zoila Magdalena  Sosa Madrid', '3237-2976', NULL, '1559578-1', 'Las vegas', 'VENTA', '2026-01-03', 15, '2026-01-18', '[{\"id\":\"1767459375389-0.7966779719384878\",\"source\":\"PRODUCTO\",\"refId\":\"3\",\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precioUnit\":400,\"subtotal\":400,\"aplicarImpuestos\":false}]', 400.00, 0.00, 0.00, 400.00, 0, 'BORRADOR', 'vneta nueva', NULL, NULL, NULL, NULL, NULL, '2026-01-03 16:56:24', '2026-01-03 16:56:24', 1, NULL, 0),
(7, 'COT-2026-2.00', 1, 'Juan Pérez ', '5551-2345', 'juan.perez@email.com', '12345678-9', 'Zona 1, Ciudad de Guatemala', 'VENTA', '2026-01-03', 2, '2026-01-05', '[{\"id\":\"1767462084373-0.2012070134369197\",\"source\":\"PRODUCTO\",\"refId\":\"3\",\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precioUnit\":400,\"subtotal\":400,\"aplicarImpuestos\":false}]', 400.00, 0.00, 0.00, 400.00, 0, 'ENVIADA', 'Venta de prueba', NULL, NULL, NULL, NULL, NULL, '2026-01-03 17:41:39', '2026-01-03 17:46:19', NULL, NULL, 0),
(8, 'COT-2026-3.00', 3, 'Carlos López ', '5559-8765', 'carlos.lopez@email.com', 'CF', 'Mixco, Guatemala', 'VENTA', '2026-01-05', 15, '2026-01-20', '[{\"id\":\"1767584843710-0.6925317813136136\",\"source\":\"PRODUCTO\",\"refId\":\"3\",\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precioUnit\":400,\"subtotal\":400,\"aplicarImpuestos\":false}]', 400.00, 0.00, 0.00, 400.00, 0, 'BORRADOR', 'CLIENTE OK', NULL, NULL, NULL, NULL, NULL, '2026-01-05 03:48:10', '2026-01-05 03:48:10', NULL, NULL, 0),
(9, 'COT-2026-4.00', 1, 'Juan Pérez ', '5551-2345', 'juan.perez@email.com', '12345678-9', 'Zona 1, Ciudad de Guatemala', 'VENTA', '2026-01-06', 15, '2026-01-21', '[{\"id\":\"1767742221946-0.7956678140340254\",\"source\":\"PRODUCTO\",\"refId\":\"3\",\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precioUnit\":400,\"subtotal\":400,\"aplicarImpuestos\":false}]', 400.00, 0.00, 0.00, 400.00, 0, 'BORRADOR', 'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', NULL, NULL, NULL, NULL, NULL, '2026-01-06 23:30:27', '2026-01-06 23:30:27', NULL, NULL, 0),
(10, 'COT-2026-5.00', 9, 'Zoila Magdalena  Sosa Madrid', '3237-2976', NULL, '1559578-1', 'Las vegas', 'REPARACION', '2026-01-23', 15, '2026-02-07', '[{\"id\":\"1769139553970-0.7119197724423306\",\"source\":\"REPUESTO\",\"refId\":\"13\",\"nombre\":\"Pantalla iphone 11 rajada\",\"cantidad\":1,\"precioUnit\":600,\"subtotal\":600}]', 600.00, 0.00, 10.00, 610.00, 0, 'BORRADOR', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-23 03:40:47', '2026-01-23 03:40:47', NULL, NULL, 0),
(11, 'COT-2026-6.00', 9, 'Zoila Magdalena  Sosa Madrid', '3237-2976', NULL, '1559578-1', 'Las vegas', 'VENTA', '2026-01-24', 15, '2026-02-08', '[{\"id\":\"1769278126558-0.7407416813000458\",\"source\":\"PRODUCTO\",\"refId\":\"4\",\"nombre\":\"estuche spigen iphone 12 \",\"cantidad\":1,\"precioUnit\":149.97,\"subtotal\":149.97,\"aplicarImpuestos\":false}]', 149.97, 0.00, 0.00, 149.97, 0, 'BORRADOR', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 18:08:50', '2026-01-24 18:08:50', NULL, NULL, 0),
(12, 'COT-2026-7.00', 9, 'Zoila Magdalena  Sosa Madrid', '3237-2976', NULL, '1559578-1', 'Las vegas', 'REPARACION', '2026-01-24', 15, '2026-02-08', '[{\"id\":\"1769280822878-0.10239901693285514\",\"source\":\"REPUESTO\",\"refId\":\"13\",\"nombre\":\"Pantalla iphone 11 rajada\",\"cantidad\":1,\"precioUnit\":600,\"subtotal\":600}]', 600.00, 0.00, 0.00, 600.00, 0, 'BORRADOR', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 18:53:46', '2026-01-24 18:53:46', NULL, NULL, 0),
(13, 'COT-2026-8.00', 9, 'Zoila Magdalena  Sosa Madrid', '3237-2976', NULL, '1559578-1', 'Las vegas', 'VENTA', '2026-01-25', 15, '2026-02-09', '[{\"id\":\"1769305355521-0.8589777248196683\",\"source\":\"PRODUCTO\",\"refId\":\"4\",\"nombre\":\"estuche spigen iphone 12 \",\"cantidad\":1,\"precioUnit\":149.97,\"subtotal\":149.97,\"aplicarImpuestos\":false},{\"id\":\"1769305367615-0.7215778302466356\",\"source\":\"PRODUCTO\",\"refId\":\"10\",\"nombre\":\"PRUEBA 4\",\"cantidad\":1,\"precioUnit\":100,\"subtotal\":100,\"aplicarImpuestos\":false}]', 249.97, 0.00, 0.00, 249.97, 0, 'BORRADOR', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-25 01:43:00', '2026-01-25 01:43:00', NULL, NULL, 0);

--
-- Disparadores `cotizaciones`
--
DELIMITER $$
CREATE TRIGGER `before_insert_cotizaciones` BEFORE INSERT ON `cotizaciones` FOR EACH ROW BEGIN
    
    SET NEW.fecha_vencimiento = DATE_ADD(NEW.fecha_emision, INTERVAL NEW.vigencia_dias DAY);
    
    
    IF NEW.numero_cotizacion IS NULL OR NEW.numero_cotizacion = '' THEN
        SET @year = YEAR(NEW.fecha_emision);
        SET @max_num = (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_cotizacion, '-', -1) AS UNSIGNED)), 0) 
                       FROM cotizaciones 
                       WHERE numero_cotizacion LIKE CONCAT('COT-', @year, '-%'));
        SET NEW.numero_cotizacion = CONCAT('COT-', @year, '-', LPAD(@max_num + 1, 4, '0'));
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_cotizaciones` BEFORE UPDATE ON `cotizaciones` FOR EACH ROW BEGIN
    
    IF NEW.fecha_emision != OLD.fecha_emision OR NEW.vigencia_dias != OLD.vigencia_dias THEN
        SET NEW.fecha_vencimiento = DATE_ADD(NEW.fecha_emision, INTERVAL NEW.vigencia_dias DAY);
    END IF;
    
    
    IF NEW.estado IN ('ENVIADA', 'BORRADOR') AND NEW.fecha_vencimiento < CURDATE() THEN
        SET NEW.estado = 'VENCIDA';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos_marcas`
--

CREATE TABLE `equipos_marcas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo_equipo` enum('Telefono','Laptop','Tablet','Consola','Otro') NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `equipos_marcas`
--

INSERT INTO `equipos_marcas` (`id`, `nombre`, `tipo_equipo`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'Apple', 'Telefono', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(2, 'Samsung', 'Telefono', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(3, 'Xiaomi', 'Telefono', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(4, 'Huawei', 'Telefono', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(5, 'Motorola', 'Telefono', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(6, 'OnePlus', 'Telefono', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(7, 'SKY', 'Tablet', 1, '2026-01-05 05:01:18', '2026-01-05 05:01:18'),
(8, 'INFINIX', 'Telefono', 1, '2026-01-06 23:51:07', '2026-01-06 23:51:07'),
(9, 'DELL', 'Laptop', 1, '2026-01-24 15:48:56', '2026-01-24 15:48:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos_modelos`
--

CREATE TABLE `equipos_modelos` (
  `id` int(11) NOT NULL,
  `marca_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `equipos_modelos`
--

INSERT INTO `equipos_modelos` (`id`, `marca_id`, `nombre`, `activo`, `created_at`, `updated_at`) VALUES
(1, 1, 'iPhone 15 Pro Max', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(2, 1, 'iPhone 15 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(3, 1, 'iPhone 15 Plus', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(4, 1, 'iPhone 15', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(5, 1, 'iPhone 14 Pro Max', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(6, 1, 'iPhone 14 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(7, 1, 'iPhone 14 Plus', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(8, 1, 'iPhone 14', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(9, 1, 'iPhone 13 Pro Max', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(10, 1, 'iPhone 13 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(11, 1, 'iPhone 13', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(12, 1, 'iPhone 13 mini', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(13, 1, 'iPhone 12 Pro Max', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(14, 1, 'iPhone 12 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(15, 1, 'iPhone 12', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(16, 1, 'iPhone 11 Pro Max', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(17, 1, 'iPhone 11 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(18, 1, 'iPhone 11', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(19, 1, 'iPhone SE (3ra gen)', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(20, 2, 'Galaxy S24 Ultra', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(21, 2, 'Galaxy S24+', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(22, 2, 'Galaxy S24', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(23, 2, 'Galaxy S23 Ultra', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(24, 2, 'Galaxy S23+', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(25, 2, 'Galaxy S23', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(26, 2, 'Galaxy A54', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(27, 2, 'Galaxy A34', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(28, 2, 'Galaxy Z Fold 5', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(29, 2, 'Galaxy Z Flip 5', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(30, 3, 'Xiaomi 14 Ultra', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(31, 3, 'Xiaomi 14 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(32, 3, 'Xiaomi 13 Ultra', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(33, 3, 'Redmi Note 13 Pro+', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(34, 3, 'Redmi Note 13 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(35, 3, 'POCO X6 Pro', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(36, 3, 'POCO F6', 1, '2026-01-05 04:51:09', '2026-01-05 04:51:09'),
(37, 7, 'TCL-10', 1, '2026-01-05 05:01:48', '2026-01-05 05:01:48'),
(38, 8, '20GT PRO', 1, '2026-01-06 23:51:18', '2026-01-06 23:51:18'),
(39, 9, 'Insipiron 3520', 1, '2026-01-24 15:49:17', '2026-01-24 15:49:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `interacciones_clientes`
--

CREATE TABLE `interacciones_clientes` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `tipo` enum('cotizacion','venta','reparacion','visita') NOT NULL,
  `referencia_id` int(11) DEFAULT NULL COMMENT 'ID de la cotizaci├│n/venta/reparaci├│n relacionada',
  `monto` decimal(10,2) DEFAULT NULL COMMENT 'Monto de la transacci├│n si aplica',
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL COMMENT 'Usuario que registr├│ la interacci├│n'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `interacciones_clientes`
--

INSERT INTO `interacciones_clientes` (`id`, `cliente_id`, `tipo`, `referencia_id`, `monto`, `notas`, `created_at`, `created_by`) VALUES
(1, 8, 'cotizacion', 1, 60.00, 'Cotización COT-2025-1.00 - VENTA', '2025-12-31 09:39:01', 1),
(2, 1, 'cotizacion', 2, 20.00, 'Cotización COT-2025-2.00 - VENTA', '2025-12-31 09:47:42', 1),
(3, 1, 'cotizacion', 3, 20.00, 'Cotización COT-2025-3.00 - VENTA', '2025-12-31 09:50:35', 1),
(4, 2, 'cotizacion', 4, 20.00, 'Cotización COT-2025-4.00 - VENTA', '2025-12-31 18:01:20', 1),
(5, 9, 'cotizacion', 5, 1200.00, 'Cotización COT-2025-5.00 - VENTA', '2025-12-31 21:54:02', 1),
(6, 9, 'cotizacion', 6, 400.00, 'Cotización COT-2026-1.00 - VENTA', '2026-01-03 16:56:24', 1),
(7, 1, 'cotizacion', 7, 400.00, 'Cotización COT-2026-2.00 - VENTA', '2026-01-03 17:41:39', 1),
(8, 9, 'cotizacion', 11, 149.97, 'Cotización COT-2026-6.00 - VENTA', '2026-01-24 18:08:50', 1),
(9, 9, 'cotizacion', 12, 600.00, 'Cotización COT-2026-7.00 - REPARACION', '2026-01-24 18:53:46', 1),
(10, 9, 'cotizacion', 13, 249.97, 'Cotización COT-2026-8.00 - VENTA', '2026-01-25 01:43:00', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lineas`
--

CREATE TABLE `lineas` (
  `id` int(11) NOT NULL,
  `marca_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lineas`
--

INSERT INTO `lineas` (`id`, `marca_id`, `nombre`, `descripcion`, `activo`, `created_at`, `updated_at`) VALUES
(1, 1, 'iPhone SE', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(2, 1, 'iPhone 7', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(3, 1, 'iPhone 8', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(4, 1, 'iPhone X', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(5, 1, 'iPhone XR', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(6, 1, 'iPhone XS', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(7, 1, 'iPhone 11', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(8, 1, 'iPhone 12', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(9, 1, 'iPhone 13', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(10, 1, 'iPhone 14', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(11, 1, 'iPhone 15', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(12, 1, 'iPhone 16', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(13, 1, 'iPad', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(14, 1, 'iPad Mini', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(15, 1, 'iPad Air', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(16, 1, 'iPad Pro', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(17, 1, 'MacBook', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(18, 1, 'MacBook Air', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(19, 1, 'MacBook Pro', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(20, 1, 'iMac', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(21, 1, 'Apple Watch', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(22, 2, 'Galaxy A03', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(23, 2, 'Galaxy A04', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(24, 2, 'Galaxy A05', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(25, 2, 'Galaxy A10', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(26, 2, 'Galaxy A12', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(27, 2, 'Galaxy A13', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(28, 2, 'Galaxy A14', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(29, 2, 'Galaxy A15', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(30, 2, 'Galaxy A20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(31, 2, 'Galaxy A30', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(32, 2, 'Galaxy A50', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(33, 2, 'Galaxy A51', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(34, 2, 'Galaxy A52', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(35, 2, 'Galaxy A53', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(36, 2, 'Galaxy A54', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(37, 2, 'Galaxy S20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(38, 2, 'Galaxy S21', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(39, 2, 'Galaxy S22', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(40, 2, 'Galaxy S23', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(41, 2, 'Galaxy S24', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(42, 2, 'Galaxy Note 10', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(43, 2, 'Galaxy Note 20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(44, 2, 'Galaxy Z Flip', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(45, 2, 'Galaxy Z Fold', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(46, 2, 'Galaxy Tab A', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(47, 2, 'Galaxy Tab S', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(48, 3, 'Redmi 9', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(49, 3, 'Redmi 10', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(50, 3, 'Redmi 11', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(51, 3, 'Redmi 12', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(52, 3, 'Redmi 13', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(53, 3, 'Redmi Note 9', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(54, 3, 'Redmi Note 10', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(55, 3, 'Redmi Note 11', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(56, 3, 'Redmi Note 12', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(57, 3, 'Redmi Note 13', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(58, 3, 'Mi 11', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(59, 3, 'Mi 12', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(60, 3, 'Mi 13', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(61, 3, 'POCO X3', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(62, 3, 'POCO X4', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(63, 3, 'POCO X5', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(64, 3, 'POCO F3', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(65, 3, 'POCO F4', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(66, 3, 'POCO F5', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(67, 3, 'POCO M3', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(68, 3, 'POCO M4', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(69, 3, 'POCO M5', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(70, 4, 'Moto E', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(71, 4, 'Moto E6', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(72, 4, 'Moto E7', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(73, 4, 'Moto G', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(74, 4, 'Moto G Play', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(75, 4, 'Moto G Power', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(76, 4, 'Moto G Stylus', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(77, 4, 'Moto G10', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(78, 4, 'Moto G20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(79, 4, 'Moto G30', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(80, 4, 'Moto G40', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(81, 4, 'Moto G50', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(82, 4, 'Moto G60', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(83, 4, 'Moto G100', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(84, 4, 'Edge', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(85, 4, 'Edge 20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(86, 4, 'Edge 30', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(87, 4, 'Edge 40', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(88, 4, 'One', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(89, 4, 'Razr', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(90, 5, 'P20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(91, 5, 'P30', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(92, 5, 'P40', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(93, 5, 'P50', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(94, 5, 'Mate 20', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(95, 5, 'Mate 30', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(96, 5, 'Mate 40', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(97, 5, 'Nova 5', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(98, 5, 'Nova 7', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(99, 5, 'Nova 8', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(100, 5, 'Nova 9', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(101, 5, 'Y5', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(102, 5, 'Y6', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(103, 5, 'Y7', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(104, 5, 'Y9', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(105, 5, 'Honor 8', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(106, 5, 'Honor 9', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(107, 5, 'Honor 10', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(215, 1, 'iphone 17', NULL, 1, '2025-12-31 10:33:53', '2025-12-31 10:33:53'),
(216, 16, 'L3250', NULL, 1, '2026-02-04 04:48:09', '2026-02-04 04:48:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `marcas`
--

CREATE TABLE `marcas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `marcas`
--

INSERT INTO `marcas` (`id`, `nombre`, `descripcion`, `logo_url`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'Apple', 'Dispositivos Apple - iPhone, iPad, MacBook, Apple Watch', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(2, 'Samsung', 'Dispositivos Samsung - Galaxy S, Galaxy A, Galaxy Note, Galaxy Tab', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(3, 'Xiaomi', 'Dispositivos Xiaomi - Mi, Redmi, POCO', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(4, 'Motorola', 'Dispositivos Motorola - Moto G, Moto E, Edge', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(5, 'Huawei', 'Dispositivos Huawei - P Series, Mate, Nova, Y Series', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(6, 'LG', 'Dispositivos LG', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(7, 'Nokia', 'Dispositivos Nokia', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(8, 'Oppo', 'Dispositivos Oppo', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(9, 'Vivo', 'Dispositivos Vivo', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(10, 'Realme', 'Dispositivos Realme', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(11, 'OnePlus', 'Dispositivos OnePlus', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(12, 'Sony', 'Dispositivos Sony Xperia', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(13, 'Google', 'Dispositivos Google Pixel', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(14, 'Otra', 'Otras marcas', NULL, 1, '2025-12-31 10:26:00', '2025-12-31 10:26:00'),
(16, 'Epson', NULL, NULL, 1, '2026-02-04 04:47:52', '2026-02-04 04:47:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria` varchar(100) NOT NULL,
  `subcategoria` varchar(100) DEFAULT NULL,
  `precio_costo` decimal(10,2) NOT NULL COMMENT 'Precio de compra/costo del producto',
  `precio_venta` decimal(10,2) NOT NULL COMMENT 'Precio de venta al público',
  `stock` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) NOT NULL DEFAULT 0,
  `aplica_serie` tinyint(1) DEFAULT 0 COMMENT 'Indica si el producto requiere n??mero de serie/IMEI',
  `sku_generado` tinyint(1) DEFAULT 0 COMMENT 'Indica si el SKU fue generado autom??ticamente',
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `sku`, `nombre`, `descripcion`, `categoria`, `subcategoria`, `precio_costo`, `precio_venta`, `stock`, `stock_minimo`, `aplica_serie`, `sku_generado`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'SKU1', 'VIDRIO TEMPLADO IPHONE 12', 'PRODUCTO ', 'VIDRIOS', 'IPHONE 12', 2.00, 20.00, 4, 5, 0, 0, 1, '2025-12-30 03:06:21', '2026-02-13 03:17:40'),
(2, 'sku3', 'Vidrios iphone 12 normal ', 'jskadaidjqkjqkijzbjkd<khsjkq', 'vidrios', 'iphone 12', 2.00, 20.00, 6, 5, 0, 0, 1, '2025-12-30 03:28:46', '2026-01-24 18:01:23'),
(3, 'SKU5', 'COMBO TECLADO MOUSE MARVO ', 'TECALDO MOUSE TEX TEC ETC ', 'COMPUTADORAS', 'PERIFERICOS-HARDWARE', 280.00, 400.00, 1, 3, 0, 0, 1, '2025-12-31 21:47:49', '2026-01-24 17:30:50'),
(4, 'TEC_PROD4_758125', 'estuche spigen iphone 12 ', 'estcuhes ssssss', 'ESTUCHES', 'SPIGEN', 53.00, 149.97, 25, 8, 1, 1, 1, '2026-01-07 04:22:38', '2026-01-23 21:38:04'),
(5, 'TEC_PROD5_489701', 'prueba', 'prueba', 'telefonos', 'prueba', 10.01, 13.01, 5, 7, 1, 1, 0, '2026-01-23 04:28:09', '2026-02-04 04:30:52'),
(6, 'TEC_PROD6_044057', 'prueba2', 'aaaaaaaaaaaa', 'telefonos', 'prueba', 190.00, 230.00, 0, 4, 1, 1, 0, '2026-01-23 04:37:24', '2026-01-23 05:20:10'),
(7, 'TEC_PROD7_755884', 'prueba3', 'aaaaaaaaaaaaa', 'telefonos', 'prueba', 10.00, 20.00, 0, 0, 1, 1, 0, '2026-01-23 04:49:15', '2026-01-23 05:23:19'),
(8, 'TEC_PROD8_726633', 'ssssssssss', 'ssss', 'telefonos', 'prueba', 440.00, 4440.00, 0, 15, 1, 1, 1, '2026-01-23 05:05:26', '2026-01-23 05:05:26'),
(9, 'TEC_PROD9_794903', 'sssssssssss121212', '1111', 'telefonos', 'prueba', 0.01, 10.00, 0, 6, 1, 1, 1, '2026-01-23 05:06:34', '2026-01-23 05:28:30'),
(10, 'TEC_PROD10_890529', 'PRUEBA 4', 'AJA', 'telefonos', 'prueba', 10.00, 50.00, 14, 5, 1, 1, 1, '2026-01-24 18:38:10', '2026-02-13 03:17:40'),
(11, 'TEC_PROD11_801802', 'ALE MI AMOR', 'MI MUJER ES MI TODO MI MAMI ', 'ESTUCHES', 'MI AMOR', 2000.00, 1499.99, 1, 1, 1, 1, 1, '2026-01-25 01:33:21', '2026-02-04 05:12:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_imagenes`
--

CREATE TABLE `producto_imagenes` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `url` varchar(500) NOT NULL COMMENT 'Ruta o URL de la imagen',
  `orden` tinyint(4) NOT NULL DEFAULT 0 COMMENT 'Orden de visualización (0=principal)',
  `descripcion` varchar(255) DEFAULT NULL COMMENT 'Descripción alternativa de la imagen',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `producto_imagenes`
--
DELIMITER $$
CREATE TRIGGER `bi_producto_imagenes_max3` BEFORE INSERT ON `producto_imagenes` FOR EACH ROW BEGIN
  DECLARE total INT;

  SELECT COUNT(*) INTO total
  FROM producto_imagenes
  WHERE producto_id = NEW.producto_id;

  IF total >= 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Este producto ya tiene 3 imágenes (máximo permitido).';
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `bu_producto_imagenes_max3` BEFORE UPDATE ON `producto_imagenes` FOR EACH ROW BEGIN
  DECLARE total INT DEFAULT 0;

  IF NEW.producto_id <> OLD.producto_id THEN
    SELECT COUNT(*) INTO total
    FROM producto_imagenes
    WHERE producto_id = NEW.producto_id;

    IF total >= 3 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El producto destino ya tiene 3 imágenes (máximo permitido).';
    END IF;
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reparaciones`
--

CREATE TABLE `reparaciones` (
  `id` varchar(50) NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `cliente_nombre` varchar(200) NOT NULL,
  `cliente_telefono` varchar(20) DEFAULT NULL,
  `cliente_email` varchar(200) DEFAULT NULL,
  `tipo_equipo` enum('Telefono','Tablet','Laptop','Consola','Otro') NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo` varchar(150) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `imei_serie` varchar(100) DEFAULT NULL,
  `patron_contrasena` varchar(255) DEFAULT NULL,
  `estado_fisico` text DEFAULT NULL,
  `diagnostico_inicial` text DEFAULT NULL,
  `estado` enum('RECIBIDA','EN_PROCESO','ESPERANDO_PIEZA','COMPLETADA','ENTREGADA','CANCELADA') NOT NULL DEFAULT 'RECIBIDA',
  `sub_etapa` enum('DIAGNOSTICO','DESARMADO','REPARACION','ARMADO','PRUEBAS','CALIBRACION') DEFAULT NULL,
  `prioridad` enum('BAJA','MEDIA','ALTA') NOT NULL DEFAULT 'MEDIA',
  `tecnico_asignado` varchar(100) DEFAULT NULL,
  `mano_obra` int(11) DEFAULT 0,
  `subtotal` int(11) DEFAULT 0,
  `impuestos` int(11) DEFAULT 0,
  `total` int(11) DEFAULT 0,
  `monto_anticipo` int(11) DEFAULT 0,
  `saldo_anticipo` int(11) DEFAULT 0,
  `metodo_anticipo` enum('efectivo','transferencia') DEFAULT NULL,
  `total_invertido` int(11) DEFAULT 0,
  `diferencia_reparacion` int(11) DEFAULT 0,
  `total_ganancia` int(11) DEFAULT 0,
  `sticker_serie_interna` varchar(50) DEFAULT NULL,
  `sticker_ubicacion` enum('chasis','bandeja_sim','bateria','otro') DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_cierre` date DEFAULT NULL,
  `garantia_dias` int(11) DEFAULT 30,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reparaciones`
--

INSERT INTO `reparaciones` (`id`, `cliente_id`, `cliente_nombre`, `cliente_telefono`, `cliente_email`, `tipo_equipo`, `marca`, `modelo`, `color`, `imei_serie`, `patron_contrasena`, `estado_fisico`, `diagnostico_inicial`, `estado`, `sub_etapa`, `prioridad`, `tecnico_asignado`, `mano_obra`, `subtotal`, `impuestos`, `total`, `monto_anticipo`, `saldo_anticipo`, `metodo_anticipo`, `total_invertido`, `diferencia_reparacion`, `total_ganancia`, `sticker_serie_interna`, `sticker_ubicacion`, `fecha_ingreso`, `fecha_cierre`, `garantia_dias`, `observaciones`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
('REP1769210880817', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 11', 'azul', NULL, NULL, 'Pendiente revisión física', '', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 70000, 70000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-01-23', NULL, 30, NULL, '2026-01-23 23:28:00', '2026-02-04 06:29:43', 'Sistema', NULL),
('REP1769269790907', NULL, 'Brennere', '5567-2789', 'brenner@gmail.com', 'Laptop', 'DELL', 'Insipiron 3520', 'Plateada', NULL, NULL, 'Pendiente revisión física', 'BISGRAS QUEBRADAS', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, NULL, NULL, '2026-01-24', NULL, 30, NULL, '2026-01-24 15:49:50', '2026-01-24 15:49:50', 'Sistema', NULL),
('REP1769280424892', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 15', 'AZUL', NULL, NULL, 'Pendiente revisión física', 'NO DA IMAGEN LA PANTALLA NECESARIO CAMBIO DE LA MISMA', '', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 'G-11111', 'otro', '2026-01-24', NULL, 30, NULL, '2026-01-24 18:47:04', '2026-02-13 03:24:48', 'Sistema', NULL),
('REP1769280616177', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Tablet', 'SKY', 'TCL-10', 'NEGRO', NULL, NULL, 'Pendiente revisión física', '', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, NULL, NULL, '2026-01-24', NULL, 30, NULL, '2026-01-24 18:50:16', '2026-01-24 18:50:16', 'Sistema', NULL),
('REP1769305961778', NULL, 'Juan Pérez', '5551-2345', 'juan.perez@email.com', 'Telefono', 'Apple', 'iPhone 14 Pro Max', 'DORADO', NULL, NULL, 'Pendiente revisión física', 'CAMBIO DE PANTALLA', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, NULL, NULL, '2026-01-25', NULL, 30, NULL, '2026-01-25 01:52:41', '2026-01-25 01:52:41', 'Sistema', NULL),
('REP1770952861433', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 13', 'azul', NULL, NULL, 'Pendiente revisión física', 'no enciende ', '', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 70000, 70000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-02-13', NULL, 30, NULL, '2026-02-13 03:21:01', '2026-02-13 03:25:17', 'Sistema', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reparaciones_accesorios`
--

CREATE TABLE `reparaciones_accesorios` (
  `id` int(11) NOT NULL,
  `reparacion_id` varchar(50) NOT NULL,
  `chip` tinyint(1) DEFAULT 0,
  `estuche` tinyint(1) DEFAULT 0,
  `memoria_sd` tinyint(1) DEFAULT 0,
  `cargador` tinyint(1) DEFAULT 0,
  `otros` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reparaciones_accesorios`
--

INSERT INTO `reparaciones_accesorios` (`id`, `reparacion_id`, `chip`, `estuche`, `memoria_sd`, `cargador`, `otros`, `created_at`) VALUES
(1, 'REP1769210880817', 0, 0, 0, 0, NULL, '2026-01-23 23:28:00'),
(2, 'REP1769269790907', 0, 0, 0, 0, NULL, '2026-01-24 15:49:50'),
(3, 'REP1769280424892', 0, 0, 0, 0, NULL, '2026-01-24 18:47:04'),
(4, 'REP1769280616177', 0, 0, 0, 0, NULL, '2026-01-24 18:50:16'),
(5, 'REP1769305961778', 0, 0, 0, 0, NULL, '2026-01-25 01:52:41'),
(6, 'REP1770952861433', 0, 0, 0, 0, NULL, '2026-02-13 03:21:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reparaciones_historial`
--

CREATE TABLE `reparaciones_historial` (
  `id` int(11) NOT NULL,
  `reparacion_id` varchar(50) NOT NULL,
  `estado` enum('RECIBIDA','EN_DIAGNOSTICO','ESPERANDO_AUTORIZACION','AUTORIZADA','EN_REPARACION','ESPERANDO_PIEZA','COMPLETADA','ENTREGADA','CANCELADA','STAND_BY','ANTICIPO_REGISTRADO') NOT NULL,
  `sub_etapa` enum('DIAGNOSTICO','DESARMADO','REPARACION','ARMADO','PRUEBAS','CALIBRACION') DEFAULT NULL,
  `nota` text NOT NULL,
  `pieza_necesaria` varchar(255) DEFAULT NULL,
  `proveedor` varchar(255) DEFAULT NULL,
  `costo_repuesto` int(11) DEFAULT NULL,
  `sticker_numero` varchar(50) DEFAULT NULL,
  `sticker_ubicacion` enum('chasis','bandeja_sim','bateria','otro') DEFAULT NULL,
  `diferencia_reparacion` int(11) DEFAULT NULL,
  `user_nombre` varchar(100) DEFAULT 'Sistema',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reparaciones_historial`
--

INSERT INTO `reparaciones_historial` (`id`, `reparacion_id`, `estado`, `sub_etapa`, `nota`, `pieza_necesaria`, `proveedor`, `costo_repuesto`, `sticker_numero`, `sticker_ubicacion`, `diferencia_reparacion`, `user_nombre`, `created_at`) VALUES
(1, 'REP1769210880817', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', '2026-01-23 23:28:00'),
(2, 'REP1769269790907', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', '2026-01-24 15:49:50'),
(3, 'REP1769280424892', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', '2026-01-24 18:47:04'),
(4, 'REP1769280616177', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', '2026-01-24 18:50:16'),
(5, 'REP1769280424892', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-01-24 18:51:57'),
(6, 'REP1769305961778', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', '2026-01-25 01:52:41'),
(7, 'REP1769210880817', '', NULL, 'Anticipo registrado: Q700.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 06:29:43'),
(8, 'REP1769210880817', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 06:29:43'),
(9, 'REP1769280424892', '', NULL, 'Estado actualizado a EN_DIAGNOSTICO', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 06:33:16'),
(10, 'REP1769280424892', '', NULL, 'Estado actualizado a EN_DIAGNOSTICO', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 06:34:11'),
(11, 'REP1769280424892', 'RECIBIDA', NULL, 'equipo recibido tiene golpres ', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 06:46:56'),
(12, 'REP1769280424892', 'RECIBIDA', NULL, 'wqwqwqwqqqw', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 06:49:04'),
(13, 'REP1769280424892', '', NULL, 'en pruebas\r\n', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 07:01:35'),
(14, 'REP1769280424892', '', NULL, 'aaa', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 07:04:20'),
(15, 'REP1769280424892', 'EN_DIAGNOSTICO', NULL, 'sssss', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 07:12:14'),
(16, 'REP1769280424892', 'ESPERANDO_AUTORIZACION', NULL, 'cliente aun no confirma \r\n', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 07:12:44'),
(17, 'REP1769280424892', 'EN_REPARACION', NULL, 'el equipo esta desarmado ', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 07:13:53'),
(18, 'REP1769280424892', 'ESPERANDO_PIEZA', NULL, 'sssssiiiii', 'Puerto de Carga USB-C', 'Moto Parts GT', NULL, NULL, NULL, NULL, 'Usuario', '2026-02-04 07:16:28'),
(19, 'REP1769280424892', 'COMPLETADA', NULL, 'SE COLOCO EN LA BATERIA ', NULL, NULL, NULL, 'G-11111', 'otro', NULL, 'Usuario', '2026-02-04 07:56:04'),
(20, 'REP1770952861433', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', '2026-02-13 03:21:01'),
(21, 'REP1770952861433', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q700.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-13 03:22:19'),
(22, 'REP1770952861433', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-13 03:22:19'),
(23, 'REP1769280424892', 'EN_DIAGNOSTICO', NULL, 'aun esta desarmado ', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-13 03:24:48'),
(24, 'REP1770952861433', 'EN_DIAGNOSTICO', NULL, 'saasas', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', '2026-02-13 03:25:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reparaciones_imagenes`
--

CREATE TABLE `reparaciones_imagenes` (
  `id` int(11) NOT NULL,
  `reparacion_id` varchar(50) NOT NULL,
  `historial_id` int(11) DEFAULT NULL,
  `tipo` enum('recepcion','historial','final','comprobante') NOT NULL,
  `filename` varchar(255) NOT NULL,
  `url_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reparaciones_imagenes`
--

INSERT INTO `reparaciones_imagenes` (`id`, `reparacion_id`, `historial_id`, `tipo`, `filename`, `url_path`, `file_size`, `mime_type`, `created_at`) VALUES
(1, 'REP1769280424892', 11, 'historial', '71q0J2riWEL__AC_SL1500__1770187616445.jpg', '/uploads/reparaciones/REP1769280424892/historial/71q0J2riWEL__AC_SL1500__1770187616445.jpg', 150094, 'image/jpeg', '2026-02-04 06:46:56'),
(2, 'REP1769280424892', 13, 'historial', 'musica-lofi-finn-de-hora-de-aventura_3840x2160_xtrafondos_com_1770188495110.jpg', '/uploads/reparaciones/REP1769280424892/historial/musica-lofi-finn-de-hora-de-aventura_3840x2160_xtrafondos_com_1770188495110.jpg', 1889657, 'image/jpeg', '2026-02-04 07:01:35'),
(3, 'REP1769280424892', 19, 'historial', 'PANTALLA15PM_1770191764534.JPG', '/uploads/reparaciones/REP1769280424892/historial/PANTALLA15PM_1770191764534.JPG', 27724, 'image/jpeg', '2026-02-04 07:56:04'),
(4, 'REP1769280424892', 23, 'historial', 'RASP_2_1770953088177.jpg', '/uploads/reparaciones/REP1769280424892/historial/RASP_2_1770953088177.jpg', 136858, 'image/jpeg', '2026-02-13 03:24:48'),
(5, 'REP1770952861433', 24, 'historial', 'RASP_2_1770953117972.jpg', '/uploads/reparaciones/REP1770952861433/historial/RASP_2_1770953117972.jpg', 136858, 'image/jpeg', '2026-02-13 03:25:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reparaciones_items`
--

CREATE TABLE `reparaciones_items` (
  `id` int(11) NOT NULL,
  `reparacion_id` varchar(50) NOT NULL,
  `item_id` varchar(50) DEFAULT NULL,
  `item_tipo` enum('producto','repuesto','manual') NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `precio_unit` int(11) NOT NULL,
  `subtotal` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `repuestos`
--

CREATE TABLE `repuestos` (
  `id` int(11) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `tipo` enum('Pantalla','Bater├¡a','C├ímara','Flex','Placa','Back Cover','Altavoz','Conector','Otro') NOT NULL DEFAULT 'Otro',
  `marca` enum('Apple','Samsung','Xiaomi','Motorola','Huawei','Otra') NOT NULL,
  `linea` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `compatibilidad` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`compatibilidad`)),
  `condicion` enum('Original','OEM','Gen├®rico','Usado') NOT NULL DEFAULT 'Original',
  `color` varchar(50) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `precio_publico` int(11) NOT NULL DEFAULT 0 COMMENT 'Precio de venta al p├║blico en centavos',
  `precio_costo` int(11) NOT NULL DEFAULT 0 COMMENT 'Precio de costo en centavos',
  `proveedor` varchar(100) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `stock_minimo` int(11) DEFAULT 1,
  `imagenes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`imagenes`)),
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `activo` tinyint(1) DEFAULT 1,
  `sku_generado` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `repuestos`
--

INSERT INTO `repuestos` (`id`, `sku`, `codigo`, `nombre`, `tipo`, `marca`, `linea`, `modelo`, `compatibilidad`, `condicion`, `color`, `notas`, `precio_publico`, `precio_costo`, `proveedor`, `stock`, `stock_minimo`, `imagenes`, `tags`, `activo`, `sku_generado`, `created_at`, `updated_at`) VALUES
(4, 'PAN_APPL_GEN_000004', NULL, 'pantalla iphone 15 pro max', 'Pantalla', 'Apple', 'iPhone 15', NULL, '[\"15 pro max\"]', 'Original', 'negro', 'SIIII', 120000, 50000, 'celovendo', 4, 1, '[]', '[]', 0, 1, '2025-12-31 10:13:42', '2026-02-04 05:00:37'),
(5, 'PAN_APPL_GEN_000005', NULL, 'pantalla iphone 17 pro max', 'Pantalla', 'Apple', 'iphone 17', NULL, '[\"iphone 17 pro max\"]', 'Original', NULL, 'SSSSIIII', 360000, 280000, NULL, 3, 1, '[]', '[\"OLED\"]', 1, 1, '2025-12-31 10:38:58', '2026-02-04 05:00:37'),
(7, 'PAN_APPL_GEN_000007', NULL, 'Pantalla LCD + Touch', 'Pantalla', 'Apple', 'iPhone 13', 'A2482', '[\"iPhone 13\"]', '', 'Negro', 'Pantalla OLED de alta calidad con touch integrado', 125000, 85000, 'Tech Parts Guatemala', 5, 2, '[\"https://images.unsplash.com/photo-1592286927505-c0d6e9a0d42e?w=400\"]', '[\"pantalla\", \"oled\", \"touch\", \"iphone\"]', 1, 1, '2025-12-31 11:09:39', '2026-02-04 05:00:37'),
(10, '_MOTO_GEN_000010', NULL, 'Puerto de Carga USB-C', '', 'Motorola', 'Moto G', 'XT2113', '[\"Moto G Power\", \"Moto G Stylus\", \"Moto G Play\"]', '', NULL, 'Flex de carga con micr├│fono incluido', 18000, 11000, 'Moto Parts GT', 15, 5, '[\"https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400\"]', '[\"puerto\", \"usb-c\", \"carga\", \"motorola\"]', 1, 1, '2025-12-31 11:09:39', '2026-02-04 05:00:37'),
(11, '_HUAW_GEN_000011', NULL, 'Tapa Trasera de Cristal', '', 'Huawei', 'P30', 'ELE-L29', '[\"Huawei P30\"]', '', 'Aurora Blue', 'Tapa trasera de cristal con adhesivo incluido', 28000, 17000, 'Huawei Accessories', 6, 2, '[\"https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400\"]', '[\"tapa\", \"cristal\", \"huawei\", \"azul\"]', 1, 1, '2025-12-31 11:09:39', '2026-02-04 05:00:37'),
(12, 'PAN_APPL_GEN_000012', NULL, 'PANTALLA IPHONE 15 PRO MAX', 'Pantalla', 'Apple', 'iPhone 15', NULL, '[\"IPHONE 15 PRO MAX\"]', '', NULL, 'BUENA PERO NO TANTO ', 150000, 40000, 'CELOVENDO ', 2, 1, '[]', '[\"INCELL\",\"MARCO SOBRESALE PANTALLA\"]', 1, 1, '2025-12-31 21:50:23', '2026-02-04 05:00:37'),
(13, 'PAN_APPL_GEN_000013', NULL, 'Pantalla iphone 11 rajada', 'Pantalla', 'Apple', 'iPhone 11', NULL, '[\"Iphone 11\"]', 'Usado', 'blanca', 'PNTALLA MUY BUENA \n', 60000, 20000, 'CELOVENDO ', 2, 1, '[\"/api/placeholder/400/400?img=1767741053085-0&name=PANTALLA15PM.JPG\",\"/api/placeholder/400/400?img=1767741064200-0&name=rockstar-games-logo-gta-vi_3840x2160_xtrafondos.com.jpg\"]', '[\"ORIGINAL\"]', 0, 1, '2026-01-06 23:11:15', '2026-02-04 05:02:21'),
(14, 'PAN_APPL_GEN_000014', NULL, 'Pantalla iphone 11', 'Pantalla', 'Apple', 'iPhone 11', NULL, '[\"Iphone 11\"]', 'OEM', 'negro ', 'NOSAOSOAOSA', 80000, 23000, 'celovendo', 2, 1, '[]', '[\"LCD BUENA CALIDAD\"]', 1, 1, '2026-01-25 01:37:05', '2026-02-04 05:00:37'),
(15, 'OTR_EPSO_GEN_548260', NULL, 'DAMPER EPSON', 'Otro', '', 'L3250', NULL, '[\"L3110\"]', 'Original', 'BLANCO', 'MUY BUENO PROVEEDOR PROVESERSA', 30000, 10000, 'Distribuidora TecnoMax', 0, 1, '[]', '[\"EPSON\"]', 1, 1, '2026-02-04 04:49:08', '2026-02-04 04:49:08');

--
-- Disparadores `repuestos`
--
DELIMITER $$
CREATE TRIGGER `before_insert_repuesto` BEFORE INSERT ON `repuestos` FOR EACH ROW BEGIN
  
  SET NEW.nombre = TRIM(NEW.nombre);
  IF NEW.linea IS NOT NULL THEN
    SET NEW.linea = TRIM(NEW.linea);
  END IF;
  IF NEW.modelo IS NOT NULL THEN
    SET NEW.modelo = TRIM(NEW.modelo);
  END IF;
  
  
  IF NEW.precio_publico > 0 AND NEW.precio_costo > 0 AND NEW.precio_publico <= NEW.precio_costo THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El precio p├║blico debe ser mayor al precio de costo';
  END IF;
  
  
  IF NEW.stock < 0 THEN
    SET NEW.stock = 0;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_repuesto` BEFORE UPDATE ON `repuestos` FOR EACH ROW BEGIN
  
  SET NEW.nombre = TRIM(NEW.nombre);
  IF NEW.linea IS NOT NULL THEN
    SET NEW.linea = TRIM(NEW.linea);
  END IF;
  IF NEW.modelo IS NOT NULL THEN
    SET NEW.modelo = TRIM(NEW.modelo);
  END IF;
  
  
  IF NEW.precio_publico > 0 AND NEW.precio_costo > 0 AND NEW.precio_publico <= NEW.precio_costo THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El precio p├║blico debe ser mayor al precio de costo';
  END IF;
  
  
  IF NEW.stock < 0 THEN
    SET NEW.stock = 0;
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `repuestos_movimientos`
--

CREATE TABLE `repuestos_movimientos` (
  `id` int(11) NOT NULL,
  `repuesto_id` int(11) NOT NULL,
  `tipo_movimiento` enum('ENTRADA','SALIDA','AJUSTE','VENTA','REPARACION','DEVOLUCION') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `stock_anterior` int(11) NOT NULL,
  `stock_nuevo` int(11) NOT NULL,
  `precio_unitario` int(11) DEFAULT 0 COMMENT 'Precio en centavos al momento del movimiento',
  `referencia_tipo` enum('COMPRA','VENTA','REPARACION','AJUSTE_MANUAL') DEFAULT 'AJUSTE_MANUAL',
  `referencia_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `subcategorias`
--

CREATE TABLE `subcategorias` (
  `id` int(11) NOT NULL,
  `categoria_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `orden` int(11) DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `subcategorias`
--

INSERT INTO `subcategorias` (`id`, `categoria_id`, `nombre`, `orden`, `activo`, `created_at`) VALUES
(1, 1, 'iphone 12', 99, 1, '2025-12-30 03:27:46'),
(2, 3, 'PERIFERICOS-HARDWARE', 99, 1, '2025-12-31 21:46:58'),
(3, 4, 'SPIGEN', 99, 1, '2026-01-07 04:17:19'),
(4, 2, 'prueba', 99, 1, '2026-01-23 04:26:47'),
(5, 4, 'MI AMOR', 99, 1, '2026-01-25 01:32:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` enum('admin','employee') NOT NULL DEFAULT 'employee',
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `name`, `role`, `active`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@tecnocell.com', '$2b$10$Elpozs75NWM8eDAgvbR6euBlTFlhQt/1bSxr5tj3JamljoWWJtM1W', 'Administrador', 'admin', 1, '2025-12-19 01:50:58', '2025-12-19 02:04:57'),
(2, 'empleado', 'empleado@tecnocell.com', '$2b$10$Elpozs75NWM8eDAgvbR6euBlTFlhQt/1bSxr5tj3JamljoWWJtM1W', 'Empleado de Tienda', 'employee', 1, '2025-12-19 01:50:58', '2025-12-19 02:04:57');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `numero_venta` varchar(20) NOT NULL COMMENT 'N├║mero ├║nico de venta (ej: V-2025-0001)',
  `cliente_id` int(11) NOT NULL,
  `cliente_nombre` varchar(200) NOT NULL,
  `cliente_telefono` varchar(20) DEFAULT NULL,
  `cliente_email` varchar(100) DEFAULT NULL,
  `cliente_nit` varchar(20) DEFAULT NULL,
  `cliente_direccion` text DEFAULT NULL,
  `cotizacion_id` int(11) DEFAULT NULL COMMENT 'ID de la cotizaci├│n origen (si aplica)',
  `numero_cotizacion` varchar(20) DEFAULT NULL COMMENT 'N├║mero de cotizaci├│n (desnormalizado)',
  `tipo_venta` enum('PRODUCTOS','REPUESTOS','MIXTA') NOT NULL DEFAULT 'PRODUCTOS',
  `items` longtext NOT NULL COMMENT 'Array: [{id, source, refId, nombre, cantidad, precioUnit, subtotal, notas}]' CHECK (json_valid(`items`)),
  `subtotal` int(11) NOT NULL DEFAULT 0 COMMENT 'Subtotal en centavos',
  `impuestos` int(11) NOT NULL DEFAULT 0 COMMENT 'IVA en centavos',
  `descuento` int(11) NOT NULL DEFAULT 0 COMMENT 'Descuento en centavos',
  `interes_tarjeta` int(11) DEFAULT 0 COMMENT 'InterÚs/recargo de POS en centavos',
  `total` int(11) NOT NULL DEFAULT 0 COMMENT 'Total en centavos',
  `estado` enum('PENDIENTE','PAGADA','PARCIAL','ANULADA') NOT NULL DEFAULT 'PENDIENTE',
  `metodo_pago` enum('EFECTIVO','TARJETA','TRANSFERENCIA','MIXTO') DEFAULT NULL,
  `pagos` longtext DEFAULT NULL COMMENT 'Array de pagos: [{metodo, monto, referencia, fecha, comprobanteUrl}]' CHECK (json_valid(`pagos`)),
  `monto_pagado` int(11) NOT NULL DEFAULT 0 COMMENT 'Total pagado en centavos',
  `saldo_pendiente` int(11) NOT NULL DEFAULT 0 COMMENT 'Saldo pendiente en centavos',
  `observaciones` text DEFAULT NULL,
  `notas_internas` text DEFAULT NULL,
  `factura_fel_id` varchar(50) DEFAULT NULL COMMENT 'ID de la factura FEL si fue facturada',
  `factura_numero` varchar(50) DEFAULT NULL COMMENT 'N├║mero de factura FEL',
  `factura_serie` varchar(20) DEFAULT NULL,
  `factura_uuid` varchar(100) DEFAULT NULL COMMENT 'UUID de la factura FEL',
  `fecha_facturacion` datetime DEFAULT NULL,
  `fecha_venta` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL COMMENT 'ID del usuario que cre├│ la venta',
  `updated_by` int(11) DEFAULT NULL COMMENT 'ID del usuario que modific├│ la venta'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id`, `numero_venta`, `cliente_id`, `cliente_nombre`, `cliente_telefono`, `cliente_email`, `cliente_nit`, `cliente_direccion`, `cotizacion_id`, `numero_cotizacion`, `tipo_venta`, `items`, `subtotal`, `impuestos`, `descuento`, `interes_tarjeta`, `total`, `estado`, `metodo_pago`, `pagos`, `monto_pagado`, `saldo_pendiente`, `observaciones`, `notas_internas`, `factura_fel_id`, `factura_numero`, `factura_serie`, `factura_uuid`, `fecha_facturacion`, `fecha_venta`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 'V-2026-0001', 8, 'Brennere', '5567-2789', 'brenner@gmail.com', '52525252', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PAGADA', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-04T01:09:48.960Z\"}]', 2000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-03 19:09:49', '2026-01-04 01:09:49', '2026-01-05 04:07:11', NULL, NULL),
(2, 'V-2026-0002', 2, 'María García ', '5555-6789', 'maria.garcia@email.com', '98765432-1', 'Zona 10, Ciudad de Guatemala', 4, 'COT-2025-4.00', 'PRODUCTOS', '[{\"id\":\"1767204067326-0.6396039577662833\",\"source\":\"PRODUCTO\",\"refId\":\"1\",\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false}]', 2000, 0, 0, 0, 2000, 'PAGADA', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-04T01:10:33.196Z\"}]', 2000, 0, 'venta c9ntado ', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-03 19:10:33', '2026-01-04 01:10:33', '2026-01-04 01:10:33', NULL, NULL),
(3, 'V-2026-0003', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":3,\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":2,\"precio_unitario\":40000,\"subtotal\":80000},{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 82000, 0, 0, 0, 82000, 'PAGADA', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":82000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-05T03:31:06.539Z\"}]', 82000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-04 21:31:06', '2026-01-05 03:31:06', '2026-01-05 04:07:11', NULL, NULL),
(4, 'V-2026-0004', 1, 'Juan Pérez', '5551-2345', 'juan.perez@email.com', '12345678-9', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":3,\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precio_unitario\":40000,\"subtotal\":40000},{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 42000, 0, 0, 0, 42000, 'PAGADA', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":42000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-05T03:42:05.453Z\"}]', 42000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-04 21:42:05', '2026-01-05 03:42:05', '2026-01-05 04:07:11', NULL, NULL),
(5, 'V-2026-0005', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":3,\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":2,\"precio_unitario\":40000,\"subtotal\":80000}]', 80000, 0, 0, 0, 80000, 'PAGADA', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":80000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-05T03:43:54.491Z\"}]', 80000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-04 21:43:54', '2026-01-05 03:43:54', '2026-01-05 04:07:11', NULL, NULL),
(6, 'V-2026-0006', 4, 'Ana Rodríguez', '5554-3210', 'ana.rodriguez@email.com', '55555555-5', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":3,\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precio_unitario\":40000,\"subtotal\":40000},{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 42000, 0, 0, 0, 42000, 'PAGADA', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":42000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-05T03:44:36.414Z\"}]', 42000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-04 21:44:36', '2026-01-05 03:44:36', '2026-01-05 04:07:11', NULL, NULL),
(7, 'V-2026-0007', 8, 'Brennere Granados', '5567-2789', 'brenner@gmail.com', '52525252', 'Zacapa,zacapa', 1, 'COT-2025-1.00', 'PRODUCTOS', '[{\"id\":\"1767173929364-0.995002219867352\",\"source\":\"PRODUCTO\",\"refId\":\"1\",\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false},{\"id\":\"1767173929364-0.49954896681304695\",\"source\":\"PRODUCTO\",\"refId\":\"2\",\"nombre\":\"Vidrios iphone 12 normal \",\"cantidad\":2,\"precioUnit\":20,\"subtotal\":40,\"aplicarImpuestos\":false}]', 6000, 0, 0, 0, 6000, 'PAGADA', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":6000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-05T03:50:48.444Z\"}]', 6000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-04 21:50:48', '2026-01-05 03:50:48', '2026-01-05 03:50:48', NULL, NULL),
(8, 'V-2026-0008', 1, 'Juan Pérez ', '5551-2345', 'juan.perez@email.com', '12345678-9', 'Zona 1, Ciudad de Guatemala', 2, 'COT-2025-2.00', 'PRODUCTOS', '[{\"id\":\"1767174458841-0.35695694183751536\",\"source\":\"PRODUCTO\",\"refId\":\"2\",\"nombre\":\"Vidrios iphone 12 normal \",\"cantidad\":1,\"precioUnit\":20,\"subtotal\":20,\"aplicarImpuestos\":false}]', 2000, 0, 0, 0, 2000, 'PAGADA', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-05T03:51:11.404Z\"}]', 2000, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-04 21:51:11', '2026-01-05 03:51:11', '2026-01-05 03:51:11', NULL, NULL),
(9, 'V-2026-0009', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-07T03:38:16.397Z\"}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-06 21:38:16', '2026-01-07 03:38:16', '2026-01-07 03:38:16', NULL, NULL),
(10, 'V-2026-0010', 8, 'Brennere', '5567-2789', 'brenner@gmail.com', '52525252', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-07T07:07:24.908Z\"}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-07 01:07:24', '2026-01-07 07:07:24', '2026-01-07 07:07:24', NULL, NULL),
(11, 'V-2026-0011', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":3,\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precio_unitario\":40000,\"subtotal\":40000}]', 40000, 0, 0, 0, 40000, 'PENDIENTE', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":40000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-24T17:30:50.038Z\"}]', 0, 40000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 11:30:50', '2026-01-24 17:30:50', '2026-01-24 17:30:50', NULL, NULL),
(12, 'V-2026-0012', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":2,\"nombre\":\"Vidrios iphone 12 normal \",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', NULL, '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-24T18:01:23.520Z\",\"pos_seleccionado\":null,\"banco_id\":null}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 12:01:23', '2026-01-24 18:01:23', '2026-01-24 18:01:23', NULL, NULL),
(13, 'V-2026-0013', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', 'TRANSFERENCIA', '[{\"metodo\":\"TRANSFERENCIA\",\"monto\":2000,\"referencia\":\"1212112\",\"comprobante_url\":\"data:image/jpeg;base64,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\",\"fecha\":\"2026-01-24T18:23:50.287Z\",\"pos_seleccionado\":null,\"banco_id\":\"2\"}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 12:23:50', '2026-01-24 18:23:50', '2026-01-24 18:23:50', NULL, NULL);
INSERT INTO `ventas` (`id`, `numero_venta`, `cliente_id`, `cliente_nombre`, `cliente_telefono`, `cliente_email`, `cliente_nit`, `cliente_direccion`, `cotizacion_id`, `numero_cotizacion`, `tipo_venta`, `items`, `subtotal`, `impuestos`, `descuento`, `interes_tarjeta`, `total`, `estado`, `metodo_pago`, `pagos`, `monto_pagado`, `saldo_pendiente`, `observaciones`, `notas_internas`, `factura_fel_id`, `factura_numero`, `factura_serie`, `factura_uuid`, `fecha_facturacion`, `fecha_venta`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(14, 'V-2026-0014', 8, 'Brennere', '5567-2789', 'brenner@gmail.com', '52525252', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', 'TRANSFERENCIA', '[{\"metodo\":\"TRANSFERENCIA\",\"monto\":2000,\"referencia\":\"00000000000\",\"comprobante_url\":\"data:image/jpeg;base64,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\",\"fecha\":\"2026-01-24T19:04:50.796Z\",\"pos_seleccionado\":null,\"banco_id\":\"5\"}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 13:04:50', '2026-01-24 19:04:50', '2026-01-24 19:04:50', NULL, NULL),
(15, 'V-2026-0015', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-01-25T01:51:07.398Z\",\"pos_seleccionado\":null,\"banco_id\":null}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 19:51:07', '2026-01-25 01:51:07', '2026-01-25 01:51:07', NULL, NULL),
(16, 'V-2026-0016', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":11,\"nombre\":\"ALE MI AMOR\",\"cantidad\":1,\"precio_unitario\":149999,\"subtotal\":149999}]', 149999, 0, 0, 0, 149999, 'PENDIENTE', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":149999,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-02-04T05:12:02.237Z\",\"pos_seleccionado\":null,\"banco_id\":null}]', 0, 149999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-03 23:12:02', '2026-02-04 05:12:02', '2026-02-04 05:12:02', NULL, NULL),
(17, 'V-2026-0017', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":10,\"nombre\":\"PRUEBA 4\",\"cantidad\":1,\"precio_unitario\":5000,\"subtotal\":5000},{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 7000, 0, 0, 4, 7350, 'PENDIENTE', 'TARJETA', '[{\"metodo\":\"TARJETA\",\"monto\":7350,\"referencia\":\"1234\",\"comprobante_url\":null,\"fecha\":\"2026-02-13T03:17:40.775Z\",\"pos_seleccionado\":\"POS BAC\",\"banco_id\":null,\"interes_porcentaje\":5,\"interes_monto\":3.5}]', 0, 7350, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-12 21:17:40', '2026-02-13 03:17:40', '2026-02-13 03:17:40', NULL, NULL);

--
-- Disparadores `ventas`
--
DELIMITER $$
CREATE TRIGGER `after_insert_ventas_from_quote` AFTER INSERT ON `ventas` FOR EACH ROW BEGIN
    
    IF NEW.cotizacion_id IS NOT NULL THEN
        UPDATE cotizaciones
        SET estado = 'CONVERTIDA',
            convertida = 1,
            convertida_a = 'VENTA',
            referencia_venta_id = NEW.id,
            fecha_conversion = NOW()
        WHERE id = NEW.cotizacion_id;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_insert_ventas` BEFORE INSERT ON `ventas` FOR EACH ROW BEGIN
    DECLARE next_num INT;
    DECLARE year_suffix VARCHAR(4);
    
    
    SET year_suffix = YEAR(CURDATE());
    
    
    
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_venta, '-', -1) AS UNSIGNED)), 0) + 1
    INTO next_num
    FROM ventas
    WHERE numero_venta COLLATE utf8mb4_unicode_ci LIKE CONCAT('V-', year_suffix, '-%') COLLATE utf8mb4_unicode_ci;
    
    
    SET NEW.numero_venta = CONCAT('V-', year_suffix, '-', LPAD(next_num, 4, '0'));
    
    
    SET NEW.saldo_pendiente = NEW.total - NEW.monto_pagado;
    
    
    IF NEW.monto_pagado >= NEW.total THEN
        SET NEW.estado = 'PAGADA';
    ELSEIF NEW.monto_pagado > 0 THEN
        SET NEW.estado = 'PARCIAL';
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_update_ventas` BEFORE UPDATE ON `ventas` FOR EACH ROW BEGIN
    
    SET NEW.saldo_pendiente = NEW.total - NEW.monto_pagado;
    
    
    IF NEW.estado != 'ANULADA' THEN
        IF NEW.monto_pagado >= NEW.total THEN
            SET NEW.estado = 'PAGADA';
        ELSEIF NEW.monto_pagado > 0 THEN
            SET NEW.estado = 'PARCIAL';
        ELSE
            SET NEW.estado = 'PENDIENTE';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_estadisticas_repuestos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_estadisticas_repuestos` (
`tipo` enum('Pantalla','Bater├¡a','C├ímara','Flex','Placa','Back Cover','Altavoz','Conector','Otro')
,`marca` enum('Apple','Samsung','Xiaomi','Motorola','Huawei','Otra')
,`total_items` bigint(21)
,`stock_total` decimal(32,0)
,`items_stock_bajo` decimal(22,0)
,`valor_inventario_costo` decimal(46,4)
,`valor_inventario_publico` decimal(46,4)
,`precio_promedio` decimal(18,8)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_estadisticas_ventas`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_estadisticas_ventas` (
`total_ventas` bigint(21)
,`ventas_pagadas` decimal(22,0)
,`ventas_pendientes` decimal(22,0)
,`ventas_parciales` decimal(22,0)
,`total_vendido_quetzales` decimal(36,4)
,`total_cobrado_quetzales` decimal(36,4)
,`total_pendiente_quetzales` decimal(36,4)
,`promedio_venta_quetzales` decimal(18,8)
,`ventas_hoy` decimal(22,0)
,`total_hoy_quetzales` decimal(36,4)
,`ventas_mes_actual` decimal(22,0)
,`total_mes_actual_quetzales` decimal(36,4)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_lineas_con_marca`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_lineas_con_marca` (
`id` int(11)
,`linea_nombre` varchar(100)
,`marca_id` int(11)
,`marca_nombre` varchar(100)
,`descripcion` text
,`activo` tinyint(1)
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_marcas_con_lineas`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_marcas_con_lineas` (
`marca_id` int(11)
,`marca_nombre` varchar(100)
,`marca_descripcion` text
,`marca_activo` tinyint(1)
,`total_lineas` bigint(21)
,`lineas` mediumtext
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_repuestos_stock_bajo`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_repuestos_stock_bajo` (
`id` int(11)
,`nombre` varchar(150)
,`tipo` enum('Pantalla','Bater├¡a','C├ímara','Flex','Placa','Back Cover','Altavoz','Conector','Otro')
,`marca` enum('Apple','Samsung','Xiaomi','Motorola','Huawei','Otra')
,`linea` varchar(100)
,`stock` int(11)
,`stock_minimo` int(11)
,`unidades_faltantes` bigint(12)
,`precio_publico` int(11)
,`precio_costo` int(11)
,`costo_reposicion_estimado` bigint(22)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_resumen_clientes`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_resumen_clientes` (
`cliente_id` int(11)
,`nombre` varchar(100)
,`apellido` varchar(100)
,`total_interacciones` bigint(21)
,`total_cotizaciones` decimal(22,0)
,`total_ventas` decimal(22,0)
,`total_reparaciones` decimal(22,0)
,`total_visitas` decimal(22,0)
,`total_gastado` decimal(32,2)
,`ultima_interaccion` timestamp
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_resumen_cotizaciones`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_resumen_cotizaciones` (
`cliente_id` int(11)
,`nombre` varchar(100)
,`apellido` varchar(100)
,`total_cotizaciones` bigint(21)
,`cotizaciones_enviadas` decimal(22,0)
,`cotizaciones_aprobadas` decimal(22,0)
,`cotizaciones_rechazadas` decimal(22,0)
,`cotizaciones_vencidas` decimal(22,0)
,`cotizaciones_convertidas` decimal(22,0)
,`total_cotizado` decimal(32,2)
,`total_convertido` decimal(32,2)
,`ultima_cotizacion` date
,`tasa_conversion` decimal(38,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_ventas_completas`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_ventas_completas` (
`id` int(11)
,`numero_venta` varchar(20)
,`cliente_id` int(11)
,`cliente_nombre` varchar(200)
,`cliente_telefono` varchar(20)
,`cliente_nit` varchar(20)
,`cotizacion_id` int(11)
,`numero_cotizacion` varchar(20)
,`tipo_venta` enum('PRODUCTOS','REPUESTOS','MIXTA')
,`items` longtext
,`subtotal_quetzales` decimal(14,4)
,`impuestos_quetzales` decimal(14,4)
,`descuento_quetzales` decimal(14,4)
,`total_quetzales` decimal(14,4)
,`estado` enum('PENDIENTE','PAGADA','PARCIAL','ANULADA')
,`metodo_pago` enum('EFECTIVO','TARJETA','TRANSFERENCIA','MIXTO')
,`pagos` longtext
,`monto_pagado_quetzales` decimal(14,4)
,`saldo_pendiente_quetzales` decimal(14,4)
,`observaciones` text
,`factura_numero` varchar(50)
,`factura_uuid` varchar(100)
,`fecha_venta` datetime
,`created_at` timestamp
,`updated_at` timestamp
,`cliente_nombre_actual` varchar(100)
,`cliente_telefono_actual` varchar(20)
,`cotizacion_numero_actual` varchar(20)
,`cotizacion_estado` enum('BORRADOR','ENVIADA','APROBADA','RECHAZADA','VENCIDA','CONVERTIDA')
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_estadisticas_repuestos`
--
DROP TABLE IF EXISTS `v_estadisticas_repuestos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_estadisticas_repuestos`  AS SELECT `repuestos`.`tipo` AS `tipo`, `repuestos`.`marca` AS `marca`, count(0) AS `total_items`, sum(`repuestos`.`stock`) AS `stock_total`, sum(case when `repuestos`.`stock` < `repuestos`.`stock_minimo` then 1 else 0 end) AS `items_stock_bajo`, sum(`repuestos`.`precio_costo` * `repuestos`.`stock`) / 100 AS `valor_inventario_costo`, sum(`repuestos`.`precio_publico` * `repuestos`.`stock`) / 100 AS `valor_inventario_publico`, avg(`repuestos`.`precio_publico`) / 100 AS `precio_promedio` FROM `repuestos` WHERE `repuestos`.`activo` = 1 GROUP BY `repuestos`.`tipo`, `repuestos`.`marca` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_estadisticas_ventas`
--
DROP TABLE IF EXISTS `v_estadisticas_ventas`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_estadisticas_ventas`  AS SELECT count(0) AS `total_ventas`, sum(case when `ventas`.`estado` = 'PAGADA' then 1 else 0 end) AS `ventas_pagadas`, sum(case when `ventas`.`estado` = 'PENDIENTE' then 1 else 0 end) AS `ventas_pendientes`, sum(case when `ventas`.`estado` = 'PARCIAL' then 1 else 0 end) AS `ventas_parciales`, sum(`ventas`.`total`) / 100 AS `total_vendido_quetzales`, sum(`ventas`.`monto_pagado`) / 100 AS `total_cobrado_quetzales`, sum(`ventas`.`saldo_pendiente`) / 100 AS `total_pendiente_quetzales`, avg(`ventas`.`total`) / 100 AS `promedio_venta_quetzales`, sum(case when cast(`ventas`.`fecha_venta` as date) = curdate() then 1 else 0 end) AS `ventas_hoy`, sum(case when cast(`ventas`.`fecha_venta` as date) = curdate() then `ventas`.`total` else 0 end) / 100 AS `total_hoy_quetzales`, sum(case when month(`ventas`.`fecha_venta`) = month(curdate()) and year(`ventas`.`fecha_venta`) = year(curdate()) then 1 else 0 end) AS `ventas_mes_actual`, sum(case when month(`ventas`.`fecha_venta`) = month(curdate()) and year(`ventas`.`fecha_venta`) = year(curdate()) then `ventas`.`total` else 0 end) / 100 AS `total_mes_actual_quetzales` FROM `ventas` WHERE `ventas`.`estado` <> 'ANULADA' ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_lineas_con_marca`
--
DROP TABLE IF EXISTS `v_lineas_con_marca`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_lineas_con_marca`  AS SELECT `l`.`id` AS `id`, `l`.`nombre` AS `linea_nombre`, `l`.`marca_id` AS `marca_id`, `m`.`nombre` AS `marca_nombre`, `l`.`descripcion` AS `descripcion`, `l`.`activo` AS `activo`, `l`.`created_at` AS `created_at`, `l`.`updated_at` AS `updated_at` FROM (`lineas` `l` join `marcas` `m` on(`l`.`marca_id` = `m`.`id`)) WHERE `l`.`activo` = 1 AND `m`.`activo` = 1 ORDER BY `m`.`nombre` ASC, `l`.`nombre` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_marcas_con_lineas`
--
DROP TABLE IF EXISTS `v_marcas_con_lineas`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_marcas_con_lineas`  AS SELECT `m`.`id` AS `marca_id`, `m`.`nombre` AS `marca_nombre`, `m`.`descripcion` AS `marca_descripcion`, `m`.`activo` AS `marca_activo`, count(`l`.`id`) AS `total_lineas`, group_concat(`l`.`nombre` order by `l`.`nombre` ASC separator ', ') AS `lineas` FROM (`marcas` `m` left join `lineas` `l` on(`m`.`id` = `l`.`marca_id` and `l`.`activo` = 1)) WHERE `m`.`activo` = 1 GROUP BY `m`.`id`, `m`.`nombre`, `m`.`descripcion`, `m`.`activo` ORDER BY `m`.`nombre` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_repuestos_stock_bajo`
--
DROP TABLE IF EXISTS `v_repuestos_stock_bajo`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_repuestos_stock_bajo`  AS SELECT `r`.`id` AS `id`, `r`.`nombre` AS `nombre`, `r`.`tipo` AS `tipo`, `r`.`marca` AS `marca`, `r`.`linea` AS `linea`, `r`.`stock` AS `stock`, `r`.`stock_minimo` AS `stock_minimo`, `r`.`stock_minimo`- `r`.`stock` AS `unidades_faltantes`, `r`.`precio_publico` AS `precio_publico`, `r`.`precio_costo` AS `precio_costo`, `r`.`precio_costo`* (`r`.`stock_minimo` - `r`.`stock`) AS `costo_reposicion_estimado` FROM `repuestos` AS `r` WHERE `r`.`activo` = 1 AND `r`.`stock` < `r`.`stock_minimo` ORDER BY `r`.`stock_minimo`- `r`.`stock` DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_resumen_clientes`
--
DROP TABLE IF EXISTS `v_resumen_clientes`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_resumen_clientes`  AS SELECT `c`.`id` AS `cliente_id`, `c`.`nombre` AS `nombre`, `c`.`apellido` AS `apellido`, count(`i`.`id`) AS `total_interacciones`, sum(case when `i`.`tipo` = 'cotizacion' then 1 else 0 end) AS `total_cotizaciones`, sum(case when `i`.`tipo` = 'venta' then 1 else 0 end) AS `total_ventas`, sum(case when `i`.`tipo` = 'reparacion' then 1 else 0 end) AS `total_reparaciones`, sum(case when `i`.`tipo` = 'visita' then 1 else 0 end) AS `total_visitas`, coalesce(sum(case when `i`.`tipo` = 'venta' then `i`.`monto` else 0 end),0) AS `total_gastado`, max(`i`.`created_at`) AS `ultima_interaccion` FROM (`clientes` `c` left join `interacciones_clientes` `i` on(`c`.`id` = `i`.`cliente_id`)) WHERE `c`.`activo` = 1 GROUP BY `c`.`id`, `c`.`nombre`, `c`.`apellido` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_resumen_cotizaciones`
--
DROP TABLE IF EXISTS `v_resumen_cotizaciones`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_resumen_cotizaciones`  AS SELECT `c`.`id` AS `cliente_id`, `c`.`nombre` AS `nombre`, `c`.`apellido` AS `apellido`, count(`cot`.`id`) AS `total_cotizaciones`, sum(case when `cot`.`estado` = 'ENVIADA' then 1 else 0 end) AS `cotizaciones_enviadas`, sum(case when `cot`.`estado` = 'APROBADA' then 1 else 0 end) AS `cotizaciones_aprobadas`, sum(case when `cot`.`estado` = 'RECHAZADA' then 1 else 0 end) AS `cotizaciones_rechazadas`, sum(case when `cot`.`estado` = 'VENCIDA' then 1 else 0 end) AS `cotizaciones_vencidas`, sum(case when `cot`.`estado` = 'CONVERTIDA' then 1 else 0 end) AS `cotizaciones_convertidas`, sum(`cot`.`total`) AS `total_cotizado`, sum(case when `cot`.`estado` = 'CONVERTIDA' then `cot`.`total` else 0 end) AS `total_convertido`, max(`cot`.`fecha_emision`) AS `ultima_cotizacion`, round(sum(case when `cot`.`estado` = 'CONVERTIDA' then `cot`.`total` else 0 end) / nullif(sum(`cot`.`total`),0) * 100,2) AS `tasa_conversion` FROM (`clientes` `c` left join `cotizaciones` `cot` on(`c`.`id` = `cot`.`cliente_id`)) WHERE `c`.`activo` = 1 GROUP BY `c`.`id`, `c`.`nombre`, `c`.`apellido` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_ventas_completas`
--
DROP TABLE IF EXISTS `v_ventas_completas`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_ventas_completas`  AS SELECT `v`.`id` AS `id`, `v`.`numero_venta` AS `numero_venta`, `v`.`cliente_id` AS `cliente_id`, `v`.`cliente_nombre` AS `cliente_nombre`, `v`.`cliente_telefono` AS `cliente_telefono`, `v`.`cliente_nit` AS `cliente_nit`, `v`.`cotizacion_id` AS `cotizacion_id`, `v`.`numero_cotizacion` AS `numero_cotizacion`, `v`.`tipo_venta` AS `tipo_venta`, `v`.`items` AS `items`, `v`.`subtotal`/ 100 AS `subtotal_quetzales`, `v`.`impuestos`/ 100 AS `impuestos_quetzales`, `v`.`descuento`/ 100 AS `descuento_quetzales`, `v`.`total`/ 100 AS `total_quetzales`, `v`.`estado` AS `estado`, `v`.`metodo_pago` AS `metodo_pago`, `v`.`pagos` AS `pagos`, `v`.`monto_pagado`/ 100 AS `monto_pagado_quetzales`, `v`.`saldo_pendiente`/ 100 AS `saldo_pendiente_quetzales`, `v`.`observaciones` AS `observaciones`, `v`.`factura_numero` AS `factura_numero`, `v`.`factura_uuid` AS `factura_uuid`, `v`.`fecha_venta` AS `fecha_venta`, `v`.`created_at` AS `created_at`, `v`.`updated_at` AS `updated_at`, `c`.`nombre` AS `cliente_nombre_actual`, `c`.`telefono` AS `cliente_telefono_actual`, `cot`.`numero_cotizacion` AS `cotizacion_numero_actual`, `cot`.`estado` AS `cotizacion_estado` FROM ((`ventas` `v` left join `clientes` `c` on(`v`.`cliente_id` = `c`.`id`)) left join `cotizaciones` `cot` on(`v`.`cotizacion_id` = `cot`.`id`)) ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_telefono` (`telefono`),
  ADD KEY `idx_nit` (`nit`),
  ADD KEY `idx_nombre` (`nombre`);

--
-- Indices de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_cotizacion` (`numero_cotizacion`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_emision` (`fecha_emision`),
  ADD KEY `idx_fecha_vencimiento` (`fecha_vencimiento`),
  ADD KEY `idx_numero` (`numero_cotizacion`),
  ADD KEY `idx_convertida` (`convertida`);

--
-- Indices de la tabla `equipos_marcas`
--
ALTER TABLE `equipos_marcas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_tipo` (`tipo_equipo`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `equipos_modelos`
--
ALTER TABLE `equipos_modelos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_modelo_marca` (`marca_id`,`nombre`),
  ADD KEY `idx_marca` (`marca_id`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `interacciones_clientes`
--
ALTER TABLE `interacciones_clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente_tipo` (`cliente_id`,`tipo`),
  ADD KEY `idx_fecha` (`created_at`),
  ADD KEY `idx_tipo` (`tipo`);

--
-- Indices de la tabla `lineas`
--
ALTER TABLE `lineas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_marca_linea` (`marca_id`,`nombre`),
  ADD KEY `idx_marca` (`marca_id`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `marcas`
--
ALTER TABLE `marcas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_sku` (`sku`),
  ADD KEY `idx_categoria` (`categoria`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_producto` (`producto_id`),
  ADD KEY `idx_orden` (`orden`);

--
-- Indices de la tabla `reparaciones`
--
ALTER TABLE `reparaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sticker_serie_interna` (`sticker_serie_interna`),
  ADD KEY `idx_cliente_nombre` (`cliente_nombre`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_ingreso` (`fecha_ingreso`),
  ADD KEY `idx_sticker` (`sticker_serie_interna`),
  ADD KEY `cliente_id` (`cliente_id`);

--
-- Indices de la tabla `reparaciones_accesorios`
--
ALTER TABLE `reparaciones_accesorios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reparacion` (`reparacion_id`);

--
-- Indices de la tabla `reparaciones_historial`
--
ALTER TABLE `reparaciones_historial`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reparacion` (`reparacion_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indices de la tabla `reparaciones_imagenes`
--
ALTER TABLE `reparaciones_imagenes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reparacion` (`reparacion_id`),
  ADD KEY `idx_historial` (`historial_id`),
  ADD KEY `idx_tipo` (`tipo`);

--
-- Indices de la tabla `reparaciones_items`
--
ALTER TABLE `reparaciones_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reparacion` (`reparacion_id`);

--
-- Indices de la tabla `repuestos`
--
ALTER TABLE `repuestos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_marca` (`marca`),
  ADD KEY `idx_linea` (`linea`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `idx_stock` (`stock`);

--
-- Indices de la tabla `repuestos_movimientos`
--
ALTER TABLE `repuestos_movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_repuesto` (`repuesto_id`),
  ADD KEY `idx_tipo` (`tipo_movimiento`),
  ADD KEY `idx_fecha` (`created_at`);

--
-- Indices de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categoria_id` (`categoria_id`,`nombre`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_venta` (`numero_venta`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_cotizacion` (`cotizacion_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_venta` (`fecha_venta`),
  ADD KEY `idx_numero` (`numero_venta`),
  ADD KEY `idx_tipo_venta` (`tipo_venta`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `equipos_marcas`
--
ALTER TABLE `equipos_marcas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `equipos_modelos`
--
ALTER TABLE `equipos_modelos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de la tabla `interacciones_clientes`
--
ALTER TABLE `interacciones_clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `lineas`
--
ALTER TABLE `lineas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=217;

--
-- AUTO_INCREMENT de la tabla `marcas`
--
ALTER TABLE `marcas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reparaciones_accesorios`
--
ALTER TABLE `reparaciones_accesorios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `reparaciones_historial`
--
ALTER TABLE `reparaciones_historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `reparaciones_imagenes`
--
ALTER TABLE `reparaciones_imagenes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `reparaciones_items`
--
ALTER TABLE `reparaciones_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `repuestos`
--
ALTER TABLE `repuestos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `repuestos_movimientos`
--
ALTER TABLE `repuestos_movimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  ADD CONSTRAINT `cotizaciones_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `equipos_modelos`
--
ALTER TABLE `equipos_modelos`
  ADD CONSTRAINT `equipos_modelos_ibfk_1` FOREIGN KEY (`marca_id`) REFERENCES `equipos_marcas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `interacciones_clientes`
--
ALTER TABLE `interacciones_clientes`
  ADD CONSTRAINT `interacciones_clientes_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `lineas`
--
ALTER TABLE `lineas`
  ADD CONSTRAINT `lineas_ibfk_1` FOREIGN KEY (`marca_id`) REFERENCES `marcas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD CONSTRAINT `producto_imagenes_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reparaciones`
--
ALTER TABLE `reparaciones`
  ADD CONSTRAINT `reparaciones_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `reparaciones_accesorios`
--
ALTER TABLE `reparaciones_accesorios`
  ADD CONSTRAINT `reparaciones_accesorios_ibfk_1` FOREIGN KEY (`reparacion_id`) REFERENCES `reparaciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reparaciones_historial`
--
ALTER TABLE `reparaciones_historial`
  ADD CONSTRAINT `reparaciones_historial_ibfk_1` FOREIGN KEY (`reparacion_id`) REFERENCES `reparaciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reparaciones_imagenes`
--
ALTER TABLE `reparaciones_imagenes`
  ADD CONSTRAINT `reparaciones_imagenes_ibfk_1` FOREIGN KEY (`reparacion_id`) REFERENCES `reparaciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reparaciones_imagenes_ibfk_2` FOREIGN KEY (`historial_id`) REFERENCES `reparaciones_historial` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `reparaciones_items`
--
ALTER TABLE `reparaciones_items`
  ADD CONSTRAINT `reparaciones_items_ibfk_1` FOREIGN KEY (`reparacion_id`) REFERENCES `reparaciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `repuestos_movimientos`
--
ALTER TABLE `repuestos_movimientos`
  ADD CONSTRAINT `repuestos_movimientos_ibfk_1` FOREIGN KEY (`repuesto_id`) REFERENCES `repuestos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ventas_ibfk_2` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
