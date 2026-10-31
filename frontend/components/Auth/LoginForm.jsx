import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon, InformationCircleIcon, LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";
import { loginUser } from "../../api/ApisCrud";
import { sitio } from "../../config/sitio";

const guardarSesion = (access, refresh, username) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  localStorage.setItem("username", username);
};

const fieldClass =
  "block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

const iconClass = "pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400";

const Login = () => {
  const location = useLocation();
  const from = location.state?.from || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const necesitaCompra = from === "/cart" || from === "/checkout";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-600/30">
            {sitio.nombre.charAt(0)}
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inicia sesión en {sitio.nombre} para continuar.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
          {necesitaCompra && (
            <div className="mb-6 flex items-start gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>Inicia sesión para completar tu compra.</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className={labelClass}>Usuario</label>
              <div className="relative mt-1.5">
                <UserIcon className={iconClass} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Tu usuario"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>Contraseña</label>
              <div className="relative mt-1.5">
                <LockClosedIcon className={iconClass} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${fieldClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Regístrate</Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link to="/" className="text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
