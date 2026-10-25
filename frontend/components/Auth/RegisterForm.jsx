import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { registerUser } from '../../api/ApisCrud';
import { inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

// ----------------- COMPONENTES AUXILIARES -----------------
const InputGroup = ({ type, name, label, value, handleChange, errors, autoComplete }) => (
  <div>
    <label htmlFor={name} className={labelClass}>{label}</label>
    <input
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={handleChange}
      autoComplete={autoComplete}
      className={inputClass}
      required
    />
    {errors[name] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[name]}</p>}
  </div>
);

const PasswordInput = ({ name, label, value, handleChange, showPassword, setShowPassword, errors, autoComplete }) => (
  <div>
    <label htmlFor={name} className={labelClass}>{label}</label>
    <div className="relative">
      <input
        id={name}
        type={showPassword[name] ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={handleChange}
        autoComplete={autoComplete}
        className={`${inputClass} pr-10`}
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword(prev => ({ ...prev, [name]: !prev[name] }))}
        aria-label={showPassword[name] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        {showPassword[name] ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
    {errors[name] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[name]}</p>}
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
      setErrors(err.response?.data || { general: 'Error de conexión' });
      toast.error('No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Regístrate para poder comprar.</p>

        {errors.general && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <InputGroup type="text" name="username" label="Usuario" value={formData.username} handleChange={handleChange} errors={errors} autoComplete="username" />
          <InputGroup type="email" name="email" label="Correo electrónico" value={formData.email} handleChange={handleChange} errors={errors} autoComplete="email" />
          <PasswordInput name="password" label="Contraseña" value={formData.password} handleChange={handleChange} showPassword={showPassword} setShowPassword={setShowPassword} errors={errors} autoComplete="new-password" />
          <PasswordInput name="password2" label="Confirmar contraseña" value={formData.password2} handleChange={handleChange} showPassword={showPassword} setShowPassword={setShowPassword} errors={errors} autoComplete="new-password" />

          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
