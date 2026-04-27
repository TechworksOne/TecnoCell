import { useState, useEffect, useRef } from "react";
import { User, Mail, Phone, MapPin, Shield, Clock, Calendar, Edit2, Save, X, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../../components/ui/Toast";
import { canViewCosts, isAdmin } from "../../lib/permissions";
import API_URL, { UPLOADS_BASE_URL } from "../../services/config";
import axios from "axios";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
  perfil: {
    nombres: string | null;
    apellidos: string | null;
    telefono: string | null;
    dpi: string | null;
    direccion: string | null;
    foto_perfil: string | null;
  } | null;
  roles: string[];
}

const ROLE_COLORS: Record<string, string> = {
  ADMINISTRADOR: "bg-red-100 text-red-700 border border-red-200",
  TECNICO: "bg-blue-100 text-blue-700 border border-blue-200",
  VENTAS: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

function formatDate(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("es-GT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function avatarUrl(perfil: UserProfile["perfil"] | null | undefined, name: string): string {
  if (perfil?.foto_perfil) {
    return perfil.foto_perfil.startsWith("http")
      ? perfil.foto_perfil
      : `${UPLOADS_BASE_URL}${perfil.foto_perfil}`;
  }
  const initials = encodeURIComponent(name?.substring(0, 2)?.toUpperCase() || "TC");
  return `https://ui-avatars.com/api/?name=${initials}&background=3b82f6&color=fff&size=128`;
}

export default function ProfilePage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ telefono: "", direccion: "" });
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const showCost = canViewCosts(user?.roles);
  const userIsAdmin = isAdmin(user?.roles);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setProfile(res.data.data);
        setForm({
          telefono: res.data.data.perfil?.telefono || "",
          direccion: res.data.data.perfil?.direccion || "",
        });
      }
    } catch {
      toast.add("Error al cargar perfil", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewImg(URL.createObjectURL(file));
  }

  async function handleSave() {
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("telefono", form.telefono);
      fd.append("direccion", form.direccion);
      if (selectedFile) fd.append("foto_perfil", selectedFile);

      await axios.put(`${API_URL}/auth/me/perfil`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        }
      });
      toast.add("Perfil actualizado exitosamente", "success");
      await loadProfile();
      setEditing(false);
      setPreviewImg(null);
      setSelectedFile(null);
    } catch {
      toast.add("Error al actualizar perfil", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-100 rounded-2xl" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const displayName = profile.perfil?.nombres
    ? `${profile.perfil.nombres} ${profile.perfil.apellidos || ""}`.trim()
    : profile.name || profile.username;

  const avatar = previewImg || avatarUrl(profile.perfil, displayName);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header Card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-700" />
        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="relative group">
            <img
              src={avatar}
              alt={displayName}
              className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover bg-blue-100"
              onError={(e) => { e.currentTarget.src = avatarUrl(null, displayName); }}
            />
            {editing && (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera size={22} className="text-white" />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="flex-1 min-w-0 pt-3 sm:pt-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{displayName}</h1>
            <p className="text-sm text-slate-500">@{profile.username}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.roles.map(r => (
                <span key={r} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[r] || "bg-slate-100 text-slate-600"}`}>
                  {r}
                </span>
              ))}
              {profile.roles.length === 0 && (
                <span className="text-[11px] text-slate-400">Sin roles asignados</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition-colors"
              >
                <Edit2 size={14} /> Editar
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setEditing(false); setPreviewImg(null); setSelectedFile(null); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors"
                >
                  <X size={14} /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors"
                >
                  <Save size={14} /> {saving ? "Guardando..." : "Guardar"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Info personal ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <User size={15} className="text-blue-500" /> Información personal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={<Mail size={14} />} label="Correo electrónico" value={profile.email} />
          <InfoRow
            icon={<Phone size={14} />}
            label="Teléfono"
            value={
              editing
                ? <input
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="Sin número"
                  />
                : profile.perfil?.telefono || "—"
            }
          />
          <InfoRow
            icon={<MapPin size={14} />}
            label="Dirección"
            value={
              editing
                ? <input
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.direccion}
                    onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                    placeholder="Sin dirección"
                  />
                : profile.perfil?.direccion || "—"
            }
          />
          {profile.perfil?.dpi && (
            <InfoRow icon={<Shield size={14} />} label="DPI" value={profile.perfil.dpi} />
          )}
        </div>
      </div>

      {/* ── Acceso al sistema ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <Shield size={15} className="text-blue-500" /> Acceso al sistema
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={<User size={14} />} label="Usuario" value={profile.username} />
          <InfoRow
            icon={<CheckCircle size={14} />}
            label="Estado"
            value={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {profile.active ? "Activo" : "Inactivo"}
              </span>
            }
          />
          <InfoRow
            icon={<Clock size={14} />}
            label="Último acceso"
            value={formatDate(profile.ultimo_login)}
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Cuenta creada"
            value={formatDate(profile.created_at)}
          />
        </div>
      </div>

      {/* ── Roles y permisos ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <Shield size={15} className="text-blue-500" /> Roles y permisos
        </h2>
        <div className="flex flex-wrap gap-2">
          {profile.roles.length > 0
            ? profile.roles.map(r => (
                <span key={r} className={`text-xs font-semibold px-3 py-1 rounded-full ${ROLE_COLORS[r] || "bg-slate-100 text-slate-600"}`}>
                  {r}
                </span>
              ))
            : <span className="text-sm text-slate-400">Sin roles asignados</span>
          }
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <PermissionRow label="Acceso de administrador" granted={userIsAdmin} />
          <PermissionRow label="Ver datos de costos" granted={showCost} />
          <PermissionRow label="Gestión de compras" granted={userIsAdmin} />
          <PermissionRow label="Gestión de proveedores" granted={userIsAdmin} />
          <PermissionRow label="Stickers de garantía" granted={userIsAdmin} />
          <PermissionRow label="Admin de usuarios" granted={userIsAdmin} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="text-sm text-slate-700 font-medium mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

function PermissionRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${granted ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
        {granted ? "Sí" : "No"}
      </span>
    </div>
  );
}
