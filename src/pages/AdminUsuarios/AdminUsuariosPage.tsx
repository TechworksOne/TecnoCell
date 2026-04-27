import { useState, useEffect, useCallback } from 'react';
import {
  Shield, UserPlus, Search, Edit2, Power, Key, X, Check,
  Users, UserCheck, Wrench, ShoppingCart, ChevronDown, Eye, EyeOff,
  AlertTriangle, Camera, Tag, Loader2, RefreshCw,
} from 'lucide-react';
import {
  adminUsuarioService,
  fotoUrl,
  type UsuarioListItem,
  type RolItem,
  type CreateUsuarioPayload,
  type UpdateUsuarioPayload,
} from '../../services/adminUsuarioService';

const ROLE_COLORS: Record<string, string> = {
  ADMINISTRADOR: 'bg-purple-100 text-purple-700 border-purple-200',
  TECNICO: 'bg-blue-100 text-blue-700 border-blue-200',
  VENTAS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const rolColor = (r: string) => ROLE_COLORS[r] ?? 'bg-slate-100 text-slate-600 border-slate-200';

function Avatar({ foto, nombres, apellidos, size = 'md' }: { foto?: string | null; nombres: string; apellidos?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = ((nombres?.[0] ?? '') + (apellidos?.[0] ?? '')).toUpperCase() || '?';
  const sizeClass = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }[size];
  if (foto) return <img src={foto} alt={nombres} className={`${sizeClass} rounded-full object-cover border-2 border-white shadow`} />;
  return <div className={`${sizeClass} rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold shadow`}>{initials}</div>;
}

function RolBadge({ rol }: { rol: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${rolColor(rol)}`}>{rol}</span>;
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <h3 className="font-semibold text-slate-800">Confirmar accion</h3>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

interface FormState {
  nombres: string; apellidos: string; username: string; email: string;
  password: string; confirmPassword: string; telefono: string;
  dpi: string; direccion: string; roles: string[]; active: boolean;
  foto: File | null; fotoPreview: string | null;
}
const emptyForm = (): FormState => ({
  nombres: '', apellidos: '', username: '', email: '',
  password: '', confirmPassword: '', telefono: '',
  dpi: '', direccion: '', roles: [], active: true,
  foto: null, fotoPreview: null,
});

function ModalUsuario({ usuario, roles, onClose, onSaved }: { usuario: UsuarioListItem | null; roles: RolItem[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(usuario);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (usuario) {
      setForm({
        nombres: usuario.nombres ?? '', apellidos: usuario.apellidos ?? '',
        username: usuario.username ?? '', email: usuario.email ?? '',
        password: '', confirmPassword: '',
        telefono: usuario.telefono ?? '', dpi: usuario.dpi ?? '', direccion: usuario.direccion ?? '',
        roles: usuario.roles ?? [], active: usuario.active,
        foto: null, fotoPreview: fotoUrl(usuario.foto_perfil),
      });
    }
  }, [usuario]);

  const set = (k: keyof FormState, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('foto', file);
    set('fotoPreview', URL.createObjectURL(file));
  };
  const toggleRol = (rol: string) =>
    setForm(f => ({ ...f, roles: f.roles.includes(rol) ? f.roles.filter(r => r !== rol) : [...f.roles, rol] }));

  const validate = () => {
    if (!form.nombres.trim()) return 'El nombre es requerido';
    if (!form.username.trim() && !form.email.trim()) return 'Se requiere usuario o email';
    if (!isEdit && !form.password) return 'La contrasena es requerida';
    if (form.password && form.password.length < 6) return 'La contrasena debe tener minimo 6 caracteres';
    if (form.password && form.password !== form.confirmPassword) return 'Las contrasenas no coinciden';
    if (!form.roles.length) return 'Selecciona al menos un rol';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      if (isEdit && usuario) {
        const payload: UpdateUsuarioPayload = {
          nombres: form.nombres, apellidos: form.apellidos || undefined,
          username: form.username || undefined, email: form.email || undefined,
          telefono: form.telefono || undefined, dpi: form.dpi || undefined,
          direccion: form.direccion || undefined, roles: form.roles,
          active: form.active, foto: form.foto,
        };
        await adminUsuarioService.updateUsuario(usuario.id, payload);
      } else {
        const payload: CreateUsuarioPayload = {
          nombres: form.nombres, apellidos: form.apellidos || undefined,
          username: form.username || undefined, email: form.email || undefined,
          password: form.password, telefono: form.telefono || undefined,
          dpi: form.dpi || undefined, direccion: form.direccion || undefined,
          roles: form.roles, foto: form.foto,
        };
        await adminUsuarioService.createUsuario(payload);
      }
      onSaved();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar foto={form.fotoPreview} nombres={form.nombres || 'U'} apellidos={form.apellidos} size="lg" />
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-cyan-600 shadow">
                <Camera size={12} className="text-white" />
                <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
              </label>
            </div>
            <div><p className="text-sm font-medium text-slate-700">Foto de perfil</p><p className="text-xs text-slate-400">JPG, PNG. Max 5MB</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombres <span className="text-red-400">*</span></label>
              <input value={form.nombres} onChange={e => set('nombres', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Apellidos</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Telefono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">DPI</label>
              <input value={form.dpi} onChange={e => set('dpi', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Direccion</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Credenciales de acceso</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Usuario</label>
                <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="ej: admin01" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
            </div>
            {!isEdit && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contrasena <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                    <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar contrasena <span className="text-red-400">*</span></label>
                  <input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Roles <span className="text-red-400">*</span></p>
            <div className="flex flex-wrap gap-2">
              {roles.filter(r => r.activo).map(r => (
                <button key={r.id} type="button" onClick={() => toggleRol(r.nombre)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${form.roles.includes(r.nombre) ? rolColor(r.nombre) + ' shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {form.roles.includes(r.nombre) && <Check size={12} />}
                  {r.nombre}
                </button>
              ))}
            </div>
          </div>
          {isEdit && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('active', !form.active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-slate-600">{form.active ? 'Usuario activo' : 'Usuario inactivo'}</span>
            </div>
          )}
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalPassword({ usuarioId, nombre, onClose, onSaved }: { usuarioId: number; nombre: string; onClose: () => void; onSaved: () => void }) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass || pass.length < 6) { setError('Minimo 6 caracteres'); return; }
    if (pass !== confirm) { setError('Las contrasenas no coinciden'); return; }
    setSaving(true); setError('');
    try { await adminUsuarioService.changePassword(usuarioId, pass); onSaved(); }
    catch { setError('Error al cambiar la contrasena'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Cambiar contrasena</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-500">Cambiando contrasena de <strong>{nombre}</strong></p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contrasena</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar contrasena</label>
            <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-cyan-600 text-white hover:bg-cyan-700">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Cambiar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalRoles({ roles, onClose, onSaved }: { roles: RolItem[]; onClose: () => void; onSaved: () => void }) {
  const [newNombre, setNewNombre] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      await adminUsuarioService.createRol(newNombre, newDesc);
      setNewNombre(''); setNewDesc('');
      onSaved();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error');
    } finally { setSaving(false); }
  };

  const handleToggle = async (rol: RolItem) => {
    try { await adminUsuarioService.updateRol(rol.id, { activo: !rol.activo }); onSaved(); } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Gestionar roles</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {roles.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="flex items-center gap-2"><RolBadge rol={r.nombre} /><span className="text-xs text-slate-400">{r.total_usuarios} usuarios</span></div>
                  {r.descripcion && <p className="text-xs text-slate-500 mt-0.5">{r.descripcion}</p>}
                </div>
                <button onClick={() => handleToggle(r)}
                  className={`px-3 py-1 text-xs rounded-full border ${r.activo ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
                  {r.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Crear nuevo rol</p>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input value={newNombre} onChange={e => setNewNombre(e.target.value.toUpperCase())} placeholder="NOMBRE_ROL" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descripcion (opcional)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-cyan-600 text-white hover:bg-cyan-700">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />} Crear rol
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [roles, setRoles] = useState<RolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalUsuario, setModalUsuario] = useState<{ open: boolean; usuario: UsuarioListItem | null }>({ open: false, usuario: null });
  const [modalPassword, setModalPassword] = useState<{ open: boolean; usuario: UsuarioListItem | null }>({ open: false, usuario: null });
  const [modalRoles, setModalRoles] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<UsuarioListItem | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [us, rs] = await Promise.all([
        adminUsuarioService.getUsuarios({ buscar: buscar || undefined, rol: filtroRol || undefined, estado: filtroEstado }),
        adminUsuarioService.getRoles(),
      ]);
      setUsuarios(us); setRoles(rs);
    } catch { setError('Error al cargar los datos. Verifica la conexion con el servidor.'); }
    finally { setLoading(false); }
  }, [buscar, filtroRol, filtroEstado]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleEstado = async (u: UsuarioListItem) => {
    try {
      await adminUsuarioService.toggleEstado(u.id);
      showToast(u.active ? u.nombres + ' desactivado' : u.nombres + ' activado');
      loadData();
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cambiar estado');
    }
    setConfirmToggle(null);
  };

  const total = usuarios.length;
  const activos = usuarios.filter(u => u.active).length;
  const tecnicos = usuarios.filter(u => u.roles.includes('TECNICO')).length;
  const admins = usuarios.filter(u => u.roles.includes('ADMINISTRADOR')).length;
  const ventas = usuarios.filter(u => u.roles.includes('VENTAS')).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <Check size={15} className="text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administracion de Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion de accesos, perfiles y roles del sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalRoles(true)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <Tag size={15} /> Gestionar roles
          </button>
          <button onClick={() => setModalUsuario({ open: true, usuario: null })} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-cyan-600 text-white hover:bg-cyan-700">
            <UserPlus size={15} /> Nuevo usuario
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: total, icon: <Users size={20} />, color: 'from-blue-500 to-blue-600' },
          { label: 'Activos', value: activos, icon: <UserCheck size={20} />, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Tecnicos', value: tecnicos, icon: <Wrench size={20} />, color: 'from-cyan-500 to-cyan-600' },
          { label: 'Administradores', value: admins, icon: <Shield size={20} />, color: 'from-purple-500 to-purple-600' },
          { label: 'Ventas', value: ventas, icon: <ShoppingCart size={20} />, color: 'from-amber-500 to-amber-600' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <p className="text-white/80 text-xs">{s.label}</p>
              <p className="text-2xl font-bold mt-0.5">{s.value}</p>
            </div>
            <div className="opacity-60">{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre, usuario, telefono..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-300" />
          </div>
          <div className="relative">
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white">
              <option value="">Todos los roles</option>
              {roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white">
              <option value="">Todos los estados</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={loadData} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-cyan-500 animate-spin" />
            <p className="text-sm text-slate-500">Cargando usuarios...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle size={32} className="text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={loadData} className="text-xs px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Reintentar</button>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={40} className="text-slate-300" />
            <p className="text-slate-500 font-medium">No se encontraron usuarios</p>
            <p className="text-sm text-slate-400">Intenta cambiar los filtros o crea un nuevo usuario</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Usuario', 'Credenciales', 'Telefono', 'Roles', 'Estado', 'Ultimo acceso', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar foto={fotoUrl(u.foto_perfil)} nombres={u.nombres} apellidos={u.apellidos} size="sm" />
                          <p className="text-sm font-medium text-slate-800">{u.nombres} {u.apellidos}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600">{u.username ?? '-'}</p>
                        <p className="text-xs text-slate-400">{u.email ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{u.telefono ?? '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length ? u.roles.map(r => <RolBadge key={r} rol={r} />) : <span className="text-xs text-slate-400">Sin roles</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModalUsuario({ open: true, usuario: u })} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50"><Edit2 size={15} /></button>
                          <button onClick={() => setModalPassword({ open: true, usuario: u })} title="Cambiar contrasena" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Key size={15} /></button>
                          <button onClick={() => setConfirmToggle(u)} title={u.active ? 'Desactivar' : 'Activar'}
                            className={`p-1.5 rounded-lg ${u.active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {usuarios.map(u => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar foto={fotoUrl(u.foto_perfil)} nombres={u.nombres} apellidos={u.apellidos} />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{u.nombres} {u.apellidos}</p>
                        <p className="text-xs text-slate-400">{u.username ?? u.email ?? '-'}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {u.roles.map(r => <RolBadge key={r} rol={r} />)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setModalUsuario({ open: true, usuario: u })} className="flex-1 py-1.5 text-xs rounded-lg border border-cyan-200 text-cyan-600 hover:bg-cyan-50">Editar</button>
                    <button onClick={() => setModalPassword({ open: true, usuario: u })} className="flex-1 py-1.5 text-xs rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50">Contrasena</button>
                    <button onClick={() => setConfirmToggle(u)} className={`flex-1 py-1.5 text-xs rounded-lg border ${u.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalUsuario.open && (
        <ModalUsuario
          usuario={modalUsuario.usuario}
          roles={roles}
          onClose={() => setModalUsuario({ open: false, usuario: null })}
          onSaved={() => { setModalUsuario({ open: false, usuario: null }); showToast('Usuario guardado correctamente'); loadData(); }}
        />
      )}

      {modalPassword.open && modalPassword.usuario && (
        <ModalPassword
          usuarioId={modalPassword.usuario.id}
          nombre={modalPassword.usuario.nombres}
          onClose={() => setModalPassword({ open: false, usuario: null })}
          onSaved={() => { setModalPassword({ open: false, usuario: null }); showToast('Contrasena actualizada'); }}
        />
      )}

      {modalRoles && (
        <ModalRoles
          roles={roles}
          onClose={() => setModalRoles(false)}
          onSaved={() => { loadData(); }}
        />
      )}

      {confirmToggle && (
        <ConfirmDialog
          message={confirmToggle.active
            ? 'Desactivar a ' + confirmToggle.nombres + '? El usuario no podra iniciar sesion.'
            : 'Activar a ' + confirmToggle.nombres + '?'}
          onConfirm={() => handleToggleEstado(confirmToggle)}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
    </div>
  );
}
