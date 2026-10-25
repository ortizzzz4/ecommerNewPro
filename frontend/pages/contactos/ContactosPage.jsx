import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClientes, getProveedores, deleteContact } from '../../api/ApisCrud';

export function ContactosPage({ tipo = 'cliente' }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const esCliente = tipo === 'cliente';

  const cargar = async () => {
    setLoading(true);
    try {
      const res = esCliente ? await getClientes() : await getProveedores();
      setContactos(res.data);
    } catch {
      setError('Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [tipo]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contacto?')) return;
    try {
      await deleteContact(id);
      cargar();
    } catch {
      alert('No se pudo eliminar');
    }
  };

  const filtrados = contactos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.nit || '').includes(busqueda) ||
    (c.email || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            {esCliente ? '🧑‍💼 Clientes' : '🏢 Proveedores'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filtrados.length} {esCliente ? 'clientes' : 'proveedores'} encontrados
          </p>
        </div>
        <Link
          to="/contactos/crear"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>➕</span> Nuevo
        </Link>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, NIT o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Estado */}
      {loading && (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {/* Tabla */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">NIT</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No hay contactos registrados
                  </td>
                </tr>
              ) : filtrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{c.nombre}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.nit || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.telefono || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <Link
                      to={`/contactos/editar/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      ✏️ Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
