import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { ProductPage } from '../pages/ProductPage'
import { ProductFormPage } from '../pages/ProductFormPage';

import { Navigation } from '../components/Navigation';


/**
 * Usuario
 * @returns 
 */

import RegisterForm from '../components/Auth/RegisterForm';


function App() {
  return (
    <BrowserRouter>
     <Navigation />
      <div className=' container mx-auto'>
       

        <Routes>
          <Route path='/' element={<Navigate to="/productos" />} />
          <Route path='/productos' element={<ProductPage />} />
          <Route path='/productos-create' element={<ProductFormPage />} />
          <Route path='/productos/:id' element={<ProductFormPage />} />
          <Route path='/register' element={<RegisterForm />} />
        </Routes>
      </div>

    </BrowserRouter>
  );
}

export default App