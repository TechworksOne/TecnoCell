-- Insertar 5 repuestos de prueba
-- Precios en centavos: 12500 = Q125.00

INSERT INTO repuestos (
  nombre, tipo, marca, linea, modelo, compatibilidad, condicion, color, notas,
  precio_publico, precio_costo, proveedor, stock, stock_minimo, imagenes, tags, activo
) VALUES 
(
  'Pantalla LCD + Touch',
  'Pantalla',
  'Apple',
  'iPhone 13',
  'A2482',
  JSON_ARRAY('iPhone 13'),
  'nuevo',
  'Negro',
  'Pantalla OLED de alta calidad con touch integrado',
  125000, -- Q1,250.00
  85000,  -- Q850.00
  'Tech Parts Guatemala',
  5,
  2,
  JSON_ARRAY('https://images.unsplash.com/photo-1592286927505-c0d6e9a0d42e?w=400'),
  JSON_ARRAY('pantalla', 'oled', 'touch', 'iphone'),
  1
),
(
  'Batería Original',
  'Batería',
  'Samsung',
  'Galaxy S21',
  'EB-BG991ABY',
  JSON_ARRAY('Galaxy S21', 'Galaxy S21 5G'),
  'nuevo',
  NULL,
  'Batería original Samsung 4000mAh',
  45000, -- Q450.00
  28000, -- Q280.00
  'Samsung Guatemala',
  10,
  3,
  JSON_ARRAY('https://images.unsplash.com/photo-1609592806275-b8f8f12b1d0c?w=400'),
  JSON_ARRAY('bateria', 'original', 'samsung', '4000mah'),
  1
),
(
  'Cámara Trasera Principal',
  'Cámara',
  'Xiaomi',
  'Redmi Note 10',
  'M2101K7AG',
  JSON_ARRAY('Redmi Note 10', 'Redmi Note 10S'),
  'nuevo',
  NULL,
  'Cámara trasera 48MP con sensor Sony',
  35000, -- Q350.00
  22000, -- Q220.00
  'Xiaomi Parts CA',
  8,
  2,
  JSON_ARRAY('https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400'),
  JSON_ARRAY('camara', '48mp', 'sony', 'xiaomi'),
  1
),
(
  'Puerto de Carga USB-C',
  'Puerto de Carga',
  'Motorola',
  'Moto G',
  'XT2113',
  JSON_ARRAY('Moto G Power', 'Moto G Stylus', 'Moto G Play'),
  'nuevo',
  NULL,
  'Flex de carga con micrófono incluido',
  18000, -- Q180.00
  11000, -- Q110.00
  'Moto Parts GT',
  15,
  5,
  JSON_ARRAY('https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400'),
  JSON_ARRAY('puerto', 'usb-c', 'carga', 'motorola'),
  1
),
(
  'Tapa Trasera de Cristal',
  'Tapa Trasera',
  'Huawei',
  'P30',
  'ELE-L29',
  JSON_ARRAY('Huawei P30'),
  'nuevo',
  'Aurora Blue',
  'Tapa trasera de cristal con adhesivo incluido',
  28000, -- Q280.00
  17000, -- Q170.00
  'Huawei Accessories',
  6,
  2,
  JSON_ARRAY('https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400'),
  JSON_ARRAY('tapa', 'cristal', 'huawei', 'azul'),
  1
);
