import jsPDF from 'jspdf';
import logoUrl from '../assets/tecnocell-logo.png';

interface RecepcionEquipoData {
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
  };
  equipo: {
    tipo: string;
    marca: string;
    modelo: string;
    color: string;
    imei?: string;
    contraseña?: string;
    accesoTipo?: 'ninguno' | 'pin' | 'patron';
    accesoValor?: string;
    diagnostico: string;
  };
  numeroReparacion: string;
  fecha: string;
}

/**
 * Draws a 3×3 pattern grid using jsPDF primitives.
 * @param doc - jsPDF instance
 * @param cx - center X of the grid (mm)
 * @param cy - center Y of the grid (mm)
 * @param size - total size of the grid (mm)
 * @param pattern - array of node numbers 1-9 in order
 */
function drawPatternGrid(doc: jsPDF, cx: number, cy: number, size: number, pattern: number[]) {
  const cellSize = size / 2; // distance between dot centers
  const dotR = 1.5;
  const lineR = 0.8; // "active" dot radius

  // Dot centers: node 1=top-left, 2=top-center, ... 9=bottom-right
  const getDotPos = (n: number): [number, number] => {
    const col = (n - 1) % 3;
    const row = Math.floor((n - 1) / 3);
    return [cx - cellSize + col * cellSize, cy - cellSize + row * cellSize];
  };

  // Draw connecting lines first (behind dots)
  if (pattern.length >= 2) {
    doc.setDrawColor(0, 100, 200);
    doc.setLineWidth(0.7);
    for (let i = 0; i < pattern.length - 1; i++) {
      const [x1, y1] = getDotPos(pattern[i]);
      const [x2, y2] = getDotPos(pattern[i + 1]);
      doc.line(x1, y1, x2, y2);
    }
  }

  // Draw all 9 dots
  for (let n = 1; n <= 9; n++) {
    const [x, y] = getDotPos(n);
    const isActive = pattern.includes(n);
    if (isActive) {
      doc.setFillColor(0, 100, 200);
      doc.setDrawColor(0, 100, 200);
      doc.circle(x, y, lineR, 'FD');
    } else {
      doc.setFillColor(180, 180, 180);
      doc.setDrawColor(100, 100, 100);
      doc.circle(x, y, dotR, 'FD');
    }
  }
}

/**
 * Calculates the height needed for the client+equipment box.
 */
function calcBoxHeight(data: RecepcionEquipoData): number {
  // Base: "DATOS DEL CLIENTE" title(6) + name+phone row(5) + email(5 if present) + gap(3)
  //       + "DATOS DEL EQUIPO" title(6) + tipo/marca/modelo row(5) + color/imei row(5)
  //       + access row if needed (for pin: 5; for patron: grid ~22; for ninguno: 0) + padding(10)
  let h = 6 + 5 + 3 + 6 + 5 + 5 + 10; // 40 base
  if (data.cliente.email) h += 5;
  const tipo = data.equipo.accesoTipo;
  if (tipo === 'pin') h += 5;
  else if (tipo === 'patron') h += 22;
  else if (!tipo && data.equipo.contraseña) h += 5; // legacy
  return h;
}

