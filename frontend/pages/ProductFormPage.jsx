import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { createProduct, deleteProduct, getProduct, updateProduct } from '../api/ApisCrud';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../utils/ui';

const TIPOS = [
  { value: 'bien', label: 'Bien', descripcion: 'Producto físico con existencias en inventario.' },
  { value: 'servicio', label: 'Servicio', descripcion: 'Trabajo o servicio. No descuenta inventario.' },
  { value: 'combo', label: 'Combo', descripcion: 'Se vende junto. Descuenta los productos que lo forman.' },
  { value: 'kit', label: 'Kit', descripcion: 'Armado a partir de componentes. No se vende en POS.' },
];

const CANALES = [
  { campo: 'visible_pos', label: 'Punto de venta' },
  { campo: 'visible_ventas', label: 'Ventas y cotizaciones' },
  { campo: 'visible_compras', label: 'Compras' },
  { campo: 'visible_tienda', label: 'Tienda en línea' },
];

const VACIO = {
  title: '', description: '', price: '', tipo: 'bien', codigo_barras: '',
  visible_pos: true, visible_ventas: true, visible_compras: true, visible_tienda: true,
};

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editando = Boolean(id);

  const [datos, setDatos] = useState(VACIO);
  const [imagenActual, setImagenActual] = useState(null);
  const [imagenNueva, setImagenNueva] = useState(null);
  const [stock, setStock] = useState(null);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (!editando) return;
    getProduct(id)
      .then(res => {
        const p = res.data;
        setDatos({
          title: p.title, description: p.description, price: p.price, tipo: p.tipo || 'bien',
          codigo_barras: p.codigo_barras || '',
          visible_pos: p.visible_pos, visible_ventas: p.visible_ventas,
          visible_compras: p.visible_compras, visible_tienda: p.visible_tienda,
        });
        setImagenActual(p.image);
        setStock(p.stock);
      })
      .catch(() => toast.error('No se pudo cargar el producto'))
      .finally(() => setCargando(false));
  }, [id, editando]);

  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrores({});

    const formData = new FormData();
    Object.entries(datos).forEach(([clave, valor]) => formData.append(clave, valor));
    if (imagenNueva) formData.append('image', imagenNueva);

    try {
      if (editando) {
        await updateProduct(id, formData);
        toast.success('Producto actualizado');
      } else {
        await createProduct(formData);
        toast.success('Producto creado');
      }
      navigate('/erp/inventario');
    } catch (err) {
      setErrores(err.response?.data || {});
      toast.error('Revisa los campos marcados');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = () => {
    toast('¿Eliminar este producto?', {
      description: 'Esta acción no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteProduct(id);
            toast.success('Producto eliminado');
            navigate('/erp/inventario');
          } catch {
            toast.error('No se pudo eliminar. Puede estar usado en ventas o facturas.');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => toast.dismiss() },
      duration: 10000,
    });
  };

  if (cargando) {
    return <p className="animate-pulse py-20 text-center text-slate-500">Cargando producto...</p>;
  }

  const tipoActual = TIPOS.find(t => t.value === datos.tipo);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/erp/inventario" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Volver al inventario</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {editando ? 'Editar producto' : 'Nuevo producto'}
          </h1>
        </div>
        {editando && stock !== null && tipoActual && datos.tipo === 'bien' && (
          <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm dark:bg-slate-800">
            Existencias actuales: <span className="font-bold text-slate-900 dark:text-white">{stock}</span>
          </div>
        )}
      </header>

      <form onSubmit={guardar} className="space-y-6">
        <section className={`${cardClass} space-y-5 p-6`}>
          <h2 className="font-semibold text-slate-900 dark:text-white">Información general</h2>

          <div>
            <label htmlFor="title" className={labelClass}>Nombre</label>
            <input id="title" required maxLength={50} value={datos.title} onChange={e => cambiar('title', e.target.value)} className={inputClass} />
            {errores.title && <p className="mt-1 text-sm text-red-600">{errores.title.join(' ')}</p>}
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>Descripción</label>
            <textarea id="description" required rows={3} value={datos.description} onChange={e => cambiar('description', e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="codigo_barras" className={labelClass}>Código de barras</label>
            <input id="codigo_barras" value={datos.codigo_barras} onChange={e => cambiar('codigo_barras', e.target.value)} placeholder="Escanea o escribe el código" className={inputClass} />
            {errores.codigo_barras && <p className="mt-1 text-sm text-red-600">{errores.codigo_barras.join(' ')}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="price" className={labelClass}>Precio de venta (USD)</label>
              <input id="price" type="number" min="0" step="0.01" required value={datos.price} onChange={e => cambiar('price', e.target.value)} className={inputClass} />
              {errores.price && <p className="mt-1 text-sm text-red-600">{errores.price.join(' ')}</p>}
            </div>
            <div>
              <label htmlFor="image" className={labelClass}>Imagen</label>
              <input id="image" type="file" accept="image/*" onChange={e => setImagenNueva(e.target.files[0] || null)} className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200" />
              {(imagenNueva || imagenActual) && (
                <img
                  src={imagenNueva ? URL.createObjectURL(imagenNueva) : imagenActual}
                  alt="Vista previa"
                  className="mt-3 h-24 w-24 rounded-lg object-cover"
                />
              )}
            </div>
          </div>
        </section>

        <section className={`${cardClass} space-y-5 p-6`}>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Tipo de producto</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Define cómo se vende y si afecta el inventario.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TIPOS.map(tipo => (
              <label
                key={tipo.value}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  datos.tipo === tipo.value
                    ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                <input type="radio" name="tipo" value={tipo.value} checked={datos.tipo === tipo.value} onChange={() => cambiar('tipo', tipo.value)} className="sr-only" />
                <span className="block font-semibold text-slate-900 dark:text-white">{tipo.label}</span>
                <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{tipo.descripcion}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={`${cardClass} space-y-4 p-6`}>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Dónde se usa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Un producto puede ser solo para uso interno (por ejemplo, papel de oficina) o estar disponible en varios canales.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CANALES.map(canal => (
              <label key={canal.campo} className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={datos[canal.campo]} onChange={e => cambiar(canal.campo, e.target.checked)} className="accent-indigo-600" />
                {canal.label}
              </label>
            ))}
          </div>
          {tipoActual && datos.tipo === 'kit' && datos.visible_pos && (
            <p className="text-sm text-amber-700 dark:text-amber-400">Los kits no se venden en el punto de venta; se ignorará esa opción.</p>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {editando ? (
            <button type="button" onClick={eliminar} className="rounded-lg px-4 py-2.5 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
              Eliminar producto
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <Link to="/erp/inventario" className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            <button type="submit" disabled={guardando} className={`${primaryButtonClass} w-auto px-6`}>
              {guardando ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
