import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getEmpresa, probarCorreoEmpresa, saveEmpresa } from '../../api/ApisCrud';
import { usePermisos } from '../../context/PermisosContext';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const DATOS_EMPRESA = [
  { campo: 'nombre_comercial', etiqueta: 'Nombre comercial' },
  { campo: 'razon_social', etiqueta: 'Razón social' },
  { campo: 'nit', etiqueta: 'NIT' },
  { campo: 'nrc', etiqueta: 'NRC' },
  { campo: 'giro', etiqueta: 'Giro o actividad económica' },
  { campo: 'telefono', etiqueta: 'Teléfono' },
  { campo: 'correo', etiqueta: 'Correo electrónico', tipo: 'email' },
  { campo: 'dominio', etiqueta: 'Dominio web (ej. miempresa.com)' },
  { campo: 'departamento', etiqueta: 'Departamento' },
  { campo: 'municipio', etiqueta: 'Municipio' },
];

// Correo saliente de la empresa: cada base de datos usa su propia cuenta
const SEGURIDAD_CORREO = [
  { valor: 'tls', etiqueta: 'STARTTLS (puerto 587)' },
  { valor: 'ssl', etiqueta: 'SSL/TLS directo (puerto 465)' },
  { valor: 'ninguna', etiqueta: 'Sin cifrado' },
];

