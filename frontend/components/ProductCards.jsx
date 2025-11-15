import React from 'react';
import { useNavigate } from 'react-router-dom';

export function ProductCards({ product }) {
  const navigate = useNavigate();

  return (
    <div className="transform transition duration-300 hover:scale-105">
      <div
        className="bg-gradient-to-br from-sky-800 to-sky-900 rounded-2xl shadow-xl overflow-hidden cursor-pointer hover:shadow-2xl border border-gray-700"
        onClick={() => navigate('/productos/' + product.id)}
      >
        {product.image && (
          <img
            src={product.image}
            alt={`Imagen de ${product.title}`}
            className="w-full h-48 object-cover"
          />
        )}

        <div className="p-4">
          <h2 className="text-white text-lg font-bold mb-1 truncate">{product.title}</h2>
          <p className="text-gray-300 text-sm mb-2 truncate">{product.description}</p>
          <p className="text-indigo-400 font-semibold text-lg">${product.price}</p>
        </div>

        <div className="p-2 bg-gray-800/50 text-center text-white font-medium hover:bg-gray-700 transition">
          Ver detalles
        </div>
      </div>
    </div>
  );
}
