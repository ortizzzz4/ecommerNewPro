import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { getResenas } from '../api/ApisCrud';
import { imagenes, pasos, servicios, sitio } from '../config/sitio';
import { toList } from '../utils/data';
import { cardClass } from '../utils/ui';

// Imagen del sitio. Si el archivo no existe, muestra el respaldo (un recuadro o un diagrama)
function Imagen({ src, alt, respaldo, className = '' }) {
  const [fallida, setFallida] = useState(false);
  if (fallida) return respaldo;
  return <img src={src} alt={alt} onError={() => setFallida(true)} className={`h-full w-full object-cover ${className}`} />;
}

// Diagrama del ERP conectado a otros sistemas: se usa mientras no haya foto de portada
function DiagramaIntegracion() {
  const nodos = [
    { x: 40, y: 40, t: 'Tienda web' },
    { x: 280, y: 40, t: 'Facturación' },
    { x: 40, y: 200, t: 'Pagos' },
    { x: 280, y: 200, t: 'Bancos' },
  ];
  return (
    <svg viewBox="0 0 360 260" className="h-full w-full p-6" role="img" aria-label="Sistemas conectados al ERP">
      {nodos.map(n => (
        <line key={n.t} x1="180" y1="130" x2={n.x + 40} y2={n.y + 20} stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 5" />
      ))}
      <rect x="130" y="100" width="100" height="60" rx="14" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeOpacity="0.8" />
      <text x="180" y="136" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">Sistema</text>
      {nodos.map(n => (
        <g key={`${n.t}-nodo`}>
          <rect x={n.x} y={n.y} width="80" height="40" rx="10" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.5" />
          <text x={n.x + 40} y={n.y + 25} textAnchor="middle" fontSize="12" fill="currentColor">{n.t}</text>
        </g>
      ))}
    </svg>
  );
}

function Estrellas({ cantidad }) {
  return (
    <span aria-label={`${cantidad} de 5 estrellas`} className="text-amber-400">
      {'★'.repeat(cantidad)}<span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - cantidad)}</span>
    </span>
  );
}

const INTERVALO_RESENAS_MS = 6000;

