// /home/ortiz/tienda/ecommerNewPro/frontend/App.jsx o donde esté tu App
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { ProductPage } from '../pages/ProductPage'
import { ProductFormPage } from '../pages/ProductFormPage';
import { Navigation } from '../components/Navigation';
import Login from '../components/Auth/LoginForm';
import { ProductDetail } from '../components/ProductDetail';
import { Cart } from '../components/Car/Cart';
import RegisterForm from '../components/Auth/RegisterForm';
import { CartProvider } from '../context/CartContext'; // Importar el CartProvider

function AdminRoute({ children }) {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  return isAdmin ? children : <Navigate to="/productos" />;
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider> {/* Envolver toda la app con CartProvider */}
        <Navigation />
        <div className='container mx-auto'>
          <Routes>
            <Route path='/' element={<Navigate to="/productos" />} />
            <Route path='/productos' element={<ProductPage />} />
            <Route path='/productos-create' element={<ProductFormPage />} />
            <Route path="/productos/edit/:id" element={<ProductFormPage />} /> 
            <Route path='/productos/:id' element={<ProductDetail />} />
            <Route path='/register' element={<RegisterForm />} />
            <Route path='/login' element={<Login/>} /> 
            <Route path="/cart" element={<Cart />} />
          </Routes>
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;