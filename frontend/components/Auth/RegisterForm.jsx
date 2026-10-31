import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { registerUser } from '../../api/ApisCrud';
import { sitio } from '../../config/sitio';

const fieldClass =
  'block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300';

const iconClass = 'pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400';

// DRF devuelve los errores de cada campo como listas; los unimos en un texto
const mensajeError = (valor) => (Array.isArray(valor) ? valor.join(' ') : valor);

// ----------------- COMPONENTES AUXILIARES -----------------
const Campo = ({ id, label, icon: Icon, error, children }) => (
  <div>
    <label htmlFor={id} className={labelClass}>{label}</label>
    <div className="relative mt-1.5">
      <Icon className={iconClass} />
      {children}
    </div>
    {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{mensajeError(error)}</p>}
  </div>
);

// ----------------- COMPONENTE PRINCIPAL -----------------
const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', password2: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({ password: false, password2: false });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Las contraseñas no coinciden' });
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(formData);
      if (res.status === 201) {
        toast.success('¡Cuenta creada! Ahora puedes iniciar sesión.');
        setFormData({ username: '', email: '', password: '', password2: '' });
        navigate('/login');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const general = data.detail || data.non_field_errors;
        setErrors(general ? { ...data, general } : data);
      } else {
        setErrors({ general: 'Error de conexión' });
      }
      toast.error('No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const mostrar = (name) => setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/30">
            {sitio.nombre.charAt(0)}
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Regístrate en {sitio.nombre} para poder comprar.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
          {errors.general && (
            <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{mensajeError(errors.general)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Campo id="username" label="Usuario" icon={UserIcon} error={errors.username}>
              <input id="username" type="text" name="username" value={formData.username} onChange={handleChange} required autoComplete="username" placeholder="Elige un usuario" className={fieldClass} />
            </Campo>

            <Campo id="email" label="Correo electrónico" icon={EnvelopeIcon} error={errors.email}>
              <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" placeholder="tucorreo@ejemplo.com" className={fieldClass} />
            </Campo>

            <Campo id="password" label="Contraseña" icon={LockClosedIcon} error={errors.password}>
              <input id="password" type={showPassword.password ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required autoComplete="new-password" placeholder="••••••••" className={`${fieldClass} pr-10`} />
              <button type="button" onClick={() => mostrar('password')} aria-label={showPassword.password ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200">
                {showPassword.password ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </Campo>

            <Campo id="password2" label="Confirmar contraseña" icon={LockClosedIcon} error={errors.password2}>
              <input id="password2" type={showPassword.password2 ? 'text' : 'password'} name="password2" value={formData.password2} onChange={handleChange} required autoComplete="new-password" placeholder="••••••••" className={`${fieldClass} pr-10`} />
              <button type="button" onClick={() => mostrar('password2')} aria-label={showPassword.password2 ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200">
                {showPassword.password2 ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </Campo>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900">
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Inicia sesión</Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link to="/" className="text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
