import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner';
import { SiteLayout } from '../layouts/SiteLayout';
import { ErpLayout } from '../layouts/ErpLayout';
import { ProductPage } from '../pages/ProductPage';
import { SiteHomePage } from '../pages/SiteHomePage';
import { RegistroEmpresaPage } from '../pages/empresa/RegistroEmpresaPage';
import { IngresarEmpresaPage } from '../pages/empresa/IngresarEmpresaPage';
import { SuscripcionPage } from '../pages/empresa/SuscripcionPage';
import { CrmPage } from '../pages/crm/CrmPage';
import { OportunidadFormPage } from '../pages/crm/OportunidadFormPage';
import { OportunidadDetallePage } from '../pages/crm/OportunidadDetallePage';
import { EmpresasAdminPage } from '../pages/plataforma/EmpresasAdminPage';
import { PagosAdminPage } from '../pages/plataforma/PagosAdminPage';
import { ProductFormPage } from '../pages/ProductFormPage';
import { ProductDetail } from '../components/ProductDetail';
import { Cart } from '../components/Car/Cart';
import Login from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';

// ERP
import { AppsPage } from '../pages/erp/AppsPage';
import { ModuleHubPage } from '../pages/erp/ModuleHubPage';
import { InventarioPage } from '../pages/erp/InventarioPage';
import { ContabilidadPage } from '../pages/erp/ContabilidadPage';
import { MisEmpresasPage } from '../pages/erp/MisEmpresasPage';
import { PosPage } from '../pages/pos/PosPage';
import { ImpresorasPage } from '../pages/pos/ImpresorasPage';
import { UsuariosPage } from '../pages/erp/UsuariosPage';
import { ConfiguracionPage } from '../pages/erp/ConfiguracionPage';
import { RequierePermiso } from '../components/RequierePermiso';
import { PermisosProvider } from '../context/PermisosContext';
import { PosLayout } from '../layouts/PosLayout';
import { CarnetGate } from '../components/pos/CarnetGate';

// Contactos
import { ContactosPage } from '../pages/contactos/ContactosPage';
import { ContactoFormPage } from '../pages/contactos/ContactoFormPage';

// Cotizaciones
import { CotizacionesPage } from '../pages/cotizaciones/CotizacionesPage';
import { CotizacionFormPage } from '../pages/cotizaciones/CotizacionFormPage';

// Facturas
import { FacturasPage } from '../pages/facturas/FacturasPage';
import { FacturaDetallePage } from '../pages/facturas/FacturaDetallePage';

// Checkout
import { CheckoutPage } from '../pages/CheckoutPage';

// Compras
import { ComprasPage } from '../pages/compras/ComprasPage';
import { CompraFormPage } from '../pages/compras/CompraFormPage';
import { RecepcionPage } from '../pages/compras/RecepcionPage';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CartProvider>
          <Toaster position="top-center" richColors closeButton />
          <Routes>

            {/* ── Sitio web y tienda (público) ── */}
            <Route element={<SiteLayout />}>
              <Route path='/' element={<SiteHomePage />} />
              <Route path='/login' element={<Login />} />
              <Route path='/empresa/registro' element={<RegistroEmpresaPage />} />
              <Route path='/empresa/ingresar' element={<IngresarEmpresaPage />} />
              <Route path='/register' element={<RegisterForm />} />
              <Route path='/productos' element={<ProductPage />} />
              <Route path='/productos/:id' element={<ProductDetail />} />
              <Route path='/cart' element={<Cart />} />
              <Route path='/checkout' element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            </Route>

            {/* ── Punto de venta: pantalla completa en su propia pestaña ── */}
            <Route path='/pos' element={
              <PermisosProvider>
                {localStorage.getItem('access_token') && sessionStorage.getItem('pos_token') ? (
                  <RequierePermiso permiso='pos.use_pos'>
                    <PosLayout>
                      <PosPage />
                    </PosLayout>
                  </RequierePermiso>
                ) : (
                  <CarnetGate />
                )}
              </PermisosProvider>
            } />

            {/* ── Sistema ERP (requiere sesión) ── */}
            <Route element={<ProtectedRoute><ErpLayout /></ProtectedRoute>}>
              <Route path='/erp' element={<AppsPage />} />
              <Route path='/erp/suscripcion' element={<SuscripcionPage />} />

              {/* CRM */}
              <Route path='/erp/crm' element={<RequierePermiso permiso='crm.view_oportunidad'><CrmPage /></RequierePermiso>} />
              <Route path='/erp/crm/nueva' element={<RequierePermiso permiso='crm.add_oportunidad'><OportunidadFormPage /></RequierePermiso>} />
              <Route path='/erp/crm/:id' element={<RequierePermiso permiso='crm.view_oportunidad'><OportunidadDetallePage /></RequierePermiso>} />

              {/* Plataforma (solo administración; el backend lo vuelve a comprobar) */}
              <Route path='/erp/plataforma' element={<EmpresasAdminPage />} />
              <Route path='/erp/plataforma/pagos' element={<PagosAdminPage />} />
              <Route path='/erp/ventas' element={<ModuleHubPage moduleId='ventas' />} />
              <Route path='/erp/compras' element={<ModuleHubPage moduleId='compras' />} />
              <Route path='/erp/inventario' element={<InventarioPage />} />
              <Route path='/erp/compras/ordenes' element={<RequierePermiso permiso='inventario.view_compra'><ComprasPage /></RequierePermiso>} />
              <Route path='/erp/compras/ordenes/nueva' element={<RequierePermiso permiso='inventario.add_compra'><CompraFormPage /></RequierePermiso>} />
              <Route path='/erp/compras/recepciones/:id' element={<RequierePermiso permiso='inventario.view_recepcion'><RecepcionPage /></RequierePermiso>} />
              <Route path='/erp/contabilidad' element={<ContabilidadPage />} />
              <Route path='/erp/empresas' element={<MisEmpresasPage />} />

              {/* Configuración del punto de venta */}
              <Route path='/erp/pos/impresoras' element={<RequierePermiso permiso='pos.use_pos'><ImpresorasPage /></RequierePermiso>} />

              {/* Configuración de la empresa */}
              <Route path='/erp/configuracion' element={<RequierePermiso permiso='empresa.view_empresa'><ConfiguracionPage /></RequierePermiso>} />

              {/* Usuarios y permisos */}
              <Route path='/erp/usuarios' element={<RequierePermiso permiso='users.view_user'><UsuariosPage /></RequierePermiso>} />
              <Route path='/facturas' element={<FacturasPage />} />
              <Route path='/facturas/:id' element={<FacturaDetallePage />} />

              {/* Inventario (productos) */}
              <Route path='/productos-create'    element={<ProductFormPage />} />
              <Route path='/productos/edit/:id'  element={<ProductFormPage />} />

              {/* Contactos */}
              <Route path='/clientes'             element={<ContactosPage tipo="cliente" />} />
              <Route path='/proveedores'          element={<ContactosPage tipo="proveedor" />} />
              <Route path='/contactos/crear'      element={<ContactoFormPage />} />
              <Route path='/contactos/editar/:id' element={<ContactoFormPage />} />

              {/* Ventas */}
              <Route path='/cotizaciones'            element={<CotizacionesPage />} />
              <Route path='/cotizaciones/crear'      element={<CotizacionFormPage />} />
              <Route path='/cotizaciones/editar/:id' element={<CotizacionFormPage />} />
            </Route>

            <Route path='*' element={<Navigate to='/' replace />} />

          </Routes>
        </CartProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
