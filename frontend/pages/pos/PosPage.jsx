import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MinusIcon, PlusIcon, PrinterIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  abrirCajon,
  crearVentaPos,
  getCategorias,
  getClientes,
  getPosImpresoras,
  getCajaActual,
  getPosProductos,
  imprimirVentaPos,
} from '../../api/ApisCrud';
import { PinGate } from '../../components/pos/PinGate';
import { AperturaCaja, CierreCaja } from '../../components/pos/CajaPanel';
import { Recibo } from '../../components/pos/Recibo';
import { usePermisos } from '../../context/PermisosContext';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const IVA = 0.13;
const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
];
const DOCUMENTOS = [
  { value: 'ticket', label: 'Ticket', descripcion: 'Solo recibo, sin factura' },
  { value: 'factura', label: 'Factura', descripcion: 'Consumidor final o cliente' },
  { value: 'credito_fiscal', label: 'Crédito fiscal', descripcion: 'Requiere cliente con NIT y NRC' },
];

export function PosPage() {
  const { can, usuario } = usePermisos();
  const puedeFacturar = can('invoices.add_invoice');
  // Token del desbloqueo con PIN; se guarda en la sesión de la pestaña para no pedirlo en cada recarga
  const [token, setTokenState] = useState(() => sessionStorage.getItem('pos_token'));
  const setToken = (valor) => {
    if (valor) sessionStorage.setItem('pos_token', valor);
    else sessionStorage.removeItem('pos_token');
    setTokenState(valor);
  };

  const [productos, setProductos] = useState(null);
  const [errorProductos, setErrorProductos] = useState('');
  // undefined = cargando, null = sin caja abierta, objeto = caja abierta
  const [caja, setCaja] = useState(undefined);
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('todas');
  const [clientes, setClientes] = useState([]);
  const [impresoras, setImpresoras] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [recibido, setRecibido] = useState('');
  const [documento, setDocumento] = useState('ticket');
  const [clienteId, setClienteId] = useState('');
  const [impresoraId, setImpresoraId] = useState('');
  const [imprimir, setImprimir] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    getCategorias().then(res => setCategorias(toList(res.data))).catch(() => setCategorias([]));
    getPosImpresoras()
      .then(res => {
        const lista = toList(res.data).filter(i => i.activa);
        setImpresoras(lista);
        setImpresoraId(String((lista.find(i => i.predeterminada) || lista[0])?.id ?? ''));
      })
      .catch(() => setImpresoras([]));
  }, []);

  useEffect(() => {
    if (!token) return;
    getCajaActual(token)
      .then(res => setCaja(res.data.caja))
      .catch(err => {
        if (err.response?.status === 403) {
          setToken(null);
        } else {
          setCaja(null);
        }
      });
  }, [token]);

  useEffect(() => {
    if (!token || !caja) return;
    getPosProductos(token)
      .then(res => {
        setErrorProductos('');
        setProductos(res.data);
      })
      .catch(err => {
        if (err.response?.status === 403) {
          setToken(null);
          toast.error('Tu sesión del POS venció. Ingresa tu PIN otra vez.');
        } else {
          setProductos([]);
          setErrorProductos(err.response?.data?.detail || 'No se pudo conectar con el servidor.');
        }
      });
  }, [token, caja]);

  useEffect(() => {
    if (!puedeFacturar) return;
    getClientes().then(res => setClientes(toList(res.data))).catch(() => setClientes([]));
  }, [puedeFacturar]);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (productos || []).filter(p => {
      const enCategoria = categoriaId === 'todas'
        || (p.categorias || []).includes(Number(categoriaId));
      return enCategoria && p.title.toLowerCase().includes(texto);
    });
  }, [productos, busqueda, categoriaId]);

  const clienteSeleccionado = clientes.find(c => String(c.id) === String(clienteId));

  // Vista previa: el total definitivo lo calcula el servidor
  const subtotal = carrito.reduce((suma, l) => suma + Number(l.price) * l.quantity, 0);
  const descuentoMonto = subtotal * (Number(descuento) || 0) / 100;
  const base = subtotal - descuentoMonto;
  const iva = base * IVA;
  const total = base + iva;
  const cambio = metodo === 'efectivo' && recibido ? Number(recibido) - total : 0;

  // El escáner escribe el código y envía Enter: si coincide con un producto, se agrega directo
  const manejarBusqueda = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const codigo = busqueda.trim();
    if (!codigo) return;
    const producto = (productos || []).find(p => p.codigo_barras === codigo);
    if (producto) {
      agregar(producto);
      setBusqueda('');
    } else {
      toast.error(`No hay un producto con el código ${codigo}`);
    }
  };

  const agregar = (producto) => {
    const enCarrito = carrito.find(l => l.id === producto.id)?.quantity || 0;
    if (producto.tipo === 'bien' && enCarrito + 1 > Number(producto.stock)) {
      toast.error(`Sin existencias suficientes de ${producto.title}`);
      return;
    }
    setCarrito(prev => {
      const existe = prev.find(l => l.id === producto.id);
      if (existe) {
        return prev.map(l => (l.id === producto.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { id: producto.id, title: producto.title, price: producto.price, quantity: 1 }];
    });
  };

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(prev => prev.filter(l => l.id !== id));
      return;
    }
    setCarrito(prev => prev.map(l => (l.id === id ? { ...l, quantity: cantidad } : l)));
  };

  const limpiar = () => {
    setCarrito([]);
    setDescuento('');
    setRecibido('');
    setMetodo('efectivo');
    setDocumento('ticket');
    setClienteId('');
  };

  const cobrar = async () => {
    setProcesando(true);
    try {
      const { data } = await crearVentaPos({
        lineas: carrito.map(l => ({ product_id: l.id, quantity: l.quantity })),
        metodo_pago: metodo,
        monto_recibido: metodo === 'efectivo' ? recibido : null,
        descuento_pct: descuento || 0,
        documento,
        cliente_id: clienteId || null,
        imprimir,
        impresora_id: impresoraId || null,
      }, token);
      setResultado(data);
      limpiar();
      if (imprimir && !data.impresion?.ok) {
        toast.warning(`Venta guardada, pero no se imprimió: ${data.impresion?.detail}`);
      } else {
        toast.success(data.venta.factura
          ? `Venta registrada. ${data.venta.factura.numero} enviada a Facturación`
          : 'Venta registrada');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo registrar la venta');
    } finally {
      setProcesando(false);
    }
  };

  const reimprimir = async () => {
    try {
      const { data } = await imprimirVentaPos(resultado.venta.id, impresoraId || null, token);
      if (data.ok) toast.success(data.detail);
      else toast.error(data.detail);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo imprimir');
    }
  };

  const abrirCajonCaja = async () => {
    try {
      await abrirCajon(impresoraId || null, token);
      toast.success('Cajón abierto');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo abrir el cajón');
    }
  };

  if (!token) {
    return <PinGate usuario={usuario} onDesbloqueado={setToken} />;
  }

  if (caja === undefined) {
    return <p className="animate-pulse py-20 text-center text-slate-500">Cargando caja...</p>;
  }

  if (caja === null) {
    return <AperturaCaja token={token} onAbierta={setCaja} />;
  }

  const clienteRequerido = documento === 'credito_fiscal';
  const documentoValido = !clienteRequerido || Boolean(clienteId);
  const puedeCobrar = carrito.length > 0 && !procesando && documentoValido
    && (metodo !== 'efectivo' || Number(recibido) >= total);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Venta en mostrador</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Elige productos por categoría, cobra e imprime el ticket.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Caja abierta · inicial {formatPrice(caja.monto_inicial)}
          </span>
          <button onClick={() => setCerrandoCaja(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Cerrar caja
          </button>
        </div>
        <Link to="/erp/pos/impresoras" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          Configurar impresoras ↗
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar o escanear código de barras..."
              autoFocus
              onKeyDown={manejarBusqueda}
              className={`${inputClass} mt-0 sm:flex-1`}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[{ id: 'todas', title: 'Todas' }, ...categorias].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaId(String(cat.id))}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  categoriaId === String(cat.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {productos === null ? (
            <p className="animate-pulse py-10 text-center text-slate-500">Cargando productos...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {productosFiltrados.map(producto => (
                <button
                  key={producto.id}
                  onClick={() => agregar(producto)}
                  disabled={producto.tipo === 'bien' && Number(producto.stock) <= 0}
                  className={`${cardClass} flex flex-col p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md`}
                >
                  <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    {producto.image && <img src={producto.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{producto.title}</span>
                  <span className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(producto.price)}</span>
                    {producto.tipo === 'bien' && (
                      <span className={`text-xs ${Number(producto.stock) <= 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {Number(producto.stock) <= 0 ? 'Agotado' : `Stock ${producto.stock}`}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {productosFiltrados.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500">
                  {errorProductos ? (
                    <p className="text-red-600 dark:text-red-400">No se pudieron cargar los productos: {errorProductos}</p>
                  ) : productos.length === 0 ? (
                    <p>No hay productos para el punto de venta. En Inventario revisa que estén marcados como "POS" y que sean bienes o combos.</p>
                  ) : (
                    <p>Ningún producto coincide con la búsqueda o la categoría.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className={`${cardClass} h-fit space-y-5 p-5 lg:sticky lg:top-6`}>
          <h2 className="font-semibold text-slate-900 dark:text-white">Venta actual</h2>

          {carrito.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Agrega productos para empezar.</p>
          ) : (
            <ul className="max-h-72 space-y-3 overflow-y-auto">
              {carrito.map(linea => (
                <li key={linea.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{linea.title}</p>
                    <p className="text-xs text-slate-500">{formatPrice(linea.price)} c/u</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
                    <button onClick={() => cambiarCantidad(linea.id, linea.quantity - 1)} aria-label="Disminuir" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{linea.quantity}</span>
                    <button onClick={() => cambiarCantidad(linea.id, linea.quantity + 1)} aria-label="Aumentar" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => cambiarCantidad(linea.id, 0)} aria-label="Quitar" className="text-slate-400 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <label htmlFor="descuento" className={labelClass}>Descuento (%)</label>
            <input
              id="descuento"
              type="number" min="0" max="100" step="0.01"
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className={inputClass}
            />
          </div>

          <dl className="space-y-1 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            {descuentoMonto > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>Descuento</dt><dd>-{formatPrice(descuentoMonto)}</dd></div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>IVA (13%)</dt><dd>{formatPrice(iva)}</dd></div>
            <div className="flex justify-between pt-2 text-xl font-bold text-slate-900 dark:text-white"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>

          <div>
            <p className={labelClass}>Documento</p>
            <div className="mt-2 space-y-2">
              {DOCUMENTOS.filter(d => d.value === 'ticket' || puedeFacturar).map(d => (
                <label
                  key={d.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition ${
                    documento === d.value
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <input type="radio" name="documento" checked={documento === d.value} onChange={() => setDocumento(d.value)} className="accent-indigo-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">{d.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{d.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
            {!puedeFacturar && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Tu rol no puede emitir facturas.</p>
            )}

            {documento !== 'ticket' && (
              <div className="mt-3">
                <label htmlFor="cliente" className={labelClass}>
                  Cliente {clienteRequerido ? '(obligatorio)' : '(opcional)'}
                </label>
                <select id="cliente" value={clienteId} onChange={e => setClienteId(e.target.value)} className={inputClass}>
                  <option value="">{clienteRequerido ? 'Selecciona un cliente' : 'Consumidor final'}</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {clienteSeleccionado && clienteRequerido && (!clienteSeleccionado.nit || !clienteSeleccionado.nrc) && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">Este cliente no tiene NIT y NRC: no puede recibir crédito fiscal.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <p className={labelClass}>Método de pago</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {METODOS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    metodo === m.value
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {metodo === 'efectivo' && (
            <div>
              <label htmlFor="recibido" className={labelClass}>Monto recibido</label>
              <input
                id="recibido"
                type="number" min="0" step="0.01"
                value={recibido}
                onChange={e => setRecibido(e.target.value)}
                className={inputClass}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {carrito.length > 0 && (
                  <button onClick={() => setRecibido(total.toFixed(2))} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    Exacto
                  </button>
                )}
                {[5, 10, 20].map(billete => (
                  <button key={billete} onClick={() => setRecibido(String(billete))} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    ${billete}
                  </button>
                ))}
              </div>
              {recibido && carrito.length > 0 && (
                <p className={`mt-2 text-sm font-semibold ${cambio < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {cambio < 0 ? `Faltan ${formatPrice(-cambio)}` : `Cambio: ${formatPrice(cambio)}`}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={imprimir} onChange={e => setImprimir(e.target.checked)} className="accent-indigo-600" />
              Imprimir ticket
            </label>
            {imprimir && (
              <select value={impresoraId} onChange={e => setImpresoraId(e.target.value)} className={inputClass}>
                {impresoras.length === 0 && <option value="">Sin impresoras configuradas</option>}
                {impresoras.map(i => (
                  <option key={i.id} value={i.id}>{i.nombre} ({i.ancho_papel} mm)</option>
                ))}
              </select>
            )}
          </div>

          <button onClick={cobrar} disabled={!puedeCobrar} className={`${primaryButtonClass} py-3 text-base`}>
            {procesando ? 'Registrando...' : `Cobrar ${formatPrice(total)}`}
          </button>
        </aside>
      </div>

      {cerrandoCaja && (
        <CierreCaja
          caja={caja}
          token={token}
          impresoraId={impresoraId}
          onCancelar={() => setCerrandoCaja(false)}
          onCerrada={() => { setCerrandoCaja(false); setCaja(null); }}
        />
      )}

      {resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="w-full max-w-sm space-y-4">
            <div className="rounded-2xl bg-white p-2 shadow-2xl">
              <Recibo venta={resultado.venta} />
            </div>

            {resultado.venta.factura && (
              <p className="rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-slate-800 shadow">
                Enviado a Facturación: {resultado.venta.factura.numero}
              </p>
            )}

            {resultado.impresion && (
              <p className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${
                resultado.impresion.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {resultado.impresion.ok ? resultado.impresion.detail : `No se imprimió: ${resultado.impresion.detail}`}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 font-semibold text-slate-900 shadow hover:bg-slate-50">
                <PrinterIcon className="h-5 w-5" /> Imprimir en navegador
              </button>
              <button onClick={reimprimir} className="rounded-lg bg-white px-3 py-2.5 font-semibold text-slate-900 shadow hover:bg-slate-50">
                Reimprimir
              </button>
              <button onClick={abrirCajonCaja} className="rounded-lg bg-white px-3 py-2.5 font-semibold text-slate-900 shadow hover:bg-slate-50">
                Abrir cajón
              </button>
              <button onClick={() => setResultado(null)} className="rounded-lg bg-indigo-600 px-3 py-2.5 font-semibold text-white shadow hover:bg-indigo-700">
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
