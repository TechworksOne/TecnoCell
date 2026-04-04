import { X, Upload, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import API_URL from '../../services/config';
import Button from '../ui/Button';
import axios from 'axios';

interface ModalActualizarEstadoProps {
  isOpen: boolean;
  onClose: () => void;
  reparacion: {
    id: string;
    clienteNombre: string;
    estado: string;
  };
  onSuccess: () => void;
}

export default function ModalActualizarEstado({
  isOpen,
  onClose,
  reparacion,
  onSuccess
}: ModalActualizarEstadoProps) {
  const [estado, setEstado] = useState(reparacion.estado);
  const [nota, setNota] = useState('');
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Campos específicos por estado
  const [piezaNecesaria, setPiezaNecesaria] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [costoRepuesto, setCostoRepuesto] = useState('');
  const [stickerNumero, setStickerNumero] = useState('');
  const [stickerUbicacion, setStickerUbicacion] = useState('');
  const [repuestos, setRepuestos] = useState<any[]>([]);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState<any>(null);
  const [stickersDisponibles, setStickersDisponibles] = useState<any[]>([]);
  const [stickerSeleccionado, setStickerSeleccionado] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadRepuestos();
      loadStickersDisponibles();
    }
  }, [isOpen]);

  const loadRepuestos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/repuestos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && Array.isArray(response.data)) {
        setRepuestos(response.data);
      }
    } catch (error) {
      console.error('Error loading repuestos:', error);
    }
  };

  const loadStickersDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stickers/disponibles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setStickersDisponibles(response.data.data);
      }
    } catch (error) {
      console.error('Error loading stickers:', error);
    }
  };

  const handleRepuestoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repuestoId = e.target.value;
    if (repuestoId) {
      const repuesto = repuestos.find(r => r.id === parseInt(repuestoId));
      if (repuesto) {
        setRepuestoSeleccionado(repuesto);
        setPiezaNecesaria(repuesto.nombre);
        setProveedor(repuesto.proveedor || '');
        setCostoRepuesto(repuesto.precio_venta ? (repuesto.precio_venta / 100).toFixed(2) : '');
      }
    }
  };

  const handleStickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stickerId = e.target.value;
    if (stickerId) {
      const sticker = stickersDisponibles.find(s => s.id === parseInt(stickerId));
      if (sticker) {
        setStickerSeleccionado(sticker);
        setStickerNumero(sticker.numero_sticker);
      }
    }
  };

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const nuevasImagenes = [...imagenes, ...files].slice(0, 10); // Máximo 10 imágenes
    setImagenes(nuevasImagenes);

    // Crear previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews].slice(0, 10));
  };

  const removeImage = (index: number) => {
    const newImagenes = imagenes.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImagenes(newImagenes);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!nota.trim()) {
      alert('Por favor agrega una nota sobre el cambio de estado');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Datos básicos
      formData.append('estado', estado);
      formData.append('nota', nota);
      formData.append('imageTipo', 'historial'); // Tipo de imagen para el multer

      // Campos específicos según estado
      if (estado === 'ESPERANDO_PIEZA' && piezaNecesaria) {
        formData.append('piezaNecesaria', piezaNecesaria);
        if (proveedor) formData.append('proveedor', proveedor);
        if (costoRepuesto) formData.append('costoRepuesto', costoRepuesto);
      }

      if (estado === 'COMPLETADA') {
        if (stickerSeleccionado) {
          formData.append('stickerId', stickerSeleccionado.id.toString());
          formData.append('stickerNumero', stickerNumero);
        }
        if (stickerUbicacion) formData.append('stickerUbicacion', stickerUbicacion);
      }

      // Imágenes
      imagenes.forEach((imagen) => {
        formData.append('fotos', imagen);
      });

      const response = await axios.post(
        `${API_URL}/reparaciones/${reparacion.id}/estado`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        alert('Estado actualizado exitosamente');
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Error al actualizar');
      }
    } catch (error: any) {
      console.error('Error:', error);
      const mensaje = error.response?.data?.message || error.message || 'Error al actualizar estado';
      alert(`Error: ${mensaje}`);
    } finally {
      setSaving(false);
    }
  };

  const getEstadoInfo = () => {
    const infos: { [key: string]: { color: string, mensaje: string } } = {
      'EN_DIAGNOSTICO': {
        color: 'yellow',
        mensaje: 'Agrega notas del diagnóstico realizado y evidencias fotográficas'
      },
      'ESPERANDO_AUTORIZACION': {
        color: 'yellow',
        mensaje: 'Detalla qué se encontró y qué debe autorizar el cliente'
      },
      'EN_REPARACION': {
        color: 'blue',
        mensaje: 'Documenta el proceso de reparación con fotos y notas'
      },
      'ESPERANDO_PIEZA': {
        color: 'orange',
        mensaje: 'Especifica qué pieza se necesita y de qué proveedor'
      },
      'COMPLETADA': {
        color: 'green',
        mensaje: 'Agrega el sticker de garantía y fotos del equipo reparado'
      },
      'ENTREGADA': {
        color: 'green',
        mensaje: 'Confirma la entrega al cliente'
      }
    };
    return infos[estado] || { color: 'gray', mensaje: 'Agrega información sobre este cambio' };
  };

  const estadoInfo = getEstadoInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Actualizar Estado</h2>
            <p className="text-sm text-slate-600">
              {reparacion.id} - {reparacion.clienteNombre}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selector de Estado */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nuevo Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="RECIBIDA">Recibida</option>
              <option value="EN_DIAGNOSTICO">En Diagnóstico</option>
              <option value="ESPERANDO_AUTORIZACION">Esperando Autorización</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="EN_REPARACION">En Reparación</option>
              <option value="ESPERANDO_PIEZA">Esperando Pieza</option>
              <option value="COMPLETADA">Completada</option>
              <option value="ENTREGADA">Entregada</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="STAND_BY">Stand By</option>
            </select>
          </div>

          {/* Info del estado */}
          <div className={`bg-${estadoInfo.color}-50 border border-${estadoInfo.color}-200 rounded-lg p-4 flex items-start gap-3`}>
            <AlertCircle size={20} className={`text-${estadoInfo.color}-600 mt-0.5`} />
            <p className="text-sm text-slate-700">{estadoInfo.mensaje}</p>
          </div>

          {/* Campos específicos según estado */}
          {estado === 'ESPERANDO_PIEZA' && (
            <div className="space-y-4 bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800">Información de la Pieza</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seleccionar Repuesto del Inventario
                </label>
                <select
                  onChange={handleRepuestoChange}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- Seleccionar o escribir manualmente --</option>
                  {repuestos.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.nombre} {rep.proveedor ? `- ${rep.proveedor}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pieza Necesaria *
                </label>
                <input
                  type="text"
                  value={piezaNecesaria}
                  onChange={(e) => setPiezaNecesaria(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="Ej: Pantalla LCD, Batería, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Costo Estimado (Q)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costoRepuesto}
                    onChange={(e) => setCostoRepuesto(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {estado === 'COMPLETADA' && (
            <div className="space-y-4 bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800">Información de Garantía</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seleccionar Sticker Disponible
                </label>
                <select
                  onChange={handleStickerChange}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">-- Seleccionar sticker --</option>
                  {stickersDisponibles.map((sticker) => (
                    <option key={sticker.id} value={sticker.id}>
                      {sticker.numero_sticker}
                    </option>
                  ))}
                </select>
              </div>

              {stickerNumero && (
                <div className="bg-white p-3 rounded-lg border border-green-300">
                  <p className="text-sm text-slate-600">Sticker seleccionado:</p>
                  <p className="font-mono font-bold text-green-700 text-lg">{stickerNumero}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ubicación del Sticker
                </label>
                <select
                  value={stickerUbicacion}
                  onChange={(e) => setStickerUbicacion(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">-- Seleccionar ubicación --</option>
                  <option value="chasis">Chasis</option>
                  <option value="bandeja_sim">Bandeja SIM</option>
                  <option value="bateria">Batería</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notas / Observaciones *
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={4}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe los detalles del estado actual, hallazgos, trabajo realizado, etc."
            />
          </div>

          {/* Subida de Imágenes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Imágenes de Evidencia
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload size={40} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 mb-1">
                  Haz clic para subir imágenes
                </p>
                <p className="text-xs text-slate-500">
                  Máximo 10 imágenes (JPG, PNG)
                </p>
              </label>
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
