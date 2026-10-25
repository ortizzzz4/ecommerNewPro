import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlusIcon } from '@heroicons/react/24/outline';
import {
  deleteCategoria,
  getCategorias,
  getProducts,
  saveCategoria,
  setProductCategorias,
} from '../../api/ApisCrud';
import { AjusteStock } from '../../components/inventario/AjusteStock';
import { ComponentesProducto } from '../../components/inventario/ComponentesProducto';
import { usePermisos } from '../../context/PermisosContext';
import { formatPrice } from '../../utils/format';
import { toList } from '../../utils/data';
import { cardClass, inputClass, primaryButtonClass } from '../../utils/ui';

const TIPO_ETIQUETA = { bien: 'Bien', servicio: 'Servicio', combo: 'Combo', kit: 'Kit' };
const TIPO_COLOR = {
  bien: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  servicio: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  combo: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  kit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};
const CANALES = [
  { campo: 'visible_pos', etiqueta: 'POS' },
  { campo: 'visible_ventas', etiqueta: 'Ventas' },
  { campo: 'visible_compras', etiqueta: 'Compras' },
  { campo: 'visible_tienda', etiqueta: 'Tienda' },
];

function CategoriasPanel({ categorias, puedeEditar, onCambio }) {
  const [form, setForm] = useState(null); // {id?, title, description}
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await saveCategoria(form.id, { title: form.title, description: form.description });
      toast.success('Categoría guardada');
      setForm(null);
      onCambio();
    } catch (err) {
      toast.error(err.response?.data?.title?.[0] || 'No se pudo guardar la categoría');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (categoria) => {
    if (!window.confirm(`¿Eliminar la categoría "${categoria.title}"? Los productos no se borran.`)) return;
    try {
      await deleteCategoria(categoria.id);
      toast.success('Categoría eliminada');
      onCambio();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <section className={`${cardClass} space-y-4 p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-white">Categorías</h2>
        {puedeEditar && !form && (
          <button onClick={() => setForm({ title: '', description: '' })} className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            <PlusIcon className="h-4 w-4" /> Nueva
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={guardar} className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <input required placeholder="Nombre (ej. Bebidas)" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} />
          <input placeholder="Descripción (opcional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(null)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
            <button type="submit" disabled={guardando} className={`${primaryButtonClass} flex-1 py-2`}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {categorias.map(cat => (
          <li key={cat.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-white">{cat.title}</p>
              <p className="text-xs text-slate-500">{cat.productos.length} producto(s)</p>
            </div>
            {puedeEditar && (
              <div className="flex gap-3 text-sm">
                <button onClick={() => setForm({ id: cat.id, title: cat.title, description: cat.description || '' })} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Editar</button>
                <button onClick={() => eliminar(cat)} className="font-semibold text-red-600 hover:underline">Eliminar</button>
              </div>
            )}
          </li>
        ))}
        {categorias.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Aún no hay categorías.</li>}
      </ul>
    </section>
  );
}

function CategoriasProducto({ producto, categorias, onCerrar, onGuardado }) {
  const [seleccion, setSeleccion] = useState(producto.categorias || []);
  const [guardando, setGuardando] = useState(false);

  const toggle = (id) => {
    setSeleccion(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await setProductCategorias(producto.id, seleccion);
      toast.success('Categorías actualizadas');
      onGuardado();
    } catch {
      toast.error('No se pudieron guardar las categorías');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className={`${cardClass} w-full max-w-md space-y-4 p-6`}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Categorías de {producto.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">El producto aparecerá en estas categorías dentro del POS.</p>
        </div>

        {categorias.length === 0 ? (
          <p className="text-sm text-slate-500">Primero crea una categoría en el panel de la izquierda.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {categorias.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={seleccion.includes(cat.id)} onChange={() => toggle(cat.id)} className="accent-indigo-600" />
                {cat.title}
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className={`${primaryButtonClass} w-auto px-5`}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InventarioPage() {
  const { can } = usePermisos();
  const puedeGestionarCategorias = can('categories.add_category') || can('categories.change_category');
  const puedeEditarProductos = can('products.change_product');
  const puedeMovimientos = can('inventario.add_movimientoinventario');

  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [editandoCategorias, setEditandoCategorias] = useState(null);
  const [ajustando, setAjustando] = useState(null);
  const [componentesDe, setComponentesDe] = useState(null);

  const cargarProductos = () => getProducts()
    .then(res => setProductos(toList(res.data)))
    .catch(() => setError(true));

  const cargarCategorias = () => getCategorias()
    .then(res => setCategorias(toList(res.data)))
    .catch(() => setCategorias([]));

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  const recargarTodo = () => {
    cargarProductos();
    cargarCategorias();
  };

  const filtrados = (productos || []).filter(p => {
    const coincideTexto = p.title.toLowerCase().includes(query.trim().toLowerCase());
    const coincideCategoria = filtroCategoria === 'todas' || (p.categorias || []).includes(Number(filtroCategoria));
    const coincideTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
    return coincideTexto && coincideCategoria && coincideTipo;
  });

  const nombresDeCategorias = (ids) => categorias.filter(c => ids.includes(c.id)).map(c => c.title);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Inventario</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Productos, existencias y categorías. Las existencias se descuentan con cada venta.</p>
        </div>
        <Link to="/productos-create" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          <PlusIcon className="h-5 w-5" />
          Nuevo producto
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <CategoriasPanel categorias={categorias} puedeEditar={puedeGestionarCategorias} onCambio={recargarTodo} />
        </div>

        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_11rem_11rem]">
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar producto..." className={`${inputClass} mt-0`} />
            <select aria-label="Filtrar por tipo" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={`${inputClass} mt-0`}>
              <option value="todos">Todos los tipos</option>
              {Object.entries(TIPO_ETIQUETA).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
            <select aria-label="Filtrar por categoría" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className={`${inputClass} mt-0`}>
              <option value="todas">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div className={`${cardClass} overflow-hidden`}>
            {error ? (
              <p className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">No se pudo cargar el inventario.</p>
            ) : !productos ? (
              <p className="animate-pulse px-6 py-16 text-center text-slate-500 dark:text-slate-400">Cargando productos...</p>
            ) : filtrados.length === 0 ? (
              <p className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                {productos.length === 0 ? 'Aún no hay productos registrados.' : 'Ningún producto coincide con la búsqueda.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Producto</th>
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3 text-right">Existencias</th>
                      <th className="px-5 py-3 text-right">Precio</th>
                      <th className="px-5 py-3">Disponible en</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtrados.map(product => (
                      <tr key={product.id} className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <img src={product.image} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white">{product.title}</p>
                              <p className="text-xs text-slate-500">{nombresDeCategorias(product.categorias || []).join(', ') || 'Sin categoría'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIPO_COLOR[product.tipo] || TIPO_COLOR.bien}`}>
                            {TIPO_ETIQUETA[product.tipo] || 'Bien'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {product.tipo === 'bien' ? (
                            <span className={`font-semibold ${Number(product.stock) <= 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                              {product.stock}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No aplica</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-white">{formatPrice(product.price)}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {CANALES.filter(c => product[c.campo]).map(c => (
                              <span key={c.campo} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.etiqueta}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm">
                            {product.tipo === 'bien' && puedeMovimientos && (
                              <button onClick={() => setAjustando(product)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Existencias</button>
                            )}
                            {(product.tipo === 'combo' || product.tipo === 'kit') && puedeEditarProductos && (
                              <button onClick={() => setComponentesDe(product)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Componentes</button>
                            )}
                            {puedeEditarProductos && (
                              <button onClick={() => setEditandoCategorias(product)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Categorías</button>
                            )}
                            <Link to={`/productos/edit/${product.id}`} className="font-semibold text-slate-600 hover:underline dark:text-slate-300">Editar</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {editandoCategorias && (
        <CategoriasProducto
          producto={editandoCategorias}
          categorias={categorias}
          onCerrar={() => setEditandoCategorias(null)}
          onGuardado={() => { setEditandoCategorias(null); recargarTodo(); }}
        />
      )}

      {ajustando && (
        <AjusteStock
          producto={ajustando}
          onCerrar={() => setAjustando(null)}
          onGuardado={() => { setAjustando(null); recargarTodo(); }}
        />
      )}

      {componentesDe && (
        <ComponentesProducto
          producto={componentesDe}
          onCerrar={() => setComponentesDe(null)}
          onGuardado={() => { setComponentesDe(null); recargarTodo(); }}
        />
      )}
    </div>
  );
}
