USE tecnocell_web;

-- Actualizar todas las ventas a estado PAGADA
UPDATE ventas SET estado = 'PAGADA';

-- Mostrar resultado
SELECT id, numero_venta, cliente_nombre, ROUND(total/100, 2) as total_Q, estado 
FROM ventas 
ORDER BY id DESC;
