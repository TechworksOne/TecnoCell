-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 27-04-2026 a las 08:43:21
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
-- Estructura de tabla para la tabla `caja_chica`
--

CREATE TABLE `caja_chica` (
  `id` int(11) NOT NULL,
  `tipo_movimiento` enum('INGRESO','EGRESO') NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `concepto` varchar(255) NOT NULL,
  `categoria` varchar(100) DEFAULT 'Otro',
  `estado` enum('PENDIENTE','CONFIRMADO') NOT NULL DEFAULT 'PENDIENTE',
  `venta_id` int(11) DEFAULT NULL,
  `realizado_por` varchar(100) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_movimiento` datetime DEFAULT current_timestamp(),
  `referencia_tipo` varchar(50) DEFAULT NULL,
  `referencia_id` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `caja_chica`
--

INSERT INTO `caja_chica` (`id`, `tipo_movimiento`, `monto`, `concepto`, `categoria`, `estado`, `venta_id`, `realizado_por`, `observaciones`, `fecha_movimiento`, `referencia_tipo`, `referencia_id`) VALUES
(1, 'INGRESO', 150.00, 'Anticipo Reparación REP1773989186780', 'Reparación', 'CONFIRMADO', NULL, 'Sistema', NULL, '2026-03-20 00:46:26', NULL, NULL),
(2, 'INGRESO', 100.00, 'Anticipo Reparacion REP1769210880817', 'Reparacion', 'CONFIRMADO', NULL, 'Sistema', NULL, '2026-01-23 00:00:00', NULL, NULL),
(3, 'INGRESO', 100.00, 'Anticipo Reparacion REP1769305961778', 'Reparacion', 'CONFIRMADO', NULL, 'Sistema', NULL, '2026-01-25 00:00:00', NULL, NULL),
(4, 'INGRESO', 700.00, 'Anticipo Reparacion REP1770952861433', 'Reparacion', 'CONFIRMADO', NULL, 'Sistema', NULL, '2026-02-13 00:00:00', NULL, NULL),
(5, 'INGRESO', 300.00, 'Anticipo Reparacion REP1773989288266', 'Reparacion', 'CONFIRMADO', NULL, 'Sistema', NULL, '2026-03-20 00:00:00', NULL, NULL),
(9, 'INGRESO', 400.00, 'Venta V-2026-0018', 'Venta', 'CONFIRMADO', 0, 'Sistema', NULL, '2026-03-20 01:02:54', NULL, NULL),
(10, 'EGRESO', 50.00, 'Depósito a BAC - AHORRO', 'Otro', 'CONFIRMADO', NULL, 'Usuario', 'si', '2026-03-20 01:26:21', NULL, NULL),
(11, 'EGRESO', 300.00, 'gasto', 'Gasto', 'CONFIRMADO', NULL, 'Usuario', 'gastos x', '2026-03-20 09:40:47', NULL, NULL),
(12, 'INGRESO', 20.00, 'Venta V-2026-0019', 'Venta', 'CONFIRMADO', 0, 'Sistema', NULL, '2026-03-20 09:47:41', NULL, NULL),
(13, 'INGRESO', 700.00, 'Anticipo de reparación REP1769280424892', 'ANTICIPO_REPARACION', 'CONFIRMADO', NULL, 'Usuario', 'Anticipo registrado desde checklist de ingreso', '2026-04-26 19:19:38', 'REPARACION', 'REP1769280424892'),
(14, 'INGRESO', 999.99, 'Anticipo de reparación REP1769269790907', 'ANTICIPO_REPARACION', 'PENDIENTE', NULL, 'Usuario', 'Anticipo registrado desde checklist de ingreso', '2026-04-26 19:32:53', 'REPARACION', 'REP1769269790907'),
(15, 'INGRESO', 80.00, 'sss', 'Ingreso Manual', 'CONFIRMADO', NULL, 'Usuario', 'cuadre', '2026-04-26 19:34:11', NULL, NULL),
(16, 'EGRESO', 850.00, 'Gasto de prohygiene', 'Gasto', 'CONFIRMADO', NULL, 'Usuario', NULL, '2026-04-26 19:39:37', NULL, NULL),
(17, 'INGRESO', 400.00, 'Venta V-2026-0020', 'Venta', 'PENDIENTE', 0, 'Sistema', NULL, '2026-04-26 21:08:49', NULL, NULL);

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
-- Estructura de tabla para la tabla `check_equipo`
--

CREATE TABLE `check_equipo` (
  `id` int(11) NOT NULL,
  `reparacion_id` varchar(50) NOT NULL,
  `tipo_equipo` varchar(50) NOT NULL,
  `enciende` tinyint(1) DEFAULT 0,
  `tactil_funciona` tinyint(1) DEFAULT 0,
  `pantalla_ok` tinyint(1) DEFAULT 0,
  `bateria_ok` tinyint(1) DEFAULT 0,
  `carga_ok` tinyint(1) DEFAULT 0,
  `telefono_checks` text DEFAULT NULL,
  `tablet_checks` text DEFAULT NULL,
  `computadora_checks` text DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fotos_checklist` text DEFAULT NULL,
  `realizado_por` varchar(100) DEFAULT 'Sistema',
  `fecha_checklist` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `check_equipo`
--

INSERT INTO `check_equipo` (`id`, `reparacion_id`, `tipo_equipo`, `enciende`, `tactil_funciona`, `pantalla_ok`, `bateria_ok`, `carga_ok`, `telefono_checks`, `tablet_checks`, `computadora_checks`, `observaciones`, `fotos_checklist`, `realizado_por`, `fecha_checklist`, `created_at`, `updated_at`) VALUES
(1, 'REP1769210880817', 'Telefono', 1, 1, 1, 1, 1, '{\"senal\":true,\"wifi\":false,\"bluetooth\":false,\"gps\":true,\"datos\":false,\"camaraTrasera\":false,\"camaraFrontal\":true,\"flash\":false,\"zoom\":false,\"bocina\":true,\"auricular\":false,\"microfono\":false,\"microfonoLlamadas\":false,\"vibrador\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"botonHome\":false,\"sensorHuella\":false,\"faceId\":false,\"sensorProximidad\":false,\"sensorLuz\":false,\"nfc\":false,\"infrarrojo\":false,\"jackAudifonos\":false,\"puertoCarga\":false,\"cargaRapida\":false,\"cargaInalambrica\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false,\"notificaciones\":false}', NULL, NULL, NULL, '[]', 'Usuario', '2026-03-20 05:22:39', '2026-03-20 05:22:39', '2026-03-20 05:22:39'),
(2, 'REP1773989288266', 'Tablet', 1, 0, 0, 1, 0, NULL, '{\"wifi\":true,\"bluetooth\":false,\"gps\":false,\"camaraTrasera\":true,\"camaraFrontal\":false,\"flash\":false,\"bocinas\":true,\"microfono\":false,\"acelerometro\":false,\"giroscopio\":true,\"sensorLuz\":false,\"puertoCarga\":false,\"jackAudifonos\":true,\"botonesVolumen\":false,\"botonEncendido\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false}', NULL, 'jhbj', '[]', 'Usuario', '2026-03-20 06:54:44', '2026-03-20 06:54:44', '2026-03-20 06:54:44'),
(3, 'REP1769305961778', 'Telefono', 0, 0, 0, 1, 0, '{\"senal\":true,\"wifi\":false,\"bluetooth\":false,\"gps\":false,\"datos\":false,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":false,\"zoom\":false,\"bocina\":false,\"auricular\":false,\"microfono\":false,\"microfonoLlamadas\":false,\"vibrador\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"botonHome\":false,\"sensorHuella\":false,\"faceId\":false,\"sensorProximidad\":false,\"sensorLuz\":false,\"nfc\":false,\"infrarrojo\":false,\"jackAudifonos\":false,\"puertoCarga\":false,\"cargaRapida\":false,\"cargaInalambrica\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false,\"notificaciones\":false}', NULL, NULL, NULL, '[]', 'Usuario', '2026-03-20 06:56:38', '2026-03-20 06:56:38', '2026-03-20 06:56:38'),
(4, 'REP1773989186780', 'Telefono', 0, 0, 0, 0, 1, '{\"senal\":false,\"wifi\":true,\"bluetooth\":false,\"gps\":false,\"datos\":true,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":false,\"zoom\":false,\"bocina\":false,\"auricular\":false,\"microfono\":false,\"microfonoLlamadas\":false,\"vibrador\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"botonHome\":false,\"sensorHuella\":false,\"faceId\":false,\"sensorProximidad\":false,\"sensorLuz\":false,\"nfc\":false,\"infrarrojo\":false,\"jackAudifonos\":false,\"puertoCarga\":false,\"cargaRapida\":false,\"cargaInalambrica\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false,\"notificaciones\":false}', NULL, NULL, NULL, '[]', 'Usuario', '2026-03-20 22:19:07', '2026-03-20 22:19:07', '2026-03-20 22:19:07'),
(5, 'REP1770952861433', 'Telefono', 1, 1, 0, 0, 1, '{\"senal\":false,\"wifi\":false,\"bluetooth\":false,\"gps\":false,\"datos\":false,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":false,\"zoom\":false,\"bocina\":false,\"auricular\":false,\"microfono\":false,\"microfonoLlamadas\":false,\"vibrador\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"botonHome\":false,\"sensorHuella\":false,\"faceId\":false,\"sensorProximidad\":false,\"sensorLuz\":false,\"nfc\":false,\"infrarrojo\":false,\"jackAudifonos\":false,\"puertoCarga\":false,\"cargaRapida\":false,\"cargaInalambrica\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false,\"notificaciones\":false}', NULL, NULL, NULL, '[]', 'Usuario', '2026-03-20 22:21:01', '2026-03-20 22:21:01', '2026-03-20 22:21:01'),
(6, 'REP1769280616177', 'Tablet', 1, 0, 0, 0, 0, NULL, '{\"wifi\":false,\"bluetooth\":false,\"gps\":false,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":false,\"bocinas\":false,\"microfono\":false,\"acelerometro\":false,\"giroscopio\":false,\"sensorLuz\":false,\"puertoCarga\":false,\"jackAudifonos\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false}', NULL, NULL, '[]', 'Usuario', '2026-03-20 22:22:07', '2026-03-20 22:22:07', '2026-03-20 22:22:07'),
(7, 'REP1777251040902', 'Telefono', 0, 1, 0, 0, 0, '{\"senal\":false,\"wifi\":false,\"bluetooth\":false,\"gps\":false,\"datos\":false,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":false,\"zoom\":false,\"bocina\":false,\"auricular\":false,\"microfono\":false,\"microfonoLlamadas\":false,\"vibrador\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"botonHome\":false,\"sensorHuella\":false,\"faceId\":false,\"sensorProximidad\":false,\"sensorLuz\":false,\"nfc\":false,\"infrarrojo\":false,\"jackAudifonos\":false,\"puertoCarga\":false,\"cargaRapida\":false,\"cargaInalambrica\":false,\"simCard\":true,\"sdCard\":true,\"rotation\":false,\"notificaciones\":false}', NULL, NULL, 'ss', '[]', 'Usuario', '2026-04-27 01:07:11', '2026-04-27 01:07:11', '2026-04-27 01:07:11'),
(8, 'REP1769280424892', 'Telefono', 1, 0, 1, 0, 1, '{\"senal\":true,\"wifi\":false,\"bluetooth\":true,\"gps\":false,\"datos\":false,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":false,\"zoom\":false,\"bocina\":false,\"auricular\":false,\"microfono\":false,\"microfonoLlamadas\":false,\"vibrador\":false,\"botonesVolumen\":false,\"botonEncendido\":false,\"botonHome\":false,\"sensorHuella\":false,\"faceId\":false,\"sensorProximidad\":false,\"sensorLuz\":false,\"nfc\":false,\"infrarrojo\":false,\"jackAudifonos\":false,\"puertoCarga\":false,\"cargaRapida\":false,\"cargaInalambrica\":false,\"simCard\":false,\"sdCard\":false,\"rotation\":false,\"notificaciones\":false}', NULL, NULL, 'si funciona', '[]', 'Usuario', '2026-04-27 01:19:38', '2026-04-27 01:19:38', '2026-04-27 01:19:38'),
(9, 'REP1769269790907', 'Laptop', 1, 1, 1, 0, 0, NULL, NULL, '{\"teclado\":false,\"teclasFuncion\":false,\"touchpad\":false,\"clickTouchpad\":false,\"puertosUsb\":false,\"usbC\":false,\"puertoHdmi\":false,\"puertoVga\":false,\"ethernet\":false,\"lectorSd\":true,\"webcam\":true,\"microfono\":false,\"bocinas\":true,\"jackAudifonos\":true,\"wifi\":false,\"bluetooth\":false,\"lectorHuella\":false,\"retroiluminacion\":false,\"ventilador\":false,\"bisagras\":true,\"unidadOptica\":false}', 'ssjaksaskaksa', '[]', 'Usuario', '2026-04-27 01:32:53', '2026-04-27 01:32:53', '2026-04-27 01:32:53'),
(10, 'REP1777253717575', 'Tablet', 1, 1, 1, 1, 0, NULL, '{\"wifi\":false,\"bluetooth\":false,\"gps\":true,\"camaraTrasera\":false,\"camaraFrontal\":false,\"flash\":true,\"bocinas\":true,\"microfono\":true,\"acelerometro\":true,\"giroscopio\":true,\"sensorLuz\":true,\"puertoCarga\":true,\"jackAudifonos\":true,\"botonesVolumen\":true,\"botonEncendido\":true,\"simCard\":true,\"sdCard\":true,\"rotation\":true}', NULL, NULL, '[]', 'Usuario', '2026-04-27 01:38:24', '2026-04-27 01:38:24', '2026-04-27 01:38:24');

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
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id` int(11) NOT NULL,
  `numero_compra` varchar(50) NOT NULL,
  `fecha_compra` date NOT NULL,
  `proveedor_id` int(11) DEFAULT NULL,
  `proveedor_nombre` varchar(200) NOT NULL,
  `proveedor_telefono` varchar(20) DEFAULT NULL,
  `proveedor_nit` varchar(20) DEFAULT NULL,
  `proveedor_direccion` text DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `impuestos` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `notas` text DEFAULT NULL,
  `tipo` enum('PRODUCTO','REPUESTO','MIXTA') DEFAULT 'PRODUCTO',
  `estado` enum('BORRADOR','CONFIRMADA','RECIBIDA','CANCELADA') DEFAULT 'CONFIRMADA',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `compras`
--

INSERT INTO `compras` (`id`, `numero_compra`, `fecha_compra`, `proveedor_id`, `proveedor_nombre`, `proveedor_telefono`, `proveedor_nit`, `proveedor_direccion`, `subtotal`, `impuestos`, `total`, `notas`, `tipo`, `estado`, `created_at`, `updated_at`, `created_by`) VALUES
(2, 'COMP-2026-1', '2026-03-19', NULL, 'Distribuidora Tech GT', '5555-1234', '1234567-8', NULL, 750.00, 0.00, 750.00, 'Test OK', 'PRODUCTO', 'CONFIRMADA', '2026-03-20 06:25:35', '2026-03-20 06:25:35', NULL),
(3, 'COMR-2026-3', '2026-03-20', 5, 'CELOVENDO', '52584233', '1123456', 'LA CAPITAL ', 860.00, 0.00, 860.00, '', 'REPUESTO', 'CONFIRMADA', '2026-03-20 06:27:04', '2026-03-20 06:27:04', NULL),
(4, 'COMR-2026-4', '2026-03-20', 5, 'CELOVENDO', '52584233', '1123456', 'LA CAPITAL ', 3000.00, 0.00, 3000.00, '', 'REPUESTO', 'CONFIRMADA', '2026-03-20 06:28:34', '2026-03-20 06:28:34', NULL),
(5, 'COMP-2026-5', '2026-04-27', 5, 'CELOVENDO', '52584233', '1123456', 'LA CAPITAL ', 250.00, 0.00, 250.00, '', 'PRODUCTO', 'CONFIRMADA', '2026-04-27 03:03:07', '2026-04-27 03:03:07', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compra_items`
--

CREATE TABLE `compra_items` (
  `id` int(11) NOT NULL,
  `compra_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `nombre_producto` varchar(200) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `aplica_serie` tinyint(1) DEFAULT 0,
  `tipo_item` enum('producto','repuesto') DEFAULT 'producto',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `compra_items`
--

INSERT INTO `compra_items` (`id`, `compra_id`, `producto_id`, `sku`, `nombre_producto`, `cantidad`, `precio_unitario`, `subtotal`, `aplica_serie`, `tipo_item`, `created_at`) VALUES
(1, 2, 11, 'TEC_PROD11', 'Pantalla iPhone 11', 3, 250.00, 750.00, 0, 'producto', '2026-03-20 06:25:35'),
(2, 3, 14, 'PAN_APPL_GEN_000014', 'Pantalla iphone 11', 2, 430.00, 860.00, 0, 'producto', '2026-03-20 06:27:04'),
(3, 4, 12, 'PAN_APPL_GEN_000012', 'PANTALLA IPHONE 15 PRO MAX', 3, 1000.00, 3000.00, 0, 'producto', '2026-03-20 06:28:34'),
(4, 5, 11, 'TEC_PROD11_801802', 'ALE MI AMOR', 1, 250.00, 250.00, 1, 'producto', '2026-04-27 03:03:07');

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
-- Estructura de tabla para la tabla `cuentas_bancarias`
--

CREATE TABLE `cuentas_bancarias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `numero_cuenta` varchar(50) DEFAULT NULL,
  `tipo_cuenta` varchar(50) DEFAULT 'Corriente',
  `saldo_actual` decimal(10,2) DEFAULT 0.00,
  `pos_asociado` varchar(100) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cuentas_bancarias`
--

INSERT INTO `cuentas_bancarias` (`id`, `nombre`, `numero_cuenta`, `tipo_cuenta`, `saldo_actual`, `pos_asociado`, `activa`, `created_at`) VALUES
(1, 'BAC', NULL, 'Corriente', 845.00, 'POS BAC', 1, '2026-03-20 00:34:10'),
(2, 'Banco Industrial', NULL, 'Corriente', 5.00, 'POS NEONET', 1, '2026-03-20 00:34:10'),
(3, 'Promerica', NULL, 'Corriente', 0.00, NULL, 1, '2026-03-20 01:30:26'),
(4, 'Zigi', NULL, 'Corriente', 0.00, NULL, 1, '2026-03-20 01:30:26'),
(5, 'Banrural', NULL, 'Corriente', 50.00, NULL, 1, '2026-03-20 01:30:26');

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
-- Estructura de tabla para la tabla `movimientos_bancarios`
--

CREATE TABLE `movimientos_bancarios` (
  `id` int(11) NOT NULL,
  `cuenta_id` int(11) NOT NULL,
  `tipo_movimiento` enum('INGRESO','EGRESO') NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `concepto` varchar(255) NOT NULL,
  `categoria` varchar(100) DEFAULT 'Otro',
  `estado` enum('PENDIENTE','CONFIRMADO') NOT NULL DEFAULT 'PENDIENTE',
  `venta_id` int(11) DEFAULT NULL,
  `numero_referencia` varchar(100) DEFAULT NULL,
  `realizado_por` varchar(100) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_movimiento` datetime DEFAULT current_timestamp(),
  `referencia_tipo` varchar(50) DEFAULT NULL,
  `referencia_id` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimientos_bancarios`
--

INSERT INTO `movimientos_bancarios` (`id`, `cuenta_id`, `tipo_movimiento`, `monto`, `concepto`, `categoria`, `estado`, `venta_id`, `numero_referencia`, `realizado_por`, `observaciones`, `fecha_movimiento`, `referencia_tipo`, `referencia_id`) VALUES
(2, 1, 'INGRESO', 50.00, 'Depósito desde Caja Chica - AHORRO', 'Deposito', 'CONFIRMADO', NULL, NULL, 'Usuario', 'si', '2026-03-20 01:26:21', NULL, NULL),
(3, 1, 'EGRESO', 5.00, 'Transferencia a Banco Industrial - CAMBOI', 'Transferencia', 'CONFIRMADO', NULL, NULL, 'Usuario', 'SII', '2026-03-20 01:28:05', NULL, NULL),
(4, 2, 'INGRESO', 5.00, 'Transferencia desde BAC - CAMBOI', 'Transferencia', 'CONFIRMADO', NULL, NULL, 'Usuario', 'SII', '2026-03-20 01:28:05', NULL, NULL),
(5, 1, 'INGRESO', 850.00, 'Anticipo de reparación REP1777253717575', 'ANTICIPO_REPARACION', 'CONFIRMADO', NULL, NULL, 'Usuario', 'Anticipo por transferencia desde checklist de ingreso', '2026-04-26 19:38:24', 'REPARACION', 'REP1777253717575'),
(6, 1, 'EGRESO', 50.00, 'Transferencia a Banrural - ajuste', 'Transferencia', 'CONFIRMADO', NULL, NULL, 'Usuario', 'aiiiii', '2026-04-26 20:04:55', NULL, NULL),
(7, 5, 'INGRESO', 50.00, 'Transferencia desde BAC - ajuste', 'Transferencia', 'CONFIRMADO', NULL, NULL, 'Usuario', 'aiiiii', '2026-04-26 20:04:55', NULL, NULL);

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
(1, 'SKU1', 'VIDRIO TEMPLADO IPHONE 12', 'PRODUCTO ', 'VIDRIOS', 'IPHONE 12', 2.00, 20.00, 3, 5, 0, 0, 1, '2025-12-30 03:06:21', '2026-03-20 15:47:41'),
(2, 'sku3', 'Vidrios iphone 12 normal ', 'jskadaidjqkjqkijzbjkd<khsjkq', 'vidrios', 'iphone 12', 2.00, 20.00, 6, 5, 0, 0, 1, '2025-12-30 03:28:46', '2026-01-24 18:01:23'),
(3, 'SKU5', 'COMBO TECLADO MOUSE MARVO ', 'TECALDO MOUSE TEX TEC ETC ', 'COMPUTADORAS', 'PERIFERICOS-HARDWARE', 280.00, 400.00, 0, 3, 0, 0, 1, '2025-12-31 21:47:49', '2026-04-27 03:08:49'),
(4, 'TEC_PROD4_758125', 'estuche spigen iphone 12 ', 'estcuhes ssssss', 'ESTUCHES', 'SPIGEN', 53.00, 149.97, 25, 8, 1, 1, 1, '2026-01-07 04:22:38', '2026-01-23 21:38:04'),
(5, 'TEC_PROD5_489701', 'prueba', 'prueba', 'telefonos', 'prueba', 10.01, 13.01, 5, 7, 1, 1, 0, '2026-01-23 04:28:09', '2026-02-04 04:30:52'),
(6, 'TEC_PROD6_044057', 'prueba2', 'aaaaaaaaaaaa', 'telefonos', 'prueba', 190.00, 230.00, 0, 4, 1, 1, 0, '2026-01-23 04:37:24', '2026-01-23 05:20:10'),
(7, 'TEC_PROD7_755884', 'prueba3', 'aaaaaaaaaaaaa', 'telefonos', 'prueba', 10.00, 20.00, 0, 0, 1, 1, 0, '2026-01-23 04:49:15', '2026-01-23 05:23:19'),
(8, 'TEC_PROD8_726633', 'ssssssssss', 'ssss', 'telefonos', 'prueba', 440.00, 4440.00, 0, 15, 1, 1, 1, '2026-01-23 05:05:26', '2026-01-23 05:05:26'),
(9, 'TEC_PROD9_794903', 'sssssssssss121212', '1111', 'telefonos', 'prueba', 0.01, 10.00, 0, 6, 1, 1, 1, '2026-01-23 05:06:34', '2026-01-23 05:28:30'),
(10, 'TEC_PROD10_890529', 'PRUEBA 4', 'AJA', 'telefonos', 'prueba', 10.00, 50.00, 6, 5, 1, 1, 1, '2026-01-24 18:38:10', '2026-03-20 07:02:54'),
(11, 'TEC_PROD11_801802', 'ALE MI AMOR', 'MI MUJER ES MI TODO MI MAMI ', 'ESTUCHES', 'MI AMOR', 250.00, 325.00, 5, 1, 1, 1, 1, '2026-01-25 01:33:21', '2026-04-27 03:03:07');

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
-- Estructura de tabla para la tabla `producto_series`
--

CREATE TABLE `producto_series` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `numero_serie` varchar(100) NOT NULL,
  `compra_id` int(11) DEFAULT NULL,
  `compra_item_id` int(11) DEFAULT NULL,
  `estado` enum('DISPONIBLE','VENDIDO','DEFECTUOSO','EN_REPARACION') DEFAULT 'DISPONIBLE',
  `venta_id` int(11) DEFAULT NULL,
  `fecha_ingreso` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_venta` timestamp NULL DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `producto_series`
--

INSERT INTO `producto_series` (`id`, `producto_id`, `sku`, `numero_serie`, `compra_id`, `compra_item_id`, `estado`, `venta_id`, `fecha_ingreso`, `fecha_venta`, `notas`, `created_at`, `updated_at`) VALUES
(1, 11, 'TEC_PROD11_801802', '1111111111', 5, 4, 'DISPONIBLE', NULL, '2026-04-27 03:03:07', NULL, NULL, '2026-04-27 03:03:07', '2026-04-27 03:03:07');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `contacto` varchar(255) DEFAULT NULL COMMENT 'Nombre de la persona de contacto',
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `nit` varchar(50) DEFAULT NULL,
  `empresa` varchar(255) DEFAULT NULL,
  `sitio_web` varchar(255) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`, `nit`, `empresa`, `sitio_web`, `notas`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'Distribuidora TecnoMax', 'Juan P├®rez', '2234-5678', 'ventas@tecnomax.com', 'Zona 10, Ciudad de Guatemala', '12345678-9', 'TecnoMax S.A.', NULL, NULL, 1, '2026-03-20 05:48:18', '2026-03-20 05:48:18'),
(2, 'Importadora Digital', 'Mar├¡a L├│pez', '5567-8901', 'compras@importadoradigital.com', 'Zona 4, Mixco', '98765432-1', 'Importadora Digital Guatemala', NULL, NULL, 1, '2026-03-20 05:48:18', '2026-03-20 05:48:18'),
(3, 'Repuestos Express', 'Carlos G├│mez', '4456-7890', 'info@repuestosex.com', 'Zona 1, Centro Hist├│rico', '55566677-8', 'Repuestos Express', NULL, NULL, 1, '2026-03-20 05:48:18', '2026-03-20 05:48:18'),
(4, 'Distribuidora Tech GT', 'Carlos L�pez', '5555-1234', 'ventas@techgt.com', 'Zona 10, Ciudad de Guatemala', '1234567-8', 'Tech GT S.A.', NULL, 'Proveedor de accesorios', 1, '2026-03-20 05:49:10', '2026-03-20 05:49:10'),
(5, 'CELOVENDO', 'CELOVENDO', '52584233', 'JGUTDFH@GMAIL.COM', 'LA CAPITAL ', '1123456', 'CELOVENDO', 'https://www.google.com/search?sxsrf=ANbL-n4AJbQ0BAcCbzEPzUKDAX1V6QCovA:1773984266485&udm=2&q=iphone+11#sv=CAMSVhoyKhBlLXZxVm85OGNsem8zZS1NMg52cVZvOThjbHpvM2UtTToOa3hHWHVRelZtTDZSd00gBCocCgZtb3NhaWMSEGUtdnFWbzk4Y2x6bzNlLU0YADABGAcgjqiO_QkwAkoIEAEYASABKAE', 'ENVIOS GRATIS', 1, '2026-03-20 05:53:18', '2026-03-20 05:53:18');

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
  `estado` enum('RECIBIDA','EN_DIAGNOSTICO','ESPERANDO_AUTORIZACION','AUTORIZADA','EN_REPARACION','EN_PROCESO','ESPERANDO_PIEZA','COMPLETADA','ENTREGADA','CANCELADA','STAND_BY','ANTICIPO_REGISTRADO') NOT NULL DEFAULT 'RECIBIDA',
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
  `fecha_estimada_entrega` date DEFAULT NULL,
  `fecha_cierre` date DEFAULT NULL,
  `garantia_dias` int(11) DEFAULT 30,
  `garantia_meses` int(11) DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `cuenta_bancaria_anticipo_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reparaciones`
--

INSERT INTO `reparaciones` (`id`, `cliente_id`, `cliente_nombre`, `cliente_telefono`, `cliente_email`, `tipo_equipo`, `marca`, `modelo`, `color`, `imei_serie`, `patron_contrasena`, `estado_fisico`, `diagnostico_inicial`, `estado`, `sub_etapa`, `prioridad`, `tecnico_asignado`, `mano_obra`, `subtotal`, `impuestos`, `total`, `monto_anticipo`, `saldo_anticipo`, `metodo_anticipo`, `total_invertido`, `diferencia_reparacion`, `total_ganancia`, `sticker_serie_interna`, `sticker_ubicacion`, `fecha_ingreso`, `fecha_estimada_entrega`, `fecha_cierre`, `garantia_dias`, `garantia_meses`, `observaciones`, `created_at`, `updated_at`, `created_by`, `updated_by`, `cuenta_bancaria_anticipo_id`) VALUES
('REP1769210880817', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 11', 'azul', NULL, NULL, 'Pendiente revisión física', '', 'EN_DIAGNOSTICO', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 10000, 10000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-01-23', NULL, NULL, 30, 1, NULL, '2026-01-23 23:28:00', '2026-03-20 05:25:20', 'Sistema', NULL, NULL),
('REP1769269790907', NULL, 'Brennere', '5567-2789', 'brenner@gmail.com', 'Laptop', 'DELL', 'Insipiron 3520', 'Plateada', NULL, NULL, 'Pendiente revisión física', 'BISGRAS QUEBRADAS', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 99999, 99999, 'efectivo', 0, 0, 0, NULL, NULL, '2026-01-24', NULL, NULL, 30, 1, NULL, '2026-01-24 15:49:50', '2026-04-27 01:32:53', 'Sistema', NULL, NULL),
('REP1769280424892', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 15', 'AZUL', NULL, NULL, 'Pendiente revisión física', 'NO DA IMAGEN LA PANTALLA NECESARIO CAMBIO DE LA MISMA', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 70000, 70000, 'efectivo', 0, 0, 0, 'G-11111', 'otro', '2026-01-24', NULL, NULL, 30, 1, NULL, '2026-01-24 18:47:04', '2026-04-27 01:19:38', 'Sistema', NULL, NULL),
('REP1769280616177', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Tablet', 'SKY', 'TCL-10', 'NEGRO', NULL, NULL, 'Pendiente revisión física', '', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 10000, 10000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-01-24', NULL, NULL, 30, 1, NULL, '2026-01-24 18:50:16', '2026-03-20 22:22:07', 'Sistema', NULL, NULL),
('REP1769305961778', NULL, 'Juan Pérez', '5551-2345', 'juan.perez@email.com', 'Telefono', 'Apple', 'iPhone 14 Pro Max', 'DORADO', NULL, NULL, 'Pendiente revisión física', 'CAMBIO DE PANTALLA', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 10000, 10000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-01-25', NULL, NULL, 30, 1, NULL, '2026-01-25 01:52:41', '2026-03-20 06:56:38', 'Sistema', NULL, NULL),
('REP1770952861433', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 13', 'azul', NULL, NULL, 'Pendiente revisión física', 'no enciende ', 'RECIBIDA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 50000, 50000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-02-13', NULL, NULL, 30, 1, NULL, '2026-02-13 03:21:01', '2026-03-20 22:21:01', 'Sistema', NULL, NULL),
('REP1773989186780', NULL, 'Test Cliente', '55555555', NULL, 'Telefono', 'Samsung', 'A55', NULL, NULL, NULL, NULL, NULL, 'RECIBIDA', NULL, 'MEDIA', NULL, 20000, 0, 2400, 22400, 15000, 15000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-03-20', NULL, NULL, 30, 1, NULL, '2026-03-20 06:46:26', '2026-03-20 06:46:26', 'Sistema', NULL, NULL),
('REP1773989288266', NULL, 'Test Tarjeta', '44444444', NULL, 'Tablet', 'Apple', 'iPad', NULL, NULL, NULL, NULL, NULL, 'EN_DIAGNOSTICO', NULL, 'ALTA', NULL, 50000, 0, 6000, 56000, 30000, 30000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-03-20', NULL, NULL, 30, 1, NULL, '2026-03-20 06:48:08', '2026-04-27 01:01:36', 'Sistema', NULL, NULL),
('REP1777251040902', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Telefono', 'Apple', 'iPhone 13', 'negro', NULL, NULL, 'Pendiente revisión física', 'kkkkkkkkkkkkkkkk', 'ENTREGADA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 15000, 15000, 'efectivo', 0, 0, 0, NULL, NULL, '2026-04-27', NULL, '2026-04-27', 30, 1, NULL, '2026-04-27 00:50:40', '2026-04-27 02:02:08', 'Sistema', NULL, NULL),
('REP1777253717575', NULL, 'Zoila Magdalena ', '3237-2976', '', 'Tablet', 'SKY', 'TCL-10', '0222', NULL, NULL, 'Pendiente revisión física', 'no prende', 'ENTREGADA', NULL, 'MEDIA', NULL, 0, 0, 0, 0, 85000, 5000, 'transferencia', 80000, 0, 0, 'G-436594', 'chasis', '2026-04-27', NULL, '2026-04-27', 30, 1, NULL, '2026-04-27 01:35:17', '2026-04-27 02:03:50', 'Sistema', NULL, 1);

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
(6, 'REP1770952861433', 0, 0, 0, 0, NULL, '2026-02-13 03:21:01'),
(7, 'REP1777251040902', 0, 0, 0, 0, NULL, '2026-04-27 00:50:40'),
(8, 'REP1777253717575', 0, 0, 0, 0, NULL, '2026-04-27 01:35:17');

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
  `tipo_evento` varchar(80) DEFAULT NULL,
  `estado_anterior` varchar(80) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reparaciones_historial`
--

INSERT INTO `reparaciones_historial` (`id`, `reparacion_id`, `estado`, `sub_etapa`, `nota`, `pieza_necesaria`, `proveedor`, `costo_repuesto`, `sticker_numero`, `sticker_ubicacion`, `diferencia_reparacion`, `user_nombre`, `tipo_evento`, `estado_anterior`, `descripcion`, `created_at`) VALUES
(1, 'REP1769210880817', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-01-23 23:28:00'),
(2, 'REP1769269790907', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-01-24 15:49:50'),
(3, 'REP1769280424892', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-01-24 18:47:04'),
(4, 'REP1769280616177', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-01-24 18:50:16'),
(5, 'REP1769280424892', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-01-24 18:51:57'),
(6, 'REP1769305961778', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-01-25 01:52:41'),
(7, 'REP1769210880817', '', NULL, 'Anticipo registrado: Q700.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 06:29:43'),
(8, 'REP1769210880817', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 06:29:43'),
(9, 'REP1769280424892', '', NULL, 'Estado actualizado a EN_DIAGNOSTICO', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 06:33:16'),
(10, 'REP1769280424892', '', NULL, 'Estado actualizado a EN_DIAGNOSTICO', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 06:34:11'),
(11, 'REP1769280424892', 'RECIBIDA', NULL, 'equipo recibido tiene golpres ', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 06:46:56'),
(12, 'REP1769280424892', 'RECIBIDA', NULL, 'wqwqwqwqqqw', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 06:49:04'),
(13, 'REP1769280424892', '', NULL, 'en pruebas\r\n', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:01:35'),
(14, 'REP1769280424892', '', NULL, 'aaa', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:04:20'),
(15, 'REP1769280424892', 'EN_DIAGNOSTICO', NULL, 'sssss', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:12:14'),
(16, 'REP1769280424892', 'ESPERANDO_AUTORIZACION', NULL, 'cliente aun no confirma \r\n', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:12:44'),
(17, 'REP1769280424892', 'EN_REPARACION', NULL, 'el equipo esta desarmado ', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:13:53'),
(18, 'REP1769280424892', 'ESPERANDO_PIEZA', NULL, 'sssssiiiii', 'Puerto de Carga USB-C', 'Moto Parts GT', NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:16:28'),
(19, 'REP1769280424892', 'COMPLETADA', NULL, 'SE COLOCO EN LA BATERIA ', NULL, NULL, NULL, 'G-11111', 'otro', NULL, 'Usuario', NULL, NULL, NULL, '2026-02-04 07:56:04'),
(20, 'REP1770952861433', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-02-13 03:21:01'),
(21, 'REP1770952861433', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q700.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-13 03:22:19'),
(22, 'REP1770952861433', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-13 03:22:19'),
(23, 'REP1769280424892', 'EN_DIAGNOSTICO', NULL, 'aun esta desarmado ', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-13 03:24:48'),
(24, 'REP1770952861433', 'EN_DIAGNOSTICO', NULL, 'saasas', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-02-13 03:25:17'),
(25, 'REP1769210880817', 'EN_DIAGNOSTICO', NULL, 'Estado actualizado a EN_DIAGNOSTICO', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 05:21:07'),
(26, 'REP1769210880817', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q100.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 05:22:39'),
(27, 'REP1769210880817', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 05:22:39'),
(28, 'REP1769210880817', 'EN_DIAGNOSTICO', NULL, 'jjajaajajjaaj', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 05:25:20'),
(29, 'REP1773989186780', 'RECIBIDA', NULL, 'Reparación creada. Anticipo recibido: Q150.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-03-20 06:46:26'),
(30, 'REP1773989288266', 'RECIBIDA', NULL, 'Reparación creada. Anticipo recibido: Q300.00 (tarjeta)', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-03-20 06:48:08'),
(31, 'REP1773989288266', 'RECIBIDA', NULL, 'jsjja', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 06:54:05'),
(32, 'REP1773989288266', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q300.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 06:54:44'),
(33, 'REP1773989288266', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 06:54:44'),
(34, 'REP1769305961778', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q100.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 06:56:38'),
(35, 'REP1769305961778', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 06:56:38'),
(36, 'REP1773989186780', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 22:19:07'),
(37, 'REP1770952861433', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q500.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 22:21:01'),
(38, 'REP1770952861433', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 22:21:01'),
(39, 'REP1769280616177', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q100.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 22:22:07'),
(40, 'REP1769280616177', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-03-20 22:22:07'),
(41, 'REP1777251040902', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-04-27 00:50:40'),
(42, 'REP1773989288266', 'EN_DIAGNOSTICO', NULL, 'sss', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:01:36'),
(43, 'REP1777251040902', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo registrado: Q150.00 (efectivo)', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:07:11'),
(44, 'REP1777251040902', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:07:11'),
(45, 'REP1769280424892', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:19:38'),
(46, 'REP1769280424892', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo Q700.00 (Efectivo) – pendiente de confirmación en Caja/Bancos', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:19:38'),
(47, 'REP1769269790907', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:32:53'),
(48, 'REP1769269790907', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo Q999.99 (Efectivo) – pendiente de confirmación en Caja/Bancos', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:32:53'),
(49, 'REP1777253717575', 'RECIBIDA', NULL, 'Reparación creada', NULL, NULL, NULL, NULL, NULL, NULL, 'Sistema', NULL, NULL, NULL, '2026-04-27 01:35:17'),
(50, 'REP1777253717575', 'RECIBIDA', NULL, 'Equipo recibido y checklist completado', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:38:24'),
(51, 'REP1777253717575', 'ANTICIPO_REGISTRADO', NULL, 'Anticipo Q850.00 (Transferencia) – pendiente de confirmación en Caja/Bancos', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:38:24'),
(52, 'REP1777251040902', 'EN_DIAGNOSTICO', NULL, 'no funciona bien la pantalla', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:40:24'),
(53, 'REP1777253717575', 'EN_DIAGNOSTICO', NULL, 'sii', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:41:16'),
(54, 'REP1777253717575', 'ESPERANDO_AUTORIZACION', NULL, 'ya se le anticipo al cliente el precio', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:41:37'),
(55, 'REP1777253717575', 'AUTORIZADA', NULL, 'nitido cliente confirmo \r\n', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:41:53'),
(56, 'REP1777253717575', 'ESPERANDO_PIEZA', NULL, 'a ver ', 'Pantalla iphone 11', 'celovendo', 80000, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:42:35'),
(57, 'REP1777253717575', 'COMPLETADA', NULL, 'nitido adjunatmos fotos ', NULL, NULL, NULL, 'G-436591', 'chasis', NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 01:52:10'),
(58, 'REP1777251040902', 'ENTREGADA', NULL, 'se le entro al cliente', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 02:02:08'),
(59, 'REP1777253717575', 'COMPLETADA', NULL, 'nitido', NULL, NULL, NULL, 'G-436594', 'chasis', NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 02:03:07'),
(60, 'REP1777253717575', 'ENTREGADA', NULL, 'nitido clinete entregoad', NULL, NULL, NULL, NULL, NULL, NULL, 'Usuario', NULL, NULL, NULL, '2026-04-27 02:03:50');

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
(5, 'REP1770952861433', 24, 'historial', 'RASP_2_1770953117972.jpg', '/uploads/reparaciones/REP1770952861433/historial/RASP_2_1770953117972.jpg', 136858, 'image/jpeg', '2026-02-13 03:25:17'),
(6, 'REP1769210880817', 28, 'historial', 'IPHONE_11_1773984320473.jpg', '/uploads/reparaciones/REP1769210880817/historial/IPHONE_11_1773984320473.jpg', 22992, 'image/jpeg', '2026-03-20 05:25:20'),
(7, 'REP1773989288266', 42, 'historial', 'Untitled_1777251696144.png', '/uploads/reparaciones/REP1773989288266/historial/Untitled_1777251696144.png', 348668, 'image/png', '2026-04-27 01:01:36'),
(8, 'REP1777251040902', 52, 'historial', 'IPHONE_11_1777254024695.jpg', '/uploads/reparaciones/REP1777251040902/historial/IPHONE_11_1777254024695.jpg', 22992, 'image/jpeg', '2026-04-27 01:40:24'),
(9, 'REP1777253717575', 53, 'historial', '35cae2d4-784d-41b8-9ead-cd0bce4216fd_1777254076285.png', '/uploads/reparaciones/REP1777253717575/historial/35cae2d4-784d-41b8-9ead-cd0bce4216fd_1777254076285.png', 350875, 'image/png', '2026-04-27 01:41:16'),
(10, 'REP1777253717575', 57, 'historial', '35cae2d4-784d-41b8-9ead-cd0bce4216fd_1777254730884.png', '/uploads/reparaciones/REP1777253717575/historial/35cae2d4-784d-41b8-9ead-cd0bce4216fd_1777254730884.png', 350875, 'image/png', '2026-04-27 01:52:10'),
(11, 'REP1777251040902', 58, 'final', 'WIN_20260321_11_41_29_Pro_1777255328897.jpg', '/uploads/reparaciones/REP1777251040902/final/WIN_20260321_11_41_29_Pro_1777255328897.jpg', 156445, 'image/jpeg', '2026-04-27 02:02:08'),
(12, 'REP1777253717575', 59, 'final', 'WIN_20260321_11_41_29_Pro_1777255387323.jpg', '/uploads/reparaciones/REP1777253717575/final/WIN_20260321_11_41_29_Pro_1777255387323.jpg', 156445, 'image/jpeg', '2026-04-27 02:03:07'),
(13, 'REP1777253717575', 59, 'final', 'WIN_20260321_11_41_33_Pro_1777255387325.jpg', '/uploads/reparaciones/REP1777253717575/final/WIN_20260321_11_41_33_Pro_1777255387325.jpg', 152838, 'image/jpeg', '2026-04-27 02:03:07');

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
(12, 'PAN_APPL_GEN_000012', NULL, 'PANTALLA IPHONE 15 PRO MAX', 'Pantalla', 'Apple', 'iPhone 15', NULL, '[\"IPHONE 15 PRO MAX\"]', '', NULL, 'BUENA PERO NO TANTO ', 1300, 1000, 'CELOVENDO ', 5, 1, '[]', '[\"INCELL\",\"MARCO SOBRESALE PANTALLA\"]', 1, 1, '2025-12-31 21:50:23', '2026-03-20 06:28:34'),
(13, 'PAN_APPL_GEN_000013', NULL, 'Pantalla iphone 11 rajada', 'Pantalla', 'Apple', 'iPhone 11', NULL, '[\"Iphone 11\"]', 'Usado', 'blanca', 'PNTALLA MUY BUENA \n', 60000, 20000, 'CELOVENDO ', 2, 1, '[\"/api/placeholder/400/400?img=1767741053085-0&name=PANTALLA15PM.JPG\",\"/api/placeholder/400/400?img=1767741064200-0&name=rockstar-games-logo-gta-vi_3840x2160_xtrafondos.com.jpg\"]', '[\"ORIGINAL\"]', 0, 1, '2026-01-06 23:11:15', '2026-02-04 05:02:21'),
(14, 'PAN_APPL_GEN_000014', NULL, 'Pantalla iphone 11', 'Pantalla', 'Apple', 'iPhone 11', NULL, '[\"Iphone 11\"]', 'OEM', 'negro ', 'NOSAOSOAOSA', 559, 430, 'celovendo', 4, 1, '[]', '[\"LCD BUENA CALIDAD\"]', 1, 1, '2026-01-25 01:37:05', '2026-03-20 06:27:04'),
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
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `activo`, `created_at`) VALUES
(1, 'ADMINISTRADOR', 'Acceso completo al sistema', 1, '2026-04-27 02:53:08'),
(2, 'TECNICO', 'Gestion de reparaciones asignadas y flujo tecnico', 1, '2026-04-27 02:53:08'),
(3, 'VENTAS', 'Gestion de ventas, clientes y caja', 1, '2026-04-27 02:53:08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `stickers_garantia`
--

CREATE TABLE `stickers_garantia` (
  `id` int(11) NOT NULL,
  `numero_sticker` varchar(20) NOT NULL,
  `estado` enum('DISPONIBLE','ASIGNADO','USADO') NOT NULL DEFAULT 'DISPONIBLE',
  `reparacion_id` varchar(50) DEFAULT NULL,
  `ubicacion_sticker` varchar(100) DEFAULT NULL,
  `fecha_asignacion` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `stickers_garantia`
--

INSERT INTO `stickers_garantia` (`id`, `numero_sticker`, `estado`, `reparacion_id`, `ubicacion_sticker`, `fecha_asignacion`, `created_at`, `updated_at`) VALUES
(1, 'G-436591', 'ASIGNADO', 'REP1777253717575', 'chasis', '2026-04-26 19:52:10', '2026-03-20 07:52:25', '2026-04-27 01:52:10'),
(2, 'G-436592', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(3, 'G-436593', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(4, 'G-436594', 'ASIGNADO', 'REP1777253717575', 'chasis', '2026-04-26 20:03:07', '2026-03-20 07:52:25', '2026-04-27 02:03:07'),
(5, 'G-436595', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(6, 'G-436596', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(7, 'G-436597', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(8, 'G-436598', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(9, 'G-436599', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(10, 'G-436600', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(11, 'G-436601', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(12, 'G-436602', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(13, 'G-436603', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(14, 'G-436604', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(15, 'G-436605', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(16, 'G-436606', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(17, 'G-436607', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(18, 'G-436608', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(19, 'G-436609', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(20, 'G-436610', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(21, 'G-436611', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(22, 'G-436612', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(23, 'G-436613', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(24, 'G-436614', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(25, 'G-436615', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(26, 'G-436616', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(27, 'G-436617', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(28, 'G-436618', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(29, 'G-436619', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(30, 'G-436620', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(31, 'G-436621', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(32, 'G-436622', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(33, 'G-436623', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(34, 'G-436624', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(35, 'G-436625', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(36, 'G-436626', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(37, 'G-436627', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(38, 'G-436628', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(39, 'G-436629', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(40, 'G-436630', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(41, 'G-436631', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(42, 'G-436632', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(43, 'G-436633', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(44, 'G-436634', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(45, 'G-436635', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(46, 'G-436636', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(47, 'G-436637', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(48, 'G-436638', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(49, 'G-436639', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(50, 'G-436640', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(51, 'G-436641', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(52, 'G-436642', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(53, 'G-436643', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(54, 'G-436644', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(55, 'G-436645', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(56, 'G-436646', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(57, 'G-436647', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(58, 'G-436648', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(59, 'G-436649', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(60, 'G-436650', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(61, 'G-436651', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(62, 'G-436652', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(63, 'G-436653', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(64, 'G-436654', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(65, 'G-436655', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(66, 'G-436656', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(67, 'G-436657', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(68, 'G-436658', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(69, 'G-436659', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(70, 'G-436660', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(71, 'G-436661', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(72, 'G-436662', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(73, 'G-436663', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(74, 'G-436664', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(75, 'G-436665', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(76, 'G-436666', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(77, 'G-436667', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(78, 'G-436668', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(79, 'G-436669', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(80, 'G-436670', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(81, 'G-436671', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(82, 'G-436672', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(83, 'G-436673', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(84, 'G-436674', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(85, 'G-436675', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(86, 'G-436676', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(87, 'G-436677', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(88, 'G-436678', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(89, 'G-436679', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(90, 'G-436680', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(91, 'G-436681', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(92, 'G-436682', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(93, 'G-436683', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(94, 'G-436684', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(95, 'G-436685', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(96, 'G-436686', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(97, 'G-436687', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(98, 'G-436688', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(99, 'G-436689', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(100, 'G-436690', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(101, 'G-436691', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(102, 'G-436692', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(103, 'G-436693', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(104, 'G-436694', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(105, 'G-436695', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(106, 'G-436696', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(107, 'G-436697', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(108, 'G-436698', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(109, 'G-436699', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(110, 'G-436700', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(111, 'G-436701', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(112, 'G-436702', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(113, 'G-436703', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(114, 'G-436704', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(115, 'G-436705', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(116, 'G-436706', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(117, 'G-436707', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(118, 'G-436708', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(119, 'G-436709', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(120, 'G-436710', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(121, 'G-436711', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(122, 'G-436712', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(123, 'G-436713', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(124, 'G-436714', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(125, 'G-436715', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(126, 'G-436716', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(127, 'G-436717', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(128, 'G-436718', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(129, 'G-436719', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(130, 'G-436720', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(131, 'G-436721', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(132, 'G-436722', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(133, 'G-436723', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(134, 'G-436724', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(135, 'G-436725', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(136, 'G-436726', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(137, 'G-436727', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(138, 'G-436728', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(139, 'G-436729', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(140, 'G-436730', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(141, 'G-436731', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(142, 'G-436732', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(143, 'G-436733', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(144, 'G-436734', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(145, 'G-436735', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(146, 'G-436736', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(147, 'G-436737', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(148, 'G-436738', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(149, 'G-436739', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(150, 'G-436740', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(151, 'G-436741', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(152, 'G-436742', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(153, 'G-436743', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(154, 'G-436744', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(155, 'G-436745', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(156, 'G-436746', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(157, 'G-436747', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(158, 'G-436748', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(159, 'G-436749', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(160, 'G-436750', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(161, 'G-436751', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(162, 'G-436752', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(163, 'G-436753', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(164, 'G-436754', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(165, 'G-436755', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(166, 'G-436756', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(167, 'G-436757', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(168, 'G-436758', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(169, 'G-436759', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(170, 'G-436760', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(171, 'G-436761', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(172, 'G-436762', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(173, 'G-436763', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(174, 'G-436764', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(175, 'G-436765', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(176, 'G-436766', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(177, 'G-436767', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(178, 'G-436768', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(179, 'G-436769', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(180, 'G-436770', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(181, 'G-436771', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(182, 'G-436772', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(183, 'G-436773', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(184, 'G-436774', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(185, 'G-436775', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(186, 'G-436776', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(187, 'G-436777', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(188, 'G-436778', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(189, 'G-436779', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(190, 'G-436780', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(191, 'G-436781', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(192, 'G-436782', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(193, 'G-436783', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(194, 'G-436784', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(195, 'G-436785', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(196, 'G-436786', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(197, 'G-436787', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(198, 'G-436788', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(199, 'G-436789', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(200, 'G-436790', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(201, 'G-436791', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(202, 'G-436792', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(203, 'G-436793', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(204, 'G-436794', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(205, 'G-436795', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(206, 'G-436796', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(207, 'G-436797', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(208, 'G-436798', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(209, 'G-436799', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(210, 'G-436800', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(211, 'G-436801', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(212, 'G-436802', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(213, 'G-436803', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(214, 'G-436804', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(215, 'G-436805', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(216, 'G-436806', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(217, 'G-436807', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(218, 'G-436808', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(219, 'G-436809', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(220, 'G-436810', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(221, 'G-436811', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(222, 'G-436812', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(223, 'G-436813', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(224, 'G-436814', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(225, 'G-436815', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(226, 'G-436816', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(227, 'G-436817', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(228, 'G-436818', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(229, 'G-436819', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(230, 'G-436820', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(231, 'G-436821', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(232, 'G-436822', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(233, 'G-436823', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(234, 'G-436824', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(235, 'G-436825', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(236, 'G-436826', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(237, 'G-436827', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(238, 'G-436828', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(239, 'G-436829', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(240, 'G-436830', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(241, 'G-436831', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(242, 'G-436832', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(243, 'G-436833', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(244, 'G-436834', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(245, 'G-436835', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(246, 'G-436836', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(247, 'G-436837', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(248, 'G-436838', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(249, 'G-436839', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(250, 'G-436840', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(251, 'G-436841', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(252, 'G-436842', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(253, 'G-436843', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(254, 'G-436844', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(255, 'G-436845', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(256, 'G-436846', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(257, 'G-436847', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(258, 'G-436848', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(259, 'G-436849', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(260, 'G-436850', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(261, 'G-436851', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(262, 'G-436852', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(263, 'G-436853', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(264, 'G-436854', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(265, 'G-436855', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(266, 'G-436856', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(267, 'G-436857', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(268, 'G-436858', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(269, 'G-436859', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(270, 'G-436860', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(271, 'G-436861', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(272, 'G-436862', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(273, 'G-436863', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(274, 'G-436864', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(275, 'G-436865', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(276, 'G-436866', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(277, 'G-436867', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(278, 'G-436868', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(279, 'G-436869', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(280, 'G-436870', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(281, 'G-436871', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(282, 'G-436872', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(283, 'G-436873', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(284, 'G-436874', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(285, 'G-436875', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(286, 'G-436876', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(287, 'G-436877', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(288, 'G-436878', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(289, 'G-436879', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(290, 'G-436880', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(291, 'G-436881', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(292, 'G-436882', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(293, 'G-436883', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(294, 'G-436884', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(295, 'G-436885', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(296, 'G-436886', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(297, 'G-436887', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(298, 'G-436888', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(299, 'G-436889', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(300, 'G-436890', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(301, 'G-436891', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(302, 'G-436892', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(303, 'G-436893', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(304, 'G-436894', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(305, 'G-436895', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(306, 'G-436896', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(307, 'G-436897', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(308, 'G-436898', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(309, 'G-436899', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(310, 'G-436900', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(311, 'G-436901', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(312, 'G-436902', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(313, 'G-436903', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(314, 'G-436904', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(315, 'G-436905', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(316, 'G-436906', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(317, 'G-436907', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(318, 'G-436908', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(319, 'G-436909', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(320, 'G-436910', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(321, 'G-436911', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(322, 'G-436912', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(323, 'G-436913', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(324, 'G-436914', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(325, 'G-436915', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(326, 'G-436916', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(327, 'G-436917', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(328, 'G-436918', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(329, 'G-436919', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(330, 'G-436920', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(331, 'G-436921', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(332, 'G-436922', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(333, 'G-436923', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(334, 'G-436924', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(335, 'G-436925', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(336, 'G-436926', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(337, 'G-436927', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(338, 'G-436928', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(339, 'G-436929', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(340, 'G-436930', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(341, 'G-436931', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(342, 'G-436932', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(343, 'G-436933', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(344, 'G-436934', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(345, 'G-436935', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(346, 'G-436936', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(347, 'G-436937', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(348, 'G-436938', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(349, 'G-436939', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(350, 'G-436940', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(351, 'G-436941', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(352, 'G-436942', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(353, 'G-436943', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(354, 'G-436944', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(355, 'G-436945', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(356, 'G-436946', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(357, 'G-436947', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(358, 'G-436948', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(359, 'G-436949', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(360, 'G-436950', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(361, 'G-436951', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(362, 'G-436952', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(363, 'G-436953', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(364, 'G-436954', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(365, 'G-436955', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(366, 'G-436956', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(367, 'G-436957', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(368, 'G-436958', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(369, 'G-436959', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(370, 'G-436960', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(371, 'G-436961', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(372, 'G-436962', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(373, 'G-436963', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(374, 'G-436964', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(375, 'G-436965', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(376, 'G-436966', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(377, 'G-436967', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(378, 'G-436968', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(379, 'G-436969', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(380, 'G-436970', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(381, 'G-436971', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(382, 'G-436972', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(383, 'G-436973', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(384, 'G-436974', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(385, 'G-436975', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(386, 'G-436976', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(387, 'G-436977', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(388, 'G-436978', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(389, 'G-436979', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(390, 'G-436980', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(391, 'G-436981', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(392, 'G-436982', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(393, 'G-436983', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(394, 'G-436984', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(395, 'G-436985', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(396, 'G-436986', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(397, 'G-436987', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(398, 'G-436988', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(399, 'G-436989', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(400, 'G-436990', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(401, 'G-436991', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(402, 'G-436992', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(403, 'G-436993', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(404, 'G-436994', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(405, 'G-436995', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(406, 'G-436996', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(407, 'G-436997', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(408, 'G-436998', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(409, 'G-436999', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(410, 'G-437000', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(411, 'G-437001', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(412, 'G-437002', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(413, 'G-437003', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(414, 'G-437004', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(415, 'G-437005', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(416, 'G-437006', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(417, 'G-437007', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(418, 'G-437008', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(419, 'G-437009', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(420, 'G-437010', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(421, 'G-437011', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(422, 'G-437012', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(423, 'G-437013', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(424, 'G-437014', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(425, 'G-437015', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(426, 'G-437016', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(427, 'G-437017', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(428, 'G-437018', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(429, 'G-437019', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(430, 'G-437020', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(431, 'G-437021', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(432, 'G-437022', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(433, 'G-437023', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(434, 'G-437024', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(435, 'G-437025', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(436, 'G-437026', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(437, 'G-437027', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(438, 'G-437028', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(439, 'G-437029', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(440, 'G-437030', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(441, 'G-437031', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(442, 'G-437032', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(443, 'G-437033', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(444, 'G-437034', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(445, 'G-437035', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(446, 'G-437036', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(447, 'G-437037', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(448, 'G-437038', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(449, 'G-437039', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(450, 'G-437040', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(451, 'G-437041', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(452, 'G-437042', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(453, 'G-437043', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(454, 'G-437044', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(455, 'G-437045', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(456, 'G-437046', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(457, 'G-437047', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(458, 'G-437048', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(459, 'G-437049', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(460, 'G-437050', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(461, 'G-437051', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(462, 'G-437052', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(463, 'G-437053', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(464, 'G-437054', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(465, 'G-437055', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(466, 'G-437056', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(467, 'G-437057', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(468, 'G-437058', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(469, 'G-437059', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(470, 'G-437060', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(471, 'G-437061', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(472, 'G-437062', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(473, 'G-437063', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(474, 'G-437064', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(475, 'G-437065', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(476, 'G-437066', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(477, 'G-437067', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(478, 'G-437068', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(479, 'G-437069', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(480, 'G-437070', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(481, 'G-437071', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(482, 'G-437072', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(483, 'G-437073', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(484, 'G-437074', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(485, 'G-437075', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(486, 'G-437076', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(487, 'G-437077', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(488, 'G-437078', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(489, 'G-437079', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(490, 'G-437080', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(491, 'G-437081', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(492, 'G-437082', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(493, 'G-437083', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(494, 'G-437084', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(495, 'G-437085', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(496, 'G-437086', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(497, 'G-437087', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(498, 'G-437088', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(499, 'G-437089', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(500, 'G-437090', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(501, 'G-437091', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(502, 'G-437092', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(503, 'G-437093', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(504, 'G-437094', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(505, 'G-437095', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(506, 'G-437096', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(507, 'G-437097', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(508, 'G-437098', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(509, 'G-437099', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(510, 'G-437100', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(511, 'G-437101', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(512, 'G-437102', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(513, 'G-437103', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(514, 'G-437104', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(515, 'G-437105', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(516, 'G-437106', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(517, 'G-437107', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(518, 'G-437108', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(519, 'G-437109', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(520, 'G-437110', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(521, 'G-437111', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(522, 'G-437112', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(523, 'G-437113', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(524, 'G-437114', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(525, 'G-437115', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25');
INSERT INTO `stickers_garantia` (`id`, `numero_sticker`, `estado`, `reparacion_id`, `ubicacion_sticker`, `fecha_asignacion`, `created_at`, `updated_at`) VALUES
(526, 'G-437116', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(527, 'G-437117', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(528, 'G-437118', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(529, 'G-437119', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(530, 'G-437120', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(531, 'G-437121', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(532, 'G-437122', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(533, 'G-437123', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(534, 'G-437124', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(535, 'G-437125', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(536, 'G-437126', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(537, 'G-437127', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(538, 'G-437128', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(539, 'G-437129', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(540, 'G-437130', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(541, 'G-437131', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(542, 'G-437132', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(543, 'G-437133', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(544, 'G-437134', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(545, 'G-437135', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(546, 'G-437136', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(547, 'G-437137', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(548, 'G-437138', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(549, 'G-437139', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(550, 'G-437140', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(551, 'G-437141', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(552, 'G-437142', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(553, 'G-437143', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(554, 'G-437144', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(555, 'G-437145', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(556, 'G-437146', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(557, 'G-437147', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(558, 'G-437148', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(559, 'G-437149', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(560, 'G-437150', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(561, 'G-437151', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(562, 'G-437152', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(563, 'G-437153', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(564, 'G-437154', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(565, 'G-437155', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(566, 'G-437156', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(567, 'G-437157', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(568, 'G-437158', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(569, 'G-437159', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(570, 'G-437160', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(571, 'G-437161', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(572, 'G-437162', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(573, 'G-437163', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(574, 'G-437164', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(575, 'G-437165', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(576, 'G-437166', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(577, 'G-437167', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(578, 'G-437168', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(579, 'G-437169', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(580, 'G-437170', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(581, 'G-437171', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(582, 'G-437172', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(583, 'G-437173', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(584, 'G-437174', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(585, 'G-437175', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(586, 'G-437176', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(587, 'G-437177', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(588, 'G-437178', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(589, 'G-437179', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(590, 'G-437180', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(591, 'G-437181', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(592, 'G-437182', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(593, 'G-437183', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(594, 'G-437184', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(595, 'G-437185', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(596, 'G-437186', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(597, 'G-437187', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(598, 'G-437188', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(599, 'G-437189', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(600, 'G-437190', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(601, 'G-437191', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(602, 'G-437192', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(603, 'G-437193', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(604, 'G-437194', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(605, 'G-437195', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(606, 'G-437196', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(607, 'G-437197', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(608, 'G-437198', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(609, 'G-437199', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(610, 'G-437200', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(611, 'G-437201', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(612, 'G-437202', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(613, 'G-437203', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(614, 'G-437204', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(615, 'G-437205', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(616, 'G-437206', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(617, 'G-437207', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(618, 'G-437208', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(619, 'G-437209', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(620, 'G-437210', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(621, 'G-437211', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(622, 'G-437212', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(623, 'G-437213', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(624, 'G-437214', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(625, 'G-437215', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(626, 'G-437216', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(627, 'G-437217', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(628, 'G-437218', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(629, 'G-437219', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(630, 'G-437220', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(631, 'G-437221', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(632, 'G-437222', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(633, 'G-437223', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(634, 'G-437224', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(635, 'G-437225', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(636, 'G-437226', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(637, 'G-437227', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(638, 'G-437228', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(639, 'G-437229', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(640, 'G-437230', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(641, 'G-437231', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(642, 'G-437232', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(643, 'G-437233', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(644, 'G-437234', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(645, 'G-437235', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(646, 'G-437236', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(647, 'G-437237', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(648, 'G-437238', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(649, 'G-437239', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(650, 'G-437240', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(651, 'G-437241', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(652, 'G-437242', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(653, 'G-437243', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(654, 'G-437244', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(655, 'G-437245', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(656, 'G-437246', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(657, 'G-437247', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(658, 'G-437248', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(659, 'G-437249', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(660, 'G-437250', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(661, 'G-437251', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(662, 'G-437252', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(663, 'G-437253', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(664, 'G-437254', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(665, 'G-437255', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(666, 'G-437256', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(667, 'G-437257', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(668, 'G-437258', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(669, 'G-437259', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(670, 'G-437260', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(671, 'G-437261', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(672, 'G-437262', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(673, 'G-437263', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(674, 'G-437264', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(675, 'G-437265', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(676, 'G-437266', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(677, 'G-437267', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(678, 'G-437268', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(679, 'G-437269', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(680, 'G-437270', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(681, 'G-437271', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(682, 'G-437272', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(683, 'G-437273', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(684, 'G-437274', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(685, 'G-437275', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(686, 'G-437276', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(687, 'G-437277', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(688, 'G-437278', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(689, 'G-437279', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(690, 'G-437280', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(691, 'G-437281', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(692, 'G-437282', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(693, 'G-437283', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(694, 'G-437284', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(695, 'G-437285', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(696, 'G-437286', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(697, 'G-437287', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(698, 'G-437288', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(699, 'G-437289', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(700, 'G-437290', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(701, 'G-437291', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(702, 'G-437292', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(703, 'G-437293', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(704, 'G-437294', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(705, 'G-437295', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(706, 'G-437296', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(707, 'G-437297', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(708, 'G-437298', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(709, 'G-437299', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(710, 'G-437300', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(711, 'G-437301', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(712, 'G-437302', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(713, 'G-437303', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(714, 'G-437304', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(715, 'G-437305', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(716, 'G-437306', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(717, 'G-437307', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(718, 'G-437308', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(719, 'G-437309', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(720, 'G-437310', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(721, 'G-437311', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(722, 'G-437312', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(723, 'G-437313', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(724, 'G-437314', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(725, 'G-437315', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(726, 'G-437316', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(727, 'G-437317', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(728, 'G-437318', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(729, 'G-437319', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(730, 'G-437320', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(731, 'G-437321', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(732, 'G-437322', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(733, 'G-437323', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(734, 'G-437324', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(735, 'G-437325', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(736, 'G-437326', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(737, 'G-437327', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(738, 'G-437328', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(739, 'G-437329', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(740, 'G-437330', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(741, 'G-437331', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(742, 'G-437332', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(743, 'G-437333', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(744, 'G-437334', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(745, 'G-437335', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(746, 'G-437336', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(747, 'G-437337', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(748, 'G-437338', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(749, 'G-437339', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(750, 'G-437340', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(751, 'G-437341', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(752, 'G-437342', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(753, 'G-437343', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(754, 'G-437344', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(755, 'G-437345', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(756, 'G-437346', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(757, 'G-437347', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(758, 'G-437348', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(759, 'G-437349', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(760, 'G-437350', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(761, 'G-437351', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(762, 'G-437352', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(763, 'G-437353', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(764, 'G-437354', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(765, 'G-437355', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(766, 'G-437356', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(767, 'G-437357', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(768, 'G-437358', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(769, 'G-437359', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(770, 'G-437360', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(771, 'G-437361', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(772, 'G-437362', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(773, 'G-437363', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(774, 'G-437364', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(775, 'G-437365', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(776, 'G-437366', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(777, 'G-437367', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(778, 'G-437368', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(779, 'G-437369', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(780, 'G-437370', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(781, 'G-437371', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(782, 'G-437372', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(783, 'G-437373', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(784, 'G-437374', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(785, 'G-437375', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(786, 'G-437376', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(787, 'G-437377', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(788, 'G-437378', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(789, 'G-437379', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(790, 'G-437380', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(791, 'G-437381', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(792, 'G-437382', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(793, 'G-437383', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(794, 'G-437384', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(795, 'G-437385', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(796, 'G-437386', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(797, 'G-437387', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(798, 'G-437388', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(799, 'G-437389', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(800, 'G-437390', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(801, 'G-437391', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(802, 'G-437392', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(803, 'G-437393', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(804, 'G-437394', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(805, 'G-437395', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(806, 'G-437396', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(807, 'G-437397', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(808, 'G-437398', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(809, 'G-437399', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(810, 'G-437400', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(811, 'G-437401', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(812, 'G-437402', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(813, 'G-437403', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(814, 'G-437404', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(815, 'G-437405', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(816, 'G-437406', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(817, 'G-437407', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(818, 'G-437408', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(819, 'G-437409', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(820, 'G-437410', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(821, 'G-437411', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(822, 'G-437412', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(823, 'G-437413', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(824, 'G-437414', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(825, 'G-437415', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(826, 'G-437416', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(827, 'G-437417', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(828, 'G-437418', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(829, 'G-437419', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(830, 'G-437420', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(831, 'G-437421', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(832, 'G-437422', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(833, 'G-437423', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(834, 'G-437424', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(835, 'G-437425', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(836, 'G-437426', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(837, 'G-437427', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(838, 'G-437428', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(839, 'G-437429', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(840, 'G-437430', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(841, 'G-437431', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(842, 'G-437432', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(843, 'G-437433', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(844, 'G-437434', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(845, 'G-437435', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(846, 'G-437436', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(847, 'G-437437', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(848, 'G-437438', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(849, 'G-437439', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(850, 'G-437440', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(851, 'G-437441', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(852, 'G-437442', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(853, 'G-437443', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(854, 'G-437444', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(855, 'G-437445', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(856, 'G-437446', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(857, 'G-437447', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(858, 'G-437448', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(859, 'G-437449', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(860, 'G-437450', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(861, 'G-437451', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(862, 'G-437452', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(863, 'G-437453', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(864, 'G-437454', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(865, 'G-437455', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(866, 'G-437456', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(867, 'G-437457', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(868, 'G-437458', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(869, 'G-437459', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(870, 'G-437460', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(871, 'G-437461', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(872, 'G-437462', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(873, 'G-437463', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(874, 'G-437464', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(875, 'G-437465', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(876, 'G-437466', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(877, 'G-437467', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(878, 'G-437468', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(879, 'G-437469', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(880, 'G-437470', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(881, 'G-437471', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(882, 'G-437472', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(883, 'G-437473', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(884, 'G-437474', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(885, 'G-437475', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(886, 'G-437476', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(887, 'G-437477', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(888, 'G-437478', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(889, 'G-437479', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(890, 'G-437480', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(891, 'G-437481', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(892, 'G-437482', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(893, 'G-437483', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(894, 'G-437484', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(895, 'G-437485', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(896, 'G-437486', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(897, 'G-437487', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(898, 'G-437488', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(899, 'G-437489', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(900, 'G-437490', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(901, 'G-437491', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(902, 'G-437492', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(903, 'G-437493', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(904, 'G-437494', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(905, 'G-437495', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(906, 'G-437496', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(907, 'G-437497', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(908, 'G-437498', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(909, 'G-437499', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(910, 'G-437500', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(911, 'G-437501', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(912, 'G-437502', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(913, 'G-437503', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(914, 'G-437504', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(915, 'G-437505', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(916, 'G-437506', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(917, 'G-437507', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(918, 'G-437508', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(919, 'G-437509', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(920, 'G-437510', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(921, 'G-437511', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(922, 'G-437512', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(923, 'G-437513', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(924, 'G-437514', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(925, 'G-437515', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(926, 'G-437516', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(927, 'G-437517', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(928, 'G-437518', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(929, 'G-437519', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(930, 'G-437520', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(931, 'G-437521', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(932, 'G-437522', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(933, 'G-437523', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(934, 'G-437524', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(935, 'G-437525', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(936, 'G-437526', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(937, 'G-437527', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(938, 'G-437528', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(939, 'G-437529', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(940, 'G-437530', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(941, 'G-437531', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(942, 'G-437532', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(943, 'G-437533', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(944, 'G-437534', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(945, 'G-437535', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(946, 'G-437536', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(947, 'G-437537', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(948, 'G-437538', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(949, 'G-437539', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(950, 'G-437540', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(951, 'G-437541', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(952, 'G-437542', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(953, 'G-437543', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(954, 'G-437544', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(955, 'G-437545', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(956, 'G-437546', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(957, 'G-437547', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(958, 'G-437548', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(959, 'G-437549', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(960, 'G-437550', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(961, 'G-437551', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(962, 'G-437552', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(963, 'G-437553', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(964, 'G-437554', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(965, 'G-437555', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(966, 'G-437556', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(967, 'G-437557', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(968, 'G-437558', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(969, 'G-437559', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(970, 'G-437560', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(971, 'G-437561', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(972, 'G-437562', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(973, 'G-437563', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(974, 'G-437564', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(975, 'G-437565', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(976, 'G-437566', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(977, 'G-437567', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(978, 'G-437568', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(979, 'G-437569', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25'),
(980, 'G-437570', 'DISPONIBLE', NULL, NULL, NULL, '2026-03-20 07:52:25', '2026-03-20 07:52:25');

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
  `telefono` varchar(20) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `role` enum('admin','employee','tecnico') NOT NULL DEFAULT 'employee',
  `active` tinyint(1) DEFAULT 1,
  `ultimo_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `name`, `telefono`, `foto_url`, `role`, `active`, `ultimo_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@tecnocell.com', '$2b$10$Ln/VaMB1XNE/Yrs1x7bP.uFF1csOnXd3P9iBObEs/aUcW3BbrXT/i', 'Administrador', NULL, NULL, 'admin', 1, '2026-04-27 05:49:12', '2025-12-19 01:50:58', '2026-04-27 05:49:12'),
(2, 'empleado', 'empleado@tecnocell.com', '$2b$10$J6izoCeNLB3IszykT0lyEOKJCGNjF.TDAIIhv8NBkj04jfv0XrwVq', 'Empleado de Tienda', NULL, NULL, 'employee', 1, NULL, '2025-12-19 01:50:58', '2026-03-20 07:32:23'),
(3, 'Verbena34', 'verbena@tecnocell.com', '$2b$10$kFCHwYodDPx3KtT4k.xCcOC0kVD9I7HcekBS7qfDM9r/fJGSmW9ia', 'Nestor Verbena', '55644894', NULL, 'admin', 1, NULL, '2026-03-20 07:22:37', '2026-03-20 07:23:54'),
(4, 'tecnico1', 'tecnico1@tecnocell.com', '$2b$10$acnv7vZ//icCXIQdLrkpT.no0/Foc1a/vJlxzw5TKsSycugtONsx6', 'TÚcnico Demo', NULL, NULL, 'tecnico', 0, NULL, '2026-03-20 08:03:00', '2026-04-27 03:07:46'),
(5, 'Berlyn0712', 'berlyn@tecnocell.com', '$2b$10$DR0x4YRn61uVOjf.3EODyO6fswF9AFXLHaz2gaT8cNe57srR1j2gy', 'Berlyn Betzabe', '57342500', NULL, 'employee', 1, NULL, '2026-03-20 18:05:13', '2026-03-20 18:05:13'),
(6, 'tecnico12', 'jose@tecnocell.com', '$2b$10$vre9ROMjOW6Y5eemIrBfQ.Y6mD.JQx02HS3.O2PcTM0S3IU1fooxG', 'Jose  Roberto', '30752830', NULL, 'employee', 1, '2026-04-27 05:48:58', '2026-04-27 03:07:31', '2026-04-27 05:48:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_profiles`
--

CREATE TABLE `user_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `nombres` varchar(100) NOT NULL DEFAULT 'Usuario',
  `apellidos` varchar(100) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `dpi` varchar(30) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_profiles`
--

INSERT INTO `user_profiles` (`id`, `user_id`, `nombres`, `apellidos`, `telefono`, `dpi`, `direccion`, `foto_perfil`, `created_at`, `updated_at`) VALUES
(1, 1, 'Administrador', NULL, NULL, NULL, NULL, NULL, '2026-04-27 02:53:08', '2026-04-27 02:53:08'),
(2, 2, 'Empleado', 'de Tienda', NULL, NULL, NULL, NULL, '2026-04-27 02:53:08', '2026-04-27 02:53:08'),
(3, 3, 'Nestor', 'Verbena', '55644894', NULL, NULL, NULL, '2026-04-27 02:53:08', '2026-04-27 02:53:08'),
(4, 4, 'TÚcnico', 'Demo', NULL, NULL, NULL, NULL, '2026-04-27 02:53:08', '2026-04-27 02:53:08'),
(5, 5, 'Berlyn', 'Betzabe', '57342500', NULL, NULL, NULL, '2026-04-27 02:53:08', '2026-04-27 02:53:08'),
(8, 6, 'Jose ', 'Roberto', '30752830', '567687867', 'Encinitor', '/uploads/usuarios/6/perfil/perfil.jpg', '2026-04-27 03:07:31', '2026-04-27 03:29:50');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_roles`
--

CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `created_at`) VALUES
(1, 1, 1, '2026-04-27 02:53:08'),
(2, 3, 1, '2026-04-27 02:53:08'),
(3, 2, 3, '2026-04-27 02:53:08'),
(4, 5, 3, '2026-04-27 02:53:08'),
(5, 4, 3, '2026-04-27 02:53:08'),
(8, 6, 2, '2026-04-27 03:07:31');

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
(17, 'V-2026-0017', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":10,\"nombre\":\"PRUEBA 4\",\"cantidad\":1,\"precio_unitario\":5000,\"subtotal\":5000},{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 7000, 0, 0, 4, 7350, 'PENDIENTE', 'TARJETA', '[{\"metodo\":\"TARJETA\",\"monto\":7350,\"referencia\":\"1234\",\"comprobante_url\":null,\"fecha\":\"2026-02-13T03:17:40.775Z\",\"pos_seleccionado\":\"POS BAC\",\"banco_id\":null,\"interes_porcentaje\":5,\"interes_monto\":3.5}]', 0, 7350, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-12 21:17:40', '2026-02-13 03:17:40', '2026-02-13 03:17:40', NULL, NULL),
(18, 'V-2026-0018', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":10,\"nombre\":\"PRUEBA 4\",\"cantidad\":8,\"precio_unitario\":5000,\"subtotal\":40000}]', 40000, 0, 0, 0, 40000, 'PENDIENTE', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":40000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-03-20T07:02:54.769Z\",\"pos_seleccionado\":null,\"banco_id\":null,\"interes_porcentaje\":null,\"interes_monto\":null}]', 0, 40000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-20 01:02:54', '2026-03-20 07:02:54', '2026-03-20 07:02:54', NULL, NULL),
(19, 'V-2026-0019', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":1,\"nombre\":\"VIDRIO TEMPLADO IPHONE 12\",\"cantidad\":1,\"precio_unitario\":2000,\"subtotal\":2000}]', 2000, 0, 0, 0, 2000, 'PENDIENTE', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":2000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-03-20T15:47:41.147Z\",\"pos_seleccionado\":null,\"banco_id\":null,\"interes_porcentaje\":null,\"interes_monto\":null}]', 0, 2000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-20 09:47:41', '2026-03-20 15:47:41', '2026-03-20 15:47:41', NULL, NULL),
(20, 'V-2026-0020', 9, 'Zoila Magdalena ', '3237-2976', NULL, '1559578-1', NULL, NULL, NULL, 'PRODUCTOS', '[{\"source\":\"PRODUCTO\",\"ref_id\":3,\"nombre\":\"COMBO TECLADO MOUSE MARVO \",\"cantidad\":1,\"precio_unitario\":40000,\"subtotal\":40000}]', 40000, 0, 0, 0, 40000, 'PENDIENTE', 'EFECTIVO', '[{\"metodo\":\"EFECTIVO\",\"monto\":40000,\"referencia\":null,\"comprobante_url\":null,\"fecha\":\"2026-04-27T03:08:49.182Z\",\"pos_seleccionado\":null,\"banco_id\":null,\"interes_porcentaje\":null,\"interes_monto\":null}]', 0, 40000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-26 21:08:49', '2026-04-27 03:08:49', '2026-04-27 03:08:49', NULL, NULL);

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
-- Indices de la tabla `caja_chica`
--
ALTER TABLE `caja_chica`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `check_equipo`
--
ALTER TABLE `check_equipo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reparacion_id` (`reparacion_id`),
  ADD KEY `idx_fecha_checklist` (`fecha_checklist`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_telefono` (`telefono`),
  ADD KEY `idx_nit` (`nit`),
  ADD KEY `idx_nombre` (`nombre`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_compra` (`numero_compra`),
  ADD KEY `idx_numero_compra` (`numero_compra`),
  ADD KEY `idx_fecha` (`fecha_compra`),
  ADD KEY `idx_proveedor_nombre` (`proveedor_nombre`),
  ADD KEY `idx_proveedor_id` (`proveedor_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_tipo` (`tipo`);

--
-- Indices de la tabla `compra_items`
--
ALTER TABLE `compra_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_compra` (`compra_id`),
  ADD KEY `idx_producto` (`producto_id`);

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
-- Indices de la tabla `cuentas_bancarias`
--
ALTER TABLE `cuentas_bancarias`
  ADD PRIMARY KEY (`id`);

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
-- Indices de la tabla `movimientos_bancarios`
--
ALTER TABLE `movimientos_bancarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cuenta_id` (`cuenta_id`);

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
-- Indices de la tabla `producto_series`
--
ALTER TABLE `producto_series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_serie` (`numero_serie`),
  ADD KEY `compra_item_id` (`compra_item_id`),
  ADD KEY `idx_producto` (`producto_id`),
  ADD KEY `idx_sku` (`sku`),
  ADD KEY `idx_numero_serie` (`numero_serie`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_compra` (`compra_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_nit` (`nit`),
  ADD KEY `idx_activo` (`activo`);

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
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `stickers_garantia`
--
ALTER TABLE `stickers_garantia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_sticker` (`numero_sticker`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_reparacion` (`reparacion_id`);

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
-- Indices de la tabla `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indices de la tabla `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_role` (`user_id`,`role_id`),
  ADD KEY `fk_user_roles_role` (`role_id`);

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
-- AUTO_INCREMENT de la tabla `caja_chica`
--
ALTER TABLE `caja_chica`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `check_equipo`
--
ALTER TABLE `check_equipo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `compra_items`
--
ALTER TABLE `compra_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `cuentas_bancarias`
--
ALTER TABLE `cuentas_bancarias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
-- AUTO_INCREMENT de la tabla `movimientos_bancarios`
--
ALTER TABLE `movimientos_bancarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
-- AUTO_INCREMENT de la tabla `producto_series`
--
ALTER TABLE `producto_series`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `reparaciones_accesorios`
--
ALTER TABLE `reparaciones_accesorios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `reparaciones_historial`
--
ALTER TABLE `reparaciones_historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT de la tabla `reparaciones_imagenes`
--
ALTER TABLE `reparaciones_imagenes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

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
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `stickers_garantia`
--
ALTER TABLE `stickers_garantia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1024;

--
-- AUTO_INCREMENT de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `user_profiles`
--
ALTER TABLE `user_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `check_equipo`
--
ALTER TABLE `check_equipo`
  ADD CONSTRAINT `check_equipo_ibfk_1` FOREIGN KEY (`reparacion_id`) REFERENCES `reparaciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `compras`
--
ALTER TABLE `compras`
  ADD CONSTRAINT `fk_compra_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `compra_items`
--
ALTER TABLE `compra_items`
  ADD CONSTRAINT `compra_items_ibfk_1` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE;

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
-- Filtros para la tabla `movimientos_bancarios`
--
ALTER TABLE `movimientos_bancarios`
  ADD CONSTRAINT `movimientos_bancarios_ibfk_1` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_bancarias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_imagenes`
--
ALTER TABLE `producto_imagenes`
  ADD CONSTRAINT `producto_imagenes_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `producto_series`
--
ALTER TABLE `producto_series`
  ADD CONSTRAINT `producto_series_ibfk_1` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `producto_series_ibfk_2` FOREIGN KEY (`compra_item_id`) REFERENCES `compra_items` (`id`) ON DELETE SET NULL;

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
-- Filtros para la tabla `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
