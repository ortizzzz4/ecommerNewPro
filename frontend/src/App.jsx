import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { ProductPage } from '../pages/ProductPage'
import { ProductFormPage } from '../pages/ProductFormPage';
import { Navigation } from '../components/Navigation';
import { HomePage } from '../pages/HomePage';
import Login from '../components/Auth/LoginForm';
import { ProductDetail } from '../components/ProductDetail';
import { Cart } from '../components/Car/Cart';
import RegisterForm from '../components/Auth/RegisterForm';
import { CartProvider } from '../context/CartContext';
import { useCart } from '../context/CartContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ThemeProvider } from '../context/ThemeContext';

function HomePageWrapper() {
  const { getCartCount } = useCart();
  const isStaff = localStorage.getItem('isStaff') === 'true';
  
  return <HomePage isStaff={isStaff} cartCount={getCartCount()} />;
}

function App() {
  return (
    <BrowserRouter>
     <ThemeProvider>
      <CartProvider>
        <Navigation />
        <Routes>
          {/* Ruta raíz PROTEGIDA - requiere login */}
          <Route path='/' element={
            <ProtectedRoute>
              <HomePageWrapper />
            </ProtectedRoute>
          } />
          
          {/* Rutas públicas */}
          <Route path='/login' element={
            <div className='container mx-auto'>
              <Login/>
            </div>
          } />
          <Route path='/register' element={
            <div className='container mx-auto'>
              <RegisterForm />
            </div>
          } />
          
          {/* Rutas protegidas */}
          <Route path='/productos' element={
            <ProtectedRoute>
              <div className='container mx-auto'>
                <ProductPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path='/productos-create' element={
            <ProtectedRoute>
              <div className='container mx-auto'>
                <ProductFormPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/productos/edit/:id" element={
            <ProtectedRoute>
              <div className='container mx-auto'>
                <ProductFormPage />
              </div>
            </ProtectedRoute>
          } /> 
          <Route path='/productos/:id' element={
            <ProtectedRoute>
              <div className='container mx-auto'>
                <ProductDetail />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute>
              <div className='container mx-auto'>
                <Cart />
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </CartProvider>
        </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;