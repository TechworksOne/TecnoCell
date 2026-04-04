import { Package, Plus, Search, Box, TrendingUp, AlertCircle, Calendar, FileText, Eye, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { formatMoney } from "../../lib/format";
import { useCatalog } from "../../store/useCatalog";
import { useRepuestosStore } from "../../store/useRepuestosStore";
import Badge from "../../components/ui/Badge";
import { getAllCompras } from "../../services/purchaseService";
import Modal from "../../components/ui/Modal";

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, gradient,
}: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; gradient: string;
}) {
  return (
    <div className={`${gradient} rounded-2xl p-4 text-white shadow-md flex items-center justify-between`}>
      <div>
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold mt-0.5 leading-none">{value}</p>
        <p className="text-white/60 text-[11px] mt-1">{sub}</p>
      </div>
      <div className="bg-white/20 rounded-xl p-2.5 shrink-0">{icon}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const { products, loadProducts } = useCatalog();
  const { repuestos, loadRepuestos } = useRepuestosStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [compras, setCompras] = useState<any[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventario" | "historial">("inventario");
  const [inventarioTipo, setInventarioTipo] = useState<"productos" | "repuestos">("productos");

  useEffect(() => {
    loadProducts();
    loadRepuestos();
    loadCompras();
  }, []);

  const loadCompras = async () => {
    try {
      setLoadingCompras(true);
      const response = await getAllCompras({ limit: 100 });
      setCompras(response.data || []);
    } catch (error) {
      console.error("Error al cargar compras:", error);
    } finally {
      setLoadingCompras(false);
    }
  };

  const handleViewDetails = async (compraId: number) => {
    try {
      const compra = compras.find((c) => c.id === compraId);
      if (compra) {
        setSelectedCompra(compra);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Error al cargar detalles:", error);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRepuestos = repuestos.filter((r) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      r.nombre.toLowerCase().includes(s) ||
      (r.sku && r.sku.toLowerCase().includes(s)) ||
      (r.tipo && r.tipo.toLowerCase().includes(s)) ||
      (r.marca && r.marca.toLowerCase().includes(s)) ||
      (r.modelo && r.modelo.toLowerCase().includes(s))
    );
  });

  const totalProductos = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const productosConSerie = products.filter((p) => p.aplica_serie).length;
  const productosBajoStock = products.filter((p) => (p.stock || 0) < 10).length;
  const totalCompras = compras.length;
  const totalInvertido = compras.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { variant: "success" | "warning" | "error" | "info"; label: string }> = {
      CONFIRMADA: { variant: "success", label: "Confirmada" },
      RECIBIDA:   { variant: "success", label: "Recibida" },
      BORRADOR:   { variant: "warning", label: "Borrador" },
      CANCELADA:  { variant: "error",   label: "Cancelada" },
    };
    return estados[estado] || { variant: "info", label: estado };
  };

  const currentInventory = inventarioTipo === "productos" ? totalProductos : repuestos.length;
  const currentStock = inventarioTipo === "productos"
    ? totalStock
    : repuestos.reduce((sum, r) => sum + (r.stock || 0), 0);

  return (
    <div className="space-y-5 max-w-screen-2xl">

      {/* ── HEADER ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">
            <Zap size={11} />
            Gestión de Inventario
          </span>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Compras</h1>
          <p className="text-sm text-slate-500 mt-0.5">Inventario de productos, repuestos e historial de compras</p>
        </div>
        <Button
          onClick={() => navigate("/compras/nueva")}
          className="bg-cyan-600 hover:bg-cyan-700 self-start flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva Compra
        </Button>
      </div>

      {/* ── TABS ─────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["inventario", "historial"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "inventario" ? <Box size={15} /> : <FileText size={15} />}
            {tab === "inventario" ? "Inventario" : `Historial (${totalCompras})`}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB: INVENTARIO                                    */}
      {/* ══════════════════════════════════════════════════ */}
      {activeTab === "inventario" && (
        <>
          {/* Sub-tabs productos / repuestos */}
          <div className="flex gap-2">
            <button
              onClick={() => setInventarioTipo("productos")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                inventarioTipo === "productos"
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-cyan-300"
              }`}
            >
              <Package size={13} /> Productos
            </button>
            <button
              onClick={() => setInventarioTipo("repuestos")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                inventarioTipo === "repuestos"
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
              }`}
            >
              <Box size={13} /> Repuestos
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label={inventarioTipo === "productos" ? "Total Productos" : "Total Repuestos"}
              value={currentInventory}
              sub="registrados"
              icon={<Box size={17} />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <KpiCard
              label="Unidades en Stock"
              value={currentStock}
              sub="unidades disponibles"
              icon={<TrendingUp size={17} />}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            />
            <KpiCard
              label="Con Número de Serie"
              value={productosConSerie}
              sub="equipos con serie"
              icon={<Package size={17} />}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <KpiCard
              label="Stock Bajo"
              value={productosBajoStock}
              sub="requieren reposición"
              icon={<AlertCircle size={17} />}
              gradient="bg-gradient-to-br from-orange-500 to-rose-500"
            />
          </div>

          {/* Búsqueda */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder={`Buscar ${inventarioTipo === "productos" ? "por nombre, SKU o categoría" : "por nombre, SKU, tipo o marca"}…`}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
          </div>

          {/* ── Lista de Productos ── */}
          {inventarioTipo === "productos" && (
            filteredProducts.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm py-14 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                  <Package size={26} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">
                    {searchTerm ? "Sin resultados" : "No hay productos registrados"}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {searchTerm ? "Intenta con otro término" : "Crea productos primero para registrar compras"}
                  </p>
                </div>
                {!searchTerm && (
                  <Button onClick={() => navigate("/productos")} className="bg-blue-600 hover:bg-blue-700 mt-1">
                    <Plus size={15} className="mr-1.5" /> Ir a Productos
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const stock = product.stock || 0;
                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all"
                    >
                      {/* Imagen */}
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm truncate">{product.name}</p>
                          {product.aplica_serie && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Serie</span>
                          )}
                          <Badge color={stock === 0 ? "red" : stock < 10 ? "yellow" : "green"}>
                            {stock === 0 ? "Sin Stock" : stock < 10 ? "Stock Bajo" : "En Stock"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">SKU: {product.sku} · {product.category || "Sin categoría"}</p>
                      </div>

                      {/* Métricas */}
                      <div className="hidden sm:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Stock</p>
                          <p className="text-sm font-bold text-slate-800">{stock}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Costo</p>
                          <p className="text-sm font-semibold text-emerald-600">{formatMoney(product.precioProducto || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Venta</p>
                          <p className="text-sm font-semibold text-cyan-600">{formatMoney(product.precioPublico || 0)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Lista de Repuestos ── */}
          {inventarioTipo === "repuestos" && (
            repuestos.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm py-14 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                  <Box size={26} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">No hay repuestos registrados</p>
                  <p className="text-sm text-slate-400 mt-0.5">Crea repuestos primero para registrar compras</p>
                </div>
                <Button onClick={() => navigate("/repuestos")} className="bg-blue-600 hover:bg-blue-700 mt-1">
                  <Plus size={15} className="mr-1.5" /> Ir a Repuestos
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRepuestos.map((repuesto) => {
                  const stock = repuesto.stock || 0;
                  return (
                    <div
                      key={repuesto.id}
                      className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all"
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Box size={20} className="text-slate-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm truncate">{repuesto.nombre}</p>
                          <Badge color={stock === 0 ? "red" : stock < 5 ? "yellow" : "green"}>
                            {stock === 0 ? "Sin Stock" : stock < 5 ? "Stock Bajo" : "En Stock"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          SKU: {repuesto.sku || "N/A"} · {repuesto.tipo || "N/A"} · {repuesto.marca || "N/A"}
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Stock</p>
                          <p className="text-sm font-bold text-slate-800">{stock}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Costo</p>
                          <p className="text-sm font-semibold text-emerald-600">{formatMoney(repuesto.precioCosto || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Venta</p>
                          <p className="text-sm font-semibold text-cyan-600">{formatMoney(repuesto.precio || 0)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TAB: HISTORIAL                                     */}
      {/* ══════════════════════════════════════════════════ */}
      {activeTab === "historial" && (
        <>
          {/* KPIs historial */}
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              label="Total Compras"
              value={totalCompras}
              sub="registradas"
              icon={<FileText size={17} />}
              gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            />
            <KpiCard
              label="Total Invertido"
              value={formatMoney(totalInvertido)}
              sub="en compras"
              icon={<TrendingUp size={17} />}
              gradient="bg-gradient-to-br from-emerald-500 to-green-600"
            />
          </div>

          {loadingCompras ? (
            <div className="bg-white border border-slate-100 rounded-2xl py-14 flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
              <p className="text-sm text-slate-500">Cargando historial…</p>
            </div>
          ) : compras.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl py-14 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                <FileText size={26} className="text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No hay compras registradas</p>
                <p className="text-sm text-slate-400 mt-0.5">Aún no has registrado ninguna compra</p>
              </div>
              <Button onClick={() => navigate("/compras/nueva")} className="bg-violet-600 hover:bg-violet-700 mt-1">
                <Plus size={15} className="mr-1.5" /> Registrar Primera Compra
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {compras.map((compra) => {
                const estado = getEstadoBadge(compra.estado);
                const colorMap: Record<string, "green" | "yellow" | "red" | "blue"> = {
                  success: "green", warning: "yellow", error: "red", info: "blue",
                };
                return (
                  <div
                    key={compra.id}
                    className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{compra.numero_compra}</p>
                        <Badge color={colorMap[estado.variant] ?? "blue"}>{estado.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(compra.fecha_compra).toLocaleDateString("es-GT")}
                        </span>
                        <span>{compra.proveedor_nombre}</span>
                        {compra.proveedor_telefono && <span>{compra.proveedor_telefono}</span>}
                      </div>
                      {compra.notas && (
                        <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">{compra.notas}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Total</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatMoney(parseFloat(compra.total) || 0)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(compra.id)}
                        className="whitespace-nowrap"
                      >
                        <Eye size={14} className="mr-1" /> Ver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modal de Detalles ──────────────────────────── */}
      {showDetailModal && selectedCompra && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedCompra(null); }}
          title={`Detalles — ${selectedCompra.numero_compra}`}
          size="3xl"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Proveedor</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Nombre", value: selectedCompra.proveedor_nombre },
                  { label: "Teléfono", value: selectedCompra.proveedor_telefono || "N/A" },
                  { label: "NIT", value: selectedCompra.proveedor_nit || "N/A" },
                  { label: "Dirección", value: selectedCompra.proveedor_direccion || "N/A" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="text-sm font-medium text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Subtotal</p>
                <p className="text-lg font-bold text-slate-800">{formatMoney(parseFloat(selectedCompra.subtotal) || 0)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Impuestos</p>
                <p className="text-lg font-bold text-slate-800">{formatMoney(parseFloat(selectedCompra.impuestos) || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-3 text-white">
                <p className="text-[10px] text-green-100">Total</p>
                <p className="text-lg font-bold">{formatMoney(parseFloat(selectedCompra.total) || 0)}</p>
              </div>
            </div>

            {selectedCompra.notas && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-amber-700 mb-1">Notas</p>
                <p className="text-sm text-slate-700">{selectedCompra.notas}</p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              Registrado el {new Date(selectedCompra.created_at).toLocaleString("es-GT")}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
