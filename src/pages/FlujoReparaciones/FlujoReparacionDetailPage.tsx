import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Camera, Save } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { getAllReparaciones } from '../../services/repairService';
import API_URL from '../../services/config';
import axios from 'axios';

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecksGenerales {
  enciende: boolean;
  tactilFunciona: boolean;
  pantallaOk: boolean;
  bateriaOk: boolean;
  cargaOk: boolean;
}

export default function FlujoReparacionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reparacion, setReparacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Checks generales
  const [checksGenerales, setChecksGenerales] = useState<ChecksGenerales>({
    enciende: false,
    tactilFunciona: false,
    pantallaOk: false,
    bateriaOk: false,
    cargaOk: false
  });

  // Checks específicos según tipo de equipo
  const [checksTelefono, setChecksTelefono] = useState<CheckItem[]>([
    { id: 'senal', label: 'Señal de red / Antena', checked: false },
    { id: 'wifi', label: 'WiFi', checked: false },
    { id: 'bluetooth', label: 'Bluetooth', checked: false },
    { id: 'gps', label: 'GPS / Ubicación', checked: false },
    { id: 'datos', label: 'Datos móviles / 4G/5G', checked: false },
    { id: 'camaraTrasera', label: 'Cámara trasera', checked: false },
    { id: 'camaraFrontal', label: 'Cámara frontal / Selfie', checked: false },
    { id: 'flash', label: 'Flash / Linterna', checked: false },
    { id: 'zoom', label: 'Zoom de cámara', checked: false },
    { id: 'bocina', label: 'Bocina / Altavoz', checked: false },
    { id: 'auricular', label: 'Auricular / Altavoz de llamadas', checked: false },
    { id: 'microfono', label: 'Micrófono principal', checked: false },
    { id: 'microfonoLlamadas', label: 'Micrófono de llamadas', checked: false },
    { id: 'vibrador', label: 'Vibrador / Motor de vibración', checked: false },
    { id: 'botonesVolumen', label: 'Botones de volumen', checked: false },
    { id: 'botonEncendido', label: 'Botón de encendido / Power', checked: false },
    { id: 'botonHome', label: 'Botón Home / Inicio', checked: false },
    { id: 'sensorHuella', label: 'Sensor de huella dactilar', checked: false },
    { id: 'faceId', label: 'Face ID / Reconocimiento facial', checked: false },
    { id: 'sensorProximidad', label: 'Sensor de proximidad', checked: false },
    { id: 'sensorLuz', label: 'Sensor de luz ambiental', checked: false },
    { id: 'nfc', label: 'NFC / Pagos móviles', checked: false },
    { id: 'infrarrojo', label: 'Infrarrojo / Control remoto', checked: false },
    { id: 'jackAudifonos', label: 'Jack de audífonos 3.5mm', checked: false },
    { id: 'puertoCarga', label: 'Puerto de carga', checked: false },
    { id: 'cargaRapida', label: 'Carga rápida', checked: false },
    { id: 'cargaInalambrica', label: 'Carga inalámbrica', checked: false },
    { id: 'simCard', label: 'Lector de SIM / Bandeja', checked: false },
    { id: 'sdCard', label: 'Lector de tarjeta SD', checked: false },
    { id: 'rotation', label: 'Rotación automática de pantalla', checked: false },
    { id: 'notificaciones', label: 'LED de notificaciones', checked: false }
  ]);

  const [checksTablet, setChecksTablet] = useState<CheckItem[]>([
    { id: 'wifi', label: 'WiFi', checked: false },
    { id: 'bluetooth', label: 'Bluetooth', checked: false },
    { id: 'gps', label: 'GPS', checked: false },
    { id: 'camaraTrasera', label: 'Cámara trasera', checked: false },
    { id: 'camaraFrontal', label: 'Cámara frontal', checked: false },
    { id: 'flash', label: 'Flash', checked: false },
    { id: 'bocinas', label: 'Bocinas / Altavoces', checked: false },
    { id: 'microfono', label: 'Micrófono', checked: false },
    { id: 'acelerometro', label: 'Acelerómetro', checked: false },
    { id: 'giroscopio', label: 'Giroscopio', checked: false },
    { id: 'sensorLuz', label: 'Sensor de luz', checked: false },
    { id: 'puertoCarga', label: 'Puerto de carga', checked: false },
    { id: 'jackAudifonos', label: 'Jack de audífonos', checked: false },
    { id: 'botonesVolumen', label: 'Botones de volumen', checked: false },
    { id: 'botonEncendido', label: 'Botón de encendido', checked: false },
    { id: 'simCard', label: 'Lector de SIM (si aplica)', checked: false },
    { id: 'sdCard', label: 'Lector de tarjeta SD', checked: false },
    { id: 'rotation', label: 'Rotación de pantalla', checked: false }
  ]);

  const [checksComputadora, setChecksComputadora] = useState<CheckItem[]>([
    { id: 'teclado', label: 'Teclado completo', checked: false },
    { id: 'teclasFuncion', label: 'Teclas de función (F1-F12)', checked: false },
    { id: 'touchpad', label: 'Touchpad / Mouse táctil', checked: false },
    { id: 'clickTouchpad', label: 'Click del touchpad', checked: false },
    { id: 'puertosUsb', label: 'Puertos USB', checked: false },
    { id: 'usbC', label: 'Puerto USB-C', checked: false },
    { id: 'puertoHdmi', label: 'Puerto HDMI', checked: false },
    { id: 'puertoVga', label: 'Puerto VGA', checked: false },
    { id: 'ethernet', label: 'Puerto Ethernet / RJ45', checked: false },
    { id: 'lectorSd', label: 'Lector de tarjetas SD', checked: false },
    { id: 'webcam', label: 'Webcam / Cámara', checked: false },
    { id: 'microfono', label: 'Micrófono integrado', checked: false },
    { id: 'bocinas', label: 'Bocinas / Altavoces', checked: false },
    { id: 'jackAudifonos', label: 'Jack de audífonos', checked: false },
    { id: 'wifi', label: 'WiFi', checked: false },
    { id: 'bluetooth', label: 'Bluetooth', checked: false },
    { id: 'lectorHuella', label: 'Lector de huella', checked: false },
    { id: 'retroiluminacion', label: 'Retroiluminación de teclado', checked: false },
    { id: 'ventilador', label: 'Ventilador / Cooling', checked: false },
    { id: 'bisagras', label: 'Bisagras de la pantalla', checked: false },
    { id: 'unidadOptica', label: 'Unidad óptica (CD/DVD)', checked: false }
  ]);

  const [observaciones, setObservaciones] = useState('');
  const [existeCheck, setExisteCheck] = useState(false);
  
  // Estados para anticipo
  const [dejoAnticipo, setDejoAnticipo] = useState(false);
  const [montoAnticipo, setMontoAnticipo] = useState('');
  const [metodoAnticipo, setMetodoAnticipo] = useState<'efectivo' | 'transferencia'>('efectivo');

  useEffect(() => {
    loadReparacion();
  }, [id]);

  const loadReparacion = async () => {
    try {
      setLoading(true);
      const response = await getAllReparaciones();
      const data = Array.isArray(response) ? response : (response as any).data || [];
      const rep = data.find((r: any) => r.id === id);
      
      if (rep) {
        console.log('Reparación cargada:', rep);
        console.log('Tipo de equipo:', rep.recepcion?.tipoEquipo);
        console.log('Checks telefono length:', checksTelefono.length);
        setReparacion(rep);
        // Verificar si ya existe un checklist
        await loadChecklistExistente(id!);
      }
    } catch (error) {
      console.error('Error loading reparacion:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklistExistente = async (reparacionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/check-equipo/reparacion/${reparacionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status < 500 // No lanzar error en 404
        }
      );

      if (response.data.success && response.data.data) {
        const check = response.data.data;
        setExisteCheck(true);
        
        // Cargar checks generales
        setChecksGenerales({
          enciende: check.enciende,
          tactilFunciona: check.tactil_funciona,
          pantallaOk: check.pantalla_ok,
          bateriaOk: check.bateria_ok,
          cargaOk: check.carga_ok
        });

        // Cargar checks específicos según tipo
        if (check.telefono_checks) {
          const telefonoData = check.telefono_checks;
          setChecksTelefono(prev => prev.map(item => ({
            ...item,
            checked: telefonoData[item.id] || false
          })));
        }
        if (check.tablet_checks) {
          const tabletData = check.tablet_checks;
          setChecksTablet(prev => prev.map(item => ({
            ...item,
            checked: tabletData[item.id] || false
          })));
        }
        if (check.computadora_checks) {
          const computadoraData = check.computadora_checks;
          setChecksComputadora(prev => prev.map(item => ({
            ...item,
            checked: computadoraData[item.id] || false
          })));
        }

        setObservaciones(check.observaciones || '');
        
        // Cargar datos de anticipo si existen
        if (check.monto_anticipo && check.monto_anticipo > 0) {
          setDejoAnticipo(true);
          setMontoAnticipo((check.monto_anticipo / 100).toFixed(2));
          setMetodoAnticipo(check.metodo_anticipo || 'efectivo');
        }
      }
    } catch (error) {
      // No existe checklist aún, está bien
      setExisteCheck(false);
    }
  };

  const handleSaveChecklist = async () => {
    if (!reparacion) return;

    // Validación de anticipo
    if (dejoAnticipo && (!montoAnticipo || parseFloat(montoAnticipo) <= 0)) {
      alert('Por favor ingresa el monto del anticipo');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Preparar checks específicos según tipo de equipo
      let checksEspecificos = {};
      const tipoEquipo = reparacion.recepcion?.tipoEquipo;
      
      if (tipoEquipo === 'Telefono') {
        checksEspecificos = checksTelefono.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.checked
        }), {});
      } else if (tipoEquipo === 'Tablet') {
        checksEspecificos = checksTablet.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.checked
        }), {});
      } else if (tipoEquipo === 'Laptop' || tipoEquipo === 'Computadora') {
        checksEspecificos = checksComputadora.reduce((acc, item) => ({
          ...acc,
          [item.id]: item.checked
        }), {});
      }

      const data = {
        reparacionId: reparacion.id,
        tipoEquipo: tipoEquipo,
        checksGenerales,
        checksEspecificos,
        observaciones,
        fotosChecklist: [],
        realizadoPor: 'Usuario', // TODO: Obtener del contexto de autenticación
        dejoAnticipo,
        montoAnticipo: dejoAnticipo ? Math.round(parseFloat(montoAnticipo) * 100) : 0, // Convertir a centavos
        metodoAnticipo: dejoAnticipo ? metodoAnticipo : null
      };

      await axios.post(
        `${API_URL}/check-equipo`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Checklist guardado exitosamente. Estado de reparación actualizado a RECIBIDA.');
      navigate('/flujo-reparaciones');

    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('Error al guardar el checklist');
    } finally {
      setSaving(false);
    }
  };

  const toggleCheckGeneral = (key: keyof ChecksGenerales) => {
    setChecksGenerales(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleCheckEspecifico = (tipo: 'telefono' | 'tablet' | 'computadora', id: string) => {
    if (tipo === 'telefono') {
      setChecksTelefono(prev => prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ));
    } else if (tipo === 'tablet') {
      setChecksTablet(prev => prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ));
    } else {
      setChecksComputadora(prev => prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
        <div className="text-center py-12">Cargando...</div>
      </div>
    );
  }

  if (!reparacion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
        <div className="text-center py-12">Reparación no encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/flujo-reparaciones')}
          className="mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver
        </Button>

        <PageHeader
          title={`Reparación ${reparacion.id}`}
          subtitle="Checklist de ingreso de equipo"
        />
      </div>

      {/* Información de la reparación */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Información del Equipo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-600">Cliente</p>
            <p className="font-semibold">{reparacion.cliente_nombre}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Teléfono</p>
            <p className="font-semibold">{reparacion.cliente_telefono}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Tipo de Equipo</p>
            <p className="font-semibold">{reparacion.recepcion?.tipoEquipo}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Marca / Modelo</p>
            <p className="font-semibold">{reparacion.recepcion?.marca} {reparacion.recepcion?.modelo}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Color</p>
            <p className="font-semibold">{reparacion.recepcion?.color}</p>
          </div>
          {reparacion.recepcion?.imei && (
            <div>
              <p className="text-sm text-slate-600">IMEI/Serie</p>
              <p className="font-semibold">{reparacion.recepcion.imei}</p>
            </div>
          )}
        </div>
        {reparacion.recepcion?.diagnosticoInicial && (
          <div className="mt-4">
            <p className="text-sm text-slate-600">Diagnóstico Inicial</p>
            <p className="text-slate-800">{reparacion.recepcion.diagnosticoInicial}</p>
          </div>
        )}
      </Card>

      {/* Checks Generales */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Checks Generales</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(checksGenerales).map(([key, value]) => (
            <button
              key={key}
              onClick={() => toggleCheckGeneral(key as keyof ChecksGenerales)}
              className={`p-4 rounded-lg border-2 transition-all ${
                value
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {key === 'enciende' && 'Enciende'}
                  {key === 'tactilFunciona' && 'Táctil Funciona'}
                  {key === 'pantallaOk' && 'Pantalla OK'}
                  {key === 'bateriaOk' && 'Batería OK'}
                  {key === 'cargaOk' && 'Carga OK'}
                </span>
                {value ? (
                  <Check className="text-green-600" size={20} />
                ) : (
                  <X className="text-slate-400" size={20} />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Checks Específicos */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">
          Checks Específicos - {reparacion.recepcion?.tipoEquipo}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {reparacion.recepcion?.tipoEquipo === 'Telefono' &&
            checksTelefono.map(item => (
              <button
                key={item.id}
                onClick={() => toggleCheckEspecifico('telefono', item.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  item.checked
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.checked ? (
                    <Check className="text-blue-600" size={18} />
                  ) : (
                    <X className="text-slate-400" size={18} />
                  )}
                </div>
              </button>
            ))}

          {reparacion.recepcion?.tipoEquipo === 'Tablet' &&
            checksTablet.map(item => (
              <button
                key={item.id}
                onClick={() => toggleCheckEspecifico('tablet', item.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  item.checked
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.checked ? (
                    <Check className="text-blue-600" size={18} />
                  ) : (
                    <X className="text-slate-400" size={18} />
                  )}
                </div>
              </button>
            ))}

          {(reparacion.recepcion?.tipoEquipo === 'Laptop' || reparacion.recepcion?.tipoEquipo === 'Computadora') &&
            checksComputadora.map(item => (
              <button
                key={item.id}
                onClick={() => toggleCheckEspecifico('computadora', item.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  item.checked
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.checked ? (
                    <Check className="text-blue-600" size={18} />
                  ) : (
                    <X className="text-slate-400" size={18} />
                  )}
                </div>
              </button>
            ))}
        </div>
      </Card>

      {/* Observaciones */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Observaciones</h3>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Escribe cualquier observación adicional sobre el estado del equipo..."
        />
      </Card>

      {/* Anticipo del Cliente */}
      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Anticipo del Cliente</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dejoAnticipo}
                onChange={(e) => {
                  setDejoAnticipo(e.target.checked);
                  if (!e.target.checked) {
                    setMontoAnticipo('');
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">¿El cliente dejó anticipo?</span>
            </label>
          </div>

          {dejoAnticipo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monto del Anticipo (Q)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoAnticipo}
                  onChange={(e) => setMontoAnticipo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={metodoAnticipo}
                  onChange={(e) => setMetodoAnticipo(e.target.value as 'efectivo' | 'transferencia')}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="efectivo">Efectivo 💵</option>
                  <option value="transferencia">Transferencia 🏦</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/flujo-reparaciones')}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSaveChecklist}
          disabled={saving || existeCheck}
        >
          <Save size={20} className="mr-2" />
          {saving ? 'Guardando...' : existeCheck ? 'Checklist Ya Guardado' : 'Guardar Checklist y Actualizar Estado'}
        </Button>
      </div>
    </div>
  );
}
