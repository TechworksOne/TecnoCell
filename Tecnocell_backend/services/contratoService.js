/**
 * contratoService.js
 * ──────────────────────────────────────────────────────────────────────────
 * Genera el contrato de reparación en PDF sobreponiendo datos y firma del
 * cliente sobre la plantilla `contrato_tecnocell_2_paginas.pdf`.
 *
 * Solo se usan las 2 primeras páginas del template (páginas 3 y 4 se
 * descartan automáticamente).
 *
 * Dependencia:  npm install pdf-lib
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ── Rutas de archivos ────────────────────────────────────────────────────────
const TEMPLATE_PATH = path.join(
  __dirname, '..', 'templates', 'contrato_tecnocell_2_paginas.pdf.pdf'
);
const CONTRATOS_DIR = path.join(__dirname, '..', 'uploads', 'contratos');

// ── Base de uploads (dentro del contenedor Docker) ───────────────────────────
//    Docker mount: /var/www/Tecnocell_storage/uploads → /app/uploads
const UPLOADS_BASE = process.env.UPLOADS_BASE || '/app/uploads';

// ══════════════════════════════════════════════════════════════════════════════
// COORDENADAS TEXTO — PÁGINA 1
// Origen: esquina inferior-izquierda. A4: 595 × 842 pts.
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
  costoTotal:    { x: 420, y: 285 },
  anticipo:      { x: 420, y: 262 },
  saldo:         { x: 420, y: 240 },
};

// ══════════════════════════════════════════════════════════════════════════════
// COORDENADAS FIRMA — PÁGINA 2
// Ajustar según el layout real del template.
// ══════════════════════════════════════════════════════════════════════════════
const FIRMA_CLIENTE_X = 410;
const FIRMA_CLIENTE_Y = 18;
const FIRMA_CLIENTE_W = 130;
const FIRMA_CLIENTE_H = 45;

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Convierte la URL relativa almacenada en BD a ruta física absoluta.
 *
 * Ejemplos:
 *   '/uploads/firmas/...'  → '/app/uploads/firmas/...'   (Docker)
 *   'uploads/firmas/...'   → '/app/uploads/firmas/...'
 *   ruta absoluta válida   → devuelve como está
 *
 * Busca primero en UPLOADS_BASE (producción/Docker), luego en la ruta
 * local relativa al backend (desarrollo).
 */
