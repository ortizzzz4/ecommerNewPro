import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { loginUser } from "../../api/ApisCrud";
import { inputClass, labelClass, primaryButtonClass } from "../../utils/ui";

const guardarSesion = (access, refresh, username) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  localStorage.setItem("username", username);
};

const Login = () => {
  const location = useLocation();
  const from = location.state?.from || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await loginUser({ username: username.trim(), password });
      guardarSesion(data.access, data.refresh, username.trim());
      // Recarga completa para que la barra de navegación lea la sesión nueva
      window.location.href = from;
    } catch (err) {
      setError(err.response?.data?.detail || "Usuario o contraseña incorrectos");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Accede para completar tus compras o usar el sistema.</p>

        {(from === "/cart" || from === "/checkout") && (
          <div className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Inicia sesión para completar tu compra.
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <>
              <div>
                <label htmlFor="username" className={labelClass}>Usuario</label>
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" className={inputClass} />
              </div>
              <div>
                <label htmlFor="password" className={labelClass}>Contraseña</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={inputClass} />
              </div>
            </>

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Regístrate</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
