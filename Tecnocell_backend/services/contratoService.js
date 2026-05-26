/**
 * contratoService.js
 * ──────────────────────────────────────────────────────────────────────────
 * Genera el contrato de reparación en PDF sobreponiendo datos y firma del
 * cliente sobre la plantilla `contrato_tecnocell_2_paginas.pdf`.
 *
 * Solo se exportan las 2 primeras páginas del template (páginas 3 y 4 se
 * descartan automáticamente).
 *
 * Dependencia:  npm install pdf-lib
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path     = require('path');
const fs       = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ── Ruta al template ────────────────────────────────────────────────────────
const TEMPLATE_PATH = path.join(
  __dirname, '..', 'templates', 'contrato_tecnocell_2_paginas.pdf.pdf'
);

// ── Directorio de salida para contratos generados ──────────────────────────
const CONTRATOS_DIR = path.join(__dirname, '..', 'uploads', 'contratos');

// ══════════════════════════════════════════════════════════════════════════════
// COORDENADAS DE TEXTO SOBRE EL TEMPLATE
//
// Ajustar estos valores para que coincidan con el layout real del PDF.
// Origen PDF: esquina inferior-izquierda (0, 0).
// Ejemplo página A4: 595 × 842 pts.  Letter: 612 × 792 pts.
//
// Para calibrar: generar un contrato y ver dónde cae el texto vs. las líneas
// del template. Sumar/restar a `y` para subir/bajar.
// ══════════════════════════════════════════════════════════════════════════════
const C1 = {
  // Página 1 — datos del cliente y equipo
  fecha:         { x: 398, y: 703 },
  noOrden:       { x: 398, y: 688 },
  clienteNombre: { x: 148, y: 655 },
  clienteTel:    { x: 148, y: 635 },
  clienteEmail:  { x: 148, y: 615 },
  tipoEquipo:    { x: 148, y: 565 },
  marca:         { x: 148, y: 545 },
  modelo:        { x: 320, y: 545 },
  color:         { x: 148, y: 525 },
  imei:          { x: 148, y: 505 },
  acceso:        { x: 148, y: 485 },
  descripcion:   { x: 80,  y: 440, maxWidth: 450 },
  costoTotal:    { x: 420, y: 285 },
  anticipo:      { x: 420, y: 262 },
  saldo:         { x: 420, y: 240 },
};

// Página 2 — zona de firma del cliente
const C2_FIRMA = {
  imgX: 80, imgY: 145, imgW: 210, imgH: 65,  // imagen de firma
};

// ──────────────────────────────────────────────────────────────────────────────
/**
 * Genera el contrato PDF para una reparación.
 *
 * @param {object} datos
 * @param {string} datos.reparacionId          - ID de la reparación (REP123...)
 * @param {string} datos.fecha                 - Fecha de recepción (DD/MM/YYYY)
 * @param {string} datos.clienteNombre
 * @param {string} datos.clienteTel
 * @param {string} datos.clienteEmail
 * @param {string} datos.tipoEquipo
 * @param {string} datos.marca
 * @param {string} datos.modelo
 * @param {string} datos.color
 * @param {string} datos.imei
 * @param {string} datos.acceso                - 'ninguno' | 'PIN registrado' | 'Patrón registrado'
 * @param {string} datos.descripcion           - Diagnóstico inicial
 * @param {number} datos.costoTotal            - En quetzales (decimal)
 * @param {number} datos.anticipo              - En quetzales
 * @param {number} datos.saldo                 - En quetzales
 * @param {string|null} datos.firmaPngPath     - Ruta absoluta al PNG de la firma (opcional)
 *
 * @returns {Promise<string>} Ruta absoluta al PDF generado
 */
