import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, TrendingUp, AlertTriangle, DollarSign, Activity, Eye, Edit, Trash2, Copy, X, Wrench, Battery, Monitor, Camera, Cpu, Speaker, Smartphone, ChevronDown, Building2, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ImageModal from '../../components/ui/ImageModal';
import { useAuth } from '../../store/useAuth';
import { useRepuestosStore } from '../../store/useRepuestosStore';
import { useSuppliersStore } from '../../store/useSuppliers';
import { formatMoney } from '../../lib/format';
import type { Repuesto, RepuestoFormData } from '../../types/repuesto';
import * as repuestoService from '../../services/repuestoService';
import * as marcaLineaService from '../../services/marcaLineaService';
import type { Marca, Linea } from '../../services/marcaLineaService';
import { useToast } from '../../components/ui/Toast';
import { canViewCosts } from '../../lib/permissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtQ = (v: unknown): string => `Q ${toNum(v).toFixed(2)}`;

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPOS_REPUESTO = ['Pantalla', 'Batería', 'Cámara', 'Flex', 'Placa', 'Back Cover', 'Altavoz', 'Conector', 'Otro'];
const CONDICIONES = ['Original', 'OEM', 'Genérico', 'Usado'];

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, gradient }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-white/70 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-[11px] text-white/60 mt-0.5">{sub}</p>}
        </div>
        <div className="bg-white/20 rounded-xl p-2 shrink-0">
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'Pantalla': return <Monitor size={13} className="text-blue-500" />;
    case 'Batería': return <Battery size={13} className="text-yellow-500" />;
    case 'Cámara': return <Camera size={13} className="text-purple-500" />;
    case 'Placa': return <Cpu size={13} className="text-red-500" />;
    case 'Altavoz': return <Speaker size={13} className="text-green-500" />;
    case 'Back Cover': return <Smartphone size={13} className="text-slate-500" />;
    default: return <Wrench size={13} className="text-slate-400" />;
  }
};

