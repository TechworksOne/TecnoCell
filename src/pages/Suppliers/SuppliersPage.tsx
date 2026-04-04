import {
  Building2,
  Edit,
  Eye,
  Globe,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Users,
  Mail,
  FileText,
  Package,
  TrendingUp,
  Calendar,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { formatMoney, formatPhone, formatDate } from "../../lib/format";
import { useSuppliersStore } from "../../store/useSuppliers";
import { Supplier, SupplierPurchase } from "../../types/supplier";

export default function SuppliersPage() {
  const {
    suppliers,
    selectedSupplier,
    supplierPurchases,
    isLoading,
    loadSuppliers,
    getSupplierById,
    getSupplierPurchases,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    setSelectedSupplier,
    clearSelectedSupplier,
  } = useSuppliersStore();

  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [currentSupplier, setCurrentSupplier] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
    direccion: "",
    nit: "",
    empresa: "",
    sitio_web: "",
    notas: "",
    activo: true,
  });

  // Cargar proveedores al montar el componente
  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      supplier.nombre.toLowerCase().includes(query) ||
      supplier.telefono?.includes(query) ||
      supplier.nit?.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setCurrentSupplier({
      nombre: "",
      contacto: "",
      telefono: "",
      email: "",
      direccion: "",
      nit: "",
      empresa: "",
      sitio_web: "",
      notas: "",
      activo: true,
    });
    setEditingSupplier(null);
  };

  const validateForm = () => {
    if (!currentSupplier.nombre.trim()) {
      toast.add("El nombre del proveedor es requerido", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, currentSupplier);
        toast.add("Proveedor actualizado exitosamente", "success");
      } else {
        await addSupplier({
          ...currentSupplier,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.add("Proveedor creado exitosamente", "success");
      }

      setIsFormOpen(false);
      resetForm();
      await loadSuppliers();
    } catch (error: any) {
      toast.add(error.message || "Error al guardar el proveedor", "error");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setCurrentSupplier({
      nombre: supplier.nombre,
      contacto: supplier.contacto || "",
      telefono: supplier.telefono,
      email: supplier.email || "",
      direccion: supplier.direccion || "",
      nit: supplier.nit || "",
      empresa: supplier.empresa || "",
      sitio_web: supplier.sitio_web || "",
      notas: supplier.notas || "",
      activo: supplier.activo,
    });
    setIsFormOpen(true);
  };

  const handleView = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await getSupplierPurchases(supplier.id);
    setIsDetailsOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      await deleteSupplier(selectedSupplier.id);
      toast.add("Proveedor eliminado exitosamente", "success");
      setIsDeleteOpen(false);
      setSelectedSupplier(null);
      await loadSuppliers();
    } catch (error: any) {
      toast.add(error.message || "Error al eliminar el proveedor", "error");
    }
  };

  const confirmDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-6">
        <PageHeader 
          title="Proveedores" 
          subtitle="Gestión de proveedores y compras"
        />
      </div>

      {/* Main Card */}
      <Card className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <Building2 size={28} className="text-white" />
                Directorio de Proveedores
              </h3>
              <p className="text-blue-100 mt-2 text-sm">
                {filteredSuppliers.length} {filteredSuppliers.length === 1 ? "proveedor registrado" : "proveedores registrados"}
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="w-full lg:w-auto bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-xl hover:shadow-2xl font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <Plus size={20} className="mr-2" />
              Nuevo Proveedor
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={20} />
            </div>
            <Input
              type="text"
              placeholder="🔍 Buscar por nombre, NIT, teléfono o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border-2 border-transparent focus:border-blue-300 shadow-lg rounded-2xl text-gray-800 placeholder-gray-400 text-base font-medium transition-all duration-200 w-full"
            />
          </div>
        </div>

        {/* Suppliers Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando proveedores...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <EmptyState
              icon={<Building2 size={48} />}
              title={searchQuery ? "No se encontraron proveedores" : "No hay proveedores registrados"}
              description={
                searchQuery
                  ? "Intenta con otros términos de búsqueda"
                  : "Comienza agregando tu primer proveedor"
              }
              action={
                !searchQuery && (
                  <Button
                    onClick={() => {
                      resetForm();
                      setIsFormOpen(true);
                    }}
                  >
                    <Plus size={18} className="mr-2" />
                    Agregar Proveedor
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <Card
                  key={supplier.id}
                  className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border-0 shadow-lg rounded-2xl overflow-hidden group"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                    <div className="flex items-start justify-between">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                        <Building2 size={28} className="text-white" />
                      </div>
                      <Badge color={supplier.activo ? "green" : "red"} className="text-xs">
                        {supplier.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {supplier.nombre}
                      </h3>
                      {supplier.empresa && (
                        <p className="text-sm text-gray-600 font-medium">{supplier.empresa}</p>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {supplier.contacto && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User size={16} className="text-blue-500" />
                          <span>{supplier.contacto}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={16} className="text-green-500" />
                        <span>{formatPhone(supplier.telefono)}</span>
                      </div>
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={16} className="text-purple-500" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.nit && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FileText size={16} className="text-orange-500" />
                          <span>NIT: {supplier.nit}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {supplier.totalCompras || 0}
                        </div>
                        <div className="text-xs text-gray-600">Compras</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-700">
                          {supplier.ultimaCompra ? formatDate(supplier.ultimaCompra) : "N/A"}
                        </div>
                        <div className="text-xs text-gray-600">Última compra</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3">
                      <Button
                        onClick={() => handleView(supplier)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Eye size={16} className="mr-1" />
                        Ver
                      </Button>
                      <Button
                        onClick={() => handleEdit(supplier)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <Edit size={16} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => confirmDelete(supplier)}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          resetForm();
        }}
        title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
        size="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header decorativo */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <Building2 className="text-blue-600" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {editingSupplier ? "Actualizar información del proveedor" : "Registrar nuevo proveedor"}
                </h4>
                <p className="text-sm text-gray-600">Complete los campos requeridos para continuar</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Nombre del Proveedor
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={currentSupplier.nombre}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, nombre: e.target.value })
                }
                placeholder="Ej: Distribuidora TecnoMax"
                className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <User size={16} className="text-green-600" />
                Persona de Contacto
              </label>
              <Input
                type="text"
                value={currentSupplier.contacto}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, contacto: e.target.value })
                }
                placeholder="Ej: Juan Pérez"
                className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-purple-600" />
                Teléfono
              </label>
              <Input
                type="tel"
                value={currentSupplier.telefono}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, telefono: e.target.value })
                }
                placeholder="Ej: 2234-5678"
                className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-orange-600" />
                Email
              </label>
              <Input
                type="email"
                value={currentSupplier.email}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, email: e.target.value })
                }
                placeholder="Ej: ventas@proveedor.com"
                className="border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                NIT
              </label>
              <Input
                type="text"
                value={currentSupplier.nit}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, nit: e.target.value })
                }
                placeholder="Ej: 12345678-9"
                className="border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Building2 size={16} className="text-cyan-600" />
                Empresa
              </label>
              <Input
                type="text"
                value={currentSupplier.empresa}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, empresa: e.target.value })
                }
                placeholder="Ej: TecnoMax S.A."
                className="border-2 border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Globe size={16} className="text-teal-600" />
                Sitio Web
              </label>
              <Input
                type="url"
                value={currentSupplier.sitio_web}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, sitio_web: e.target.value })
                }
                placeholder="Ej: https://www.proveedor.com"
                className="border-2 border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-red-600" />
                Dirección
              </label>
              <textarea
                value={currentSupplier.direccion}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, direccion: e.target.value })
                }
                placeholder="Ej: Zona 10, Ciudad de Guatemala"
                rows={2}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500 resize-none transition-all duration-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-gray-600" />
                Notas
              </label>
              <textarea
                value={currentSupplier.notas}
                onChange={(e) =>
                  setCurrentSupplier({ ...currentSupplier, notas: e.target.value })
                }
                placeholder="Observaciones adicionales, términos de pago, descuentos especiales..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-500 resize-none transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="flex-1 py-3 border-2 border-gray-300 hover:bg-gray-100 font-semibold transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              {editingSupplier ? "✓ Actualizar Proveedor" : "✓ Guardar Proveedor"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          clearSelectedSupplier();
        }}
        title="Detalles del Proveedor"
        size="xl"
      >
        {selectedSupplier && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedSupplier.nombre}</h3>
                  {selectedSupplier.empresa && (
                    <p className="text-gray-600 mt-1">{selectedSupplier.empresa}</p>
                  )}
                </div>
                <Badge color={selectedSupplier.activo ? "green" : "red"}>
                  {selectedSupplier.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {selectedSupplier.contacto && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={18} className="text-blue-500" />
                    <span className="font-medium">Contacto:</span>
                    <span>{selectedSupplier.contacto}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={18} className="text-green-500" />
                  <span className="font-medium">Teléfono:</span>
                  <span>{formatPhone(selectedSupplier.telefono)}</span>
                </div>
                {selectedSupplier.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail size={18} className="text-purple-500" />
                    <span className="font-medium">Email:</span>
                    <span>{selectedSupplier.email}</span>
                  </div>
                )}
                {selectedSupplier.nit && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText size={18} className="text-orange-500" />
                    <span className="font-medium">NIT:</span>
                    <span>{selectedSupplier.nit}</span>
                  </div>
                )}
                {selectedSupplier.direccion && (
                  <div className="flex items-start gap-2 text-gray-700 md:col-span-2">
                    <MapPin size={18} className="text-red-500 mt-0.5" />
                    <div>
                      <span className="font-medium">Dirección:</span>
                      <p className="text-gray-600 mt-1">{selectedSupplier.direccion}</p>
                    </div>
                  </div>
                )}
                {selectedSupplier.sitio_web && (
                  <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                    <Globe size={18} className="text-blue-500" />
                    <span className="font-medium">Sitio Web:</span>
                    <a
                      href={selectedSupplier.sitio_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedSupplier.sitio_web}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <ShoppingCart size={24} className="mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {selectedSupplier.totalCompras || 0}
                </div>
                <div className="text-sm text-gray-600">Total Compras</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <Calendar size={24} className="mx-auto text-green-600 mb-2" />
                <div className="text-sm font-semibold text-green-600">
                  {selectedSupplier.ultimaCompra ? formatDate(selectedSupplier.ultimaCompra) : "N/A"}
                </div>
                <div className="text-sm text-gray-600">Última Compra</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <Package size={24} className="mx-auto text-purple-600 mb-2" />
                <div className="text-sm font-semibold text-purple-600">
                  {selectedSupplier.createdAt ? formatDate(selectedSupplier.createdAt) : "N/A"}
                </div>
                <div className="text-sm text-gray-600">Registrado</div>
              </div>
            </div>

            {/* Notes */}
            {selectedSupplier.notas && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Notas</h4>
                <p className="text-gray-700 text-sm">{selectedSupplier.notas}</p>
              </div>
            )}

            {/* Purchase History */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingCart size={20} />
                Historial de Compras
              </h4>
              {supplierPurchases.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Package size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">No hay compras registradas</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Número
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                            Items
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                            Total
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {supplierPurchases.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-blue-600">
                              {purchase.numero_compra}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(purchase.fecha_compra)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {purchase.total_items || 0}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                              {formatMoney(purchase.total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                color={
                                  purchase.estado === "RECIBIDA"
                                    ? "green"
                                    : purchase.estado === "CONFIRMADA"
                                    ? "blue"
                                    : purchase.estado === "BORRADOR"
                                    ? "yellow"
                                    : "red"
                                }
                              >
                                {purchase.estado}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedSupplier(null);
        }}
        onConfirm={handleDelete}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de eliminar el proveedor "${selectedSupplier?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
}
