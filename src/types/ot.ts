import { RepairStatus } from './repair';

export interface Tecnico {
  id: number;
  username: string;
  email: string;
  nombre_completo: string;
  roles: string[];
}

export interface OrdenTrabajo {
  id: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  tipo_equipo: string;
  marca?: string;
  modelo?: string;
  estado: RepairStatus;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA';
  fecha_ingreso: string;

  // Asignación técnica
  tecnico_asignado_id: number | null;
  asignado_por: number | null;
  asignado_en: string | null;

  // Nombres resueltos por JOIN
  tecnico_nombre?: string;
  tecnico_username?: string;
  asignado_por_nombre?: string;
  asignado_por_username?: string;
}

export interface AsignarTecnicoPayload {
  tecnico_id: number;
}
