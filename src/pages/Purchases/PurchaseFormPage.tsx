import { ShoppingCart, Plus, Search, Package, User, Hash, ArrowLeft, Save, Building2, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";
import { formatMoney } from "../../lib/format";
import { useCatalog } from "../../store/useCatalog";
import { useSuppliersStore } from "../../store/useSuppliers";
import { useRepuestosStore } from "../../store/useRepuestosStore";
import * as purchaseService from "../../services/purchaseService";
import Badge from "../../components/ui/Badge";

interface CompraItem {
  producto_id: number;
  sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  aplica_serie: boolean;
  series: string[];
  tipo_item: 'producto' | 'repuesto'; // Nuevo campo para identificar el tipo
}

export default function PurchaseFormPage() {
  const { products, loadProducts } = useCatalog();
  const { suppliers, loadSuppliers } = useSuppliersStore();
  const { repuestos, loadRepuestos } = useRepuestosStore();
  const toast = useToast();
  const navigate = useNavigate();

  const [searchProduct, setSearchProduct] = useState("");

  // Form de compra
  const [compraForm, setCompraForm] = useState({
    fecha_compra: new Date().toISOString().split('T')[0],
    proveedor_id: null as number | null,
    proveedor_nombre: "",
    proveedor_telefono: "",
    proveedor_nit: "",
    proveedor_direccion: "",
    notas: "",
    estado: "CONFIRMADA" as const
  });
  
  const [showProveedoresDropdown, setShowProveedoresDropdown] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const [items, setItems] = useState<CompraItem[]>([]);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
    loadRepuestos();
  }, []);

  function handleAddProduct(product: any, tipo: 'producto' | 'repuesto') {
    // Permitir agregar el mismo producto múltiples veces (sin validación de duplicados)
    const newItem: CompraItem = {
      producto_id: parseInt(product.id),
      sku: product.sku || product.codigo,
      nombre_producto: product.name || product.nombre,
      cantidad: 1,
      precio_unitario: tipo === 'producto' ? (product.precioProducto || 0) : (product.precio_venta || 0),
      aplica_serie: tipo === 'producto' ? (product.aplica_serie || false) : false,
      series: [],
      tipo_item: tipo
    };

    setItems([...items, newItem]);
    setSearchProduct("");
  }
  
  function handleSelectProveedor(proveedor: any) {
    setCompraForm({
      ...compraForm,
      proveedor_id: parseInt(proveedor.id),
      proveedor_nombre: proveedor.nombre,
      proveedor_telefono: proveedor.telefono || "",
      proveedor_nit: proveedor.nit || "",
      proveedor_direccion: proveedor.direccion || ""
    });
    setShowProveedoresDropdown(false);
  }

  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function handleUpdateItem(index: number, field: keyof CompraItem, value: any) {
    setItems(prevItems => {
      return prevItems.map((item, idx) => {
        if (idx === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Si cambia la cantidad y aplica serie, ajustar array de series
          if (field === 'cantidad' && item.aplica_serie) {
            const currentSeriesCount = item.series.length;
            const newQuantity = parseInt(value);
            
            if (newQuantity > currentSeriesCount) {
              // Agregar espacios vacíos
              updatedItem.series = [
                ...item.series,
                ...Array(newQuantity - currentSeriesCount).fill('')
              ];
            } else {
              // Recortar array
              updatedItem.series = item.series.slice(0, newQuantity);
            }
          }
          
          return updatedItem;
        }
        return item;
      });
    });
  }

  function handleUpdateSerie(itemIndex: number, serieIndex: number, value: string) {
    setItems(prevItems => {
      return prevItems.map((item, idx) => {
        if (idx === itemIndex) {
          // Usar la misma serie para todas las unidades
          const newSeries = Array(item.cantidad).fill(value);
          return {
            ...item,
            series: newSeries
          };
        }
        return item;
      });
    });
  }

  function calculateTotal() {
    return items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  }

  async function handleSaveCompra() {
    try {
      // Validaciones
      if (!compraForm.proveedor_nombre) {
        toast.add("El nombre del proveedor es requerido", "error");
        return;
      }

      if (items.length === 0) {
        toast.add("Debes agregar al menos un producto o repuesto", "error");
        return;
      }

      // Validar series
      for (const item of items) {
        if (item.aplica_serie) {
          if (!item.series[0] || item.series[0].trim() === '') {
            toast.add(`Ingresa el número de serie para "${item.nombre_producto}"`, "error");
            return;
          }
        }
      }

      // Separar items por tipo
      const productosItems = items.filter(item => item.tipo_item === 'producto');
      const repuestosItems = items.filter(item => item.tipo_item === 'repuesto');

      let comprasCreadas = 0;

      // Crear compra de productos si hay items
      if (productosItems.length > 0) {
        const compraProductosData = {
          ...compraForm,
          items: productosItems.map(item => ({
            ...item,
            series: item.aplica_serie ? item.series : []
          }))
        };
        await purchaseService.createCompraProductos(compraProductosData);
        comprasCreadas++;
      }

      // Crear compra de repuestos si hay items
      if (repuestosItems.length > 0) {
        const compraRepuestosData = {
          ...compraForm,
          items: repuestosItems.map(item => ({
            ...item,
            series: [] // Los repuestos no manejan series
          }))
        };
        await purchaseService.createCompraRepuestos(compraRepuestosData);
        comprasCreadas++;
      }
      
      const totalUnidades = items.reduce((sum, item) => sum + item.cantidad, 0);
      toast.add(`✅ ${comprasCreadas} compra(s) registrada(s). Stock actualizado: +${totalUnidades} unidades`);
      
      navigate('/compras');
    } catch (error: any) {
      console.error('Error al crear compra:', error);
      toast.add(error.response?.data?.message || "Error al registrar la compra", "error");
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );
  
  const filteredRepuestos = repuestos.filter(r =>
    r.nombre.toLowerCase().includes(searchProduct.toLowerCase()) ||
    (r.codigo && r.codigo.toLowerCase().includes(searchProduct.toLowerCase()))
  );
  
  const hasResults = filteredProducts.length > 0 || filteredRepuestos.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ml-64 p-8">
      {/* Header con botón volver */}
      <div className="mb-6 flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/compras')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver
        </Button>
        <div className="flex-1">
          <PageHeader
            title="Nueva Compra de Inventario"
            subtitle="Registra la entrada de productos para actualizar el stock"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Botón para mostrar/ocultar inventario actual */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="text-indigo-600" size={24} />
              <div>
                <h3 className="font-semibold text-indigo-900">Inventario Actual</h3>
                <p className="text-sm text-indigo-700">
                  {products.length} productos • {repuestos.length} repuestos
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowInventory(!showInventory)}
              className="flex items-center gap-2"
            >
              {showInventory ? <EyeOff size={18} /> : <Eye size={18} />}
              {showInventory ? 'Ocultar' : 'Ver'} Inventario
            </Button>
          </div>
        </Card>

        {/* Tabla de inventario actual */}
        {showInventory && (
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4 text-lg">
              Inventario Actual - Stock Disponible
            </h3>
            
            {/* Tabs para productos y repuestos */}
            <div className="flex gap-2 mb-4 border-b border-gray-200">
              <button
                onClick={() => {}}
                className="px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600"
              >
                Productos ({products.length})
              </button>
              <button
                onClick={() => {}}
                className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900"
              >
                Repuestos ({repuestos.length})
              </button>
            </div>

            {/* Tabla de Productos */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Precio Costo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Precio Venta</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.slice(0, 10).map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{product.sku}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.aplica_serie && (
                          <Badge variant="info" className="mt-1">Serie</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${product.stock === 0 ? 'text-red-600' : product.stock < 5 ? 'text-orange-600' : 'text-green-600'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{formatMoney(product.precioCosto || 0)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatMoney(product.precioProducto || 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddProduct(product, 'producto')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Plus size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length > 10 && (
                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50 border-t">
                  Mostrando 10 de {products.length} productos. Usa el buscador para encontrar más.
                </div>
              )}
            </div>

            {/* Tabla de Repuestos */}
            <div className="mt-6">
              <h4 className="font-semibold text-purple-700 mb-3">Repuestos</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase">Repuesto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase">Marca</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600 uppercase">Stock</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600 uppercase">Precio Costo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600 uppercase">Precio Público</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {repuestos.slice(0, 10).map((repuesto) => (
                      <tr key={repuesto.id} className="hover:bg-purple-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{repuesto.sku || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{repuesto.nombre}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{repuesto.tipo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{repuesto.marca}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${repuesto.stock === 0 ? 'text-red-600' : repuesto.stock < 5 ? 'text-orange-600' : 'text-green-600'}`}>
                            {repuesto.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">{formatMoney(repuesto.precioCosto || 0)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatMoney(repuesto.precio || 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddProduct(repuesto, 'repuesto')}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Plus size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {repuestos.length > 10 && (
                  <div className="p-3 text-center text-sm text-gray-500 bg-purple-50 border-t">
                    Mostrando 10 de {repuestos.length} repuestos. Usa el buscador para encontrar más.
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Alerta informativa */}
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Package className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">¿Cómo funciona?</h3>
              <p className="text-sm text-blue-800">
                Al guardar esta compra, el <strong>stock de los productos se actualizará automáticamente</strong>.
                Los productos que requieren números de serie (celulares, tablets) serán rastreables individualmente.
              </p>
            </div>
          </div>
        </Card>

        {/* Datos del Proveedor */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-lg">
            <Building2 size={20} className="text-blue-600" />
            Datos del Proveedor
          </h3>
          
          {/* Selector de Proveedor Existente */}
          <div className="mb-4 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccionar Proveedor Registrado
            </label>
            <button
              type="button"
              onClick={() => setShowProveedoresDropdown(!showProveedoresDropdown)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <span className={compraForm.proveedor_id ? "text-gray-900 font-medium" : "text-gray-400"}>
                {compraForm.proveedor_nombre || "Buscar proveedor existente..."}
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
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre del Proveedor *"
              value={compraForm.proveedor_nombre}
              onChange={(e) => setCompraForm({ ...compraForm, proveedor_nombre: e.target.value })}
              placeholder="Ej: Distribuidora XYZ"
            />
            <Input
              label="Teléfono"
              value={compraForm.proveedor_telefono}
              onChange={(e) => setCompraForm({ ...compraForm, proveedor_telefono: e.target.value })}
              placeholder="2222-3333"
            />
            <Input
              label="NIT"
              value={compraForm.proveedor_nit}
              onChange={(e) => setCompraForm({ ...compraForm, proveedor_nit: e.target.value })}
              placeholder="12345678-9"
            />
            <Input
              label="Fecha de Compra"
              type="date"
              value={compraForm.fecha_compra}
              onChange={(e) => setCompraForm({ ...compraForm, fecha_compra: e.target.value })}
            />
          </div>
        </Card>

        {/* Buscar Productos y Repuestos */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-lg">
            <Package size={20} />
            Agregar Productos o Repuestos a la Compra
          </h3>
          <div className="relative">
            <Input
              placeholder="Buscar producto o repuesto por nombre, SKU o código..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              icon={<Search size={18} />}
            />
            
            {searchProduct && hasResults && (
              <div className="absolute z-10 w-full mt-2 max-h-96 overflow-y-auto border-2 border-emerald-200 rounded-lg bg-white shadow-2xl">
                {/* Productos */}
                {filteredProducts.length > 0 && (
                  <div>
                    <div className="bg-blue-100 px-4 py-2 font-semibold text-blue-900 text-sm sticky top-0">
                      📦 PRODUCTOS ({filteredProducts.length})
                    </div>
                    {filteredProducts.slice(0, 8).map((product) => (
                      <div
                        key={`prod-${product.id}`}
                        onClick={() => handleAddProduct(product, 'producto')}
                        className="p-4 hover:bg-emerald-50 cursor-pointer border-b transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{product.name}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                              <p className="text-sm text-slate-500">Stock: <strong>{product.stock || 0}</strong></p>
                              <p className="text-sm text-emerald-600 font-medium">
                                Precio: {formatMoney(product.precioProducto || 0)}
                              </p>
                            </div>
                          </div>
                          {product.aplica_serie && (
                            <Badge variant="info" className="ml-3">📱 Requiere Serie</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Repuestos */}
                {filteredRepuestos.length > 0 && (
                  <div>
                    <div className="bg-purple-100 px-4 py-2 font-semibold text-purple-900 text-sm sticky top-0">
                      🔧 REPUESTOS ({filteredRepuestos.length})
                    </div>
                    {filteredRepuestos.slice(0, 8).map((repuesto) => (
                      <div
                        key={`rep-${repuesto.id}`}
                        onClick={() => handleAddProduct(repuesto, 'repuesto')}
                        className="p-4 hover:bg-purple-50 cursor-pointer border-b transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{repuesto.nombre}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-sm text-slate-500">Código: {repuesto.codigo || 'N/A'}</p>
                              <p className="text-sm text-slate-500">Stock: <strong>{repuesto.stock || 0}</strong></p>
                              <p className="text-sm text-purple-600 font-medium">
                                Precio: {formatMoney(repuesto.precio_venta || 0)}
                              </p>
                            </div>
                          </div>
                          <Badge color="purple" className="ml-3">Repuesto</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {(filteredProducts.length + filteredRepuestos.length) > 16 && (
                  <div className="p-3 text-center text-sm text-slate-500 bg-slate-50">
                    +{(filteredProducts.length + filteredRepuestos.length) - 16} items más...
                  </div>
                )}
              </div>
            )}
            
            {searchProduct && !hasResults && (
              <div className="absolute z-10 w-full mt-2 p-6 border border-slate-200 rounded-lg bg-white shadow-lg text-center text-slate-500">
                No se encontraron productos ni repuestos con ese término
              </div>
            )}
          </div>
        </Card>

        {/* Items Agregados */}
        {items.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 text-lg">
                Productos en esta Compra ({items.length})
              </h3>
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                ⚡ El stock se actualizará al guardar
              </span>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => {
                const itemData = item.tipo_item === 'producto' 
                  ? products.find(p => p.id === String(item.producto_id))
                  : repuestos.find(r => r.id === String(item.producto_id));
                  
                const stockActual = itemData?.stock || 0;
                const nuevoStock = stockActual + item.cantidad;
                
                return (
                  <Card key={index} className={`border-2 ${item.tipo_item === 'producto' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-800 text-lg">{item.nombre_producto}</h4>
                            <Badge color={item.tipo_item === 'producto' ? 'blue' : 'purple'}>
                              {item.tipo_item === 'producto' ? '📦 Producto' : '🔧 Repuesto'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mb-2">{item.tipo_item === 'producto' ? 'SKU' : 'Código'}: {item.sku}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                              Stock actual: {stockActual}
                            </span>
                            <span className="text-xs text-slate-400">→</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                              Nuevo stock: {nuevoStock}
                            </span>
                          </div>
                          {item.aplica_serie && (
                            <Badge variant="warning" className="mt-2">⚠️ Requiere Números de Serie</Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:bg-red-50 border-red-300"
                        >
                          Eliminar
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Cantidad"
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(index, 'cantidad', parseInt(e.target.value) || 1)}
                        />
                        <Input
                          label="Precio Unitario"
                          type="number"
                          step="0.01"
                          value={item.precio_unitario}
                          onChange={(e) => handleUpdateItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Números de Serie */}
                      {item.aplica_serie && (
                        <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                          <h5 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                            <Hash size={16} />
                            Número de Serie / Modelo
                          </h5>
                          <p className="text-xs text-amber-700 mb-3">
                            💡 Este número se aplicará a todas las {item.cantidad} unidades
                          </p>
                          <Input
                            label={`Serie/IMEI para las ${item.cantidad} unidades`}
                            placeholder="Ej: IMEI123456789 o Modelo-XYZ"
                            value={item.series[0] || ''}
                            onChange={(e) => handleUpdateSerie(index, 0, e.target.value)}
                            className="font-mono text-lg"
                          />
                          {item.series[0] && (
                            <div className="mt-3 bg-green-50 p-2 rounded border border-green-200">
                              <p className="text-sm text-green-800">
                                ✅ Serie <span className="font-mono font-bold">{item.series[0]}</span> se aplicará a {item.cantidad} unidad{item.cantidad > 1 ? 'es' : ''}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-right border-t pt-3">
                        <p className="text-lg font-bold text-cyan-600">
                          Subtotal: {formatMoney(item.cantidad * item.precio_unitario)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        )}

        {/* Notas */}
        <Card>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notas / Observaciones
          </label>
          <textarea
            className="w-full border-2 border-slate-200 rounded-lg p-3 focus:border-cyan-500 focus:outline-none"
            rows={3}
            value={compraForm.notas}
            onChange={(e) => setCompraForm({ ...compraForm, notas: e.target.value })}
            placeholder="Observaciones adicionales sobre esta compra..."
          />
        </Card>

        {/* Total y Botones */}
        {items.length > 0 && (
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 sticky bottom-8">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-600">Total de productos</p>
                  <p className="text-2xl font-bold text-slate-800">{items.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total de unidades</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {items.reduce((sum, item) => sum + item.cantidad, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total de la Compra</p>
                  <p className="text-3xl font-bold text-cyan-600">
                    {formatMoney(calculateTotal())}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-cyan-300">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/compras')}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveCompra}
                  disabled={items.length === 0 || !compraForm.proveedor_nombre}
                  className="bg-cyan-600 hover:bg-cyan-700 px-8"
                >
                  <Save size={18} className="mr-2" />
                  Guardar Compra
                </Button>
              </div>
            </div>
          </Card>
        )}

        {items.length === 0 && (
          <Card className="py-16">
            <div className="text-center text-slate-500">
              <Package size={64} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg">No hay productos agregados</p>
              <p className="text-sm mt-2">Busca y agrega productos usando el campo de búsqueda arriba</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
