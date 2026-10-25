import { useEffect, useState } from 'react';
import {
  getBalanceGeneral, getBalanza, getCuentas, getEstadoResultados, getLibroDiario, getLibroMayor,
} from '../../../api/ApisCrud';
import { formatPrice } from '../../../utils/format';
import { toList } from '../../../utils/data';
import { cardClass, inputClass, labelClass } from '../../../utils/ui';

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioDeAnio = () => `${new Date().getFullYear()}-01-01`;

// Los montos llegan como texto ("12.50"). El saldo se muestra con D (deudor) o A (acreedor)
const monto = (valor) => formatPrice(Number(valor) || 0);
const saldo = (valor) => {
  const numero = Number(valor) || 0;
  if (numero === 0) return '—';
  return `${formatPrice(Math.abs(numero))} ${numero > 0 ? 'D' : 'A'}`;
};

// Carga un reporte cada vez que cambian sus parámetros. Con params = null no hace nada todavía
function useReporte(consulta, params) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const clave = JSON.stringify(params);

  useEffect(() => {
    if (params === null) return undefined;
    let vigente = true;
    setDatos(null);
    setError('');
    consulta(params)
      .then(({ data }) => { if (vigente) setDatos(data); })
      .catch(err => { if (vigente) setError(err.response?.data?.detail || 'No se pudo cargar el reporte.'); });
    return () => { vigente = false; };
  }, [clave]);

  return { datos, error };
}

function Estado({ mensaje }) {
  return <p className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">{mensaje}</p>;
}

function Tabla({ cabeceras, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            {cabeceras.map(([texto, alineacion]) => (
              <th key={texto} className={`px-5 py-3 ${alineacion === 'right' ? 'text-right' : ''}`}>{texto}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

// Filtros de fechas: "desde" y "hasta", o solo "hasta" para reportes a una fecha (balance)
export function FiltroPeriodo({ desde, hasta, onChange, soloHasta = false }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {!soloHasta && (
        <div>
          <label htmlFor="desde" className={labelClass}>Desde</label>
          <input id="desde" type="date" value={desde} onChange={e => onChange({ desde: e.target.value, hasta })} className={`${inputClass} mt-0`} />
        </div>
      )}
      <div>
        <label htmlFor="hasta" className={labelClass}>{soloHasta ? 'Al' : 'Hasta'}</label>
        <input id="hasta" type="date" value={hasta} onChange={e => onChange({ desde, hasta: e.target.value })} className={`${inputClass} mt-0`} />
      </div>
    </div>
  );
}

export const periodoInicial = () => ({ desde: inicioDeAnio(), hasta: hoy() });

// Parámetros del reporte sin fechas vacías (la API usa su valor por defecto)
const sinVacios = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined));

export function LibroDiario({ periodo }) {
  const { datos, error } = useReporte(getLibroDiario, sinVacios(periodo));
  if (error) return <Estado mensaje={error} />;
  if (!datos) return <Estado mensaje="Cargando..." />;
  if (datos.length === 0) return <Estado mensaje="No hay asientos en este periodo." />;

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {datos.map(asiento => (
        <div key={asiento.id} className="px-5 py-4">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
            #{asiento.numero} · {asiento.fecha} · {asiento.descripcion}
            <span className="ml-2 text-xs font-normal text-slate-500">{asiento.origen}{asiento.referencia ? ` · ${asiento.referencia}` : ''}</span>
          </p>
          <Tabla cabeceras={[['Cuenta'], ['Descripción'], ['Debe', 'right'], ['Haber', 'right']]}>
            {asiento.partidas.map((p, i) => (
              <tr key={i} className="text-slate-700 dark:text-slate-300">
                <td className="px-5 py-2 font-mono text-xs">{p.codigo} {p.cuenta}</td>
                <td className="px-5 py-2">{p.descripcion || '—'}</td>
                <td className="px-5 py-2 text-right">{Number(p.debe) ? monto(p.debe) : ''}</td>
                <td className="px-5 py-2 text-right">{Number(p.haber) ? monto(p.haber) : ''}</td>
              </tr>
            ))}
          </Tabla>
        </div>
      ))}
    </div>
  );
}

export function LibroMayor({ periodo }) {
  const [cuentas, setCuentas] = useState([]);
  const [cuenta, setCuenta] = useState('');

  useEffect(() => {
    getCuentas().then(({ data }) => {
      const detalle = toList(data).filter(c => c.acepta_movimientos);
      setCuentas(detalle);
      setCuenta(actual => actual || (detalle[0] ? String(detalle[0].id) : ''));
    });
  }, []);

  const { datos, error } = useReporte(getLibroMayor, cuenta ? { cuenta, ...sinVacios(periodo) } : null);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cuenta-mayor" className={labelClass}>Cuenta</label>
        <select id="cuenta-mayor" value={cuenta} onChange={e => setCuenta(e.target.value)} className={`${inputClass} mt-0 max-w-md`}>
          {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
        </select>
      </div>

      {!cuenta ? <Estado mensaje="Carga el plan de cuentas para ver el libro mayor." />
        : error ? <Estado mensaje={error} />
        : !datos ? <Estado mensaje="Cargando..." />
        : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Saldo inicial: <span className="font-semibold text-slate-900 dark:text-white">{saldo(datos.saldo_inicial)}</span>
              {' · '}Saldo final: <span className="font-semibold text-slate-900 dark:text-white">{saldo(datos.cuenta.saldo)}</span>
            </p>
            <div className={`${cardClass} overflow-hidden`}>
              {datos.movimientos.length === 0 ? <Estado mensaje="Esta cuenta no tiene movimientos en el periodo." /> : (
                <Tabla cabeceras={[['Fecha'], ['Asiento'], ['Descripción'], ['Debe', 'right'], ['Haber', 'right'], ['Saldo', 'right']]}>
                  {datos.movimientos.map((m, i) => (
                    <tr key={i} className="text-slate-700 dark:text-slate-300">
                      <td className="px-5 py-2">{m.fecha}</td>
                      <td className="px-5 py-2">#{m.numero}{m.referencia ? ` · ${m.referencia}` : ''}</td>
                      <td className="px-5 py-2">{m.descripcion}</td>
                      <td className="px-5 py-2 text-right">{Number(m.debe) ? monto(m.debe) : ''}</td>
                      <td className="px-5 py-2 text-right">{Number(m.haber) ? monto(m.haber) : ''}</td>
                      <td className="px-5 py-2 text-right font-semibold text-slate-900 dark:text-white">{saldo(m.saldo)}</td>
                    </tr>
                  ))}
                </Tabla>
              )}
            </div>
          </>
        )}
    </div>
  );
}

