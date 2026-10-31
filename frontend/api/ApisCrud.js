import api from './axios';

export const getProducts = (params) => api.get('productos/v1/product/', { params });
export const getProduct    = (id, params) => api.get(`productos/v1/product/${id}/`, { params });
export const createProduct = (product) => api.post('productos/v1/product/', product);
export const deleteProduct = (id) => api.delete(`productos/v1/product/${id}/`);
export const updateProduct = (id, product) => api.put(`productos/v1/product/${id}/`, product);




// Usuarios
export const registerUser = (userData) => api.post('usuarios/registro', userData);
export const loginUser = (credentials) => api.post('users/users/login/', credentials);
export const refreshToken = (token) => api.post('users/users/refresh/', { refresh: token });

export const getCurrentUser = () => api.get('users/users/current/');




// ─────────────────────────────────────────────
// CONTACTOS (Clientes y Proveedores)
// ─────────────────────────────────────────────
export const getContacts        = ()           => api.get('api/contactos/contactos/');
export const getContact         = (id)         => api.get(`api/contactos/contactos/${id}/`);
export const createContact      = (data)       => api.post('api/contactos/contactos/', data);
export const updateContact      = (id, data)   => api.put(`api/contactos/contactos/${id}/`, data);
export const patchContact       = (id, data)   => api.patch(`api/contactos/contactos/${id}/`, data);
export const deleteContact      = (id)         => api.delete(`api/contactos/contactos/${id}/`);
export const getClientes        = ()           => api.get('api/contactos/contactos/clientes/');
export const getProveedores     = ()           => api.get('api/contactos/contactos/proveedores/');
export const searchContacts     = (q)          => api.get(`api/contactos/contactos/?search=${q}`);

// ─────────────────────────────────────────────
// COTIZACIONES
// ─────────────────────────────────────────────
export const getCotizaciones    = ()           => api.get('api/cotizaciones/cotizaciones/');
export const getCotizacion      = (id)         => api.get(`api/cotizaciones/cotizaciones/${id}/`);
export const createCotizacion   = (data)       => api.post('api/cotizaciones/cotizaciones/', data);
export const updateCotizacion   = (id, data)   => api.put(`api/cotizaciones/cotizaciones/${id}/`, data);
export const patchCotizacion    = (id, data)   => api.patch(`api/cotizaciones/cotizaciones/${id}/`, data);
export const deleteCotizacion   = (id)         => api.delete(`api/cotizaciones/cotizaciones/${id}/`);

// ─────────────────────────────────────────────
// FACTURAS
// ─────────────────────────────────────────────
export const getFacturas        = ()           => api.get('api/facturas/facturas/');
export const getFactura         = (id)         => api.get(`api/facturas/facturas/${id}/`);
export const createFactura      = (data)       => api.post('api/facturas/facturas/', data);
export const facturarDesdeCoti  = (data)       => api.post('api/facturas/facturas/desde-cotizacion/', data);
export const marcarFacturaPagada= (id)         => api.patch(`api/facturas/facturas/${id}/marcar-pagada/`);
export const anularFactura      = (id)         => api.patch(`api/facturas/facturas/${id}/anular/`);

// ─────────────────────────────────────────────
// CARRITO
// ─────────────────────────────────────────────
export const getCarrito         = ()           => api.get('carrito/');
export const addToCarrito       = (data)       => api.post('carrito/', data);
export const updateCarritoItem  = (id, data)   => api.put(`carrito/${id}/`, data);
export const removeCarritoItem  = (id)         => api.delete(`carrito/${id}/`);

// ─────────────────────────────────────────────
// ÓRDENES / PEDIDOS
// ─────────────────────────────────────────────
export const getOrdenes         = ()           => api.get('orden/');
export const getOrden           = (id)         => api.get(`orden/${id}/`);
export const createOrden        = (data)       => api.post('orden/', data);
export const updateOrden        = (id, data)   => api.put(`orden/${id}/`, data);

// ─────────────────────────────────────────────
// DIRECCIONES
// ─────────────────────────────────────────────
export const getDirecciones     = ()           => api.get('direcciones/');
export const getDireccion       = (id)         => api.get(`direcciones/${id}/`);
export const createDireccion    = (data)       => api.post('direcciones/', data);
export const updateDireccion    = (id, data)   => api.put(`direcciones/${id}/`, data);
export const deleteDireccion    = (id)         => api.delete(`direcciones/${id}/`);

