// Servicio para gestionar reparaciones con imágenes
import axios from 'axios';
import type { Repair, RepairFormData, RepairStatus, StateChangeRequest } from '../types/repair';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper: Convertir FormData para enviar
const createFormData = (data: any, files?: File[]): FormData => {
  const formData = new FormData();
  
  // Agregar archivos si existen
  if (files && files.length > 0) {
    files.forEach(file => {
      formData.append('fotos', file);
    });
  }
  
  // Agregar datos como JSON o campos individuales
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });
  
  return formData;
};

// ========== CREAR REPARACIÓN ==========
export const createReparacion = async (repairData: RepairFormData, fotosRecepcion?: File[]): Promise<{ id: string; total: number }> => {
  try {
    // Primero subir fotos de recepción si las hay
    let fotosRecepcionUrls: any[] = [];
    
    if (fotosRecepcion && fotosRecepcion.length > 0) {
      const uploadFormData = new FormData();
      fotosRecepcion.forEach(file => {
        uploadFormData.append('fotos', file);
      });
      uploadFormData.append('repairId', `REP${Date.now()}`);
      uploadFormData.append('imageTipo', 'recepcion');
      
      const uploadResponse = await axios.post(`${API_URL}/reparaciones/upload`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      fotosRecepcionUrls = uploadResponse.data.data;
    }
    
    // Preparar datos de reparación
    const payload = {
      clienteNombre: repairData.clienteNombre,
      clienteTelefono: repairData.clienteTelefono,
      clienteEmail: repairData.clienteEmail,
      clienteId: repairData.cliente?.id,
      
      // Equipo
      tipoEquipo: repairData.recepcion.tipoEquipo,
      marca: repairData.recepcion.marca,
      modelo: repairData.recepcion.modelo,
      color: repairData.recepcion.color,
      imeiSerie: repairData.recepcion.imeiSerie,
      patronContrasena: repairData.recepcion.patronContraseña,
      estadoFisico: repairData.recepcion.estadoFisico,
      diagnosticoInicial: repairData.recepcion.diagnosticoInicial,
      
      // Estado
      estado: repairData.estado,
      prioridad: repairData.prioridad,
      
      // Anticipo
      montoAnticipo: repairData.recepcion.montoAnticipo || 0,
      metodoAnticipo: repairData.recepcion.metodoAnticipo,
      
      // Items
      items: repairData.items,
      manoDeObra: repairData.manoDeObra,
      
      // Accesorios
      accesorios: repairData.recepcion.accesoriosRecibidos,
      
      // Observaciones
      observaciones: repairData.observaciones,
      
      // Fotos de recepción
      fotosRecepcion: fotosRecepcionUrls,

      // Fecha de ingreso seleccionada por el usuario
      fechaIngreso: repairData.recepcion.fechaRecepcion
    };
    
    const response = await axios.post(`${API_URL}/reparaciones`, payload);
    return response.data.data;
  } catch (error) {
    console.error('Error al crear reparación:', error);
    throw error;
  }
};

// ========== OBTENER TODAS LAS REPARACIONES ==========
export const getAllReparaciones = async (filters?: {
  estado?: RepairStatus;
  prioridad?: string;
  search?: string;
  limit?: number;
}): Promise<Repair[]> => {
  try {
    const response = await axios.get(`${API_URL}/reparaciones`, {
      params: filters
    });
    
    // Transformar datos del backend al formato frontend
    const reparaciones = response.data.data.map((rep: any) => ({
      id: rep.id,
      clienteNombre: rep.cliente_nombre,
      clienteTelefono: rep.cliente_telefono,
      clienteEmail: rep.cliente_email,
      clienteId: rep.cliente_id?.toString(),
      clienteFrecuente: false,
      recepcion: {
        tipoEquipo: rep.tipo_equipo,
        marca: rep.marca,
        modelo: rep.modelo,
        color: rep.color,
        imei: rep.imei_serie,
        contraseña: rep.patron_contrasena,
        diagnosticoInicial: rep.diagnostico_inicial,
        estadoFisico: rep.estado_fisico,
        accesoriosRecibidos: {
          chip: false,
          estuche: false,
          memoriaSD: false,
          cargador: false
        },
        fotosRecepcion: [],
        fechaRecepcion: rep.fecha_ingreso,
        userRecepcion: rep.created_by || 'Sistema',
        montoAnticipo: rep.monto_anticipo,
        metodoAnticipo: rep.metodo_anticipo,
        comprobanteTransferencia: ''
      },
      estado: rep.estado,
      prioridad: rep.prioridad,
      tecnicoAsignado: rep.tecnico_asignado,
      subEtapa: rep.sub_etapa,
      stickerSerieInterna: rep.sticker_serie_interna,
      garantiaMeses: rep.garantia_meses || 1,
      garantiaDias: rep.garantia_dias || 30,
      items: [],
      manoDeObra: rep.mano_obra || 0,
      fotosFinales: [],
      subtotal: rep.subtotal || 0,
      impuestos: rep.impuestos || 0,
      total: rep.total || 0,
      saldoAnticipo: rep.saldo_anticipo || 0,
      totalInvertido: rep.total_invertido || 0,
      totalGanancia: rep.total_ganancia,
      diferenciaReparacion: rep.diferencia_reparacion,
      fechaIngreso: rep.fecha_ingreso,
      fechaEstimadaEntrega: rep.fecha_estimada_entrega,
      fechaEntrega: rep.fecha_entrega,
      historialEstados: [],
      totalCambiosEstado: rep.total_cambios || 0,
      createdAt: rep.created_at,
      updatedAt: rep.updated_at
    }));
    
    return reparaciones;
  } catch (error) {
    console.error('Error al obtener reparaciones:', error);
    throw error;
  }
};

// ========== OBTENER UNA REPARACIÓN ==========
export const getReparacionById = async (id: string): Promise<Repair> => {
  try {
    const response = await axios.get(`${API_URL}/reparaciones/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error al obtener reparación:', error);
    throw error;
  }
};

// ========== CAMBIAR ESTADO CON IMÁGENES ==========
export const changeRepairState = async (
  id: string,
  stateChange: StateChangeRequest,
  fotos?: File[]
): Promise<void> => {
  try {
    const formData = new FormData();
    
    // Agregar archivos
    if (fotos && fotos.length > 0) {
      fotos.forEach(file => {
        formData.append('fotos', file);
      });
    }
    
    // Agregar datos del cambio de estado
    formData.append('estado', stateChange.estado);
    if (stateChange.subEtapa) formData.append('subEtapa', stateChange.subEtapa);
    formData.append('nota', stateChange.nota);
    
    if (stateChange.piezaNecesaria) formData.append('piezaNecesaria', stateChange.piezaNecesaria);
    if (stateChange.proveedor) formData.append('proveedor', stateChange.proveedor);
    if (stateChange.costoRepuesto) formData.append('costoRepuesto', String(stateChange.costoRepuesto));
    
    if (stateChange.stickerNumero) formData.append('stickerNumero', stateChange.stickerNumero);
    if (stateChange.stickerUbicacion) formData.append('stickerUbicacion', stateChange.stickerUbicacion);
    
    if (stateChange.diferenciaReparacion !== undefined) {
      formData.append('diferenciaReparacion', String(stateChange.diferenciaReparacion));
    }
    
    await axios.post(`${API_URL}/reparaciones/${id}/estado`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    throw error;
  }
};

// ========== SUBIR IMÁGENES INDIVIDUALES ==========
export const uploadImages = async (
  repairId: string,
  files: File[],
  tipo: 'recepcion' | 'historial' | 'final' | 'comprobante'
): Promise<Array<{ filename: string; url_path: string }>> => {
  try {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('fotos', file);
    });
    
    formData.append('repairId', repairId);
    formData.append('imageTipo', tipo);
    
    const response = await axios.post(`${API_URL}/reparaciones/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error al subir imágenes:', error);
    throw error;
  }
};

// ========== OBTENER URL COMPLETA DE IMAGEN ==========
export const getImageUrl = (urlPath: string): string => {
  // En desarrollo: http://localhost:3000/uploads/...
  // En producción Docker: /uploads/... (Nginx proxea al backend)
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  
  // Si urlPath ya es una URL completa, devolverla tal cual
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath;
  }
  
  // Construir URL completa
  return `${baseUrl}${urlPath}`;
};

const repairService = {
  createReparacion,
  getAllReparaciones,
  getReparacionById,
  changeRepairState,
  uploadImages,
  getImageUrl
};

export default repairService;