export function Balanza({ periodo }) {
  const { datos, error } = useReporte(getBalanza, sinVacios(periodo));
  if (error) return <Estado mensaje={error} />;
  if (!datos) return <Estado mensaje="Cargando..." />;
  if (datos.cuentas.length === 0) return <Estado mensaje="Todavía no hay movimientos contabilizados." />;

  const { totales } = datos;
  return (
    <div className={`${cardClass} overflow-hidden`}>
      <Tabla cabeceras={[['Código'], ['Cuenta'], ['Saldo inicial', 'right'], ['Debe', 'right'], ['Haber', 'right'], ['Saldo final', 'right']]}>
        {datos.cuentas.map(c => (
          <tr key={c.codigo} className="text-slate-700 dark:text-slate-300">
            <td className="px-5 py-2 font-mono text-xs">{c.codigo}</td>
            <td className="px-5 py-2">{c.nombre}</td>
            <td className="px-5 py-2 text-right">{saldo(c.saldo_inicial)}</td>
            <td className="px-5 py-2 text-right">{monto(c.debe)}</td>
            <td className="px-5 py-2 text-right">{monto(c.haber)}</td>
            <td className="px-5 py-2 text-right font-semibold text-slate-900 dark:text-white">{saldo(c.saldo_final)}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-semibold text-slate-900 dark:bg-slate-800/60 dark:text-white">
          <td className="px-5 py-3" colSpan={2}>Totales</td>
          <td className="px-5 py-3" />
          <td className="px-5 py-3 text-right">{monto(totales.debe)}</td>
          <td className="px-5 py-3 text-right">{monto(totales.haber)}</td>
          <td className="px-5 py-3 text-right">{monto(totales.saldo_deudor)} D · {monto(totales.saldo_acreedor)} A</td>
        </tr>
      </Tabla>
    </div>
  );
}

function Seccion({ titulo, total, cuentas }) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white">{titulo}</h3>
        <span className="font-semibold text-slate-900 dark:text-white">{monto(total)}</span>
      </div>
      {cuentas.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">Sin saldos.</p> : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {cuentas.map(c => (
            <li key={c.codigo} className="flex justify-between px-5 py-2 text-sm text-slate-700 dark:text-slate-300">
              <span>{c.codigo} {c.nombre}</span>
              <span>{monto(c.saldo)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BalanceGeneral({ periodo }) {
  const { datos, error } = useReporte(getBalanceGeneral, { hasta: periodo.hasta });
  if (error) return <Estado mensaje={error} />;
  if (!datos) return <Estado mensaje="Cargando..." />;

  return (
    <div className="space-y-4">
      <p className={`text-sm font-medium ${datos.cuadra ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
        {datos.cuadra ? 'Activo = Pasivo + Patrimonio ✓' : 'El balance no cuadra: revisa los asientos.'}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Activo" total={Number(datos.activo.total)} cuentas={datos.activo.cuentas} />
        <div className="space-y-4">
          <Seccion titulo="Pasivo" total={Number(datos.pasivo.total)} cuentas={datos.pasivo.cuentas} />
          <Seccion titulo="Patrimonio" total={Number(datos.patrimonio.total)} cuentas={datos.patrimonio.cuentas} />
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            Incluye la utilidad del ejercicio ({monto(datos.patrimonio.resultado_del_ejercicio)}) hasta que se cierre.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EstadoResultados({ periodo }) {
  const { datos, error } = useReporte(getEstadoResultados, sinVacios(periodo));
  if (error) return <Estado mensaje={error} />;
  if (!datos) return <Estado mensaje="Cargando..." />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Seccion titulo="Ingresos" total={Number(datos.ingresos.total)} cuentas={datos.ingresos.cuentas} />
        <Seccion titulo="Costos" total={Number(datos.costos.total)} cuentas={datos.costos.cuentas} />
      </div>
      <div className="space-y-4">
        <Seccion titulo="Gastos" total={Number(datos.gastos.total)} cuentas={datos.gastos.cuentas} />
        <div className={`${cardClass} space-y-2 p-5 text-sm`}>
          <div className="flex justify-between text-slate-700 dark:text-slate-300"><span>Utilidad bruta</span><span>{monto(datos.utilidad_bruta)}</span></div>
          <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white">
            <span>Utilidad neta</span><span>{monto(datos.utilidad_neta)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