export function ConfiguracionPage() {
  const { can } = usePermisos();
  const puedeEditar = can('empresa.change_empresa');

  const [datos, setDatos] = useState(null);
  const [faltantes, setFaltantes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [destinatarioPrueba, setDestinatarioPrueba] = useState('');
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    getEmpresa().then(res => {
      setDatos(res.data);
      setFaltantes(res.data.faltantes_fe || []);
    });
  }, []);

  if (!datos) {
    return <p className="animate-pulse py-20 text-center text-slate-500">Cargando configuración...</p>;
  }

  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

  // Se aplica al instante: carga o quita los productos, categorías y contactos de ejemplo
  const cambiarDemo = async (activar) => {
    setGuardando(true);
    try {
      const { data } = await saveEmpresa({ datos_demo: activar });
      setDatos(prev => ({ ...prev, datos_demo: data.datos_demo }));
      const resultado = data.resultado_demo;
      if (!resultado) {
        toast.info('Sin cambios');
      } else if (resultado.accion === 'activados') {
        const c = resultado.creados;
        toast.success(`Datos de demostración cargados: ${c.productos} productos, ${c.categorias} categorías, ${c.contactos} contactos`);
      } else {
        const b = resultado.borrados;
        const aviso = resultado.conservados.length
          ? ` Se conservaron ${resultado.conservados.length} porque ya tienen ventas o facturas.`
          : '';
        toast.success(`Datos de demostración quitados: ${b.productos} productos, ${b.categorias} categorías, ${b.contactos} contactos.${aviso}`);
      }
    } catch {
      toast.error('No se pudo cambiar los datos de demostración');
    } finally {
      setGuardando(false);
    }
  };

  const probarCorreo = async () => {
    setProbando(true);
    try {
      const { data } = await probarCorreoEmpresa(destinatarioPrueba);
      toast.success(data.detail);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo enviar el correo de prueba');
    } finally {
      setProbando(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data } = await saveEmpresa({
        nombre_comercial: datos.nombre_comercial, razon_social: datos.razon_social,
        nit: datos.nit, nrc: datos.nrc, giro: datos.giro, direccion: datos.direccion,
        departamento: datos.departamento, municipio: datos.municipio,
        telefono: datos.telefono, correo: datos.correo, dominio: datos.dominio, pie_ticket: datos.pie_ticket,
        correo_servidor: datos.correo_servidor, correo_puerto: datos.correo_puerto, correo_seguridad: datos.correo_seguridad,
        correo_usuario: datos.correo_usuario, correo_clave: datos.correo_clave, correo_remitente: datos.correo_remitente,
        correo_nombre_remitente: datos.correo_nombre_remitente,
        facturacion_electronica: datos.facturacion_electronica, ambiente: datos.ambiente,
        codigo_establecimiento: datos.codigo_establecimiento, codigo_punto_venta: datos.codigo_punto_venta,
      });
      setDatos(data);
      setFaltantes(data.faltantes_fe || []);
      toast.success('Configuración guardada');
    } catch (err) {
      const errores = err.response?.data || {};
      toast.error(Object.values(errores).flat().join(' ') || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Configuración de la empresa</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Estos datos aparecen en tus tickets, facturas y documentos.</p>
      </header>

      <section className={`${cardClass} grid gap-5 p-6 sm:grid-cols-2`}>
        <h2 className="sm:col-span-2 font-semibold text-slate-900 dark:text-white">Datos generales</h2>
        {DATOS_EMPRESA.map(campo => (
          <div key={campo.campo}>
            <label htmlFor={campo.campo} className={labelClass}>{campo.etiqueta}</label>
            <input
              id={campo.campo} type={campo.tipo || 'text'} disabled={!puedeEditar}
              value={datos[campo.campo] || ''} onChange={e => cambiar(campo.campo, e.target.value)}
              className={`${inputClass} disabled:opacity-60`}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="direccion" className={labelClass}>Dirección</label>
          <textarea id="direccion" rows={2} disabled={!puedeEditar} value={datos.direccion || ''} onChange={e => cambiar('direccion', e.target.value)} className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pie" className={labelClass}>Mensaje al pie del ticket</label>
          <input id="pie" disabled={!puedeEditar} value={datos.pie_ticket || ''} onChange={e => cambiar('pie_ticket', e.target.value)} className={`${inputClass} disabled:opacity-60`} />
        </div>
      </section>

      <section className={`${cardClass} grid gap-5 p-6 sm:grid-cols-2`}>
        <div className="sm:col-span-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Correo saliente</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Desde esta cuenta se envían las facturas y avisos de la empresa. Cada empresa usa su propia cuenta.
            Para Gmail usa una contraseña de aplicación, no tu contraseña normal.
          </p>
        </div>
        <div>
          <label htmlFor="correo_servidor" className={labelClass}>Servidor SMTP</label>
          <input id="correo_servidor" disabled={!puedeEditar} value={datos.correo_servidor || ''} onChange={e => cambiar('correo_servidor', e.target.value)} placeholder="smtp.gmail.com" className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="correo_puerto" className={labelClass}>Puerto</label>
            <input id="correo_puerto" type="number" min="1" max="65535" disabled={!puedeEditar} value={datos.correo_puerto || ''} onChange={e => cambiar('correo_puerto', e.target.value)} className={`${inputClass} disabled:opacity-60`} />
          </div>
          <div>
            <label htmlFor="correo_seguridad" className={labelClass}>Cifrado</label>
            <select id="correo_seguridad" disabled={!puedeEditar} value={datos.correo_seguridad || 'tls'} onChange={e => cambiar('correo_seguridad', e.target.value)} className={`${inputClass} disabled:opacity-60`}>
              {SEGURIDAD_CORREO.map(op => <option key={op.valor} value={op.valor}>{op.etiqueta}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="correo_usuario" className={labelClass}>Usuario</label>
          <input id="correo_usuario" disabled={!puedeEditar} value={datos.correo_usuario || ''} onChange={e => cambiar('correo_usuario', e.target.value)} className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div>
          <label htmlFor="correo_clave" className={labelClass}>Contraseña</label>
          <input
            id="correo_clave" type="password" autoComplete="new-password" disabled={!puedeEditar}
            value={datos.correo_clave || ''} onChange={e => cambiar('correo_clave', e.target.value)}
            placeholder={datos.correo_clave_configurada ? 'Guardada: escribe para cambiarla' : ''}
            className={`${inputClass} disabled:opacity-60`}
          />
        </div>
        <div>
          <label htmlFor="correo_remitente" className={labelClass}>Correo remitente</label>
          <input id="correo_remitente" type="email" disabled={!puedeEditar} value={datos.correo_remitente || ''} onChange={e => cambiar('correo_remitente', e.target.value)} className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div>
          <label htmlFor="correo_nombre_remitente" className={labelClass}>Nombre del remitente</label>
          <input id="correo_nombre_remitente" disabled={!puedeEditar} value={datos.correo_nombre_remitente || ''} onChange={e => cambiar('correo_nombre_remitente', e.target.value)} placeholder="Mi Empresa" className={`${inputClass} disabled:opacity-60`} />
        </div>
        <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="correo_prueba" className={labelClass}>Enviar un correo de prueba a</label>
            <input id="correo_prueba" type="email" value={destinatarioPrueba} onChange={e => setDestinatarioPrueba(e.target.value)} className={inputClass} />
          </div>
          <button
            type="button" onClick={probarCorreo} disabled={probando || !destinatarioPrueba}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {probando ? 'Enviando...' : 'Enviar prueba'}
          </button>
        </div>
        <p className="text-xs text-slate-400 sm:col-span-2">Guarda los cambios antes de enviar la prueba.</p>
      </section>

      <section className={`${cardClass} space-y-5 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Facturación electrónica</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Cada factura y crédito fiscal recibe su número de control y su código de generación del DTE.
              El envío a Hacienda requiere firma electrónica y credenciales del Ministerio, configuradas por separado.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{datos.facturacion_electronica ? 'Activa' : 'Inactiva'}</span>
            <input
              type="checkbox" disabled={!puedeEditar}
              checked={datos.facturacion_electronica}
              onChange={e => cambiar('facturacion_electronica', e.target.checked)}
              className="h-5 w-5 accent-indigo-600"
            />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="ambiente" className={labelClass}>Ambiente</label>
            <select id="ambiente" disabled={!puedeEditar} value={datos.ambiente} onChange={e => cambiar('ambiente', e.target.value)} className={`${inputClass} disabled:opacity-60`}>
              <option value="00">Pruebas</option>
              <option value="01">Producción</option>
            </select>
          </div>
          <div>
            <label htmlFor="establecimiento" className={labelClass}>Código de establecimiento</label>
            <input id="establecimiento" disabled={!puedeEditar} placeholder="M001" value={datos.codigo_establecimiento || ''} onChange={e => cambiar('codigo_establecimiento', e.target.value.toUpperCase())} className={`${inputClass} disabled:opacity-60`} />
          </div>
          <div>
            <label htmlFor="punto" className={labelClass}>Código de punto de venta</label>
            <input id="punto" disabled={!puedeEditar} placeholder="P001" value={datos.codigo_punto_venta || ''} onChange={e => cambiar('codigo_punto_venta', e.target.value.toUpperCase())} className={`${inputClass} disabled:opacity-60`} />
          </div>
        </div>

        {datos.facturacion_electronica && faltantes.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Faltan datos para la facturación electrónica: {faltantes.join(', ')}.
          </p>
        )}
      </section>

      <section className={`${cardClass} flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Datos de demostración</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Productos, categorías y contactos de ejemplo para probar el sistema. Al quitarlos se borran solo los que
            no tengan ventas ni facturas.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{datos.datos_demo ? 'Activados' : 'Desactivados'}</span>
          <input
            type="checkbox" disabled={!puedeEditar || guardando}
            checked={datos.datos_demo}
            onChange={e => cambiarDemo(e.target.checked)}
            className="h-5 w-5 accent-indigo-600"
          />
        </label>
      </section>

      {puedeEditar ? (
        <div className="flex justify-end">
          <button type="submit" disabled={guardando} className={`${primaryButtonClass} w-auto px-6`}>
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      ) : (
        <p className="text-right text-sm text-slate-500">Solo lectura: tu rol no puede cambiar la configuración.</p>
      )}
    </form>
  );
}
