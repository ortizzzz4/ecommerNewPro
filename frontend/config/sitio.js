import {
  AcademicCapIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';

// Contenido del sitio web. Cambia aquí los datos de contacto y los textos.
// Los correos y teléfonos de ejemplo deben reemplazarse por los reales.
export const sitio = {
  nombre: 'Ortiz',
  eslogan: 'Desarrollo de sistemas a la medida e integraciones entre aplicaciones.',
  correo: 'contacto@tudominio.com',
  telefono: '+503 0000-0000',
  ubicacion: 'El Salvador',
};

export const servicios = [
  {
    titulo: 'Sistemas a la medida',
    texto: 'Aplicaciones y módulos hechos para la forma en que trabaja tu empresa: ventas, compras, inventario y contabilidad.',
    icono: PuzzlePieceIcon,
  },
  {
    titulo: 'Integraciones entre sistemas',
    texto: 'Conectamos tu sistema con tu tienda en línea, facturación electrónica, pasarelas de pago, bancos y otras aplicaciones por medio de APIs.',
    icono: ArrowsRightLeftIcon,
  },
  {
    titulo: 'Automatización de procesos',
    texto: 'Aprobaciones, notificaciones y reportes automáticos para las tareas que hoy se hacen a mano.',
    icono: Cog6ToothIcon,
  },
  {
    titulo: 'Implementación y migración',
    texto: 'Puesta en marcha, carga de datos desde tus archivos o sistema anterior, y configuración de roles y permisos.',
    icono: ChartBarIcon,
  },
  {
    titulo: 'Soporte y capacitación',
    texto: 'Acompañamiento después de la entrega y formación para que tu equipo use el sistema con confianza.',
    icono: AcademicCapIcon,
  },
];

export const pasos = [
  { titulo: 'Diagnóstico', texto: 'Entendemos tus procesos, tus sistemas actuales y lo que necesitas resolver.' },
  { titulo: 'Propuesta', texto: 'Definimos alcance, plazos y costos antes de empezar.' },
  { titulo: 'Desarrollo y pruebas', texto: 'Construimos por etapas y validamos cada una con tu equipo.' },
  { titulo: 'Puesta en marcha', texto: 'Lanzamos, capacitamos a tu personal y damos soporte.' },
];

// Imágenes del sitio: copia tus fotos en frontend/public/site/ con estos nombres.
// Si no existen, el sitio muestra un recuadro de color en su lugar.
export const imagenes = {
  hero: '/site/hero.jpg',
  trabajos: [
    { src: '/site/trabajo-1.jpg', alt: 'Panel del sistema', pie: 'Panel de control del ERP' },
    { src: '/site/trabajo-2.jpg', alt: 'Integración entre sistemas', pie: 'Integración entre sistemas' },
    { src: '/site/trabajo-3.jpg', alt: 'Tienda en línea', pie: 'Tienda en línea conectada al ERP' },
  ],
};
