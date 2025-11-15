import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createProduct, deleteProduct, updateProduct, obtenerProduct } from '../api/ApisCrud';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

export function ProductFormPage() {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();
  const [image, setImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  const navigate = useNavigate();
  const params = useParams();

  useEffect(() => {
    async function loadProduct() {
      if (params.id) {
        const res = await obtenerProduct(params.id);
        setValue('description', res.data.description);
        setValue('price', res.data.price);
        setValue('title', res.data.title);
        if (res.data.image) setExistingImage(res.data.image);
      }
    }
    loadProduct();
  }, [params.id]);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const onSubmit = handleSubmit(async (data) => {
    const formData = new FormData();
    formData.append('description', data.description);
    formData.append('title', data.title);
    formData.append('price', data.price);
    if (image) formData.append('image', image);

    try {
      if (params.id) {
        await updateProduct(params.id, formData);
        toast.success('✅ Producto actualizado!');
      } else {
        await createProduct(formData);
        toast.success('🎉 Producto agregado!');
      }
      navigate('/productos');
    } catch (error) {
      console.error('Error subiendo producto:', error);
      toast.error('❌ Ocurrió un error');
    }
  });

  const handleDelete = async () => {
    toast('¿Eliminar producto?', {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteProduct(params.id);
            toast.success('Producto eliminado');
            navigate('/productos');
          } catch (error) {
            toast.error('Error al eliminar');
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => toast.dismiss(),
      },
      duration: Infinity,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-purple-800 via-indigo-900 to-blue-900 p-6">
      <Toaster position="top-center" richColors closeButton />
      <div className="w-full max-w-xl bg-gray-900/90 p-8 rounded-3xl shadow-2xl border border-gray-700">
        <h2 className="text-3xl font-extrabold text-white text-center mb-6">
          {params.id ? 'Editar Producto' : 'Crear Producto'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-white font-semibold mb-1">Título</label>
            <input
              type="text"
              placeholder="Nombre del producto"
              {...register('title', { required: true })}
              className="w-full px-4 py-2 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-md"
            />
            {errors.title && <p className="text-red-500 mt-1 text-sm">Este campo es requerido</p>}
          </div>

          <div>
            <label className="block text-white font-semibold mb-1">Descripción</label>
            <textarea
              rows={4}
              placeholder="Descripción del producto"
              {...register('description', { required: true })}
              className="w-full px-4 py-2 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-md resize-none"
            />
            {errors.description && <p className="text-red-500 mt-1 text-sm">Este campo es requerido</p>}
          </div>

          <div>
            <label className="block text-white font-semibold mb-1">Precio</label>
            <input
              type="number"
              placeholder="$0.00"
              {...register('price', { required: true })}
              className="w-full px-4 py-2 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-md"
            />
            {errors.price && <p className="text-red-500 mt-1 text-sm">Este campo es requerido</p>}
          </div>

          <div>
            <label className="block text-white font-semibold mb-1">Imagen</label>
            <input type="file" onChange={handleImageChange} className="w-full text-white" />
            {image && (
              <img
                src={URL.createObjectURL(image)}
                alt="Preview"
                className="mt-3 w-full h-48 object-cover rounded-xl border border-gray-600 shadow-lg"
              />
            )}
            {!image && existingImage && (
              <img
                src={existingImage}
                alt="Imagen actual del producto"
                className="mt-3 w-full h-48 object-cover rounded-xl border border-gray-600 shadow-lg"
              />
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg transition"
          >
            {params.id ? 'Actualizar Producto' : 'Crear Producto'}
          </button>
        </form>

        {params.id && (
          <button
            onClick={handleDelete}
            className="mt-4 w-full py-3 rounded-3xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg transition"
          >
            Eliminar Producto
          </button>
        )}
      </div>
    </div>
  );
}
