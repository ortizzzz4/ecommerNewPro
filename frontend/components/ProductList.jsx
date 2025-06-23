//import React from 'react'
import { useEffect,useState } from "react"
import { getProduct } from "../api/ApisCrud";
import { ProductCards } from "./ProductCards";

export function ProductList() {
    
    const [products,setProducts] = useState([]);

    useEffect(() => {
      
      async  function loadProduct(){
        const res = await getProduct()
        setProducts(res.data);

      }
      loadProduct()
     /* return () => {
        
      }*/
    }, []);
    


  return (
    <div className="grid grid-cols-4 gap-4">
        {products.map(product => (
            <ProductCards key={product.id} product={product} />
        ))}

    </div>
  )
}

//export default ProductList