function resolveFirmaPath(firmaClienteUrl) {
  if (!firmaClienteUrl) return null;

  // Si ya es absoluta y existe, usarla directamente
  if (path.isAbsolute(firmaClienteUrl) && fs.existsSync(firmaClienteUrl)) {
    return firmaClienteUrl;
  }

  // Quitar barra inicial y prefijo redundante 'uploads/'
  let relative = String(firmaClienteUrl).replace(/^\/+/, '');
  if (relative.startsWith('uploads/')) {
    relative = relative.slice('uploads/'.length);
  }

  // Intentar en UPLOADS_BASE (Docker / producción)
  const fromBase = path.join(UPLOADS_BASE, relative);
  if (fs.existsSync(fromBase)) return fromBase;

  // Fallback: relativo al directorio del backend (desarrollo local)
  const fromLocal = path.join(__dirname, '..', 'uploads', relative);
  if (fs.existsSync(fromLocal)) return fromLocal;

  // Devolver la ruta principal para que el log muestre dónde se buscó
  return fromBase;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Inserta la imagen de firma del cliente en la página 2 del PDF.
 * No lanza excepción si la firma no existe — el PDF se genera igual.
 */
async function insertarFirmaCliente(pdfDoc, page2, firmaClienteUrl) {
  console.log('[ContratoPDF] firma_cliente_url recibida:', firmaClienteUrl);

  const firmaPath = resolveFirmaPath(firmaClienteUrl);
  console.log('[ContratoPDF] firmaPath resuelto:', firmaPath);

  if (!firmaPath || !fs.existsSync(firmaPath)) {
    console.warn('[ContratoPDF] ⚠️  Firma no encontrada — PDF generado sin firma.');
    return;
  }

  console.log('[ContratoPDF] ✅ Archivo de firma encontrado.');

  try {
    const firmaBytes = fs.readFileSync(firmaPath);
    const firmaImage = await pdfDoc.embedPng(firmaBytes);

    page2.drawImage(firmaImage, {
      x:      FIRMA_CLIENTE_X,
      y:      FIRMA_CLIENTE_Y,
      width:  FIRMA_CLIENTE_W,
      height: FIRMA_CLIENTE_H,
    });

    console.log('[ContratoPDF] ✅ Firma insertada correctamente.');
  } catch (err) {
    console.error('[ContratoPDF] ❌ Error insertando firma:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Genera el contrato PDF para una reparación.
 *
 * @param {object} datos
 * @param {string}      datos.reparacionId      - ID (REP1769280424892)
 * @param {string}      datos.fecha             - Fecha DD/MM/YYYY
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
 * @param {number}      datos.costoTotal        - En quetzales
 * @param {number}      datos.anticipo          - En quetzales
 * @param {number}      datos.saldo             - En quetzales
 * @param {string|null} datos.firmaClienteUrl   - URL relativa guardada en BD
 *
 * @returns {Promise<{absolutePath: string, relativePath: string}>}
 */
async function generarContrato(datos) {
  const {
    reparacionId,
    fecha         = new Date().toLocaleDateString('es-GT'),
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
    firmaClienteUrl = null,
  } = datos;

  // ── 1. Cargar template ────────────────────────────────────────────────────
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`[ContratoPDF] Template no encontrado: ${TEMPLATE_PATH}`);
  }
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const templateDoc   = await PDFDocument.load(templateBytes);

  // ── 2. Nuevo PDF con solo las 2 primeras páginas ──────────────────────────
  const doc = await PDFDocument.create();
  const [pag1, pag2] = await doc.copyPages(templateDoc, [0, 1]);
  doc.addPage(pag1);
  doc.addPage(pag2);

  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const COLOR    = rgb(0.05, 0.05, 0.05);

  const drawText = (page, text, x, y, opts = {}) => {
    page.drawText(String(text ?? ''), {
      x, y,
      size:     opts.size  || 9,
      font:     opts.bold  ? fontBold : font,
      color:    opts.color || COLOR,
      maxWidth: opts.maxWidth,
    });
  };

  const fmtQ = (n) => `Q ${Number(n).toFixed(2)}`;

  // ── 3. Datos en página 1 ──────────────────────────────────────────────────
  const p1 = doc.getPage(0);
  drawText(p1, fecha,              C1.fecha.x,         C1.fecha.y,         { bold: true });
  drawText(p1, reparacionId,       C1.noOrden.x,       C1.noOrden.y,       { bold: true });
  drawText(p1, clienteNombre,      C1.clienteNombre.x, C1.clienteNombre.y);
  drawText(p1, clienteTel,         C1.clienteTel.x,    C1.clienteTel.y);
  drawText(p1, clienteEmail,       C1.clienteEmail.x,  C1.clienteEmail.y);
  drawText(p1, tipoEquipo,         C1.tipoEquipo.x,    C1.tipoEquipo.y);
  drawText(p1, marca,              C1.marca.x,         C1.marca.y);
  drawText(p1, modelo,             C1.modelo.x,        C1.modelo.y);
  drawText(p1, color,              C1.color.x,         C1.color.y);
  drawText(p1, imei || '—',        C1.imei.x,          C1.imei.y);
  drawText(p1, acceso || 'ninguno',C1.acceso.x,        C1.acceso.y);
  drawText(p1, descripcion,        C1.descripcion.x,   C1.descripcion.y,   { maxWidth: C1.descripcion.maxWidth });
  drawText(p1, fmtQ(costoTotal),   C1.costoTotal.x,    C1.costoTotal.y,    { bold: true });
  drawText(p1, fmtQ(anticipo),     C1.anticipo.x,      C1.anticipo.y);
  drawText(p1, fmtQ(saldo),        C1.saldo.x,         C1.saldo.y);

  // ── 4. Firma en página 2 ──────────────────────────────────────────────────
  const p2 = doc.getPage(1);
  await insertarFirmaCliente(doc, p2, firmaClienteUrl);

  // ── 5. Guardar PDF ────────────────────────────────────────────────────────
  const outputDir  = path.join(CONTRATOS_DIR, reparacionId);
  const outputFile = path.join(outputDir, `contrato_reparacion_${reparacionId}.pdf`);
  fs.mkdirSync(outputDir, { recursive: true });

  const pdfBytes = await doc.save();
  fs.writeFileSync(outputFile, pdfBytes);

  const relativePath = `/uploads/contratos/${reparacionId}/contrato_reparacion_${reparacionId}.pdf`;
  console.log(`[ContratoPDF] ✅ PDF guardado: ${outputFile}`);
  return { absolutePath: outputFile, relativePath };
}

module.exports = { generarContrato };
