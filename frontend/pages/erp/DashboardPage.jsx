import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClientes, getCotizaciones, getFacturas, getProducts, getProveedores } from '../../api/ApisCrud';
import { erpModules } from '../../config/erpModules';
import { usePermisos } from '../../context/PermisosContext';
import { formatPrice } from '../../utils/format';
import { sumTotal, toList } from '../../utils/data';
import { cardClass, invoiceStatusLabels, statusBadgeClass } from '../../utils/ui';

function KpiCard({ label, value, hint }) {
  return (
    <div className={`${cardClass} p-5`}>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const { can } = usePermisos();
  const username = localStorage.getItem('username');

  useEffect(() => {
    Promise.allSettled([getProducts(), getClientes(), getProveedores(), getCotizaciones(), getFacturas()])
      .then(([productos, clientes, proveedores, cotizaciones, facturas]) => {
        const listOf = (result) => (result.status === 'fulfilled' ? toList(result.value.data) : []);
        const facturasList = listOf(facturas);
        const activas = facturasList.filter(f => f.status !== 'anulada');
        const porCobrar = facturasList.filter(f => f.status === 'pendiente' || f.status === 'vencida');

        setStats({
          productos: listOf(productos).length,
          clientes: listOf(clientes).length,
          proveedores: listOf(proveedores).length,
          cotizaciones: listOf(cotizaciones).length,
          facturado: sumTotal(activas),
          porCobrar: sumTotal(porCobrar),
        });
        setRecentInvoices(facturasList.slice(0, 5));
      });
  }, []);

  const value = (key, format = (v) => v) => (stats ? format(stats[key]) : '—');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Panel general</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          {username ? `Hola, ${username}. ` : ''}Resumen de tu negocio.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Productos" value={value('productos')} />
        <KpiCard label="Clientes" value={value('clientes')} />
        <KpiCard label="Proveedores" value={value('proveedores')} />
        <KpiCard label="Cotizaciones" value={value('cotizaciones')} />
        <KpiCard label="Facturado" value={value('facturado', formatPrice)} hint="Sin facturas anuladas" />
        <KpiCard label="Por cobrar" value={value('porCobrar', formatPrice)} hint="Pendientes y vencidas" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${cardClass} lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Facturas recientes</h2>
            <Link to="/facturas" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Ver todas
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Aún no hay facturas registradas.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentInvoices.map(factura => (
                <li key={factura.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{factura.numero}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{factura.nombre_cliente || 'Sin cliente'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={statusBadgeClass(factura.status)}>{invoiceStatusLabels[factura.status] || factura.status}</span>
                    <span className="w-24 text-right font-semibold text-slate-900 dark:text-white">{formatPrice(factura.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardClass} p-4`}>
          <h2 className="px-2 pb-2 font-semibold text-slate-900 dark:text-white">Módulos</h2>
          <div className="space-y-1">
            {erpModules.filter(module => can(module.perm)).map(module => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.id}
                  to={module.path}
                  target={module.externo ? '_blank' : undefined}
                  rel={module.externo ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Icon className="h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{module.title}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{module.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