// Carrusel de reseñas: gira solo, se pausa con el mouse o el teclado encima,
// y no se mueve si el visitante pidió reducir el movimiento en su sistema
function CarruselResenas({ resenas }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = resenas.length;
  const actual = indice < total ? indice : 0;
  const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (total < 2 || pausado || reducirMovimiento) return undefined;
    const id = setInterval(() => setIndice(i => (i + 1) % total), INTERVALO_RESENAS_MS);
    return () => clearInterval(id);
  }, [total, pausado, reducirMovimiento]);

  const anterior = () => setIndice(i => (i - 1 + total) % total);
  const siguiente = () => setIndice(i => (i + 1) % total);

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label="Reseñas de clientes"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${actual * 100}%)` }}
        >
          {resenas.map((resena, n) => (
            <div key={resena.id} className="w-full shrink-0 px-2" aria-hidden={n !== actual}>
              <blockquote className={`${cardClass} mx-auto flex max-w-2xl flex-col gap-4 p-8`}>
                <Estrellas cantidad={resena.calificacion} />
                <p className="flex-1 text-lg text-slate-700 dark:text-slate-300">“{resena.texto}”</p>
                <footer className="flex items-center gap-3">
                  {resena.foto ? (
                    <img src={resena.foto} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {resena.nombre.charAt(0)}
                    </span>
                  )}
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">{resena.nombre}</p>
                    {(resena.cargo || resena.empresa) && (
                      <p className="text-slate-500 dark:text-slate-400">{[resena.cargo, resena.empresa].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={anterior}
            aria-label="Reseña anterior"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {resenas.map((resena, n) => (
              <button
                key={resena.id}
                type="button"
                onClick={() => setIndice(n)}
                aria-label={`Ir a la reseña ${n + 1}`}
                aria-current={n === actual}
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  n === actual ? 'w-8 bg-indigo-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={siguiente}
            aria-label="Reseña siguiente"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHomePage() {
  const [resenas, setResenas] = useState([]);
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));

  useEffect(() => {
    getResenas()
      .then(({ data }) => setResenas(toList(data)))
      .catch(() => setResenas([]));
  }, []);

  return (
    <div className="space-y-24">
      {/* Portada */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Desarrollo a medida · Integraciones</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Tus sistemas trabajando juntos, sin tareas repetidas
          </h1>
          <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">{sitio.eslogan}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/empresa/registro" className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              Probar gratis 30 días
            </Link>
            <a href="#contacto" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Solicitar propuesta
            </a>
            <a href="#servicios" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Ver servicios
            </a>
          </div>
        </div>

        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-indigo-200 shadow-xl">
          <Imagen src={imagenes.hero} alt="Sistema ERP" respaldo={<DiagramaIntegracion />} />
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="scroll-mt-24 space-y-10">
        <header className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Servicios</h2>
          <p className="text-slate-500 dark:text-slate-400">Desde el diseño de tu sistema hasta la conexión con las herramientas que ya usas.</p>
        </header>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map(servicio => {
            const Icono = servicio.icono;
            return (
              <article key={servicio.titulo} className={`${cardClass} p-6`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <Icono className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{servicio.titulo}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{servicio.texto}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Proceso */}
      <section id="proceso" className="scroll-mt-24 space-y-10">
        <header className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Cómo trabajamos</h2>
          <p className="text-slate-500 dark:text-slate-400">Un proceso claro, con entregas por etapas para que veas avances desde el inicio.</p>
        </header>
        <ol className="grid gap-6 md:grid-cols-4">
          {pasos.map((paso, indice) => (
            <li key={paso.titulo} className={`${cardClass} p-6`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{indice + 1}</span>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{paso.titulo}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trabajos */}
      <section className="space-y-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Nuestro trabajo</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {imagenes.trabajos.map(trabajo => (
            <figure key={trabajo.src} className={`${cardClass} overflow-hidden`}>
              <div className="aspect-video bg-slate-200 dark:bg-slate-800">
                <Imagen src={trabajo.src} alt={trabajo.alt} respaldo={<div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700" />} />
              </div>
              <figcaption className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">{trabajo.pie}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Reseñas */}
      <section id="resenas" className="scroll-mt-24 space-y-10">
        <header className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Lo que dicen nuestros clientes</h2>
        </header>
        {resenas.length === 0 ? (
          <p className={`${cardClass} p-8 text-center text-slate-500 dark:text-slate-400`}>
            Todavía no hay reseñas publicadas.
          </p>
        ) : (
          <CarruselResenas resenas={resenas} />
        )}
      </section>

      {/* Tienda */}
      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:p-12 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¿Buscas productos?</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Revisa nuestro catálogo en línea.</p>
        </div>
        <Link to="/productos" className="rounded-lg border border-indigo-600 px-6 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
          Ver productos
        </Link>
      </section>

      {/* Contacto */}
      <section id="contacto" className="scroll-mt-24 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-8 text-white shadow-xl sm:p-12">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Hablemos de tu proyecto</h2>
            <p className="text-indigo-100">Cuéntanos qué sistemas usas y qué quieres resolver. Te respondemos con una propuesta.</p>
          </div>
          <div className="space-y-4">
            <a href={`mailto:${sitio.correo}`} className="flex items-center gap-3 rounded-xl bg-white/10 px-5 py-4 font-medium transition hover:bg-white/20">
              <EnvelopeIcon className="h-5 w-5" /> {sitio.correo}
            </a>
            <a href={`tel:${sitio.telefono.replace(/\s/g, '')}`} className="flex items-center gap-3 rounded-xl bg-white/10 px-5 py-4 font-medium transition hover:bg-white/20">
              <PhoneIcon className="h-5 w-5" /> {sitio.telefono}
            </a>
            {!isLoggedIn && (
              <p className="pt-2 text-sm text-indigo-200">
                ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-white underline-offset-4 hover:underline">Inicia sesión</Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
