export const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300';

export const primaryButtonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400';

export const invoiceStatusLabels = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  anulada: 'Anulada',
  vencida: 'Vencida',
};

const statusStyles = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  pagada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  anulada: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  vencida: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

export const statusBadgeClass = (status) =>
  `inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] || statusStyles.anulada}`;

export const cardClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