// ─────────────────────────────────────────────
// CÓDIGOS PROMOCIONALES
// ─────────────────────────────────────────────
export const getCodigos         = ()           => api.get('codigos/');
export const validarCodigo      = (codigo)     => api.post('codigos/validar/', { codigo });

// ─────────────────────────────────────────────
// PAGOS
// ─────────────────────────────────────────────
export const getPagos           = ()           => api.get('pagos/');
export const createPago         = (data)       => api.post('pagos/', data);

// ─────────────────────────────────────────────
// TIENDA (carrito, pagos y pedidos del usuario)
// ─────────────────────────────────────────────
export const getTiendaConfig        = ()              => api.get('api/tienda/configuracion/');
export const getTiendaCarrito       = ()              => api.get('api/tienda/carrito/');
export const setTiendaCartItem      = (productId, qty) => api.put(`api/tienda/carrito/productos/${productId}/`, { quantity: qty });
export const removeTiendaCartItem   = (productId)     => api.delete(`api/tienda/carrito/productos/${productId}/`);
export const clearTiendaCarrito     = ()              => api.delete('api/tienda/carrito/');
export const getTiendaPagos         = ()              => api.get('api/tienda/pagos/');
export const addTiendaPago          = (stripeToken)   => api.post('api/tienda/pagos/', { stripeToken });
export const createTiendaPedido     = ()              => api.post('api/tienda/pedidos/');
export const pagarTiendaPedido      = (pedidoId, billingProfileId) =>
  api.post(`api/tienda/pedidos/${pedidoId}/pagar/`, { billing_profile_id: billingProfileId });
// ─────────────────────────────────────────────
// PUNTO DE VENTA (POS) E IMPRESORAS
// Las operaciones del POS requieren el token que devuelve el desbloqueo con PIN
// ─────────────────────────────────────────────
const posHeaders = (token) => ({ headers: { 'X-POS-Desbloqueo': token } });
export const desbloquearPos     = (pin)       => api.post('api/pos/desbloqueo/', { pin });
export const getPosProductos    = (token)     => api.get('api/pos/productos/', posHeaders(token));

// ─────────────────────────────────────────────
export const getPosImpresoras   = ()          => api.get('api/pos/impresoras/');
export const savePosImpresora   = (id, data)  => id
  ? api.put(`api/pos/impresoras/${id}/`, data)
  : api.post('api/pos/impresoras/', data);
export const deletePosImpresora = (id)        => api.delete(`api/pos/impresoras/${id}/`);
export const pruebaPosImpresora = (id)        => api.post(`api/pos/impresoras/${id}/prueba/`);
export const abrirCajon         = (impresoraId, token) => api.post('api/pos/caja/abrir-cajon/', { impresora_id: impresoraId }, posHeaders(token));
export const crearVentaPos      = (data, token)  => api.post('api/pos/ventas/', data, posHeaders(token));
export const imprimirVentaPos   = (id, impresoraId, token) => api.post(`api/pos/ventas/${id}/imprimir/`, { impresora_id: impresoraId }, posHeaders(token));

// ─────────────────────────────────────────────
// USUARIOS, ROLES Y PERMISOS
// ─────────────────────────────────────────────
export const getMiUsuario          = ()      => api.get('api/usuarios/yo/');
export const getUsuarios           = ()      => api.get('api/usuarios/usuarios/');
export const saveUsuario           = (id, data) => id
  ? api.patch(`api/usuarios/usuarios/${id}/`, data)
  : api.post('api/usuarios/usuarios/', data);
export const getRoles              = ()      => api.get('api/usuarios/roles/');
export const saveRol               = (id, data) => id
  ? api.put(`api/usuarios/roles/${id}/`, data)
  : api.post('api/usuarios/roles/', data);
export const deleteRol             = (id)    => api.delete(`api/usuarios/roles/${id}/`);
export const getPermisosDisponibles = ()     => api.get('api/usuarios/permisos/');

