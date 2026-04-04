import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Printer, FileText, ShoppingBag, DollarSign, Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import QuotePicker from '../../components/sales/QuotePicker';
import { useSales } from '../../store/useSales';
import { useQuotesStore } from '../../store/useQuotesStore';
import { formatMoney, formatDate } from '../../lib/format';

type QuoteFilter = 'ACTIVAS' | 'CONVERTIDAS' | 'VENCIDAS' | 'TODAS';

export default function SalesPage() {
  const navigate = useNavigate();
  const { sales, loadSales, getTodaySales, getTotalRevenue } = useSales();
  const { quotes, loadQuotes } = useQuotesStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('ACTIVAS');
  const [showQuotesSection, setShowQuotesSection] = useState(false);

  // Cargar ventas y cotizaciones al montar
  useEffect(() => {
    loadSales();
    loadQuotes();
  }, [loadSales, loadQuotes]);

  // Recargar ventas cuando se vuelve a la página
  useEffect(() => {
    const handleFocus = () => {
      loadSales();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadSales]);

  // Filtrar ventas
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = searchTerm === '' || 
        sale.cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.cliente.phone.includes(searchTerm);
      
      return matchesSearch;
    });
  }, [sales, searchTerm]);

  // Estadísticas
  const stats = useMemo(() => {
    const today = getTodaySales();
    const totalVentas = sales.filter(s => s.estado === 'PAGADA').length;
    const ventasHoy = today.length;
    const ingresos = getTotalRevenue();
    const promedio = totalVentas > 0 ? ingresos / totalVentas : 0;
    
    return { totalVentas, ventasHoy, ingresos, promedio };
  }, [sales, getTodaySales, getTotalRevenue]);

  const handleNewSale = (quote: any) => {
    navigate(`/ventas/nueva?from=${quote.id}`);
  };

  const handleViewSale = (id: string) => {
    navigate(`/ventas/${id}`);
  };

  const getPaymentMethodDisplay = (sale: typeof sales[0]) => {
    if (!sale.payments || sale.payments.length === 0) {
      return { text: 'Sin especificar', icon: '💰' };
    }
    
    if (sale.payments.length === 1) {
      const metodo = sale.payments[0].metodo;
      switch (metodo) {
        case 'EFECTIVO':
          return { text: 'Efectivo', icon: '💵' };
        case 'TARJETA':
          return { text: 'Tarjeta', icon: '💳' };
        case 'TRANSFERENCIA':
          return { text: 'Transferencia', icon: '🏬' };
        default:
          return { text: metodo, icon: '💰' };
      }
    } else {
      return { text: 'Mixto', icon: '🔄' };
    }
  };

  // Filtrar cotizaciones por estado
  const filteredQuotes = useMemo(() => {
    const now = new Date();
    
    return quotes.filter(quote => {
      if (quoteFilter === 'TODAS') return true;
      
      if (quoteFilter === 'ACTIVAS') {
        // Cotizaciones abiertas y no vencidas
        if (quote.estado !== 'ABIERTA') return false;
        
        const createdDate = new Date(quote.createdAt);
        const expiryDate = new Date(createdDate);
        expiryDate.setDate(expiryDate.getDate() + quote.vigenciaDias);
        return expiryDate > now;
      }
      
      if (quoteFilter === 'CONVERTIDAS') {
        // Cotizaciones convertidas
        return quote.estado === 'CERRADA';
      }
      
      if (quoteFilter === 'VENCIDAS') {
        // Cotizaciones abiertas pero vencidas
        if (quote.estado !== 'ABIERTA') return false;
        
        const createdDate = new Date(quote.createdAt);
        const expiryDate = new Date(createdDate);
        expiryDate.setDate(expiryDate.getDate() + quote.vigenciaDias);
        return expiryDate <= now;
      }
      
      return false;
    });
  }, [quotes, quoteFilter]);

  const getQuoteStatusColor = (quote: any) => {
    const now = new Date();
    const createdDate = new Date(quote.createdAt);
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(expiryDate.getDate() + quote.vigenciaDias);
    
    if (quote.estado === 'CERRADA') return 'green';
    if (expiryDate <= now) return 'red';
    if (quote.estado === 'ABIERTA') return 'blue';
    return 'gray';
  };

  const getQuoteStatusText = (quote: any) => {
    const now = new Date();
    const createdDate = new Date(quote.createdAt);
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(expiryDate.getDate() + quote.vigenciaDias);
    
    if (quote.estado === 'CERRADA') return 'Convertida';
    if (expiryDate <= now) return 'Vencida';
    if (quote.estado === 'ABIERTA') return 'Activa';
    return quote.estado;
  };

  // Calcular días restantes hasta el vencimiento
  const getDiasRestantes = (quote: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar a medianoche
    
    const createdDate = new Date(quote.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(expiryDate.getDate() + quote.vigenciaDias);
    
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Gestión de Ventas"
              subtitle="Control y seguimiento de todas las ventas"
            />
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/ventas/nueva')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                <Plus size={20} />
                Nueva Venta
              </Button>
              <Button 
                onClick={() => setShowQuotePicker(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              >
                <FileText size={20} />
                Desde Cotización
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-lg">
                <ShoppingBag className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Total Ventas</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalVentas}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Ventas Hoy</p>
                <p className="text-2xl font-bold text-blue-900">{stats.ventasHoy}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">Ingresos Totales</p>
                <p className="text-2xl font-bold text-emerald-900">{formatMoney(stats.ingresos)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Promedio</p>
                <p className="text-2xl font-bold text-purple-900">{formatMoney(stats.promedio)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Buscar por cliente, número o teléfono..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Lista de ventas */}
        {filteredSales.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={64} className="text-gray-400" />}
            title={searchTerm ? 'No se encontraron ventas' : 'No hay ventas registradas'}
            description={searchTerm 
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'Convierte una cotización para crear tu primera venta'}
            action={
              <Button onClick={() => setShowQuotePicker(true)}>
                <FileText size={20} />
                Convertir desde Cotización
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredSales.map((sale) => (
              <Card 
                key={sale.id} 
                className="p-6 hover:shadow-xl transition-all duration-300"
              >
                <div onClick={() => handleViewSale(sale.id)} className="cursor-pointer">
                <div className="flex items-start justify-between">
                  {/* Información principal */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{sale.numero}</h3>
                      <Badge color={sale.estado === 'PAGADA' ? 'green' : sale.estado === 'PENDIENTE' ? 'orange' : 'red'}>
                        {sale.estado}
                      </Badge>
                      <Badge color="blue">
                        {getPaymentMethodDisplay(sale).icon} {getPaymentMethodDisplay(sale).text}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <ShoppingBag size={16} className="text-gray-400" />
                        <span className="font-medium">{sale.cliente.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{formatDate(sale.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText size={16} className="text-gray-400" />
                        <span>{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total y acciones */}
                  <div className="text-right ml-6">
                    <p className="text-3xl font-bold text-green-600 mb-3">
                      {formatMoney(sale.total)}
                    </p>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSale(sale.id)}
                      >
                        <Eye size={16} />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigate(`/ventas/${sale.id}`);
                          setTimeout(() => window.print(), 500);
                        }}
                      >
                        <Printer size={16} />
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Sección de Cotizaciones */}
        <Card className="p-6 bg-white border-2 border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" size={28} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Cotizaciones</h2>
                <p className="text-sm text-gray-600">Gestiona y convierte cotizaciones a ventas</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowQuotesSection(!showQuotesSection)}
              variant="ghost"
            >
              {showQuotesSection ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>

          {showQuotesSection && (
            <>
              {/* Filtros de cotizaciones */}
              <div className="flex gap-3 mb-6 flex-wrap">
                <Button
                  onClick={() => setQuoteFilter('ACTIVAS')}
                  className={quoteFilter === 'ACTIVAS' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                >
                  <Clock size={18} />
                  Activas
                </Button>
                <Button
                  onClick={() => setQuoteFilter('CONVERTIDAS')}
                  className={quoteFilter === 'CONVERTIDAS' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                >
                  <CheckCircle size={18} />
                  Convertidas
                </Button>
                <Button
                  onClick={() => setQuoteFilter('VENCIDAS')}
                  className={quoteFilter === 'VENCIDAS' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                >
                  <XCircle size={18} />
                  Vencidas
                </Button>
                <Button
                  onClick={() => setQuoteFilter('TODAS')}
                  className={quoteFilter === 'TODAS' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                >
                  Todas
                </Button>
              </div>

              {/* Lista de cotizaciones filtradas */}
              {filteredQuotes.length === 0 ? (
                <EmptyState
                  icon={<FileText size={64} className="text-gray-400" />}
                  title="No hay cotizaciones"
                  description={`No se encontraron cotizaciones ${quoteFilter.toLowerCase()}`}
                />
              ) : (
                <div className="space-y-4">
                  {filteredQuotes.map((quote) => {
                    const borderColor = getQuoteStatusColor(quote) === 'green' ? 'border-green-500' : 
                                       getQuoteStatusColor(quote) === 'red' ? 'border-red-500' : 'border-blue-500';
                    
                    return (
                    <Card 
                      key={quote.id} 
                      className={`p-6 hover:shadow-xl transition-all duration-300 border-l-4 ${borderColor}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-gray-900">{quote.numero}</h3>
                            <Badge color={getQuoteStatusColor(quote)}>
                              {getQuoteStatusText(quote)}
                            </Badge>
                            <Badge color={quote.tipo === 'VENTA' ? 'blue' : 'purple'}>
                              {quote.tipo}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <ShoppingBag size={16} className="text-gray-400" />
                              <span className="font-medium">{quote.cliente.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-gray-400" />
                              <span>{formatDate(quote.createdAt)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock size={16} className="text-gray-400" />
                              <span>
                                {getDiasRestantes(quote) > 0 
                                  ? `Quedan ${getDiasRestantes(quote)} días` 
                                  : getDiasRestantes(quote) === 0 
                                    ? 'Vence hoy'
                                    : `Vencida hace ${Math.abs(getDiasRestantes(quote))} días`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <p className="text-3xl font-bold text-blue-600 mb-3">
                            {formatMoney(quote.total)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/cotizaciones/${quote.id}`)}
                            >
                              <Eye size={16} />
                              Ver
                            </Button>
                            {getQuoteStatusText(quote) === 'Activa' ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => navigate(`/ventas/nueva?from=${quote.id}`)}
                              >
                                <ShoppingBag size={16} />
                                Convertir
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Quote Picker Modal */}
      <QuotePicker
        open={showQuotePicker}
        onClose={() => setShowQuotePicker(false)}
        onSelect={handleNewSale}
        allowedType="VENTA"
      />
    </div>
  );
}
