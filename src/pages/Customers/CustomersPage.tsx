import {
  Calendar,
  Edit,
  Eye,
  FileText,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User,
  Users,
  Wallet,
  Clock,
  Star,
  TrendingUp,
  Activity,
  Award,
  Heart,
  Target,
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
import { useCustomers } from "../../store/useCustomers";
import { Customer, CustomerPurchase } from "../../types/customer";

export default function CustomersPage() {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerPurchases,
    loadCustomerPurchases,
    getCustomerVisits,
    getCustomerSummary,
    searchCustomers,
    getLoyaltyLevel,
    loadCustomers,
    isLoading
  } = useCustomers();

  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [purchasesLoaded, setPurchasesLoaded] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    nit: "",
    email: "",
    address: "",
    notes: "",
    preferredPaymentMethod: "efectivo" as "efectivo" | "tarjeta" | "transferencia",
  });

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = searchCustomers(searchQuery);

  const resetForm = () => {
    setCurrentCustomer({
      firstName: "",
      lastName: "",
      phone: "",
      nit: "",
      email: "",
      address: "",
      notes: "",
      preferredPaymentMethod: "efectivo",
    });
    setEditingCustomer(null);
  };

  const validateForm = () => {
    if (!currentCustomer.firstName.trim()) {
      toast.add("El nombre es requerido");
      return false;
    }
    if (!currentCustomer.lastName.trim()) {
      toast.add("El apellido es requerido");
      return false;
    }
    if (!currentCustomer.phone.trim()) {
      toast.add("El teléfono es requerido");
      return false;
    }
    if (currentCustomer.phone.length < 8) {
      toast.add("El teléfono debe tener al menos 8 dígitos");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, currentCustomer);
        toast.add("Cliente actualizado exitosamente");
      } else {
        await addCustomer(currentCustomer);
        toast.add("Cliente registrado exitosamente");
      }

      resetForm();
      setIsFormOpen(false);
    } catch (error: any) {
      toast.add(error.message || "Error al guardar el cliente", "error");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCurrentCustomer({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      nit: customer.nit || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      preferredPaymentMethod: customer.preferredPaymentMethod || "efectivo",
    });
    setIsFormOpen(true);
  };

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
    setPurchasesLoaded(false);
    // Cargar compras del cliente
    await loadCustomerPurchases(customer.id);
    setPurchasesLoaded(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCustomer) {
      deleteCustomer(selectedCustomer.id);
      toast.add("Cliente eliminado exitosamente");
      setIsDeleteOpen(false);
      setSelectedCustomer(null);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 8) {
      return cleaned.replace(/(\d{4})(\d{4})/, "$1-$2");
    }
    return phone;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "warning";
      case "won":
        return "success";
      case "lost":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Pendiente";
      case "won":
        return "Ganada";
      case "lost":
        return "Perdida";
      default:
        return status;
    }
  };

  const getLoyaltyColor = (level: string) => {
    switch (level) {
      case "VIP":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
      case "Frecuente":
        return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
      case "Regular":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
    }
  };

  const getLoyaltyIcon = (level: string) => {
    switch (level) {
      case "VIP":
        return <Star size={16} className="fill-current" />;
      case "Frecuente":
        return <Award size={16} />;
      case "Regular":
        return <Heart size={16} />;
      default:
        return <User size={16} />;
    }
  };

  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingBag size={14} className="text-green-600" />;
      case "quote":
        return <FileText size={14} className="text-blue-600" />;
      case "visit":
        return <Eye size={14} className="text-gray-600" />;
      case "inquiry":
        return <Search size={14} className="text-yellow-600" />;
      default:
        return <Activity size={14} className="text-gray-600" />;
    }
  };

  const getVisitTypeText = (type: string) => {
    switch (type) {
      case "purchase":
        return "Compra";
      case "quote":
        return "Cotización";
      case "visit":
        return "Visita";
      case "inquiry":
        return "Consulta";
      default:
        return "Actividad";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 space-y-6 sm:space-y-8">
      <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-6">
        <PageHeader title="Gestión de Clientes" subtitle="Administre su cartera de clientes" />
      </div>

      {/* Barra de acciones */}
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                placeholder="Buscar clientes por nombre, teléfono, NIT o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 border-blue-200 focus:border-blue-500 rounded-xl shadow-sm"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0 shadow-lg font-semibold transition-all duration-200 hover:scale-105"
          >
            <Plus size={16} className="mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </Card>

      {/* Lista de clientes */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-16 h-16 text-gray-300" />}
          title={searchQuery ? "No se encontraron clientes" : "No hay clientes registrados"}
          description={
            searchQuery
              ? "Intente con otros términos de búsqueda"
              : "Comience registrando su primer cliente"
          }
          action={
            !searchQuery ? (
              <Button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <Plus size={16} className="mr-2" />
                Registrar Cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            const summary = getCustomerSummary(customer.id);
            const daysSinceLastVisit = customer.lastVisit 
              ? Math.floor((new Date().getTime() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
              : null;
            
            return (
              <Card
                key={customer.id}
                className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        <div className="flex items-center space-x-1 text-blue-100">
                          <Phone size={14} />
                          <span className="text-sm">{formatPhoneNumber(customer.phone)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {summary.activeQuotes > 0 && (
                        <Badge variant="warning" className="bg-yellow-500 text-white text-xs">
                          {summary.activeQuotes} activa{summary.activeQuotes > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Nivel de lealtad */}
                  <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${getLoyaltyColor(summary.loyaltyLevel)}`}>
                    {getLoyaltyIcon(summary.loyaltyLevel)}
                    <span>{summary.loyaltyLevel}</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Información del cliente */}
                  <div className="space-y-2">
                    {customer.nit && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <FileText size={14} className="mr-2" />
                        <span>NIT: {customer.nit}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <span className="mr-2">✉</span>
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <MapPin size={14} className="mr-2" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Estadísticas avanzadas */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{summary.totalVisits}</div>
                      <div className="text-xs text-gray-500">Visitas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{summary.totalQuotes}</div>
                      <div className="text-xs text-gray-500">Cotizaciones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {formatMoney(summary.averageOrderValue)}
                      </div>
                      <div className="text-xs text-gray-500">Promedio</div>
                    </div>
                  </div>

                  {/* Total gastado */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Wallet size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-green-800">Total gastado</span>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatMoney(summary.totalSpent)}
                      </div>
                    </div>
                  </div>

                  {/* Información de actividad reciente */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <div className="flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>Cliente desde {formatDate(customer.customerSince)}</span>
                    </div>
                    {daysSinceLastVisit !== null && (
                      <div className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>
                          {daysSinceLastVisit === 0 
                            ? "Hoy" 
                            : daysSinceLastVisit === 1 
                            ? "Ayer" 
                            : `${daysSinceLastVisit}d`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Productos favoritos */}
                  {summary.favoriteProducts.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">Productos favoritos:</div>
                      <div className="flex flex-wrap gap-1">
                        {summary.favoriteProducts.slice(0, 2).map((product, index) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            {product.length > 15 ? `${product.substring(0, 15)}...` : product}
                          </span>
                        ))}
                        {summary.favoriteProducts.length > 2 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            +{summary.favoriteProducts.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex space-x-2 pt-3">
                    <Button
                      variant="ghost"
                      onClick={() => handleViewDetails(customer)}
                      className="flex-1 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye size={14} className="mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleEdit(customer)}
                      className="flex-1 text-amber-600 hover:bg-amber-50"
                    >
                      <Edit size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(customer)}
                      className="flex-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Formulario Cliente */}
      <Modal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          resetForm();
        }}
        title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre *
              </label>
              <Input
                value={currentCustomer.firstName}
                onChange={(e) =>
                  setCurrentCustomer({ ...currentCustomer, firstName: e.target.value })
                }
                placeholder="Nombre del cliente"
                required
                className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Apellido *
              </label>
              <Input
                value={currentCustomer.lastName}
                onChange={(e) =>
                  setCurrentCustomer({ ...currentCustomer, lastName: e.target.value })
                }
                placeholder="Apellido del cliente"
                required
                className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Teléfono *
              </label>
              <Input
                value={currentCustomer.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setCurrentCustomer({ ...currentCustomer, phone: formatted });
                }}
                placeholder="5551-2345"
                required
                className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">NIT</label>
              <Input
                value={currentCustomer.nit}
                onChange={(e) =>
                  setCurrentCustomer({ ...currentCustomer, nit: e.target.value })
                }
                placeholder="12345678-9"
                className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={currentCustomer.email}
              onChange={(e) =>
                setCurrentCustomer({ ...currentCustomer, email: e.target.value })
              }
              placeholder="cliente@email.com"
              className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
            <Input
              value={currentCustomer.address}
              onChange={(e) =>
                setCurrentCustomer({ ...currentCustomer, address: e.target.value })
              }
              placeholder="Dirección del cliente"
              className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Método de pago preferido
            </label>
            <select
              value={currentCustomer.preferredPaymentMethod}
              onChange={(e) =>
                setCurrentCustomer({ 
                  ...currentCustomer, 
                  preferredPaymentMethod: e.target.value as "efectivo" | "tarjeta" | "transferencia"
                })
              }
              className="w-full px-3 py-2 border-2 border-gray-200 focus:border-blue-500 rounded-xl shadow-sm"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
            <textarea
              value={currentCustomer.notes}
              onChange={(e) =>
                setCurrentCustomer({ ...currentCustomer, notes: e.target.value })
              }
              placeholder="Información adicional sobre el cliente..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-gray-200 focus:border-blue-500 rounded-xl shadow-sm resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              {editingCustomer ? "Actualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalles Cliente */}
      <Modal
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Perfil Completo del Cliente"
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Header del cliente con estadísticas principales */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h3>
                    <div className="text-sm text-gray-600 flex items-center space-x-3">
                      <span>Cliente desde {formatDate(selectedCustomer.customerSince)}</span>
                      <span>•</span>
                      <span>{selectedCustomer.totalVisits} visitas</span>
                      {selectedCustomer.lastVisit && (
                        <>
                          <span>•</span>
                          <span>Última visita: {formatDate(selectedCustomer.lastVisit)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {(() => {
                  const summary = getCustomerSummary(selectedCustomer.id);
                  return (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${getLoyaltyColor(summary.loyaltyLevel)}`}>
                      {getLoyaltyIcon(summary.loyaltyLevel)}
                      <span className="font-semibold">{summary.loyaltyLevel}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Información de contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <Phone size={18} className="mr-3 text-blue-600" />
                    <span className="font-medium">{formatPhoneNumber(selectedCustomer.phone)}</span>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-3 text-blue-600">✉</span>
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {selectedCustomer.nit && (
                    <div className="flex items-center text-gray-700">
                      <FileText size={18} className="mr-3 text-blue-600" />
                      <span>NIT: {selectedCustomer.nit}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center text-gray-700">
                      <MapPin size={18} className="mr-3 text-blue-600" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Método de pago preferido */}
              {selectedCustomer.preferredPaymentMethod && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Wallet size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Método de pago preferido: 
                    </span>
                    <Badge 
                      variant={selectedCustomer.preferredPaymentMethod === 'efectivo' ? 'success' : 'default'}
                      className="capitalize"
                    >
                      {selectedCustomer.preferredPaymentMethod}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Notas del cliente */}
              {selectedCustomer.notes && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-start space-x-2">
                    <FileText size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notas:</span>
                      <p className="text-sm text-gray-600 mt-1">{selectedCustomer.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estadísticas detalladas */}
            {!purchasesLoaded ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (() => {
              const summary = getCustomerSummary(selectedCustomer.id);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{summary.totalVisits}</div>
                    <div className="text-sm text-gray-600">Total Visitas</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{summary.totalQuotes}</div>
                    <div className="text-sm text-gray-600">Cotizaciones</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl text-center border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">{summary.activeQuotes}</div>
                    <div className="text-sm text-gray-600">Activas</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{selectedCustomer.loyaltyPoints}</div>
                    <div className="text-sm text-gray-600">Puntos</div>
                  </div>
                </div>
              );
            })()}

            {/* Información financiera */}
            {purchasesLoaded && (() => {
              const summary = getCustomerSummary(selectedCustomer.id);
              return (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <Wallet size={20} className="mr-3" />
                    Resumen Financiero
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatMoney(summary.totalSpent)}
                      </div>
                      <div className="text-sm text-gray-600">Total Gastado</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatMoney(summary.averageOrderValue)}
                      </div>
                      <div className="text-sm text-gray-600">Promedio por Orden</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{summary.monthlyPurchases}</div>
                      <div className="text-sm text-gray-600">Compras del Mes</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Productos favoritos */}
            {(() => {
              const summary = getCustomerSummary(selectedCustomer.id);
              return summary.favoriteProducts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                  <h4 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                    <Star size={20} className="mr-3" />
                    Productos Favoritos
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.favoriteProducts.map((product, index) => (
                      <div
                        key={index}
                        className="bg-white px-4 py-2 rounded-lg border border-amber-200 flex items-center space-x-2"
                      >
                        <Target size={16} className="text-amber-600" />
                        <span className="font-medium text-amber-800">{product}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Historial de visitas recientes */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Activity size={20} className="mr-3" />
                Actividad Reciente
              </h4>
              {(() => {
                const visits = getCustomerVisits(selectedCustomer.id);
                return visits.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No hay actividad registrada</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {visits.slice(0, 10).map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          {getVisitTypeIcon(visit.type)}
                          <div>
                            <div className="font-medium text-gray-800">{visit.description}</div>
                            <div className="text-sm text-gray-600 flex items-center space-x-2">
                              <span>{formatDate(visit.date)}</span>
                              <span>•</span>
                              <span>{visit.time}</span>
                              <span>•</span>
                              <span className="capitalize">{getVisitTypeText(visit.type)}</span>
                            </div>
                            {visit.products && visit.products.length > 0 && (
                              <div className="text-xs text-blue-600 mt-1">
                                Productos: {visit.products.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        {visit.amount && (
                          <div className="text-right">
                            <div className="font-medium text-gray-800">{formatMoney(visit.amount)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Historial de compras detallado */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <ShoppingBag size={20} className="mr-3" />
                Historial de Compras
              </h4>
              {(() => {
                const purchases = getCustomerPurchases(selectedCustomer.id);
                return purchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingBag size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No hay compras registradas</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{purchase.reference}</div>
                              <div className="text-sm text-gray-600">
                                {formatDate(purchase.date)} • {purchase.items} item{purchase.items > 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-800">{formatMoney(purchase.total)}</div>
                            <Badge
                              variant={getStatusColor(purchase.status || "default")}
                              className="text-xs"
                            >
                              {getStatusText(purchase.status || "default")}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Productos de la compra */}
                        {purchase.products && purchase.products.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm font-medium text-gray-700 mb-2">Productos:</div>
                            <div className="space-y-1">
                              {purchase.products.map((product, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    {product.quantity}x {product.name}
                                  </span>
                                  <span className="font-medium">{formatMoney(product.price * product.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        description={
          selectedCustomer
            ? `¿Está seguro de que desea eliminar a ${selectedCustomer.firstName} ${selectedCustomer.lastName}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}