async function generarContrato(datos) {
  const {
    reparacionId,
    fecha        = new Date().toLocaleDateString('es-GT'),
    clienteNombre = '',
    clienteTel    = '',
    clienteEmail  = '',
    tipoEquipo    = '',
    marca         = '',
    modelo        = '',
    color         = '',
    imei          = '',
    acceso        = '',
    descripcion   = '',
    costoTotal    = 0,
    anticipo      = 0,
    saldo         = 0,
    firmaPngPath  = null,
  } = datos;

  // ── 1. Cargar template ────────────────────────────────────────────────────
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template no encontrado: ${TEMPLATE_PATH}`);
  }
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const templateDoc   = await PDFDocument.load(templateBytes);

  // ── 2. Crear nuevo PDF con solo las 2 primeras páginas ───────────────────
  const doc = await PDFDocument.create();
  const [pag1, pag2] = await doc.copyPages(templateDoc, [0, 1]);
  doc.addPage(pag1);
  doc.addPage(pag2);

  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const COLOR    = rgb(0.05, 0.05, 0.05);   // casi negro

  const drawText = (page, text, x, y, opts = {}) => {
    page.drawText(String(text ?? ''), {
      x, y,
      size:  opts.size  || 9,
      font:  opts.bold  ? fontBold : font,
      color: opts.color || COLOR,
      maxWidth: opts.maxWidth,
    });
  };

  const fmtQ = (n) => `Q ${Number(n).toFixed(2)}`;

  // ── 3. Escribir datos en página 1 ─────────────────────────────────────────
  const p1 = doc.getPage(0);

  drawText(p1, fecha,                       C1.fecha.x,         C1.fecha.y,         { bold: true });
  drawText(p1, reparacionId,                C1.noOrden.x,       C1.noOrden.y,       { bold: true });
  drawText(p1, clienteNombre,               C1.clienteNombre.x, C1.clienteNombre.y);
  drawText(p1, clienteTel,                  C1.clienteTel.x,    C1.clienteTel.y);
  drawText(p1, clienteEmail,                C1.clienteEmail.x,  C1.clienteEmail.y);
  drawText(p1, tipoEquipo,                  C1.tipoEquipo.x,    C1.tipoEquipo.y);
  drawText(p1, marca,                       C1.marca.x,         C1.marca.y);
  drawText(p1, modelo,                      C1.modelo.x,        C1.modelo.y);
  drawText(p1, color,                       C1.color.x,         C1.color.y);
  drawText(p1, imei || '—',                 C1.imei.x,          C1.imei.y);
  drawText(p1, acceso || 'ninguno',         C1.acceso.x,        C1.acceso.y);
  drawText(p1, descripcion,                 C1.descripcion.x,   C1.descripcion.y,   { maxWidth: C1.descripcion.maxWidth });
  drawText(p1, fmtQ(costoTotal),            C1.costoTotal.x,    C1.costoTotal.y,    { bold: true });
  drawText(p1, fmtQ(anticipo),              C1.anticipo.x,      C1.anticipo.y);
  drawText(p1, fmtQ(saldo),                 C1.saldo.x,         C1.saldo.y);

  // ── 4. Insertar firma en página 2 ─────────────────────────────────────────
  if (firmaPngPath && fs.existsSync(firmaPngPath)) {
    try {
      const firmaBytes = fs.readFileSync(firmaPngPath);
      const firmaImg   = await doc.embedPng(firmaBytes);

      const p2 = doc.getPage(1);
      p2.drawImage(firmaImg, {
        x:      C2_FIRMA.imgX,
        y:      C2_FIRMA.imgY,
        width:  C2_FIRMA.imgW,
        height: C2_FIRMA.imgH,
      });
    } catch (err) {
      console.warn('⚠️ No se pudo insertar la firma en el PDF:', err.message);
    }
  }

  // ── 5. Guardar PDF ────────────────────────────────────────────────────────
  const outputDir  = path.join(CONTRATOS_DIR, reparacionId);
  const outputFile = path.join(outputDir, `contrato_reparacion_${reparacionId}.pdf`);
  fs.mkdirSync(outputDir, { recursive: true });

  const pdfBytes = await doc.save();
  fs.writeFileSync(outputFile, pdfBytes);

  const relativePath = `/uploads/contratos/${reparacionId}/contrato_reparacion_${reparacionId}.pdf`;
  console.log(`✅ Contrato generado: ${outputFile}`);
  return { absolutePath: outputFile, relativePath };
}

module.exports = { generarContrato };
