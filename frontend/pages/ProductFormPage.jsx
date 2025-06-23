//import React from 'react'

import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react';
import { createProduct, deleteProduct, updateProduct, obtenerProduct } from '../api/ApisCrud';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
//import { toast } from 'react-hot-toast';

export function ProductFormPage() {

  const { register, handleSubmit, formState: { errors },setValue } = useForm();

  const [image, setImage] = useState(null);
  const [existingImage, setExistingImage] = useState(null); // Nuevo estado para la imagen existente


  const navigate = useNavigate();
  const params = useParams();

 
  useEffect(() => {
    async function loadProductod() {
      if (params.id) {
       const res = await obtenerProduct(params.id);
       setValue('description',res.data.description)
       setValue('price',res.data.price)
       setValue('title',res.data.title)
       // Cargar imagen existente si existe
       // Guardar la URL de la imagen existente si existe
       if (res.data.image) {
        setExistingImage(res.data.image);
      }
      }
    }
    loadProductod();
  }, []);

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const onSubmit = handleSubmit(async (data) => {
    const formData = new FormData();
    formData.append("description", data.description);
    formData.append("title", data.title);
    formData.append("price", data.price);
    if (image) {
      formData.append("image", image);
    }

    try {

      if (params.id) {
        await updateProduct(params.id,data);
        toast.success("Producto Actualizado");
      } else {
        await createProduct(formData);
        toast.success("Producto Agregado!!!.");
      


      }
      navigate('/productos')
    } catch (error) {
      console.error("Error subiendo producto:", error);
    }
  });

  //  tu función de eliminación con Sonner
  const handleDelete = async () => {
    toast(
      '¿Eliminar producto?',
      {
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
          onClick: () => toast.dismiss()
        },
        duration: Infinity, // El toast no se cierra automáticamente
      }
    );
  };


  return (
    <div>
      <form onSubmit={onSubmit} encType="multipart/form-data" >

        <div>
          <textarea id="description" rows="3"  {...register("description", { required: true })}></textarea>
          {errors.description && <span>Este campos es requerido</span>}
        </div>
        <div>
          <input id="title" type="text" placeholder="Titulo"
            {...register("title", { required: true })}
          />
          {errors.title && <span>Este campos es requerido</span>}
        </div>
        <div>
          <input type="number" id="price"
            {...register("price", { required: true })} />
          {errors.price && <span>Este campos es requerido</span>}
        </div>
        <div>
          <input type="file" onChange={handleImageChange} />
             {/* Muestra la imagen existente solo si estamos editando y hay imagen */}
             {params.id && existingImage && !image && (
              <img 
                src={existingImage} 
                alt="Imagen actual del producto" 
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px',
                  display: 'block'
                }}
              /> )}
        </div>
        <button >Guardar</button>
      </form>
      <Toaster
        position="top-center"
        richColors
        closeButton
      />

      {params.id && (
        <button
          onClick={handleDelete}
          style={{ background: '#ff4444', color: 'white' }}
        >
          Eliminar
        </button>
      )}

    </div>
  )
}

