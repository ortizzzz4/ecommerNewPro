import React, { useState } from 'react';
import axios from 'axios';
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

// COMPONENTE: InputGroup (afuera)
const InputGroup = ({ icon: Icon, type, name, label, value, handleChange, errors }) => (
  <div>
    <label className="block text-sm font-medium text-white mb-1">
      {label}
    </label>
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
    {errors[name] && (
      <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
    )}
  </div>
);

// COMPONENTE: PasswordInput (afuera)
const PasswordInput = ({
  name,
  label,
  value,
  handleChange,
  showPassword,
  setShowPassword,
  errors
}) => (
  <div>
    <label className="block text-sm font-medium text-white mb-1">
      {label}
    </label>
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
        onClick={() =>
          setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }))
        }
        className="ml-2 text-gray-500 hover:text-gray-300"
      >
        {showPassword[name] ? (
          <EyeSlashIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    </div>
    {errors[name] && (
      <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
    )}
  </div>
);

// COMPONENTE PRINCIPAL: RegisterForm
const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    password: false,
    password2: false
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({});
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setLoading(true);

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Las contraseñas no coinciden' });
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('/api/users/register/', formData);
      setSuccess(res.data.message || 'Usuario registrado con éxito');
      setFormData({
        username: '',
        email: '',
        password: '',
        password2: ''
      });
    } catch (err) {
      setErrors(err.response?.data || { general: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-black shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold text-center mb-4 text-white">
        Registro de Usuario
      </h2>

      {success && (
        <div className="bg-green-100 text-green-800 p-2 rounded mb-3">
          {success}
        </div>
      )}
      {errors.general && (
        <div className="bg-red-100 text-red-800 p-2 rounded mb-3">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <InputGroup
          icon={UserIcon}
          type="text"
          name="username"
          label="Usuario"
          value={formData.username}
          handleChange={handleChange}
          errors={errors}
        />

        <InputGroup
          icon={EnvelopeIcon}
          type="email"
          name="email"
          label="Correo Electrónico"
          value={formData.email}
          handleChange={handleChange}
          errors={errors}
        />

        <PasswordInput
          name="password"
          label="Contraseña"
          value={formData.password}
          handleChange={handleChange}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          errors={errors}
        />

        <PasswordInput
          name="password2"
          label="Confirmar Contraseña"
          value={formData.password2}
          handleChange={handleChange}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          errors={errors}
        />

        <button
          type="submit"
          className={`w-full text-white py-2 rounded transition ${
            loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          disabled={loading}
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
