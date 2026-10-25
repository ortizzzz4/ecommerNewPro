import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createContact, getContact, updateContact } from '../../api/ApisCrud';

const DEPARTAMENTOS_SV = [
  'Ahuachapán','Santa Ana','Sonsonate','Chalatenango','La Libertad',
  'San Salvador','Cuscatlán','La Paz','Cabañas','San Vicente',
  'Usulután','San Miguel','Morazán','La Unión'
];

export function ContactoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    tipo: 'cliente',
    tipo_persona: 'natural',
    nombre: '',
    nombre_fiscal: '',
    nit: '',
    nrc: '',
    email: '',
    telefono: '',
    telefono_alt: '',
    direccion: '',
    municipio: '',
    departamento: '',
    pais: 'El Salvador',
    limite_credito: 0,
    dias_credito: 0,
    descuento_defecto: 0,
    activo: true,
    nota: '',
  });

  useEffect(() => {
    if (isEdit) {
      getContact(id)
        .then(res => setForm(res.data))
        .catch(() => setError('No se pudo cargar el contacto'));
    }
  }, [id]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        await updateContact(id, form);
      } else {
        await createContact(form);
      }
      navigate(form.tipo === 'proveedor' ? '/proveedores' : '/clientes');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', required = false, placeholder = '' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mb-2"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          {isEdit ? '✏️ Editar Contacto' : '➕ Nuevo Contacto'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Clasificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="ambos">Cliente y Proveedor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Persona <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_persona"
                value={form.tipo_persona}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="natural">Persona Natural</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
            </div>
          </div>
        </div>

        {/* Datos generales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Datos Generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre" name="nombre" required placeholder="Nombre completo" />
            <Field label="Nombre Fiscal / Razón Social" name="nombre_fiscal" placeholder="Razón social (opcional)" />
            <Field label="NIT / DUI" name="nit" placeholder="0000-000000-000-0" />
            {form.tipo_persona === 'juridica' && (
              <Field label="NRC" name="nrc" placeholder="Número de Registro de Contribuyente" />
            )}
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Información de Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email" name="email" type="email" placeholder="correo@ejemplo.com" />
            <Field label="Teléfono" name="telefono" placeholder="7000-0000" />
            <Field label="Teléfono Alternativo" name="telefono_alt" placeholder="2000-0000" />
          </div>
        </div>

        {/* Dirección */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Dirección</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
              <textarea
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                rows={2}
                placeholder="Dirección completa"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Field label="Municipio" name="municipio" placeholder="Municipio" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departamento</label>
              <select
                name="departamento"
                value={form.departamento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar departamento</option>
                {DEPARTAMENTOS_SV.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <Field label="País" name="pais" />
          </div>
        </div>

        {/* Comercial */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Condiciones Comerciales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Límite de Crédito ($)" name="limite_credito" type="number" />
            <Field label="Días de Crédito" name="dias_credito" type="number" />
            <Field label="Descuento por Defecto (%)" name="descuento_defecto" type="number" />
          </div>
        </div>

        {/* Nota y estado */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white mb-4">Notas</h2>
          <textarea
            name="nota"
            value={form.nota}
            onChange={handleChange}
            rows={3}
            placeholder="Observaciones adicionales..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={handleChange}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Contacto activo</span>
          </label>
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
