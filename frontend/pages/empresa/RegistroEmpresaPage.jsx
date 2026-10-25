import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getModulosCatalogo, loginEmpresa, registrarEmpresa } from '../../api/ApisCrud';
import { inputClass, labelClass, cardClass, primaryButtonClass } from '../../utils/ui';

const VACIO = { nombre: '', slug: '', correo: '', usuario: '', password: '' };

// Registro de una empresa de prueba: se crea su propia base de datos con los módulos elegidos
export function RegistroEmpresaPage() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(VACIO);
  const [catalogo, setCatalogo] = useState([]);
  const [elegidos, setElegidos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getModulosCatalogo()
      .then(({ data }) => {
        setCatalogo(data);
        // Por defecto se marcan los módulos principales
        setElegidos(data.filter(m => !m.base).map(m => m.id));
      })
      .catch(() => setError('No se pudo cargar la lista de módulos.'));
  }, []);

  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

  const alternarModulo = (id) => setElegidos(prev =>
    prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
  );

  // Entra directo a la empresa nueva con la cuenta que acaba de crear
  const entrarA = async (slug) => {
    try {
      const { data } = await loginEmpresa(slug, datos.usuario.trim(), datos.password);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('username', datos.usuario.trim());
      window.location.href = '/erp';
    } catch {
      navigate('/empresa/ingresar', { state: { empresa: slug } });
    }
  };

  const registrar = async (e) => {
    e.preventDefault();
    setError('');
    if (elegidos.length === 0) return setError('Elige al menos un módulo.');
    setGuardando(true);
    try {
      const slug = datos.slug.trim().toLowerCase();
      await registrarEmpresa({ ...datos, slug, modulos: elegidos });
      toast.success('Empresa creada. Tienes 30 días de prueba.');
      await entrarA(slug);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo crear la empresa.');
    } finally {
      setGuardando(false);
    }
  };

  const base = catalogo.filter(m => !m.base);
  const modulosBase = catalogo.filter(m => m.base);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Prueba gratis por 30 días</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Creamos una base de datos solo para tu empresa. Elige los módulos que necesitas.
        </p>
      </header>

      <form onSubmit={registrar} className={`${cardClass} space-y-6 p-6 sm:p-8`}>
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nombre" className={labelClass}>Nombre de la empresa</label>
            <input id="nombre" required value={datos.nombre} onChange={e => cambiar('nombre', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="slug" className={labelClass}>Identificador</label>
            <input
              id="slug" required pattern="[a-z0-9][a-z0-9-]{2,39}" value={datos.slug}
              onChange={e => cambiar('slug', e.target.value.toLowerCase())}
              placeholder="mi-empresa" className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lo usarás para entrar. Solo letras, números y guiones.</p>
          </div>
          <div>
            <label htmlFor="correo" className={labelClass}>Correo</label>
            <input id="correo" type="email" required value={datos.correo} onChange={e => cambiar('correo', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="usuario" className={labelClass}>Usuario administrador</label>
            <input id="usuario" required value={datos.usuario} onChange={e => cambiar('usuario', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>Contraseña</label>
            <input id="password" type="password" required minLength={8} value={datos.password} onChange={e => cambiar('password', e.target.value)} className={inputClass} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Módulos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {base.map(modulo => (
              <label key={modulo.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="checkbox" checked={elegidos.includes(modulo.id)} onChange={() => alternarModulo(modulo.id)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{modulo.titulo}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Incluido siempre: {modulosBase.map(m => m.titulo).join(', ')}.
          </p>
        </section>

        {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={guardando} className={primaryButtonClass}>
          {guardando ? 'Creando tu empresa...' : 'Crear empresa y empezar la prueba'}
        </button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Ya tienes empresa? <Link to="/empresa/ingresar" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Ingresa aquí</Link>
        </p>
      </form>
    </div>
  );
}
