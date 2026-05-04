import axios from 'axios';
import API_URL from './config';

const getConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export interface Deudor {
  id: number;
  numero_credito: string;
  cliente_id?: number;
  cliente_nombre: string;
  cliente_telefono?: string;
  descripcion?: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_vencimiento?: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'ANULADO';
  referencia_venta_id?: number;
  referencia_reparacion_id?: number;
  notas?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  pagos?: DeudorPago[];
  cliente_nombre_actual?: string;
  cliente_telefono_actual?: string;
}

export interface DeudorPago {
  id: number;
  deudor_id: number;
  monto: number;
  metodo_pago: string;
  referencia?: string;
  notas?: string;
  realizado_por?: string;
  fecha_pago: string;
}

export interface DeudoresResumen {
  total_creditos: number;
  pendientes: number;
  parciales: number;
  pagados: number;
  total_prestado: number;
  total_pendiente: number;
  total_cobrado: number;
}

export const deudoresService = {
  getAll: async (filters?: { estado?: string; search?: string }): Promise<Deudor[]> => {
    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.search) params.append('search', filters.search);
    const { data } = await axios.get(`${API_URL}/deudores?${params}`, getConfig());
    return data.data;
  },

  getById: async (id: number): Promise<Deudor> => {
    const { data } = await axios.get(`${API_URL}/deudores/${id}`, getConfig());
    return data.data;
  },

  create: async (payload: {
    cliente_id?: number | null;
    cliente_nombre: string;
    cliente_telefono?: string;
    descripcion?: string;
    monto_total: number;
    fecha_vencimiento?: string;
    referencia_venta_id?: number;
    referencia_reparacion_id?: number;
    notas?: string;
    created_by?: string;
  }): Promise<Deudor> => {
    const { data } = await axios.post(`${API_URL}/deudores`, payload, getConfig());
    return data.data;
  },

  registrarPago: async (id: number, payload: {
    monto: number;
    metodo_pago: string;
    referencia?: string;
    notas?: string;
    realizado_por?: string;
  }): Promise<Deudor> => {
    const { data } = await axios.post(`${API_URL}/deudores/${id}/pago`, payload, getConfig());
    return data.data;
  },

  anular: async (id: number, motivo: string): Promise<void> => {
    await axios.post(`${API_URL}/deudores/${id}/anular`, { motivo }, getConfig());
  },

  getResumen: async (): Promise<DeudoresResumen> => {
    const { data } = await axios.get(`${API_URL}/deudores/resumen`, getConfig());
    return data.data;
  },
};