// ─────────────────────────────────────────────
// INVENTARIO: CATEGORÍAS Y PRODUCTOS
// ─────────────────────────────────────────────
export const getCategorias        = ()           => api.get('api/inventario/categorias/');
export const saveCategoria        = (id, data)   => id
  ? api.put(`api/inventario/categorias/${id}/`, data)
  : api.post('api/inventario/categorias/', data);
export const deleteCategoria      = (id)         => api.delete(`api/inventario/categorias/${id}/`);
export const setProductCategorias = (productId, categoriaIds) =>
  api.patch(`productos/v1/product/${productId}/`, { categorias: categoriaIds });

// ─────────────────────────────────────────────
// EXISTENCIAS, COMPONENTES Y MOVIMIENTOS
// ─────────────────────────────────────────────
export const getMovimientos     = (params)    => api.get('api/inventario/movimientos/', { params });
export const crearMovimiento    = (data)      => api.post('api/inventario/movimientos/', data);
export const getComponentes     = (id)        => api.get(`api/inventario/productos/${id}/componentes/`);
export const setComponentes     = (id, lista) => api.put(`api/inventario/productos/${id}/componentes/`, lista);

// ─────────────────────────────────────────────
// COMPRAS (órdenes de compra y recepciones)
// ─────────────────────────────────────────────
export const getCompras          = ()           => api.get('api/inventario/compras/');
export const crearCompra         = (data)       => api.post('api/inventario/compras/', data);
export const getRecepcion        = (id)         => api.get(`api/inventario/recepciones/${id}/`);
export const confirmarRecepcion  = (id, lineas) => api.post(`api/inventario/recepciones/${id}/confirmar/`, { lineas });

// ─────────────────────────────────────────────
// EMPRESA, PIN Y FACTURA ELECTRÓNICA
// ─────────────────────────────────────────────
export const getEmpresa         = ()          => api.get('api/empresa/');
export const saveEmpresa        = (data)      => api.patch('api/empresa/', data);
export const probarCorreoEmpresa = (destinatario) => api.post('api/empresa/correo/probar/', { destinatario });
export const setMiPin           = (pinActual, pinNuevo) =>
  api.post('api/usuarios/yo/pin/', { pin_actual: pinActual, pin_nuevo: pinNuevo });
export const setPinUsuario      = (id, pinNuevo) => api.post(`api/usuarios/usuarios/${id}/pin/`, { pin_nuevo: pinNuevo });
export const getDte             = (facturaId) => api.get(`api/fe/facturas/${facturaId}/dte/`);
export const transmitirFactura  = (facturaId) => api.post(`api/fe/facturas/${facturaId}/transmitir/`);

// Ingreso rápido con carnet y PIN (cajeros)
export const loginPin = (carnet, pin) => api.post('users/users/login-pin/', { carnet, pin });

// ─────────────────────────────────────────────
// CAJA (apertura, cierre e historial)
// ─────────────────────────────────────────────
export const getCajaActual   = (token)  => api.get('api/pos/caja/actual/', posHeaders(token));
// desglose: {"20": 3, "0.25": 4} billetes y monedas contados; el backend suma el total
export const abrirCaja       = (montoInicial, token, desglose) =>
  api.post('api/pos/caja/abrir/', { monto_inicial: montoInicial, desglose }, posHeaders(token));
export const cerrarCaja      = (montoContado, impresoraId, token) =>
  api.post('api/pos/caja/cerrar/', { monto_contado: montoContado, impresora_id: impresoraId, imprimir: true }, posHeaders(token));
export const getCajas        = (token)  => api.get('api/pos/cajas/', posHeaders(token));

// ─────────────────────────────────────────────
// SITIO WEB: reseñas públicas
// ─────────────────────────────────────────────
export const getResenas = () => api.get('api/resenas/');

// ─────────────────────────────────────────────
// EMPRESAS (registro, ingreso y módulos contratados)
// ─────────────────────────────────────────────
export const getModulosCatalogo = () => api.get('api/tenants/modulos/');
export const registrarEmpresa   = (data) => api.post('api/tenants/registro/', data);
export const loginEmpresa       = (empresa, usuario, password) =>
  api.post('api/tenants/login/', { empresa, usuario, password });