const getCondicionBadge = (condicion: string) => {
  const map: Record<string, string> = {
    'Original': 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    'OEM':      'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'Genérico': 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'Usado':    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  };
  return map[condicion] || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
};

const REPUESTO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Crect fill='%231e293b' width='44' height='44'/%3E%3Ctext fill='%2364748b' font-family='system-ui' font-size='8' x='50%25' y='57%25' dominant-baseline='middle' text-anchor='middle'%3ESin img%3C/text%3E%3C/svg%3E";

function RepuestoRow({ repuesto, onView, onEdit, onDelete, onDuplicate }: {
  repuesto: Repuesto;
  onView: (r: Repuesto) => void;
  onEdit: (r: Repuesto) => void;
  onDelete: (id: string) => void;
  onDuplicate: (r: Repuesto) => void;
}) {
  const { user } = useAuth();
  const showCost = canViewCosts(user?.roles);
  const stock = toNum(repuesto.stock);
  const precio = toNum(repuesto.precio);
  const precioCosto = toNum(repuesto.precioCosto);
  const stockMin = toNum(repuesto.stockMinimo ?? 1);
  const lowStock = stock > 0 && stock <= stockMin;
  const noStock = stock === 0;
  const img = repuesto.imagenes?.[0] || REPUESTO_PLACEHOLDER;

  return (
    <>
      {/* ── Desktop row ────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#0A1220] transition-colors border-b border-slate-100 dark:border-[rgba(72,185,230,0.08)] last:border-0">
        <img
          src={img}
          alt={repuesto.nombre}
          className="w-11 h-11 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-[rgba(72,185,230,0.12)]"
          onError={(e) => { e.currentTarget.src = REPUESTO_PLACEHOLDER; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {getTipoIcon(repuesto.tipo)}
            <p className="text-sm font-semibold text-[#14324A] dark:text-[#F8FAFC] truncate leading-tight">{repuesto.nombre}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {(repuesto.sku || repuesto.codigo) && (
              <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 px-1.5 py-0.5 rounded">{repuesto.sku || repuesto.codigo}</span>
            )}
            <span className="text-[10px] font-medium text-[#5E7184] dark:text-[#B8C2D1]">{repuesto.marca}</span>
            {repuesto.linea && <span className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99]">· {repuesto.linea}</span>}
            {repuesto.modelo && <span className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99]">· {repuesto.modelo}</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCondicionBadge(repuesto.condicion)}`}>{repuesto.condicion}</span>
          </div>
        </div>
        <div className="text-right w-20 shrink-0">
          <p className={`text-sm font-bold ${noStock ? 'text-red-600 dark:text-red-400' : lowStock ? 'text-amber-600 dark:text-amber-400' : 'text-[#14324A] dark:text-[#F8FAFC]'}`}>
            {stock} uds
          </p>
          <p className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99]">mín {stockMin}</p>
        </div>
        <div className="text-right w-28 shrink-0">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtQ(precio)}</p>
          {showCost && (
            <p className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99]">costo {fmtQ(precioCosto)}</p>
          )}
        </div>
        <div className="hidden lg:flex items-center justify-center w-20 shrink-0">
          {noStock && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">Sin stock</span>}
          {!noStock && lowStock && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">Stock bajo</span>}
          {!noStock && !lowStock && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              repuesto.activo
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>{repuesto.activo ? 'Activo' : 'Inactivo'}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onView(repuesto)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Ver detalles"><Eye size={14} className="text-[#5E7184] dark:text-[#B8C2D1]" /></button>
          <button onClick={() => onEdit(repuesto)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar"><Edit size={14} className="text-[#5E7184] dark:text-[#B8C2D1]" /></button>
          <button onClick={() => onDuplicate(repuesto)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Duplicar"><Copy size={14} className="text-[#5E7184] dark:text-[#B8C2D1]" /></button>
          <button onClick={() => onDelete(repuesto.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Eliminar"><Trash2 size={14} className="text-red-400 dark:text-red-500" /></button>
        </div>
      </div>

      {/* ── Mobile card ────────────────────────────────────────────────── */}
      <div className="md:hidden p-4 border-b border-[#D6EEF8] dark:border-[rgba(72,185,230,0.10)] last:border-0">
        <div className="flex items-start gap-3">
          <img
            src={img}
            alt={repuesto.nombre}
            className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-[rgba(72,185,230,0.12)]"
            onError={(e) => { e.currentTarget.src = REPUESTO_PLACEHOLDER; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#14324A] dark:text-[#F8FAFC] leading-tight">{repuesto.nombre}</p>
              {noStock
                ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">Sin stock</span>
                : lowStock
                ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">Stock bajo</span>
                : <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                    repuesto.activo
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>{repuesto.activo ? 'Activo' : 'Inactivo'}</span>
              }
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(repuesto.sku || repuesto.codigo) && (
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 px-1.5 py-0.5 rounded">{repuesto.sku || repuesto.codigo}</span>
              )}
              <span className="text-[10px] font-medium text-[#5E7184] dark:text-[#B8C2D1]">{repuesto.marca}</span>
              {repuesto.linea && <span className="text-[10px] text-[#7F8A99]">· {repuesto.linea}</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCondicionBadge(repuesto.condicion)}`}>{repuesto.condicion}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99] uppercase tracking-wide">Stock</p>
              <p className={`font-bold ${noStock ? 'text-red-600 dark:text-red-400' : lowStock ? 'text-amber-600 dark:text-amber-400' : 'text-[#14324A] dark:text-[#F8FAFC]'}`}>{stock} uds</p>
            </div>
            <div>
              <p className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99] uppercase tracking-wide">Precio</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmtQ(precio)}</p>
            </div>
            {showCost && (
              <div>
                <p className="text-[10px] text-[#7F8A99] dark:text-[#7F8A99] uppercase tracking-wide">Costo</p>
                <p className="font-bold text-[#5E7184] dark:text-[#B8C2D1]">{fmtQ(precioCosto)}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onView(repuesto)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Ver"><Eye size={16} className="text-[#5E7184] dark:text-[#B8C2D1]" /></button>
            <button onClick={() => onEdit(repuesto)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar"><Edit size={16} className="text-[#5E7184] dark:text-[#B8C2D1]" /></button>
            <button onClick={() => onDuplicate(repuesto)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Duplicar"><Copy size={16} className="text-[#5E7184] dark:text-[#B8C2D1]" /></button>
            <button onClick={() => onDelete(repuesto.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Eliminar"><Trash2 size={16} className="text-red-400 dark:text-red-500" /></button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function RepuestosPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const showCost = canViewCosts(user?.roles);
  const { repuestos, removeRepuesto, duplicateRepuesto, loadRepuestos, isLoading } = useRepuestosStore();
  const { suppliers, loadSuppliers } = useSuppliersStore();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Selection
  const [selectedRepuesto, setSelectedRepuesto] = useState<Repuesto | null>(null);
  const [repuestoToDelete, setRepuestoToDelete] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // New repuesto form state
  const [isSaving, setIsSaving] = useState(false);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [showSuppliersDropdown, setShowSuppliersDropdown] = useState(false);
  const suppliersRef = useRef<HTMLDivElement>(null);
  const [newCompatible, setNewCompatible] = useState('');

  const emptyForm = (): RepuestoFormData => ({
    nombre: '', tipo: 'Pantalla', marca: '', linea: '', modelo: '',
    compatibilidad: [], condicion: 'Original', color: '', notas: '',
    precio: 0, precioCosto: 0, proveedor: '', stock: 0, stockMinimo: 1,
    imagenes: [], tags: [], activo: true
  });
  const [formData, setFormData] = useState<RepuestoFormData>(emptyForm());

  useEffect(() => { loadRepuestos(); }, [loadRepuestos]);

  useEffect(() => {
    if (showFormModal) {
      const load = async () => {
        try {
          const data = await marcaLineaService.getAllMarcas(true);
          setMarcas(data);
        } catch { }
      };
      load();
      loadSuppliers();
    }
  }, [showFormModal, loadSuppliers]);

  useEffect(() => {
    const load = async () => {
      if (!formData.marca) { setLineas([]); return; }
      const marca = marcas.find(m => m.nombre === formData.marca);
      if (marca) {
        try {
          const data = await marcaLineaService.getLineasByMarca(marca.id, true);
          setLineas(data);
        } catch { setLineas([]); }
      }
    };
    load();
  }, [formData.marca, marcas]);

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suppliersRef.current && !suppliersRef.current.contains(e.target as Node)) {
        setShowSuppliersDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Image modal keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!showImageModal) return;
      if (e.key === 'ArrowLeft') setCurrentImageIndex(p => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setCurrentImageIndex(p => Math.min(selectedImages.length - 1, p + 1));
      if (e.key === 'Escape') setShowImageModal(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showImageModal, selectedImages.length]);

  // Filtered list
  const filteredRepuestos = repuestos.filter(r => {
    const sl = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      r.nombre.toLowerCase().includes(sl) ||
      r.tipo.toLowerCase().includes(sl) ||
      (r.sku && r.sku.toLowerCase().includes(sl)) ||
      (r.codigo && r.codigo.toLowerCase().includes(sl)) ||
      r.marca.toLowerCase().includes(sl) ||
      (r.linea && r.linea.toLowerCase().includes(sl)) ||
      (r.modelo && r.modelo.toLowerCase().includes(sl)) ||
      (r.proveedor && r.proveedor.toLowerCase().includes(sl)) ||
      (r.compatibilidad && r.compatibilidad.some(c => c.toLowerCase().includes(sl)));
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? r.activo : !r.activo);
    const matchCat = categoryFilter === 'all' || r.tipo === categoryFilter;
    const matchStock = stockFilter === 'all' ||
      (stockFilter === 'low' && r.stockMinimo != null && r.stock <= r.stockMinimo) ||
      (stockFilter === 'available' && r.stock > 0) ||
      (stockFilter === 'out' && r.stock === 0);
    return matchSearch && matchStatus && matchCat && matchStock;
  });

  const totalActivos = repuestos.filter(r => r.activo).length;
  const totalLowStock = repuestos.filter(r => {
    const st = toNum(r.stock); const mn = toNum(r.stockMinimo ?? 1);
    return st > 0 && st <= mn;
  }).length;
  const valorInventario = repuestos.reduce((s, r) => s + toNum(r.precioCosto) * toNum(r.stock), 0);
  const hasFilters = searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all';

  // Handlers
  const handleViewDetails = (r: Repuesto) => { setSelectedRepuesto(r); setShowDetailModal(true); };
  const handleEditRepuesto = (r: Repuesto) => navigate(`/repuestos/editar/${r.id}`);
  const handleDeleteRepuesto = (id: string) => { setRepuestoToDelete(id); setShowDeleteDialog(true); };
  const confirmDelete = () => {
    if (repuestoToDelete) { removeRepuesto(repuestoToDelete); setRepuestoToDelete(null); }
    setShowDeleteDialog(false);
  };
  const handleDuplicateRepuesto = (r: Repuesto) => {
    const dup = duplicateRepuesto(r.id);
    if (dup) navigate(`/repuestos/editar/${dup.id}`);
  };

  const handleToggleActive = async (r: Repuesto) => {
    try {
      const nuevoEstado = !r.activo;
      await repuestoService.updateRepuesto(Number(r.id), { activo: nuevoEstado });
      toast.add(`Repuesto ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`, 'success');
      await loadRepuestos();
      const updated = await repuestoService.getAllRepuestos({ limit: 500 });
      const found = updated.find(x => x.id === Number(r.id));
      if (found) {
        setSelectedRepuesto(prev => prev ? {
          ...prev,
          activo: found.activo !== false
        } : prev);
      }
    } catch (error: any) {
      toast.add(error.response?.data?.error || 'Error al cambiar estado', 'error');
    }
  };

  const openNewModal = () => { setFormData(emptyForm()); setShowFormModal(true); };

  const handleAddCompatible = () => {
    if (newCompatible.trim() && !formData.compatibilidad?.includes(newCompatible.trim())) {
      setFormData(p => ({ ...p, compatibilidad: [...(p.compatibilidad || []), newCompatible.trim()] }));
      setNewCompatible('');
    }
  };

  const handleSaveRepuesto = async () => {
    if (!formData.nombre.trim() || !formData.tipo || !formData.marca) {
      toast.add('Completa los campos requeridos: Nombre, Tipo y Marca', 'error');
      return;
    }
    if (formData.precio > 0 && formData.precioCosto > 0 && formData.precio <= formData.precioCosto) {
      toast.add('El precio público debe ser mayor al precio de costo', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await repuestoService.createRepuesto({
        nombre: formData.nombre,
        tipo: formData.tipo,
        marca: formData.marca,
        linea: formData.linea || undefined,
        modelo: formData.modelo || undefined,
        compatibilidad: formData.compatibilidad || [],
        condicion: formData.condicion,
        color: formData.color || undefined,
        notas: formData.notas || undefined,
        precio_publico: repuestoService.quetzalesACentavos(formData.precio),
        precio_costo: repuestoService.quetzalesACentavos(formData.precioCosto),
        proveedor: formData.proveedor || undefined,
        stock: 0,
        stock_minimo: formData.stockMinimo || 1,
        imagenes: [],
        tags: [],
        activo: formData.activo,
      });
      toast.add('Repuesto creado exitosamente', 'success');
      setShowFormModal(false);
      setFormData(emptyForm());
      await loadRepuestos();
    } catch (error: any) {
      toast.add(error.response?.data?.error || 'Error al crear el repuesto', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#14324A] dark:text-[#F8FAFC] flex items-center gap-2">
            <Wrench size={20} className="text-[#48B9E6]" />
            Repuestos
          </h1>
          <p className="text-xs text-[#5E7184] dark:text-[#B8C2D1] mt-0.5">Gestión de repuestos y compatibilidades</p>
        </div>
        <Button
          onClick={openNewModal}
          className="bg-gradient-to-r from-[#48B9E6] to-[#2EA7D8] hover:from-[#2EA7D8] hover:to-[#2563EB] text-white font-semibold rounded-xl text-sm px-4 py-2 shadow-sm shrink-0 transition-all"
        >
          <Plus size={15} className="mr-1.5" />
          Nuevo Repuesto
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Repuestos" value={repuestos.length} sub="en inventario" icon={Package} gradient="bg-gradient-to-br from-[#48B9E6] to-[#2563EB]" />
        <KpiCard label="Activos" value={totalActivos} sub="disponibles" icon={Activity} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <KpiCard label="Stock Bajo" value={totalLowStock} sub="por reponer" icon={AlertTriangle} gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
        {showCost && <KpiCard label="Valor inventario" value={fmtQ(valorInventario)} sub="precio costo" icon={DollarSign} gradient="bg-gradient-to-br from-violet-500 to-purple-700" />}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0D1526] rounded-2xl border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] px-4 py-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F8A99] pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, SKU, marca, modelo..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-9 py-2 text-sm rounded-xl border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] bg-[#F8FDFF] dark:bg-[#060B14] text-[#14324A] dark:text-[#F8FAFC] placeholder:text-[#7F8A99] w-full focus:ring-[#48B9E6]"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter} className="text-sm rounded-xl border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] bg-white dark:bg-[#0D1526] text-[#14324A] dark:text-[#F8FAFC] py-2 sm:w-40 shrink-0">
          <option value="all">Todos los tipos</option>
          {TIPOS_REPUESTO.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter} className="text-sm rounded-xl border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] bg-white dark:bg-[#0D1526] text-[#14324A] dark:text-[#F8FAFC] py-2 sm:w-36 shrink-0">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter} className="text-sm rounded-xl border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] bg-white dark:bg-[#0D1526] text-[#14324A] dark:text-[#F8FAFC] py-2 sm:w-36 shrink-0">
          <option value="all">Todo el stock</option>
          <option value="available">Disponible</option>
          <option value="low">Stock bajo</option>
          <option value="out">Sin stock</option>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); setStockFilter('all'); }} className="text-sm text-[#5E7184] dark:text-[#B8C2D1] hover:text-[#14324A] dark:hover:text-[#F8FAFC] border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] rounded-xl px-3 py-2 whitespace-nowrap shrink-0">
            Limpiar
          </Button>
        )}
        <span className="text-xs text-[#5E7184] dark:text-[#B8C2D1] whitespace-nowrap self-center sm:ml-1 shrink-0">
          {filteredRepuestos.length} repuestos
        </span>
      </div>

      {/* ── List ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0D1526] rounded-2xl border border-[#D6EEF8] dark:border-[rgba(72,185,230,0.16)] overflow-hidden">
        {/* Table header — only on desktop */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-[#F8FDFF] dark:bg-[#0A1220] border-b border-[#D6EEF8] dark:border-[rgba(72,185,230,0.12)]">
          <div className="w-11 shrink-0" />
          <p className="flex-1 text-[11px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest">Repuesto</p>
          <p className="w-20 text-right text-[11px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest shrink-0">Stock</p>
          <p className="w-28 text-right text-[11px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest shrink-0">Precio venta</p>
          <p className="hidden lg:block w-20 text-center text-[11px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest shrink-0">Estado</p>
          <p className="w-24 text-right text-[11px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest shrink-0">Acciones</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#48B9E6] border-t-transparent" />
            <p className="text-sm text-[#5E7184] dark:text-[#B8C2D1]">Cargando repuestos...</p>
          </div>
        ) : filteredRepuestos.length > 0 ? (
          <div>
            {filteredRepuestos.map(r => (
              <RepuestoRow
                key={r.id}
                repuesto={r}
                onView={handleViewDetails}
                onEdit={handleEditRepuesto}
                onDelete={handleDeleteRepuesto}
                onDuplicate={handleDuplicateRepuesto}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-[#F8FDFF] dark:bg-[#0A1220] rounded-2xl p-4 mb-3">
              <Wrench size={28} className="text-[#48B9E6]" />
            </div>
            <p className="text-sm font-semibold text-[#14324A] dark:text-[#F8FAFC]">{hasFilters ? 'Sin resultados' : 'No hay repuestos'}</p>
            <p className="text-xs text-[#5E7184] dark:text-[#B8C2D1] mt-1 mb-4">{hasFilters ? 'Ajusta los filtros' : 'Comienza agregando tu primer repuesto'}</p>
            {!hasFilters && (
              <Button onClick={openNewModal} className="bg-gradient-to-r from-[#48B9E6] to-[#2EA7D8] text-white text-sm rounded-xl px-4 py-2">
                <Plus size={14} className="mr-1.5" />
                Agregar Repuesto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── New Repuesto Modal ───────────────────────────────────────── */}
      <Modal open={showFormModal} onClose={() => setShowFormModal(false)} title="Nuevo Repuesto">
        <div className="space-y-4">
          {/* SKU preview note */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Sparkles size={13} className="text-cyan-500 shrink-0" />
            <p className="text-[11px] text-cyan-700">
              <span className="font-semibold">SKU automático:</span> se generará como TIPO_MARCA_MODELO_######
            </p>
          </div>

          {/* Row 1: Nombre + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Nombre <span className="text-red-400">*</span></label>
              <Input
                value={formData.nombre}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Pantalla iPhone 15 Pro OLED Original"
                className="text-sm rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Tipo <span className="text-red-400">*</span></label>
              <Select
                value={formData.tipo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(p => ({ ...p, tipo: e.target.value as RepuestoFormData['tipo'] }))}
                className="text-sm rounded-xl border-slate-200 w-full"
              >
                {TIPOS_REPUESTO.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>

          {/* Row 2: Marca + Línea + Modelo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Marca <span className="text-red-400">*</span></label>
              <Select
                value={formData.marca}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(p => ({ ...p, marca: e.target.value as RepuestoFormData['marca'], linea: '' }))}
                className="text-sm rounded-xl border-slate-200 w-full"
              >
                <option value="">Seleccionar...</option>
                {marcas.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Línea</label>
              {lineas.length > 0 ? (
                <Select
                  value={formData.linea}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(p => ({ ...p, linea: e.target.value }))}
                  className="text-sm rounded-xl border-slate-200 w-full"
                  disabled={!formData.marca}
                >
                  <option value="">Seleccionar...</option>
                  {lineas.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                </Select>
              ) : (
                <Input
                  value={formData.linea}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, linea: e.target.value }))}
                  placeholder="iPhone, Galaxy S..."
                  className="text-sm rounded-xl border-slate-200"
                  disabled={!formData.marca}
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Modelo</label>
              <Input
                value={formData.modelo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, modelo: e.target.value }))}
                placeholder="15 Pro, S24, etc."
                className="text-sm rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* Row 3: Condición + Color + Activo */}
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Condición</label>
              <Select
                value={formData.condicion}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(p => ({ ...p, condicion: e.target.value as RepuestoFormData['condicion'] }))}
                className="text-sm rounded-xl border-slate-200 w-full"
              >
                {CONDICIONES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Color</label>
              <Input
                value={formData.color}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, color: e.target.value }))}
                placeholder="Negro, Blanco..."
                className="text-sm rounded-xl border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="formActivo"
                checked={formData.activo}
                onChange={(e) => setFormData(p => ({ ...p, activo: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="formActivo" className="text-xs font-medium text-slate-600 cursor-pointer">Activo</label>
            </div>
          </div>

          {/* Row 4: Precios + Stock mínimo */}
          <div className="grid grid-cols-3 gap-3">
            {showCost && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Precio Costo <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Q</span>
                <Input
                  type="number" step="0.01" min="0"
                  value={formData.precioCosto}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, precioCosto: Number(e.target.value) }))}
                  className="pl-6 text-sm rounded-xl border-slate-200"
                  placeholder="0.00"
                />
              </div>
            </div>
            )}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Precio Venta <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Q</span>
                <Input
                  type="number" step="0.01" min="0"
                  value={formData.precio}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, precio: Number(e.target.value) }))}
                  className="pl-6 text-sm rounded-xl border-slate-200"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Stock mínimo</label>
              <Input
                type="number" min="0"
                value={formData.stockMinimo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, stockMinimo: Number(e.target.value) }))}
                className="text-sm rounded-xl border-slate-200"
                placeholder="1"
              />
            </div>
          </div>

          {/* Margin preview */}
          {showCost && formData.precioCosto > 0 && formData.precio > 0 && (
            <div className={`rounded-xl px-3 py-2 flex items-center justify-between ${formData.precio <= formData.precioCosto ? 'bg-red-50 border border-red-200' : 'bg-violet-50 border border-violet-200'}`}>
              <span className={`text-[11px] font-medium ${formData.precio <= formData.precioCosto ? 'text-red-600' : 'text-violet-600'}`}>
                {formData.precio <= formData.precioCosto ? '⚠ Precio venta ≤ costo' : 'Margen de ganancia'}
              </span>
              <span className={`text-sm font-bold ${formData.precio <= formData.precioCosto ? 'text-red-700' : 'text-violet-700'}`}>
                Q{(formData.precio - formData.precioCosto).toFixed(2)}
                {formData.precio > formData.precioCosto && (
                  <span className="font-normal text-[11px] ml-1">
                    ({(((formData.precio - formData.precioCosto) / formData.precioCosto) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Proveedor */}
          <div className="space-y-1" ref={suppliersRef}>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Building2 size={11} /> Proveedor
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSuppliersDropdown(p => !p)}
                className="w-full text-left text-sm px-3 py-2 border border-slate-200 rounded-xl flex items-center justify-between hover:border-blue-300 transition-colors bg-white"
              >
                <span className={formData.proveedor ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                  {formData.proveedor || 'Seleccionar proveedor...'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              {showSuppliersDropdown && (
                <div className="absolute z-30 w-full mt-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xl">
                  {suppliers.filter(s => s.activo).length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No hay proveedores registrados</div>
                  ) : (
                    suppliers.filter(s => s.activo).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setFormData(p => ({ ...p, proveedor: s.nombre })); setShowSuppliersDropdown(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <p className="text-sm font-medium text-slate-800">{s.nombre}</p>
                        {s.telefono && <p className="text-[11px] text-slate-400 mt-0.5">{s.telefono}</p>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Input
              value={formData.proveedor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, proveedor: e.target.value }))}
              placeholder="O escribe el nombre manualmente"
              className="text-sm rounded-xl border-slate-200 mt-1.5"
            />
            <p className="text-[11px] text-slate-400">El stock inicial siempre es 0. Actualiza el inventario en Compras.</p>
          </div>

          {/* Compatibilidad */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Compatibilidad</label>
            <div className="flex gap-2">
              <Input
                value={newCompatible}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCompatible(e.target.value)}
                placeholder="iPhone 15 Pro, Samsung S24..."
                className="text-sm rounded-xl border-slate-200 flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompatible(); }}}
              />
              <Button type="button" onClick={handleAddCompatible} className="text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-3 py-2">
                <Plus size={14} />
              </Button>
            </div>
            {formData.compatibilidad && formData.compatibilidad.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.compatibilidad.map((c, i) => (
                  <span key={i} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                    {c}
                    <button type="button" onClick={() => setFormData(p => ({ ...p, compatibilidad: p.compatibilidad?.filter((_, j) => j !== i) || [] }))} className="hover:text-blue-900">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Notas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData(p => ({ ...p, notas: e.target.value }))}
              placeholder="Información adicional..."
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 pt-1 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 self-center">Para imágenes y etiquetas edita después de crear.</p>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" onClick={() => setShowFormModal(false)} className="text-sm border border-slate-200 rounded-xl px-4 py-2">
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRepuesto}
                disabled={isSaving || !formData.nombre || !formData.tipo || !formData.marca}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5 py-2 disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Crear Repuesto'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title="Detalle del Repuesto">
        {selectedRepuesto && (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Image */}
            <div className="lg:w-44 shrink-0">
              {selectedRepuesto.imagenes && selectedRepuesto.imagenes.length > 0 ? (
                <button
                  onClick={() => { setSelectedImages(selectedRepuesto.imagenes!); setCurrentImageIndex(0); setShowImageModal(true); }}
                  className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 block"
                >
                  <img src={selectedRepuesto.imagenes[0]} alt={selectedRepuesto.nombre} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </button>
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                  {getTipoIcon(selectedRepuesto.tipo)}
                  <p className="text-[10px] mt-1">Sin imagen</p>
                </div>
              )}
              {selectedRepuesto.imagenes && selectedRepuesto.imagenes.length > 1 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {selectedRepuesto.imagenes.slice(1, 5).map((img, i) => (
                    <button key={i} onClick={() => { setSelectedImages(selectedRepuesto.imagenes!); setCurrentImageIndex(i + 1); setShowImageModal(true); }}
                      className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-300 transition-colors shrink-0"
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {selectedRepuesto.imagenes.length > 5 && (
                    <span className="text-[10px] text-slate-400 self-center">+{selectedRepuesto.imagenes.length - 5}</span>
                  )}
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Estado</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${selectedRepuesto.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {selectedRepuesto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Condición</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${getCondicionBadge(selectedRepuesto.condicion)}`}>{selectedRepuesto.condicion}</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {getTipoIcon(selectedRepuesto.tipo)}
                  <span className="text-xs text-slate-500 font-medium">{selectedRepuesto.tipo}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">{selectedRepuesto.nombre}</h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{selectedRepuesto.sku || selectedRepuesto.codigo}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-[#0A1220] rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest">Marca / Línea</p>
                  <p className="text-sm font-semibold text-[#14324A] dark:text-[#F8FAFC] mt-0.5">{selectedRepuesto.marca}</p>
                  {selectedRepuesto.linea && <p className="text-[11px] text-[#7F8A99]">{selectedRepuesto.linea}{selectedRepuesto.modelo ? ` · ${selectedRepuesto.modelo}` : ''}</p>}
                </div>
                <div className="bg-slate-50 dark:bg-[#0A1220] rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest">Stock</p>
                  <p className={`text-sm font-bold mt-0.5 ${toNum(selectedRepuesto.stock) === 0 ? 'text-red-600 dark:text-red-400' : (selectedRepuesto.stockMinimo && toNum(selectedRepuesto.stock) <= toNum(selectedRepuesto.stockMinimo)) ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {toNum(selectedRepuesto.stock)} uds
                  </p>
                  <p className="text-[11px] text-[#7F8A99]">mín {selectedRepuesto.stockMinimo ?? 1}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {showCost && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">Precio Costo</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">{fmtQ(selectedRepuesto.precioCosto)}</p>
                </div>
                )}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Precio Venta</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{fmtQ(selectedRepuesto.precio)}</p>
                </div>
              </div>

              {showCost && toNum(selectedRepuesto.precioCosto) > 0 && toNum(selectedRepuesto.precio) > 0 && (
                <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400">Margen</span>
                  <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                    {fmtQ(toNum(selectedRepuesto.precio) - toNum(selectedRepuesto.precioCosto))}
                    <span className="font-normal text-[11px] ml-1">
                      ({(((toNum(selectedRepuesto.precio) - toNum(selectedRepuesto.precioCosto)) / toNum(selectedRepuesto.precioCosto)) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              )}

              {selectedRepuesto.proveedor && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span>{selectedRepuesto.proveedor}</span>
                </div>
              )}

              {selectedRepuesto.compatibilidad && selectedRepuesto.compatibilidad.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Compatibilidad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRepuesto.compatibilidad.map((c, i) => (
                      <span key={i} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedRepuesto.notas && (
                <div className="bg-slate-50 dark:bg-[#0A1220] rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-[#5E7184] dark:text-[#B8C2D1] uppercase tracking-widest mb-1">Notas</p>
                  <p className="text-sm text-[#14324A] dark:text-[#F8FAFC]">{selectedRepuesto.notas}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                <Button onClick={() => { setShowDetailModal(false); handleEditRepuesto(selectedRepuesto); }} className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">
                  <Edit size={13} className="mr-1.5" />
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => handleToggleActive(selectedRepuesto)}
                  className={`text-sm border rounded-xl px-4 py-2 ${selectedRepuesto.activo ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                  {selectedRepuesto.activo ? 'Desactivar' : 'Activar'}
                </Button>
                <Button variant="ghost" onClick={() => { setShowDetailModal(false); handleDuplicateRepuesto(selectedRepuesto); }} className="text-sm border border-slate-200 rounded-xl px-4 py-2">
                  <Copy size={13} className="mr-1.5" />
                  Duplicar
                </Button>
                <Button variant="ghost" onClick={() => { setShowDetailModal(false); handleDeleteRepuesto(selectedRepuesto.id); }} className="text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-xl px-4 py-2">
                  <Trash2 size={13} className="mr-1.5" />
                  Eliminar
                </Button>
                <Button variant="ghost" onClick={() => setShowDetailModal(false)} className="text-sm border border-slate-200 rounded-xl px-4 py-2 ml-auto">
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Image Modal ──────────────────────────────────────────────── */}
      {showImageModal && (
        <ImageModal
          isOpen={showImageModal}
          images={selectedImages}
          initialIndex={currentImageIndex}
          onClose={() => setShowImageModal(false)}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Repuesto"
        message="¿Estás seguro de que deseas eliminar este repuesto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />
    </div>
  );
}

