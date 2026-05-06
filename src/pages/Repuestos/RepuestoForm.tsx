import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Upload, X, Plus, Tag, Monitor, Smartphone, AlertCircle, DollarSign, User, Camera, Package2, ChevronDown, Building2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { useRepuestosStore } from "../../store/useRepuestosStore";
import { useSuppliersStore } from "../../store/useSuppliers";
import { RepuestoFormData, MARCAS_LINEAS } from "../../types/repuesto";
import * as repuestoService from "../../services/repuestoService";
import * as marcaLineaService from "../../services/marcaLineaService";
import type { Marca, Linea } from "../../services/marcaLineaService";
import { UPLOADS_BASE_URL } from "../../services/config";

// ─── Constants ─────────────────────────────────────────────────────────────
const TIPOS_REPUESTO = [
  'Pantalla', 'Batería', 'Cámara', 'Flex', 'Placa', 'Back Cover', 'Altavoz', 'Conector', 'Otro'
];

const CONDICIONES = ['Original', 'OEM', 'Genérico', 'Usado'];

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ─── Image item type ────────────────────────────────────────────────────────
interface ImageItem {
  url: string;      // blob: URL for new files, /uploads/... for existing
  file: File | null; // null for existing server images
}

function resolveImgSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http')) return url;
  return `${UPLOADS_BASE_URL}${url}`;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function RepuestoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { getRepuestoById, upsertRepuesto } = useRepuestosStore();
  const { suppliers, loadSuppliers } = useSuppliersStore();
  const hasChanges = useRef(false);

  const isEditing = Boolean(id);
  
  // Default values
  const [formData, setFormData] = useState<RepuestoFormData>({
    nombre: '',
    tipo: 'Pantalla',
    marca: 'Apple',
    linea: '',
    modelo: '',
    compatibilidad: [],
    condicion: 'Original',
    color: '',
    notas: '',
    precio: 0,
    precioCosto: 0,
    proveedor: '',
    stock: 0,
    stockMinimo: 1,
    imagenes: [],
    tags: [],
    activo: true
  });

  // Image state – replaces formData.imagenes for display + upload
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const blobUrlsRef = useRef<string[]>([]);

  const [newCompatible, setNewCompatible] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProveedoresDropdown, setShowProveedoresDropdown] = useState(false);
  
  // Estados para marcas y líneas dinámicas
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [showNewMarcaDialog, setShowNewMarcaDialog] = useState(false);
  const [showNewLineaDialog, setShowNewLineaDialog] = useState(false);
  const [newMarcaNombre, setNewMarcaNombre] = useState('');
  const [newLineaNombre, setNewLineaNombre] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Cargar marcas al montar el componente
  useEffect(() => {
    const loadMarcas = async () => {
      try {
        const data = await marcaLineaService.getAllMarcas(true);
        setMarcas(data);
      } catch (error) {
        console.error('Error al cargar marcas:', error);
        toast.add('Error al cargar marcas', 'error');
      }
    };
    loadMarcas();
    loadSuppliers();
  }, [toast, loadSuppliers]);

  // Cargar líneas cuando cambia la marca
  useEffect(() => {
    const loadLineas = async () => {
      if (formData.marca) {
        try {
          const marca = marcas.find(m => m.nombre === formData.marca);
          if (marca) {
            const data = await marcaLineaService.getLineasByMarca(marca.id, true);
            setLineas(data);
          }
        } catch (error) {
          console.error('Error al cargar líneas:', error);
        }
      } else {
        setLineas([]);
      }
    };
    loadLineas();
  }, [formData.marca, marcas]);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (isEditing && id) {
      const repuesto = getRepuestoById(id);
      if (repuesto) {
        setFormData({
          nombre: repuesto.nombre,
          tipo: repuesto.tipo,
          marca: repuesto.marca,
          linea: repuesto.linea || '',
          modelo: repuesto.modelo || '',
          compatibilidad: repuesto.compatibilidad || [],
          condicion: repuesto.condicion,
          color: repuesto.color || '',
          notas: repuesto.notas || '',
          precio: repuesto.precio,
          precioCosto: repuesto.precioCosto,
          proveedor: repuesto.proveedor || '',
          stock: repuesto.stock,
          stockMinimo: repuesto.stockMinimo || 1,
          imagenes: repuesto.imagenes,
          tags: repuesto.tags || [],
          activo: repuesto.activo
        });
        // Load existing images into imageItems
        setImageItems((repuesto.imagenes || []).map(url => ({ url, file: null })));
      } else {
        toast.add('Repuesto no encontrado', 'error');
        navigate('/repuestos');
      }
    }
  }, [id, isEditing, getRepuestoById, navigate, toast]);

  // Detectar cambios en el formulario
  useEffect(() => {
    const checkForChanges = () => {
      if (isEditing && id) {
        const original = getRepuestoById(id);
        if (original) {
          hasChanges.current = (
            formData.nombre !== original.nombre ||
            formData.precio !== original.precio ||
            formData.stock !== original.stock ||
            JSON.stringify(formData.compatibilidad) !== JSON.stringify(original.compatibilidad || []) ||
            JSON.stringify(formData.tags) !== JSON.stringify(original.tags || [])
          );
        }
      } else {
        hasChanges.current = !!(
          formData.nombre.trim() !== '' ||
          formData.precio > 0 ||
          formData.stock > 0 ||
          (formData.compatibilidad && formData.compatibilidad.length > 0) ||
          (formData.tags && formData.tags.length > 0)
        );
      }
    };
    checkForChanges();
  }, [formData, isEditing, id, getRepuestoById]);

  // Interceptar navegación si hay cambios no guardados
  const handleNavigation = (path: string) => {
    if (hasChanges.current) {
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
    } else {
      navigate(path);
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const cancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.nombre.trim()) {
      errors.push('El nombre del repuesto es requerido');
    } else if (formData.nombre.trim().length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    } else if (formData.nombre.trim().length > 120) {
      errors.push('El nombre no puede exceder 120 caracteres');
    }

    if (!formData.tipo) {
      errors.push('El tipo de repuesto es requerido');
    }

    if (!formData.marca) {
      errors.push('La marca es requerida');
    }

    if (formData.precio < 0) {
      errors.push('El precio público debe ser mayor o igual a cero');
    }

    if (formData.precioCosto < 0) {
      errors.push('El precio de costo debe ser mayor o igual a cero');
    }

    if (formData.precio > 0 && formData.precioCosto > 0 && formData.precio <= formData.precioCosto) {
      errors.push('El precio público debe ser mayor al precio de costo');
    }

    if (formData.stock < 0) {
      errors.push('El stock debe ser mayor o igual a cero');
    }

    if (formData.stockMinimo && formData.stockMinimo < 0) {
      errors.push('El stock mínimo debe ser mayor o igual a cero');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.add(error, 'error'));
      return;
    }

    setIsLoading(true);
    
    try {
      // Split imageItems into existing server paths and new files
      const imagenesExistentes = imageItems
        .filter(item => item.file === null)
        .map(item => item.url);
      const imagenesFiles = imageItems
        .filter(item => item.file !== null)
        .map(item => item.file as File);

      const dataToSave = {
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
        stock: isEditing ? formData.stock : 0,
        stock_minimo: formData.stockMinimo || 1,
        imagenes: imagenesExistentes,
        imagenesFiles,
        tags: formData.tags || [],
        activo: formData.activo
      };

      if (isEditing && id) {
        await repuestoService.updateRepuesto(Number(id), dataToSave);
      } else {
        await repuestoService.createRepuesto(dataToSave);
      }

      toast.add(
        `Repuesto ${isEditing ? 'actualizado' : 'creado'} exitosamente`,
        'success'
      );
      hasChanges.current = false;
      navigate('/repuestos');
    } catch (error: any) {
      console.error('Error al guardar repuesto:', error);
      toast.add(
        error.response?.data?.error || 'Error al guardar el repuesto',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMarca = async () => {
    if (!newMarcaNombre.trim()) {
      toast.add('El nombre de la marca es requerido', 'error');
      return;
    }

    try {
      const nuevaMarca = await marcaLineaService.createMarca({
        nombre: newMarcaNombre.trim()
      });
      setMarcas(prev => [...prev, nuevaMarca]);
      setFormData(prev => ({ ...prev, marca: nuevaMarca.nombre as any }));
      setNewMarcaNombre('');
      setShowNewMarcaDialog(false);
      toast.add('Marca creada exitosamente', 'success');
    } catch (error: any) {
      console.error('Error al crear marca:', error);
      toast.add(
        error.response?.data?.error || 'Error al crear marca',
        'error'
      );
    }
  };

  const handleCreateLinea = async () => {
    if (!newLineaNombre.trim()) {
      toast.add('El nombre de la línea es requerido', 'error');
      return;
    }

    const marca = marcas.find(m => m.nombre === formData.marca);
    if (!marca) {
      toast.add('Selecciona una marca primero', 'error');
      return;
    }

    try {
      const nuevaLinea = await marcaLineaService.createLinea({
        marca_id: marca.id,
        nombre: newLineaNombre.trim()
      });
      setLineas(prev => [...prev, nuevaLinea]);
      setFormData(prev => ({ ...prev, linea: nuevaLinea.nombre }));
      setNewLineaNombre('');
      setShowNewLineaDialog(false);
      toast.add('Línea creada exitosamente', 'success');
    } catch (error: any) {
      console.error('Error al crear línea:', error);
      toast.add(
        error.response?.data?.error || 'Error al crear línea',
        'error'
      );
    }
  };

  const handleSelectProveedor = (proveedor: any) => {
    setFormData(prev => ({
      ...prev,
      proveedor: proveedor.nombre
    }));
    setShowProveedoresDropdown(false);
  };

  const handleAddCompatible = () => {
    if (newCompatible.trim() && !formData.compatibilidad?.includes(newCompatible.trim())) {
      setFormData(prev => ({
        ...prev,
        compatibilidad: [...(prev.compatibilidad || []), newCompatible.trim()]
      }));
      setNewCompatible('');
    }
  };

  const handleRemoveCompatible = (index: number) => {
    setFormData(prev => ({
      ...prev,
      compatibilidad: prev.compatibilidad?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || []
    }));
  };

  // ─── Image helpers ──────────────────────────────────────────────────────
  const addImageFiles = (files: File[]) => {
    const valid = files.filter(f => ALLOWED_MIME.includes(f.type));
    if (files.length > 0 && valid.length === 0) {
      toast.add('Solo se permiten imágenes JPG, PNG o WEBP', 'error');
      return;
    }
    const remaining = 10 - imageItems.length;
    if (remaining <= 0) {
      toast.add('Máximo 10 imágenes por repuesto', 'error');
      return;
    }
    const toAdd = valid.slice(0, remaining);
    const newItems: ImageItem[] = toAdd.map(file => {
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.push(url);
      return { url, file };
    });
    setImageItems(prev => [...prev, ...newItems]);
  };

  const handleRemoveImage = (index: number) => {
    const item = imageItems[index];
    if (item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
      blobUrlsRef.current = blobUrlsRef.current.filter(u => u !== item.url);
    }
    setImageItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllImages = () => {
    imageItems.forEach(item => {
      if (item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
        blobUrlsRef.current = blobUrlsRef.current.filter(u => u !== item.url);
      }
    });
    setImageItems([]);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    setImageItems(prev => {
      const arr = [...prev];
      const [removed] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, removed);
      return arr;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addImageFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImageFiles(Array.from(e.target.files));
    }
    e.target.value = ''; // allow re-selecting same file
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Header with breadcrumb navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <button 
              onClick={() => handleNavigation('/repuestos')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Package2 size={16} />
              Repuestos
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {isEditing ? 'Editar Repuesto' : 'Nuevo Repuesto'}
            </span>
          </nav>

          {/* Title and subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {isEditing ? <Monitor size={24} className="text-blue-600" /> : <Plus size={24} className="text-blue-600" />}
                </div>
                {isEditing ? 'Editar Repuesto' : 'Nuevo Repuesto'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditing ? 'Actualizar información del repuesto' : 'Registrar nuevo repuesto en inventario'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleNavigation('/repuestos')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Volver
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* A) Información básica */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Monitor size={20} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vista previa del SKU que se generará */}
              {!isEditing && formData.tipo && formData.marca && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU (se generará automáticamente)
                  </label>
                  <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <span className="font-mono text-blue-700 font-semibold">
                      {formData.tipo.substring(0, 3).toUpperCase()}_
                      {formData.marca.substring(0, 4).toUpperCase()}_
                      {formData.modelo ? formData.modelo.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'GEN'}_
                      XXXXXX
                    </span>
                    <span className="ml-2 text-xs text-blue-600">
                      (Ejemplo: {formData.tipo.substring(0, 3).toUpperCase()}_
                      {formData.marca.substring(0, 4).toUpperCase()}_
                      {formData.modelo ? formData.modelo.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'GEN'}_{Date.now().toString().slice(-6)})
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    El SKU se genera automáticamente usando: Tipo + Marca + Modelo + Timestamp
                  </p>
                </div>
              )}

              {/* Nombre */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del repuesto <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.nombre}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Pantalla iPhone 12 Pro Max Original"
                  className="w-full"
                  required
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.tipo}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, tipo: e.target.value as RepuestoFormData['tipo'] }))}
                  className="w-full"
                  required
                >
                  {TIPOS_REPUESTO.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </Select>
              </div>

              {/* Condición */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condición <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.condicion}
                  onChange={(e) => setFormData(prev => ({ ...prev, condicion: e.target.value as RepuestoFormData['condicion'] }))}
                  className="w-full"
                  required
                >
                  {CONDICIONES.map(condicion => (
                    <option key={condicion} value={condicion}>{condicion}</option>
                  ))}
                </Select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="Negro, Blanco, etc."
                  className="w-full"
                />
              </div>

              {/* Estado activo */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Repuesto activo</span>
                </label>
              </div>
            </div>
          </Card>

          {/* B) Marca/Línea/Modelo */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Smartphone size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Marca y Modelo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Marca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Select
                    value={formData.marca}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      marca: e.target.value as RepuestoFormData['marca'],
                      linea: ''
                    }))}
                    className="flex-1"
                    required
                  >
                    <option value="">Seleccionar marca</option>
                    {marcas.map(marca => (
                      <option key={marca.id} value={marca.nombre}>{marca.nombre}</option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewMarcaDialog(true)}
                    className="px-3"
                    title="Agregar nueva marca"
                  >
                    <Plus size={20} />
                  </Button>
                </div>
              </div>

              {/* Línea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Línea
                </label>
                <div className="flex gap-2">
                  {lineas.length > 0 ? (
                    <Select
                      value={formData.linea}
                      onChange={(e) => setFormData(prev => ({ ...prev, linea: e.target.value }))}
                      className="flex-1"
                    >
                      <option value="">Seleccionar línea</option>
                      {lineas.map(linea => (
                        <option key={linea.id} value={linea.nombre}>{linea.nombre}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      value={formData.linea}
                      onChange={(e) => setFormData(prev => ({ ...prev, linea: e.target.value }))}
                      placeholder="Especificar línea"
                      className="flex-1"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewLineaDialog(true)}
                    className="px-3"
                    disabled={!formData.marca}
                    title="Agregar nueva línea"
                  >
                    <Plus size={20} />
                  </Button>
                </div>
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo
                </label>
                <Input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                  placeholder="A2407, SM-S911B, etc."
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* C) Compatibilidad */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag size={20} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Compatibilidad</h3>
            </div>

            {/* Agregar compatible */}
            <div className="flex gap-3 mb-4">
              <Input
                type="text"
                value={newCompatible}
                onChange={(e) => setNewCompatible(e.target.value)}
                placeholder="iPhone 12 Pro Max"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCompatible())}
              />
              <Button type="button" onClick={handleAddCompatible}>
                <Plus size={16} />
                Agregar
              </Button>
            </div>

            {/* Lista de compatibles */}
            {formData.compatibilidad && formData.compatibilidad.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.compatibilidad.map((comp, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {comp}
                    <button
                      type="button"
                      onClick={() => handleRemoveCompatible(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* D) Precios, Proveedor y Stock */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Precios y Proveedor</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Precio Costo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Costo (Q) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.precioCosto}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, precioCosto: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  className="w-full"
                  placeholder="950.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Lo que nos costó el repuesto</p>
              </div>

              {/* Precio Público */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio Público (Q) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.precio}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, precio: Number(e.target.value) }))}
                  step="0.01"
                  min="0"
                  className="w-full"
                  placeholder="1250.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Precio de venta al cliente</p>
                {formData.precioCosto > 0 && formData.precio > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Margen: Q{(formData.precio - formData.precioCosto).toFixed(2)} 
                    ({(((formData.precio - formData.precioCosto) / formData.precioCosto) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>

              {/* Proveedor - Selector con dropdown */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={16} className="inline mr-1" />
                  Proveedor
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProveedoresDropdown(!showProveedoresDropdown)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <span className={formData.proveedor ? "text-gray-900 font-medium" : "text-gray-400"}>
                      {formData.proveedor || "Seleccionar proveedor..."}
                    </span>
                    <ChevronDown size={20} className="text-gray-400" />
                  </button>
                  
                  {showProveedoresDropdown && (
                    <div className="absolute z-20 w-full mt-2 max-h-64 overflow-y-auto border-2 border-blue-200 rounded-lg bg-white shadow-2xl">
                      {suppliers.filter(s => s.activo).length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No hay proveedores registrados
                        </div>
                      ) : (
                        suppliers.filter(s => s.activo).map((proveedor) => (
                          <div
                            key={proveedor.id}
                            onClick={() => handleSelectProveedor(proveedor)}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{proveedor.nombre}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {proveedor.telefono && `📞 ${proveedor.telefono}`}
                              {proveedor.nit && ` • NIT: ${proveedor.nit}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <Input
                  type="text"
                  value={formData.proveedor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, proveedor: e.target.value }))}
                  placeholder="O escribe el nombre manualmente"
                  className="w-full mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">El stock inicial será 0. Actualiza el inventario desde Compras.</p>
              </div>

              {/* Stock mínimo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Mínimo (Alerta)
                </label>
                <Input
                  type="number"
                  value={formData.stockMinimo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
                  min="0"
                  className="w-full"
                  placeholder="2"
                />
                <p className="text-xs text-gray-500 mt-1">Alerta cuando el stock llegue a esta cantidad</p>
              </div>
            </div>
          </Card>

          {/* E) Tags */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Tag size={20} className="text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Etiquetas</h3>
            </div>

            {/* Agregar tag */}
            <div className="flex gap-3 mb-4">
              <Input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="OLED, Incell, Amoled"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" onClick={handleAddTag}>
                <Plus size={16} />
                Agregar
              </Button>
            </div>

            {/* Lista de tags */}
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* E2) Imágenes */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Camera size={20} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Imágenes del Repuesto</h3>
            </div>

            {/* Upload area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-300 hover:border-indigo-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Camera size={48} className={`mx-auto mb-4 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {isDragging ? 'Suelta las imágenes aquí' : 'Agregar imágenes'}
              </h4>
              <p className="text-gray-600 mb-4">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                id="image-upload"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors"
              >
                <Upload size={16} />
                Seleccionar Imágenes
              </label>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, WEBP hasta 5 MB cada una. Máximo 10 imágenes.
              </p>
            </div>

            {/* Preview de imágenes */}
            {imageItems.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Imágenes ({imageItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleRemoveAllImages}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Eliminar todas
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageItems.map((item, index) => {
                    const src = resolveImgSrc(item.url);
                    const isNew = item.file !== null;
                    return (
                      <div key={index} className="relative group">
                        {/* Vista previa de imagen */}
                        <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-colors">
                          <img
                            src={src}
                            alt={`Imagen ${index + 1} del repuesto`}
                            className="w-full h-40 object-cover cursor-pointer transition-transform hover:scale-105"
                            onClick={() => window.open(src, '_blank')}
                          />
                          
                          {/* Overlay con controles */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => reorderImages(index, index - 1)}
                                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                                  title="Mover hacia la izquierda"
                                >
                                  <ArrowLeft size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
                                title="Eliminar imagen"
                              >
                                <X size={16} />
                              </button>
                              {index < imageItems.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => reorderImages(index, index + 1)}
                                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                                  title="Mover hacia la derecha"
                                >
                                  <ArrowLeft size={16} className="rotate-180" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Badge de imagen principal */}
                          {index === 0 && (
                            <div className="absolute top-2 left-2">
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                Principal
                              </span>
                            </div>
                          )}

                          {/* Badge nueva/existente */}
                          <div className="absolute top-2 right-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${isNew ? 'bg-emerald-500 text-white' : 'bg-black bg-opacity-60 text-white'}`}>
                              {isNew ? 'Nueva' : index + 1}
                            </span>
                          </div>
                        </div>

                        {/* Info de la imagen */}
                        <div className="mt-2 text-center">
                          <p className="text-xs text-gray-500">
                            {index === 0 ? 'Imagen principal' : isNew ? `Nueva (${item.file?.name ?? ''})` : `Imagen ${index + 1}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <Camera size={16} />
                    <strong>Tip:</strong> La primera imagen será la que se muestre en el catálogo. 
                    Usa las flechas para reordenar las imágenes.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* F) Notas */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Tag size={20} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Notas</h3>
            </div>

            <textarea
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Información adicional sobre el repuesto..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
          </Card>

          {/* Botones de acción */}
          <div className="flex gap-4 justify-end pt-6 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleNavigation('/repuestos')}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-32"
            >
              {isLoading ? (
                'Guardando...'
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? 'Actualizar' : 'Crear'} Repuesto
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Diálogo de confirmación para cambios no guardados */}
        <ConfirmDialog
          open={showUnsavedDialog}
          onClose={cancelNavigation}
          onConfirm={confirmNavigation}
          title="Cambios sin guardar"
          message="Tienes cambios sin guardar. ¿Estás seguro de que deseas salir sin guardar?"
          confirmText="Salir sin guardar"
        />

        {/* Diálogo para crear nueva marca */}
        <ConfirmDialog
          open={showNewMarcaDialog}
          onClose={() => {
            setShowNewMarcaDialog(false);
            setNewMarcaNombre('');
          }}
          onConfirm={handleCreateMarca}
          title="Agregar Nueva Marca"
          confirmText="Crear Marca"
        >
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Marca
            </label>
            <Input
              type="text"
              value={newMarcaNombre}
              onChange={(e) => setNewMarcaNombre(e.target.value)}
              placeholder="Ej: Oppo, Vivo, Realme"
              className="w-full"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateMarca();
                }
              }}
            />
          </div>
        </ConfirmDialog>

        {/* Diálogo para crear nueva línea */}
        <ConfirmDialog
          open={showNewLineaDialog}
          onClose={() => {
            setShowNewLineaDialog(false);
            setNewLineaNombre('');
          }}
          onConfirm={handleCreateLinea}
          title="Agregar Nueva Línea"
          confirmText="Crear Línea"
        >
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Marca: <strong>{formData.marca}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Línea
            </label>
            <Input
              type="text"
              value={newLineaNombre}
              onChange={(e) => setNewLineaNombre(e.target.value)}
              placeholder="Ej: iPhone 16, Galaxy S25, Redmi Note 14"
              className="w-full"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateLinea();
                }
              }}
            />
          </div>
        </ConfirmDialog>
      </div>
    </div>
  );
}
