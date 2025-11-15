import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { obtenerProduct } from "../api/ApisCrud";
import { toast, Toaster } from "sonner";
import { getCurrentUser } from '../api/ApisCrud';


export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);


  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      // Llamar API para saber si es staff
      getCurrentUser()
        .then(res => {
          setIsStaff(res.data.is_staff);
          localStorage.setItem('isStaff', res.data.is_staff);
        })
        .catch(() => setIsStaff(false));
    }

    async function fetchProduct() {
      try {
        const res = await obtenerProduct(id);
        setProduct(res.data);
      } catch (error) {
        console.error(error);
        toast.error("❌ No se pudo cargar el producto");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading)
    return (
      <div className="text-white text-center mt-20 text-xl animate-pulse">
        Cargando producto...
      </div>
    );
  if (!product)
    return <div className="text-white text-center mt-20 text-xl">Producto no encontrado</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 flex flex-col items-center">
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-3xl bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-700 overflow-hidden transition-transform transform hover:scale-105 duration-300">
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-96 object-cover"
          />
        )}

        <div className="p-6">
          <h1 className="text-4xl font-extrabold mb-3 text-indigo-400">{product.title}</h1>
          <p className="text-gray-300 mb-4">{product.description}</p>
          <p className="text-xl font-semibold mb-6">Precio: <span className="text-green-400">${product.price}</span></p>


          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => navigate("/productos")}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-semibold shadow-lg transition"
            >
              Volver a productos
            </button>
            <button
              onClick={() => {
                if (isLoggedIn) {

                  navigate("/cart"); // Ir al carrito
                } else {
                  navigate("/login"); // Redirigir al login si no está logeado
                }
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-semibold shadow-lg transition"
            >
              Agregar al carrito
            </button>

            {isStaff && (
              <button
                onClick={() => navigate(`/productos/edit/${id}`)}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-2xl font-semibold shadow-lg transition"
              >
                Editar Producto
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

