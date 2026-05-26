/**
 * contratoService.js
 * ──────────────────────────────────────────────────────────────────────────
 * Rellena la plantilla `contrato_tecnocell_2_paginas.pdf` con los datos
 * dinámicos de la reparación y la firma del cliente.
 *
 * REGLA: NO se genera diseño desde cero. Solo se escriben textos e imagen
 * de firma encima de la plantilla existente.
 *
 * Dependencia:  pdf-lib  (ya instalado)
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ── Rutas ────────────────────────────────────────────────────────────────────
const TEMPLATE_PATH = path.join(
  __dirname, '..', 'templates', 'contrato_tecnocell_2_paginas.pdf'
);
const CONTRATOS_DIR = path.join(__dirname, '..', 'uploads', 'contratos');

// ══════════════════════════════════════════════════════════════════════════════
// COORDENADAS TEXTO — PÁGINA 1
// Sistema de coordenadas: origen esquina inferior-izquierda.
// Ajustar según la plantilla real.
// ══════════════════════════════════════════════════════════════════════════════
const C1 = {
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
};

// ══════════════════════════════════════════════════════════════════════════════
// COORDENADAS COSTOS — PÁGINA 2
// Ajustar según la plantilla real.
// ══════════════════════════════════════════════════════════════════════════════
const COSTO_X      = 420;
const COSTO_Y      = 285;
const ANTICIPO_X   = 420;
const ANTICIPO_Y   = 262;
const DIFERENCIA_X = 420;
const DIFERENCIA_Y = 240;

// ══════════════════════════════════════════════════════════════════════════════
// COORDENADAS FIRMA DEL CLIENTE — PÁGINA 2
// Ajustar para que quede sobre la línea "Cliente:" de la plantilla.
// ══════════════════════════════════════════════════════════════════════════════
const FIRMA_CLIENTE_X = 500;
const FIRMA_CLIENTE_Y = 18;
const FIRMA_CLIENTE_W = 120;
const FIRMA_CLIENTE_H = 35;

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Convierte la URL relativa guardada en BD a ruta física absoluta.
 *
 *   /uploads/firmas/...  →  /app/uploads/firmas/...
 *   uploads/firmas/...   →  /app/uploads/firmas/...
 *   ruta absoluta        →  se devuelve como está
 */
