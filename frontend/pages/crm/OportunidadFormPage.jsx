import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { crearOportunidad, getContacts } from '../../api/ApisCrud';
import { toList } from '../../utils/data';
import { cardClass, inputClass, labelClass, primaryButtonClass } from '../../utils/ui';

const VACIO = { titulo: '', contacto: '', nombre_prospecto: '', correo: '', telefono: '', valor: '', fecha_cierre: '', notas: '' };

// Nueva oportunidad: un cliente registrado o un prospecto nuevo
export function OportunidadFormPage() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(VACIO);
  const [contactos, setContactos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getContacts().then(({ data }) => setContactos(toList(data))).catch(() => {});
  }, []);

  const cambiar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data } = await crearOportunidad({
        ...datos,
        contacto: datos.contacto || null,
        valor: datos.valor || 0,
        fecha_cierre: datos.fecha_cierre || null,
      });
      toast.success('Oportunidad creada');
      navigate(`/erp/crm/${data.id}`);
    } catch (err) {
      const detalle = err.response?.data;
      toast.error(typeof detalle === 'object' ? Object.values(detalle).flat()[0] : 'No se pudo crear la oportunidad');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className={`${cardClass} mx-auto max-w-2xl space-y-5 p-6 sm:p-8`}>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Nueva oportunidad</h1>

      <div>
        <label htmlFor="titulo" className={labelClass}>Título</label>
        <input id="titulo" required value={datos.titulo} onChange={e => cambiar('titulo', e.target.value)} placeholder="Ej. Integración con facturación" className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contacto" className={labelClass}>Cliente registrado</label>
          <select id="contacto" value={datos.contacto} onChange={e => cambiar('contacto', e.target.value)} className={inputClass}>
            <option value="">Sin cliente (prospecto nuevo)</option>
            {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nombre_prospecto" className={labelClass}>Nombre del prospecto</label>
          <input id="nombre_prospecto" value={datos.nombre_prospecto} onChange={e => cambiar('nombre_prospecto', e.target.value)} disabled={Boolean(datos.contacto)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="correo" className={labelClass}>Correo</label>
          <input id="correo" type="email" value={datos.correo} onChange={e => cambiar('correo', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="telefono" className={labelClass}>Teléfono</label>
          <input id="telefono" value={datos.telefono} onChange={e => cambiar('telefono', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="valor" className={labelClass}>Valor estimado (USD)</label>
          <input id="valor" type="number" min="0" step="0.01" value={datos.valor} onChange={e => cambiar('valor', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="fecha_cierre" className={labelClass}>Cierre estimado</label>
          <input id="fecha_cierre" type="date" value={datos.fecha_cierre} onChange={e => cambiar('fecha_cierre', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="notas" className={labelClass}>Notas</label>
        <textarea id="notas" rows={3} value={datos.notas} onChange={e => cambiar('notas', e.target.value)} className={inputClass} />
      </div>

      <button type="submit" disabled={guardando} className={primaryButtonClass}>
        {guardando ? 'Guardando...' : 'Crear oportunidad'}
      </button>
    </form>
  );
}
