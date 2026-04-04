import DashboardPage from "./pages/Dashboard/DashboardPage";
import FelPage from "./pages/InvoicesFel/FelPage";
import LoginPage from "./pages/Login/LoginPage";
import CustomersPage from "./pages/Customers/CustomersPage";
import SuppliersPage from "./pages/Suppliers/SuppliersPage";
import ProductsPage from "./pages/Products/ProductsPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import PurchasesPage from "./pages/Purchases/PurchasesPage";
import PurchaseFormPage from "./pages/Purchases/PurchaseFormPage";
import QuotesPage from "./pages/Quotes/QuotesPage";
import QuoteDetailPage from "./pages/Quotes/QuoteDetailPage";
import QuoteFormPage from "./pages/Quotes/QuoteFormPage";
import ReportsPage from "./pages/Reports/ReportsPage";
import SalesPageNew from "./pages/Sales/SalesPageNew";
import SaleNewPage from "./pages/Sales/SaleNewPage";
import SaleDetailPage from "./pages/Sales/SaleDetailPage";
import UsersPage from "./pages/Users/UsersPage";
import CardPaymentPage from "./pages/CardPayment/CardPaymentPage";
import RepairsPage from "./pages/Repairs/RepairsPage";
import RepairFormSimple from "./pages/Repairs/RepairFormSimple";
import FlujoReparacionesPage from "./pages/FlujoReparaciones/FlujoReparacionesPage";
import FlujoReparacionDetailPage from "./pages/FlujoReparaciones/FlujoReparacionDetailPage";
import { RepuestosPage } from "./pages/Repuestos/RepuestosPage";
import RepuestoForm from "./pages/Repuestos/RepuestoForm";
import StickersGarantiaPage from "./pages/StickersGarantia/StickersGarantiaPage";
import AdminUsuariosPage from "./pages/AdminUsuarios/AdminUsuariosPage";
import CajaBancosPage from "./pages/CajaBancos/CajaBancosPage";

const routes = [
  { path: "/login", element: <LoginPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/productos", element: <ProductsPage /> },
  { path: "/repuestos", element: <RepuestosPage /> },
  { path: "/repuestos/nuevo", element: <RepuestoForm /> },
  { path: "/repuestos/editar/:id", element: <RepuestoForm /> },
  { path: "/compras", element: <PurchasesPage /> },
  { path: "/compras/nueva", element: <PurchaseFormPage /> },
  { path: "/cotizaciones", element: <QuotesPage /> },
  { path: "/cotizaciones/nueva", element: <QuoteFormPage /> },
  { path: "/cotizaciones/:id/editar", element: <QuoteFormPage /> },
  { path: "/cotizaciones/:id", element: <QuoteDetailPage /> },
  { path: "/ventas", element: <SalesPageNew /> },
  { path: "/ventas/nueva", element: <SaleNewPage /> },
  { path: "/ventas/:id", element: <SaleDetailPage /> },
  { path: "/reparaciones", element: <RepairsPage /> },
  { path: "/reparaciones/nueva", element: <RepairFormSimple /> },
  { path: "/reparaciones/:id/editar", element: <RepairFormSimple /> },
  { path: "/flujo-reparaciones", element: <FlujoReparacionesPage /> },
  { path: "/flujo-reparaciones/:id", element: <FlujoReparacionDetailPage /> },
  { path: "/pago-tarjeta", element: <CardPaymentPage /> },
  { path: "/clientes", element: <CustomersPage /> },
  { path: "/proveedores", element: <SuppliersPage /> },
  { path: "/caja-bancos", element: <CajaBancosPage /> },
  { path: "/stickers-garantia", element: <StickersGarantiaPage /> },
  { path: "/admin-usuarios", element: <AdminUsuariosPage /> },
  { path: "/fel", element: <FelPage /> },
  { path: "/reportes", element: <ReportsPage /> },
  { path: "/usuarios", element: <UsersPage /> },
  { path: "/perfil", element: <ProfilePage /> },
];

export default routes;
