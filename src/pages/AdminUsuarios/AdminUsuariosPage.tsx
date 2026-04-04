import { useState } from 'react';
import { Shield, UserPlus, Search, Edit, Trash2, Key } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function AdminUsuariosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - reemplazar con datos reales del backend
  const usuarios = [
    {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@tecnocell.com',
      rol: 'Admin',
      activo: true,
      ultimoAcceso: '2026-01-24 10:30',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
      <div className="mb-8">
        <PageHeader
          title="Administración de Usuarios"
          subtitle="Gestiona usuarios y permisos del sistema"
        />

        {/* Info Card */}
        <Card className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Shield size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-1">Control de Acceso y Permisos</h3>
              <p className="text-sm text-slate-600">
                Administra los usuarios del sistema, asigna roles y permisos específicos.
                Controla quién tiene acceso a cada módulo del sistema.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Usuarios</p>
              <p className="text-3xl font-bold mt-1">{usuarios.length}</p>
            </div>
            <Shield size={40} className="text-blue-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Usuarios Activos</p>
              <p className="text-3xl font-bold mt-1">
                {usuarios.filter(u => u.activo).length}
              </p>
            </div>
            <Shield size={40} className="text-green-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Administradores</p>
              <p className="text-3xl font-bold mt-1">
                {usuarios.filter(u => u.rol === 'Admin').length}
              </p>
            </div>
            <Key size={40} className="text-purple-200" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Técnicos</p>
              <p className="text-3xl font-bold mt-1">
                {usuarios.filter(u => u.rol === 'Tecnico').length}
              </p>
            </div>
            <Shield size={40} className="text-orange-200" />
          </div>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e: any) => setSearchTerm(e.target.value)}
          icon={<Search size={18} />}
          className="w-96"
        />
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus size={20} className="mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Tabla de Usuarios */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left p-4 font-semibold text-slate-700">ID</th>
                <th className="text-left p-4 font-semibold text-slate-700">Nombre</th>
                <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                <th className="text-left p-4 font-semibold text-slate-700">Rol</th>
                <th className="text-left p-4 font-semibold text-slate-700">Estado</th>
                <th className="text-left p-4 font-semibold text-slate-700">Último Acceso</th>
                <th className="text-center p-4 font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 font-mono text-sm">{usuario.id}</td>
                  <td className="p-4 font-semibold">{usuario.nombre}</td>
                  <td className="p-4 text-slate-600">{usuario.email}</td>
                  <td className="p-4">
                    <Badge color={usuario.rol === 'Admin' ? 'purple' : 'blue'}>
                      {usuario.rol}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge color={usuario.activo ? 'green' : 'red'}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{usuario.ultimoAcceso}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
