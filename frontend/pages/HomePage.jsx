import { useState } from 'react';
import { Link } from 'react-router-dom';

export function HomePage({ isStaff, cartCount }) {
  const [selectedModule, setSelectedModule] = useState(null);

  const modules = [
    {
      id: 'productos',
      title: 'Productos',
      icon: '📦',
      color: 'from-blue-500 to-blue-600',
      description: 'Gestión de productos',
      subModules: [
        {
          title: 'Catálogo',
          icon: '📋',
          path: '/productos',
          color: 'from-blue-500 to-blue-600',
          description: 'Ver todos los productos',
          show: true
        },
        {
          title: 'Crear Producto',
          icon: '➕',
          path: '/productos-create',
          color: 'from-indigo-500 to-indigo-600',
          description: 'Agregar nuevo producto',
          show: isStaff
        },
        {
          title: 'Carrito',
          icon: '🛒',
          path: '/cart',
          color: 'from-green-500 to-green-600',
          description: 'Ver carrito de compras',
          badge: cartCount,
          show: true
        }
      ]
    },
    {
      id: 'ventas',
      title: 'Ventas',
      icon: '💰',
      color: 'from-green-500 to-green-600',
      description: 'Gestión de ventas',
      subModules: [
        {
          title: 'Mis Pedidos',
          icon: '📋',
          path: '/pedidos',
          color: 'from-purple-500 to-purple-600',
          description: 'Historial de pedidos',
          show: true
        },
        {
          title: 'Carrito',
          icon: '🛒',
          path: '/cart',
          color: 'from-green-500 to-green-600',
          description: 'Carrito actual',
          badge: cartCount,
          show: true
        }
      ]
    },
    {
      id: 'compras',
      title: 'Compras',
      icon: '🛍️',
      color: 'from-purple-500 to-purple-600',
      description: 'Gestión de compras',
      subModules: [
        {
          title: 'Proveedores',
          icon: '🏢',
          path: '/proveedores',
          color: 'from-purple-500 to-purple-600',
          description: 'Gestionar proveedores',
          show: isStaff
        }
      ]
    },
    {
      id: 'contabilidad',
      title: 'Contabilidad',
      icon: '📊',
      color: 'from-orange-500 to-orange-600',
      description: 'Gestión contable',
      subModules: [
        {
          title: 'Métodos de Pago',
          icon: '💳',
          path: '/pagos',
          color: 'from-pink-500 to-pink-600',
          description: 'Configurar pagos',
          show: true
        },
        {
          title: 'Direcciones',
          icon: '📍',
          path: '/direcciones',
          color: 'from-orange-500 to-orange-600',
          description: 'Gestionar direcciones',
          show: true
        }
      ]
    }
  ];

// Vista de submódulos
if (selectedModule !== null) {
  const module = modules[selectedModule];
  const availableSubModules = module.subModules.filter(m => m.show);

  return (
    <div className="bg-gray-50 dark:bg-transparent min-h-screen py-8 transition-colors">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-8">
          <button
            onClick={() => setSelectedModule(null)}
            className="mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            <span className="text-xl">←</span>
            Volver a módulos
          </button>
          <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-xl shadow-lg p-8 transition-colors">
            <div className="flex items-center gap-6">
              <div className={`bg-gradient-to-br ${module.color} w-20 h-20 rounded-2xl shadow-xl flex items-center justify-center`}>
                <span className="text-4xl">{module.icon}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">
                  {module.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-lg transition-colors">
                  {module.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {availableSubModules.length > 0 ? (
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center transition-colors">
              Opciones Disponibles
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableSubModules.map((subModule, index) => (
                <Link
                  key={index}
                  to={subModule.path}
                  className="group relative bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${subModule.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  
                  <div className="p-6 flex flex-col items-center text-center relative z-10">
                    <div className={`bg-gradient-to-br ${subModule.color} w-20 h-20 rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center`}>
                      <span className="text-4xl">{subModule.icon}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                      {subModule.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                      {subModule.description}
                    </p>
                    
                    {subModule.badge > 0 && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg animate-pulse">
                        {subModule.badge}
                      </div>
                    )}
                  </div>

                  <div className={`h-1 bg-gradient-to-r ${subModule.color} transform scale-x-0 group-hover:scale-x-100 transition-transform`}></div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-xl shadow-lg p-8 text-center transition-colors">
              <div className="mb-6">
                <span className="text-6xl">🔒</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 transition-colors">
                Acceso Restringido
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg transition-colors">
                No tienes permisos para acceder a las opciones de este módulo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

 // Vista de módulos principales
return (
  <div className="bg-gray-50 dark:bg-transparent min-h-screen py-8 transition-colors">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center transition-colors">
        Módulos del Sistema
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8 text-center transition-colors">
        Selecciona un módulo para comenzar
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {modules.map((module, index) => (
          <button
            key={module.id}
            onClick={() => setSelectedModule(index)}
            className="group relative bg-white dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
            
            <div className="p-6 flex flex-col items-center text-center relative z-10">
              <div className={`bg-gradient-to-br ${module.color} w-20 h-20 rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center`}>
                <span className="text-4xl">{module.icon}</span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                {module.title}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {module.description}
              </p>

              <div className="mt-3 text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            <div className={`h-1 bg-gradient-to-r ${module.color} transform scale-x-0 group-hover:scale-x-100 transition-transform`}></div>
          </button>
        ))}
      </div>
    </div>
  </div>
);
}