export const getMiEmpresa       = () => api.get('api/tenants/mi-empresa/');
export const getPlanes          = () => api.get('api/tenants/planes/');
export const getPagosEmpresa    = () => api.get('api/tenants/pagos/');
export const pagarConTransferencia = (planId) => api.post('api/tenants/pagos/transferencia/', { plan_id: planId });
export const pagarConStripe     = (planId) => api.post('api/tenants/pagos/stripe/', { plan_id: planId });

// ─────────────────────────────────────────────
// PLATAFORMA (solo administración de la plataforma)
// ─────────────────────────────────────────────
export const getEmpresasAdmin     = (params) => api.get('api/tenants/admin/empresas/', { params });
export const getEmpresaAdmin      = (id) => api.get(`api/tenants/admin/empresas/${id}/`);
export const actualizarEmpresaAdmin = (id, data) => api.patch(`api/tenants/admin/empresas/${id}/`, data);
export const extenderPruebaAdmin  = (id, dias) => api.post(`api/tenants/admin/empresas/${id}/extender/`, { dias });
export const getPagosAdmin        = (estado) => api.get('api/tenants/admin/pagos/', { params: { estado } });
export const confirmarPagoAdmin   = (id) => api.post(`api/tenants/admin/pagos/${id}/confirmar/`);
export const crearEmpresaPrueba    = (data) => api.post('api/tenants/admin/pruebas/', data);
export const eliminarEmpresaAdmin  = (id) => api.delete(`api/tenants/admin/empresas/${id}/`);

// VARIAS EMPRESAS (una persona puede tener cuenta en varias empresas)
export const getMisEmpresas        = () => api.get('api/tenants/mis-empresas/');
export const cambiarEmpresa        = (empresa) => api.post('api/tenants/cambiar-empresa/', { empresa });
export const crearEmpresaEnCuenta = (data) => api.post('api/tenants/empresas/nueva/', data);
export const getUsuariosCuenta    = () => api.get('api/tenants/cuenta/usuarios/');
export const crearUsuarioCuenta   = (data) => api.post('api/tenants/cuenta/usuarios/', data);
export const actualizarUsuarioCuenta = (id, data) => api.patch(`api/tenants/cuenta/usuarios/${id}/`, data);

// CONTABILIDAD
export const getCuentas            = () => api.get('api/contabilidad/cuentas/');
export const crearCuenta           = (data) => api.post('api/contabilidad/cuentas/', data);
export const cargarPlanBase        = () => api.post('api/contabilidad/cuentas/cargar-base/');
export const getAsientos           = (params) => api.get('api/contabilidad/asientos/', { params });
export const crearAsiento          = (data) => api.post('api/contabilidad/asientos/', data);
export const anularAsiento         = (id) => api.post(`api/contabilidad/asientos/${id}/anular/`);
export const contabilizarFacturas  = () => api.post('api/contabilidad/contabilizar-facturas/');
export const getLibroDiario        = (params) => api.get('api/contabilidad/libro-diario/', { params });
export const getLibroMayor         = (params) => api.get('api/contabilidad/libro-mayor/', { params });
export const getBalanza            = (params) => api.get('api/contabilidad/balanza/', { params });
export const getBalanceGeneral     = (params) => api.get('api/contabilidad/balance-general/', { params });
export const getEstadoResultados   = (params) => api.get('api/contabilidad/estado-resultados/', { params });

// ─────────────────────────────────────────────
// CRM
// ─────────────────────────────────────────────
export const getOportunidades     = () => api.get('api/crm/oportunidades/');
export const getOportunidad       = (id) => api.get(`api/crm/oportunidades/${id}/`);
export const crearOportunidad     = (data) => api.post('api/crm/oportunidades/', data);
export const actualizarOportunidad = (id, data) => api.patch(`api/crm/oportunidades/${id}/`, data);
export const getResumenCrm        = () => api.get('api/crm/oportunidades/resumen/');
export const getActividades       = (oportunidadId) => api.get('api/crm/actividades/', { params: { oportunidad: oportunidadId } });
export const crearActividad       = (data) => api.post('api/crm/actividades/', data);

// Entrada al POS escaneando el carnet
export const loginCarnet = (carnet) => api.post('users/users/login-carnet/', { carnet });
