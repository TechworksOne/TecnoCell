import { X, Clock, FileText, Image as ImageIcon, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import API_URL, { UPLOADS_BASE_URL } from '../../services/config';
import axios from 'axios';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface ModalHistorialReparacionProps {
  isOpen: boolean;
  onClose: () => void;
  reparacionId: string;
}

export default function ModalHistorialReparacion({
  isOpen,
  onClose,
  reparacionId
}: ModalHistorialReparacionProps) {
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any>(null);
  const [imagenes, setImagenes] = useState<any[]>([]);
  const [reparacion, setReparacion] = useState<any>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistorial();
      loadChecklist();
      loadReparacion();
    }
  }, [isOpen, reparacionId]);

  const loadHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/reparaciones/${reparacionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        const rep = response.data.data;
        setHistorial(rep.historial || []);
        setReparacion(rep);
        
        // Combinar todas las imágenes del historial
        const todasImagenes: any[] = [];
        rep.historial?.forEach((h: any) => {
          if (h.fotos && Array.isArray(h.fotos)) {
            h.fotos.forEach((foto: string) => {
              if (foto) {
                todasImagenes.push({
                  url_path: foto,
                  estado: h.estado,
                  fecha: h.fecha_cambio
                });
              }
            });
          }
        });
        setImagenes(todasImagenes);
      }
    } catch (error) {
      console.error('Error loading historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklist = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/check-equipo/reparacion/${reparacionId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status < 500
        }
      );

      if (response.data.success && response.data.data) {
        setChecklist(response.data.data);
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
    }
  };

  const loadReparacion = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/reparaciones/${reparacionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setReparacion(response.data.data);
      }
    } catch (error) {
      console.error('Error loading reparacion:', error);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estados: { [key: string]: { color: string, label: string } } = {
      'RECIBIDA': { color: 'blue', label: 'Recibida' },
      'EN_DIAGNOSTICO': { color: 'yellow', label: 'En Diagnóstico' },
      'ESPERANDO_AUTORIZACION': { color: 'yellow', label: 'Esperando Autorización' },
      'AUTORIZADA': { color: 'blue', label: 'Autorizada' },
      'EN_REPARACION': { color: 'yellow', label: 'En Reparación' },
      'ESPERANDO_PIEZA': { color: 'yellow', label: 'Esperando Pieza' },
      'COMPLETADA': { color: 'green', label: 'Completada' },
      'ENTREGADA': { color: 'green', label: 'Entregada' },
      'CANCELADA': { color: 'red', label: 'Cancelada' },
      'STAND_BY': { color: 'yellow', label: 'Stand By' },
      'ANTICIPO_REGISTRADO': { color: 'green', label: 'Anticipo Registrado' }
    };
    return estados[estado] || { color: 'gray', label: estado };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Historial Completo</h2>
              <p className="text-sm text-slate-600">
                {reparacionId} - {reparacion?.clienteNombre}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando historial...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Checklist */}
              {checklist && (
                <Card>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-600" />
                    Checklist de Recepción
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        {checklist.enciende ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className={checklist.enciende ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          Enciende
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {checklist.tactil_funciona ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className={checklist.tactil_funciona ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          Táctil Funciona
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {checklist.pantalla_ok ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className={checklist.pantalla_ok ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          Pantalla OK
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {checklist.bateria_ok ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className={checklist.bateria_ok ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          Batería OK
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {checklist.carga_ok ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className={checklist.carga_ok ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          Carga OK
                        </span>
                      </div>
                    </div>

                    {checklist.observaciones && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-700 mb-1">Observaciones:</p>
                        <p className="text-sm text-slate-600">{checklist.observaciones}</p>
                      </div>
                    )}

                    {checklist.telefono_checks && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Checks Específicos:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(checklist.telefono_checks).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              {value ? (
                                <CheckCircle size={14} className="text-green-600" />
                              ) : (
                                <XCircle size={14} className="text-red-500" />
                              )}
                              <span className={value ? 'text-slate-600' : 'text-slate-400 line-through'}>
                                {key.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Historial de Estados */}
              <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" />
                  Historial de Estados
                </h3>

                {historial.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay historial registrado</p>
                ) : (
                  <div className="space-y-4">
                    {historial.map((item, index) => {
                      const estadoInfo = getEstadoBadge(item.estado);
                      const fotosHistorial = item.fotos || [];
                      
                      return (
                        <div
                          key={index}
                          className="border-l-4 border-blue-500 pl-4 py-2 bg-slate-50 rounded-r-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Badge color={estadoInfo.color}>{estadoInfo.label}</Badge>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                            {item.user_nombre && (
                              <span className="text-xs text-slate-500">
                                Por: {item.user_nombre}
                              </span>
                            )}
                          </div>

                          {item.nota && (
                            <p className="text-sm text-slate-700 mb-2">
                              <FileText size={14} className="inline mr-1" />
                              {item.nota}
                            </p>
                          )}

                          {item.pieza_necesaria && (
                            <div className="text-xs text-slate-600 space-y-1 mt-2">
                              <p><strong>Pieza:</strong> {item.pieza_necesaria}</p>
                              {item.proveedor && <p><strong>Proveedor:</strong> {item.proveedor}</p>}
                              {item.costo_repuesto && (
                                <p><strong>Costo:</strong> Q{item.costo_repuesto}</p>
                              )}
                            </div>
                          )}

                          {item.sticker_numero && (
                            <div className="text-xs text-slate-600 space-y-1 mt-2">
                              <p><strong>Sticker:</strong> {item.sticker_numero}</p>
                              {item.sticker_ubicacion && (
                                <p><strong>Ubicación:</strong> {item.sticker_ubicacion}</p>
                              )}
                            </div>
                          )}

                          {/* Imágenes de este estado */}
                          {fotosHistorial.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {fotosHistorial.map((foto: string, fotoIdx: number) => (
                                <img
                                  key={fotoIdx}
                                  src={`${UPLOADS_BASE_URL}${foto}`}
                                  alt={`Evidencia ${fotoIdx + 1}`}
                                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setImagenAmpliada(`${UPLOADS_BASE_URL}${foto}`)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Imágenes */}
              {imagenes.length > 0 && (
                <Card>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ImageIcon size={20} className="text-purple-600" />
                    Imágenes de Evidencia ({imagenes.length})
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagenes.map((img, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => setImagenAmpliada(`${UPLOADS_BASE_URL}${img.url_path}`)}
                      >
                        <img
                          src={`${UPLOADS_BASE_URL}${img.url_path}`}
                          alt={`Evidencia ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                          <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                        </div>
                        {img.estado && (
                          <div className="absolute top-2 left-2">
                            <Badge color="blue" className="text-xs">
                              {getEstadoBadge(img.estado).label}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
            <Button onClick={onClose} variant="outline" className="ml-auto">
              Cerrar
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Imagen Ampliada */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            onClick={() => setImagenAmpliada(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X size={32} />
          </button>
          <img
            src={imagenAmpliada}
            alt="Imagen ampliada"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
