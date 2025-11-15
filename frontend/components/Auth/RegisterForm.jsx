import React, { useState } from 'react';
import { UserIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { registerUser } from '../../api/ApisCrud';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ----------------- COMPONENTES AUXILIARES -----------------
const InputGroup = ({ icon: Icon, type, name, label, value, handleChange, errors }) => (
  <div>
    <label className="block text-sm font-medium text-white mb-1">{label}</label>
    <div className="flex items-center border border-gray-600 rounded px-3 py-2 bg-black">
      <Icon className="h-5 w-5 text-gray-400 mr-2" />
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        className="w-full focus:outline-none bg-black text-white placeholder-gray-400"
        placeholder={label}
        required
      />
    </div>
    {errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>}
  </div>
);

const PasswordInput = ({ name, label, value, handleChange, showPassword, setShowPassword, errors }) => (
  <div>
    <label className="block text-sm font-medium text-white mb-1">{label}</label>
    <div className="flex items-center border border-gray-600 rounded px-3 py-2 bg-black">
      <LockClosedIcon className="h-5 w-5 text-gray-400 mr-2" />
      <input
        type={showPassword[name] ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={handleChange}
        className="w-full focus:outline-none bg-black text-white placeholder-gray-400"
        placeholder={label}
        required
      />
      <button
        type="button"
        onClick={() => setShowPassword(prev => ({ ...prev, [name]: !prev[name] }))}
        className="ml-2 text-gray-500 hover:text-gray-300"
      >
        {showPassword[name] ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
    {errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>}
  </div>
);

// ----------------- COMPONENTE PRINCIPAL -----------------
const RegisterForm = () => {
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
    setLoading(true);

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Las contraseñas no coinciden' });
      setLoading(false);
      return;
    }

    try {
      const res = await registerUser(formData);
      if (res.status === 201) {
        toast.success('🎉 ¡Usuario registrado correctamente!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
        setFormData({ username: '', email: '', password: '', password2: '' });
        setTimeout(() => window.location.href = "/productos", 3000);
      }
    } catch (err) {
      const msg = err.response?.data || { general: 'Error de conexión' };
      setErrors(msg);
      toast.error('❌ Ocurrió un error en el registro', { position: "top-right" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gradient-to-r from-indigo-900 via-blue-800 to-indigo-900">
      <ToastContainer />
      <div className="max-w-md w-full p-6 bg-black/80 shadow-lg rounded-xl border border-gray-700">
        <h2 className="text-2xl font-bold text-center mb-4 text-white">
          Registro de Usuario
        </h2>

        {errors.general && (
          <div className="bg-red-100 text-red-800 p-2 rounded mb-3 text-center">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputGroup icon={UserIcon} type="text" name="username" label="Usuario" value={formData.username} handleChange={handleChange} errors={errors} />
          <InputGroup icon={EnvelopeIcon} type="email" name="email" label="Correo Electrónico" value={formData.email} handleChange={handleChange} errors={errors} />
          <PasswordInput name="password" label="Contraseña" value={formData.password} handleChange={handleChange} showPassword={showPassword} setShowPassword={setShowPassword} errors={errors} />
          <PasswordInput name="password2" label="Confirmar Contraseña" value={formData.password2} handleChange={handleChange} showPassword={showPassword} setShowPassword={setShowPassword} errors={errors} />

          <button
            type="submit"
            className={`w-full text-white py-2 rounded transition ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