export const generarPDFRecepcion = (data: RecepcionEquipoData, preview: boolean = false) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // ============ PÁGINA 1 ============

  // Recuadro superior derecho — logo va dentro
  const boxX = pageWidth - margin - 45;
  const boxY = margin - 5;
  const boxW = 45;
  const boxH = 25;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxW, boxH);

  // LOGO dentro del recuadro superior derecho
  const logoWidth = 30;
  const logoHeight = 15;
  const logoX = boxX + (boxW - logoWidth) / 2;
  const logoY = boxY + (boxH - logoHeight) / 2;
  doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
  yPos += 5; // small top gap before heading

  // ENCABEZADO CENTRADO - TECNOCELL
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('TECNOCELL', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.text('nosotros te lo reparamos', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Línea separadora
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin - 50, yPos);
  yPos += 10;

  // ============ DATOS DEL CLIENTE - Recuadro celeste con bordes redondeados ============
  const boxHeight1 = calcBoxHeight(data);
  doc.setFillColor(173, 216, 230); // Celeste
  doc.setDrawColor(0, 100, 150); // Borde azul oscuro
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth - 50, boxHeight1, 3, 3, 'FD');

  yPos += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL CLIENTE', margin + 3, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${data.cliente.nombre}`, margin + 3, yPos);
  doc.text(`Teléfono: ${data.cliente.telefono}`, margin + 90, yPos);
  yPos += 5;
  if (data.cliente.email) {
    doc.text(`Email: ${data.cliente.email}`, margin + 3, yPos);
    yPos += 5;
  }

  yPos += 3;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL EQUIPO', margin + 3, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Tipo: ${data.equipo.tipo}`, margin + 3, yPos);
  doc.text(`Marca: ${data.equipo.marca}`, margin + 50, yPos);
  doc.text(`Modelo: ${data.equipo.modelo}`, margin + 100, yPos);
  yPos += 5;
  doc.text(`Color: ${data.equipo.color}`, margin + 3, yPos);
  if (data.equipo.imei) {
    doc.text(`IMEI/Serie: ${data.equipo.imei}`, margin + 50, yPos);
  }
  yPos += 5;

  // Access method rendering
  {
    const tipo = data.equipo.accesoTipo;
    const valor = data.equipo.accesoValor;
    if (tipo === 'patron' && valor) {
      doc.text('Patrón de acceso:', margin + 3, yPos);
      yPos += 4;
      const patternArr = valor.split('-').map(Number).filter(n => n >= 1 && n <= 9);
      const gridSize = 16; // mm
      drawPatternGrid(doc, margin + 12, yPos + gridSize / 2, gridSize, patternArr);
      yPos += gridSize + 4;
    } else if (tipo === 'pin') {
      doc.text('Acceso: PIN registrado', margin + 3, yPos);
      yPos += 5;
    } else if (!tipo && data.equipo.contraseña) {
      // legacy
      doc.text(`Contraseña/Patrón: ${data.equipo.contraseña}`, margin + 3, yPos);
      yPos += 5;
    }
  }

  yPos += 5;

  // Diagnóstico Inicial
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Diagnóstico Inicial:', margin, yPos);
  yPos += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const diagnosticoLines = doc.splitTextToSize(data.equipo.diagnostico, contentWidth - 10);
  doc.text(diagnosticoLines, margin, yPos, { maxWidth: contentWidth - 10, align: 'justify' });
  yPos += diagnosticoLines.length * 5 + 10;

  // Línea separadora antes de la política
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Título de Política de Garantía
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('POLÍTICA DE GARANTÍA – TECNOCELL', margin, yPos);
  yPos += 8;

  // Texto introductorio
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('TECNOCELL ofrece una garantía de 5 meses para los siguientes servicios de reparación:', margin, yPos, { maxWidth: contentWidth - 50, align: 'justify' });
  yPos += 8;

  // Lista de servicios con viñetas
  doc.setFontSize(10);
  const servicios = [
    'Reparación y cambio de hardware (celulares, laptops, tablets, consolas, impresoras, etc.)',
    'Servicios de soldadura y micro-soldadura (componentes SMD, puertos, líneas de alimentación, conectores, filtros, bobinas, etc.)',
    'Reparaciones y mantenimiento técnico en impresoras (sistemas de tinta, placas, motores, sensores, engranajes, equipos de inyección, láser o térmicos)'
  ];

  servicios.forEach(servicio => {
    doc.text('•', margin + 3, yPos);
    const lines = doc.splitTextToSize(servicio, contentWidth - 12);
    doc.text(lines, margin + 8, yPos, { maxWidth: contentWidth - 12, align: 'justify' });
    yPos += lines.length * 5 + 2;
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // COBERTURA DE LA GARANTÍA
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('COBERTURA DE LA GARANTÍA', margin, yPos);
  yPos += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const intro = 'La garantía aplica únicamente a defectos relacionados con la intervención realizada, siempre que se cumpla lo siguiente:';
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, yPos, { maxWidth: contentWidth, align: 'justify' });
  yPos += introLines.length * 5.5 + 5;

  const coberturaItems = [
    'El dispositivo no presente humedad, corrosión o daño por líquidos.',
    'El equipo no haya sido manipulado por terceros después de la reparación.',
    'No existan daños físicos (golpes, caídas, quiebres, presión excesiva).',
    'No se hayan realizado modificaciones de software que afecten el funcionamiento del componente reparado.',
    'En reparaciones de impresoras, la garantía no aplica para:'
  ];

  coberturaItems.forEach(item => {
    doc.text('•', margin + 5, yPos);
    const lines = doc.splitTextToSize(item, contentWidth - 15);
    doc.text(lines, margin + 10, yPos, { maxWidth: contentWidth - 15, align: 'justify' });
    yPos += lines.length * 5.5 + 2;
  });

  // Sub-items con círculos (○)
  const subItems = [
    'Líneas de impresión defectuosas causadas por aire en mangueras, dampers o el sistema continuo de tinta.',
    'Obstrucciones por tinta de baja calidad, uso incorrecto o falta de mantenimiento.'
  ];

  subItems.forEach(item => {
    doc.circle(margin + 12, yPos - 1.5, 1, 'S');
    const lines = doc.splitTextToSize(item, contentWidth - 25);
    doc.text(lines, margin + 17, yPos, { maxWidth: contentWidth - 25, align: 'justify' });
    yPos += lines.length * 5.5 + 2;
  });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // HALLAZGOS ADICIONALES
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('HALLAZGOS ADICIONALES DURANTE EL SERVICIO', margin, yPos);
  yPos += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const hallazgosIntro = 'Durante la revisión o reparación, TECNOCELL puede descubrir daños adicionales que no podían detectarse al momento de recibir el equipo. Estos problemas no están cubiertos por la garantía inicial y podrían requerir reparaciones extra.';
  const hallazgosLines = doc.splitTextToSize(hallazgosIntro, contentWidth);
  doc.text(hallazgosLines, margin, yPos, { maxWidth: contentWidth, align: 'justify' });
  yPos += hallazgosLines.length * 5.5 + 8;

  // Ejemplos de hallazgos adicionales
  doc.setFont('times', 'bold');
  doc.text('Ejemplos en computadoras y laptops:', margin, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  const ejemplosPC = [
    'Se cambia la memoria RAM porque estaba fallando, y al encender nuevamente se detecta que el disco duro también está dañado o tiene problemas de lectura.',
    'Se limpia el equipo o se revisa por lentitud, y se descubre que el ventilador o el disco duro ya no funciona bien, lo cual provoca sobrecalentamiento.'
  ];

  ejemplosPC.forEach(ejemplo => {
    doc.text('•', margin + 5, yPos);
    const lines = doc.splitTextToSize(ejemplo, contentWidth - 15);
    doc.text(lines, margin + 10, yPos, { maxWidth: contentWidth - 15, align: 'justify' });
    yPos += lines.length * 5.5 + 2;
  });

  yPos += 5;
  doc.setFont('times', 'bold');
  doc.text('Ejemplos en teléfonos celulares:', margin, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  const ejemplosCel = [
    'Se cambia la pantalla porque estaba quebrada, pero después se detecta que el equipo no carga, y es necesario reemplazar el centro de carga (rack).',
    'Se reemplaza la batería porque no retenía carga, pero luego se identifica que el centro de carga presenta otra falla independiente que impide el encendido normal.'
  ];

  ejemplosCel.forEach(ejemplo => {
    doc.text('•', margin + 5, yPos);
    const lines = doc.splitTextToSize(ejemplo, contentWidth - 15);
    doc.text(lines, margin + 10, yPos, { maxWidth: contentWidth - 15, align: 'justify' });
    yPos += lines.length * 5.5 + 2;
  });

  yPos += 8;
  const notificacion = 'En todos los casos, TECNOCELL notificará al cliente antes de continuar, explicando el nuevo problema y el costo adicional necesario para completar la reparación.';
  const notificacionLines = doc.splitTextToSize(notificacion, contentWidth);
  doc.text(notificacionLines, margin, yPos, { maxWidth: contentWidth, align: 'justify' });
  yPos += notificacionLines.length * 5.5 + 8;

  // ============ PÁGINA 2 ============
  doc.addPage();
  yPos = margin + 5;

  // Recuadro superior derecho (repetir en página 2) — logo dentro
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxW, boxH);
  doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);

  // Recuadro celeste con datos del cliente y equipo (altura dinámica)
  const boxHeight2 = calcBoxHeight(data);
  doc.setFillColor(173, 216, 230);
  doc.setDrawColor(0, 100, 150);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth - 50, boxHeight2, 3, 3, 'FD');

  yPos += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL CLIENTE', margin + 3, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${data.cliente.nombre}`, margin + 3, yPos);
  doc.text(`Teléfono: ${data.cliente.telefono}`, margin + 90, yPos);
  yPos += 5;
  if (data.cliente.email) {
    doc.text(`Email: ${data.cliente.email}`, margin + 3, yPos);
    yPos += 5;
  }

  yPos += 3;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL EQUIPO', margin + 3, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Tipo: ${data.equipo.tipo}`, margin + 3, yPos);
  doc.text(`Marca: ${data.equipo.marca}`, margin + 50, yPos);
  doc.text(`Modelo: ${data.equipo.modelo}`, margin + 100, yPos);
  yPos += 5;
  doc.text(`Color: ${data.equipo.color}`, margin + 3, yPos);
  if (data.equipo.imei) {
    doc.text(`IMEI/Serie: ${data.equipo.imei}`, margin + 50, yPos);
  }
  yPos += 5;

  // Access method rendering (page 2)
  {
    const tipo = data.equipo.accesoTipo;
    const valor = data.equipo.accesoValor;
    if (tipo === 'patron' && valor) {
      doc.text('Patrón de acceso:', margin + 3, yPos);
      yPos += 4;
      const patternArr = valor.split('-').map(Number).filter(n => n >= 1 && n <= 9);
      const gridSize = 16;
      drawPatternGrid(doc, margin + 12, yPos + gridSize / 2, gridSize, patternArr);
      yPos += gridSize + 4;
    } else if (tipo === 'pin') {
      doc.text('Acceso: PIN registrado', margin + 3, yPos);
      yPos += 5;
    } else if (!tipo && data.equipo.contraseña) {
      doc.text(`Contraseña/Patrón: ${data.equipo.contraseña}`, margin + 3, yPos);
      yPos += 5;
    }
  }

  yPos += 5;

  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // INFORMACIÓN DE DEVOLUCIÓN
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('CONDICIONES DE DEVOLUCIÓN DEL EQUIPO', margin, yPos);
  yPos += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const devolucionIntro = 'Si el cliente decide no proceder con la reparación y solicita la devolución del equipo sin reparar, se aplicará un cobro de Q50.00 por concepto de revisión técnica, diagnóstico y manipulación del equipo.';
  const devolucionLines = doc.splitTextToSize(devolucionIntro, contentWidth);
  doc.text(devolucionLines, margin, yPos, { maxWidth: contentWidth, align: 'justify' });
  yPos += devolucionLines.length * 5.5 + 8;

  const condiciones = [
    'El equipo tiene 30 días calendario para ser retirado después de haber sido informado que está listo.',
    'Pasados los 30 días, el equipo pasará a bodega y se cobrará Q10.00 adicionales por resguardo.',
    'Si el equipo no es retirado en un período de 3 meses después de ingresar a bodega, se considerará abandonado y pasará a propiedad de TECNOCELL para cubrir los gastos de diagnóstico, reparación y almacenamiento.'
  ];

  condiciones.forEach(cond => {
    doc.text('•', margin + 5, yPos);
    const lines = doc.splitTextToSize(cond, contentWidth - 15);
    doc.text(lines, margin + 10, yPos, { maxWidth: contentWidth - 15, align: 'justify' });
    yPos += lines.length * 5.5 + 2;
  });

  yPos += 8;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // DECLARACIÓN DE ACEPTACIÓN
  doc.setFillColor(255, 255, 200);
  doc.setDrawColor(200, 180, 0);
  doc.setLineWidth(0.5);
  const declaracionHeight = 25;
  doc.rect(margin, yPos, contentWidth, declaracionHeight, 'FD');

  yPos += 6;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DECLARACIÓN DE ACEPTACIÓN', margin + 3, yPos);
  yPos += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const declaracion = 'Al firmar este documento, el cliente acepta haber leído, comprendido y estar de acuerdo con todos los términos y condiciones de garantía, costos y devolución establecidos por TECNOCELL.';
  const declaracionLines = doc.splitTextToSize(declaracion, contentWidth - 6);
  doc.text(declaracionLines, margin + 3, yPos, { maxWidth: contentWidth - 6, align: 'justify' });
  yPos += declaracionHeight + 8;

  // FIRMAS
  yPos += 5;
  const firmaY = yPos;
  const firmaWidth = (contentWidth - 20) / 2;

  // Firma del cliente
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, firmaY, margin + firmaWidth, firmaY);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('Firma del Cliente', margin + firmaWidth / 2, firmaY + 5, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.text(data.cliente.nombre, margin + firmaWidth / 2, firmaY + 10, { align: 'center' });

  // Firma de TECNOCELL
  const firma2X = margin + firmaWidth + 20;
  doc.line(firma2X, firmaY, firma2X + firmaWidth, firmaY);
  doc.setFont('times', 'bold');
  doc.text('Recibido por TECNOCELL', firma2X + firmaWidth / 2, firmaY + 5, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.text(`Fecha: ${data.fecha}`, firma2X + firmaWidth / 2, firmaY + 10, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('TECNOCELL - Soluciones Tecnológicas Profesionales', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(`No. Reparación: ${data.numeroReparacion}`, pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Generar salida según el modo
  if (preview) {
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`Recepcion_${data.numeroReparacion}_${data.cliente.nombre.replace(/\s/g, '_')}.pdf`);
  }
};
