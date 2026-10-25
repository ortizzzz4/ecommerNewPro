import { createContext, useContext, useEffect, useState } from 'react';
import { getMiEmpresa, getMiUsuario } from '../api/ApisCrud';
import { erpModules } from '../config/erpModules';

const PermisosContext = createContext({ usuario: null, miEmpresa: null, cargando: true, can: () => false });

// Quien tiene al menos un módulo del ERP usa el sistema y no ve la tienda
export const tieneAccesoErp = (usuario) =>
  Boolean(usuario) && (usuario.is_superuser || erpModules.some(m => m.perm && usuario.permisos.includes(m.perm)));

// Carga el usuario, su empresa (módulos contratados y prueba) y expone can('app.codename')
export function PermisosProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [miEmpresa, setMiEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Sin sesión no hay permisos que pedir
    if (!localStorage.getItem('access_token')) {
      setCargando(false);
      return;
    }
    Promise.all([
      getMiUsuario().then(res => setUsuario(res.data)).catch(() => setUsuario(null)),
      getMiEmpresa().then(res => setMiEmpresa(res.data)).catch(() => setMiEmpresa(null)),
    ]).finally(() => setCargando(false));
  }, []);

  const can = (permiso) => Boolean(usuario) && (usuario.is_superuser || usuario.permisos.includes(permiso));

  return (
    <PermisosContext.Provider value={{ usuario, miEmpresa, cargando, can }}>
      {children}
    </PermisosContext.Provider>
  );
}

export const usePermisos = () => useContext(PermisosContext);

// Módulos del ERP que la empresa tiene contratados (ids de erpModules.js)
export const modulosContratados = (miEmpresa) => (miEmpresa ? miEmpresa.modulos.map(m => m.id) : []);

// Administración de la plataforma: superusuario en la base maestra (sin empresa en la sesión)
export const esPlataforma = (usuario, miEmpresa) => Boolean(usuario?.is_superuser) && Boolean(miEmpresa) && miEmpresa.empresa === null;

// Decide si un módulo aparece para el usuario: permiso, contrato de la empresa y rol de plataforma
export const moduloVisible = (modulo, { can, usuario, miEmpresa }) => {
  if (modulo.soloPlataforma) return esPlataforma(usuario, miEmpresa);
  return (!modulo.perm || can(modulo.perm)) && (!miEmpresa || modulosContratados(miEmpresa).includes(modulo.id));
};
