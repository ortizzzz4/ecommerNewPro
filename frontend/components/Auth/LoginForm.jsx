import React, { useState } from "react";
import { loginUser } from "../../api/ApisCrud";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ username, password });

      if (response.status === 200) {
        const { access, refresh } = response.data;

        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);

        // ✅ Mostrar alerta de éxito
        alert("✅ Inicio de sesión exitoso 😊");

        window.location.href = "/productos"
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex h-screen justify-center items-center bg-cover bg-center relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&w=1950&q=80')",
      }}
    >
      {/* Capa de degradado */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 via-blue-700/60 to-indigo-900/70 backdrop-blur-sm"></div>

      {/* Tarjeta de login */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-96 border border-gray-200">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 drop-shadow-md">
          Iniciar Sesión
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-black"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-black"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-md"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-4">
          ¿No tienes cuenta?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