function resolveFirmaPath(firmaClienteUrl) {
  if (!firmaClienteUrl) return null;

  if (path.isAbsolute(firmaClienteUrl)) {
    return firmaClienteUrl;
  }

  let relative = String(firmaClienteUrl).replace(/^\/+/, '');

  if (relative.startsWith('uploads/')) {
    relative = relative.replace(/^uploads\//, '');
  }

  return path.join('/app/uploads', relative);
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Embebe la imagen de firma en la página 2.
 * Si la firma no existe o falla, el PDF se genera igual sin ella.
 */
async function insertarFirmaCliente(pdfDoc, page2, firmaClienteUrl) {
  console.log('[ContratoPDF] firma_cliente_url:', firmaClienteUrl);

  const firmaPath = resolveFirmaPath(firmaClienteUrl);
  console.log('[ContratoPDF] firmaPath:', firmaPath);
  console.log('[ContratoPDF] existe firma:', firmaPath ? fs.existsSync(firmaPath) : false);

  if (!firmaPath || !fs.existsSync(firmaPath)) {
    console.warn('[ContratoPDF] ⚠️  Firma no encontrada — PDF generado sin firma.');
    return;
  }

  try {
    const firmaBytes = fs.readFileSync(firmaPath);
    const firmaImage = await pdfDoc.embedPng(firmaBytes);

    page2.drawImage(firmaImage, {
      x:      FIRMA_CLIENTE_X,
      y:      FIRMA_CLIENTE_Y,
      width:  FIRMA_CLIENTE_W,
      height: FIRMA_CLIENTE_H,
    });

    console.log('[ContratoPDF] firma insertada correctamente');
  } catch (err) {
    console.error('[ContratoPDF] ❌ Error insertando firma:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Genera el contrato PDF rellenando la plantilla con los datos de la reparación.
 *
 * @param {object}      datos
 * @param {string}      datos.reparacionId
 * @param {string}      datos.fecha             DD/MM/YYYY
 * @param {string}      datos.clienteNombre
 * @param {string}      datos.clienteTel
 * @param {string}      datos.clienteEmail
 * @param {string}      datos.tipoEquipo
 * @param {string}      datos.marca
 * @param {string}      datos.modelo
 * @param {string}      datos.color
 * @param {string}      datos.imei
 * @param {string}      datos.acceso
 * @param {string}      datos.descripcion
 * @param {number}      datos.costoTotal        En quetzales
 * @param {number}      datos.anticipo          En quetzales
 * @param {number}      datos.saldo             En quetzales
 * @param {string|null} datos.firmaClienteUrl   URL relativa guardada en BD
 *
 * @returns {Promise<{absolutePath: string, relativePath: string}>}
 */
async function generarContrato(datos) {
  const {
    reparacionId,
    fecha           = new Date().toLocaleDateString('es-GT'),
    clienteNombre   = '',
    clienteTel      = '',
    clienteEmail    = '',
    tipoEquipo      = '',
    marca           = '',
    modelo          = '',
    color           = '',
    imei            = '',
    acceso          = '',
    descripcion     = '',
    costoTotal      = 0,
    anticipo        = 0,
    saldo           = 0,
    firmaClienteUrl = null,
  } = datos;

  // ── 1. Cargar plantilla ───────────────────────────────────────────────────
  console.log('[ContratoPDF] templatePath:', TEMPLATE_PATH);

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`[ContratoPDF] Plantilla no encontrada: ${TEMPLATE_PATH}`);
  }

  const existingPdfBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  console.log('[ContratoPDF] páginas:', pdfDoc.getPageCount());

  // ── 2. Asegurar exactamente 2 páginas ────────────────────────────────────
  while (pdfDoc.getPageCount() > 2) {
    pdfDoc.removePage(2);
  }

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages[1];

  // ── 3. Fuentes ────────────────────────────────────────────────────────────
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const COLOR    = rgb(0.05, 0.05, 0.05);

  const drawText = (page, text, x, y, opts = {}) => {
    page.drawText(String(text ?? ''), {
      x,
      y,
      size:     opts.size     || 9,
      font:     opts.bold     ? fontBold : font,
      color:    opts.color    || COLOR,
      maxWidth: opts.maxWidth,
    });
  };

  const fmtQ = (n) => `Q ${Number(n).toFixed(2)}`;

  // ── 4. Rellenar Página 1 ──────────────────────────────────────────────────
  drawText(page1, fecha,               C1.fecha.x,         C1.fecha.y,         { bold: true });
  drawText(page1, reparacionId,        C1.noOrden.x,       C1.noOrden.y,       { bold: true });
  drawText(page1, clienteNombre,       C1.clienteNombre.x, C1.clienteNombre.y);
  drawText(page1, clienteTel,          C1.clienteTel.x,    C1.clienteTel.y);
  drawText(page1, clienteEmail,        C1.clienteEmail.x,  C1.clienteEmail.y);
  drawText(page1, tipoEquipo,          C1.tipoEquipo.x,    C1.tipoEquipo.y);
  drawText(page1, marca,               C1.marca.x,         C1.marca.y);
  drawText(page1, modelo,              C1.modelo.x,        C1.modelo.y);
  drawText(page1, color,               C1.color.x,         C1.color.y);
  drawText(page1, imei || '—',         C1.imei.x,          C1.imei.y);
  drawText(page1, acceso || 'ninguno', C1.acceso.x,        C1.acceso.y);
  drawText(page1, descripcion,         C1.descripcion.x,   C1.descripcion.y,   { maxWidth: C1.descripcion.maxWidth });

  // ── 5. Rellenar Página 2 (costos + firma) ─────────────────────────────────
  drawText(page2, fmtQ(costoTotal), COSTO_X,      COSTO_Y,      { bold: true });
  drawText(page2, fmtQ(anticipo),   ANTICIPO_X,   ANTICIPO_Y);
  drawText(page2, fmtQ(saldo),      DIFERENCIA_X, DIFERENCIA_Y);

  await insertarFirmaCliente(pdfDoc, page2, firmaClienteUrl);

  // ── 6. Guardar PDF ────────────────────────────────────────────────────────
  const outputDir  = path.join(CONTRATOS_DIR, reparacionId);
  const outputFile = path.join(outputDir, `contrato_reparacion_${reparacionId}.pdf`);
  fs.mkdirSync(outputDir, { recursive: true });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputFile, pdfBytes);

  const relativePath = `/uploads/contratos/${reparacionId}/contrato_reparacion_${reparacionId}.pdf`;
  console.log(`[ContratoPDF] ✅ PDF guardado: ${outputFile}`);
  return { absolutePath: outputFile, relativePath };
}

module.exports = { generarContrato };
