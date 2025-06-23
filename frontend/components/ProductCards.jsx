//import React from 'react'
import { useNavigate } from 'react-router-dom'

export function ProductCards({ product }) {
  const navigate = useNavigate()


  return (
    <div>
      <div className='p-3 bg-sky-950'
        onClick={() => {
          navigate('/productos/' + product.id)
        }}>
        <h1>{product.description}</h1>
        <h1>{product.price}</h1>
        <h1>{product.title}</h1>
        <hr className="my-2 border-gray-600" />

        {product.image && (
          <div className="mt-2">
            <img
              src={product.image}
              alt={`Imagen de ${product.title}`}
              className="w-full h-48 object-cover rounded-md"
            />
          </div>
        )}




      </div>
    </div>
  )
}
