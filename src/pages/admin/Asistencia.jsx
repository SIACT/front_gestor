import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '../../api/client';
import { useCongreso } from '../../context/CongresoContext';
import { ESTADO_INSCRIPCION_LABEL, capitalizar, formatFechaSolo } from '../../utils/formato';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/PageLoader';
import { DatePicker } from '../../components/ui/DatePicker';
import { ResultadoEmision } from '../../components/ResultadoEmision';

const ESTADOS_INSCRIPCION = ['pendiente', 'carta_compromiso', 'confirmada', 'rechazada', 'cancelada'];

const MENSAJE_UMBRAL_NO_CONFIGURADO =
  'Configura primero el umbral de días requeridos para poder filtrar por cumplimiento.';

// Ventana.fecha y Congreso.fecha_inicio/fecha_fin son fechas puras: se comparan como
// 'YYYY-MM-DD' (orden lexicográfico = orden cronológico), sin pasar por Date para no
// arrastrar el corrimiento de huso horario.
function fechaDia(valor) {
  return valor ? String(valor).slice(0, 10) : '';
}

function CrearVentanaModal({ open, onClose, idCongreso, congreso, onCreada }) {
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inicio = fechaDia(congreso?.fecha_inicio);
  const fin = fechaDia(congreso?.fecha_fin);
  const fueraDeRango = Boolean(fecha) && ((inicio && fecha < inicio) || (fin && fecha > fin));

  function handleClose() {
    setFecha('');
    setError('');
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fecha || fueraDeRango) return;
    setSubmitting(true);
    setError('');
    try {
      const ventana = await apiFetch(`/congresos/${idCongreso}/asistencia/ventanas`, {
        method: 'POST',
        body: JSON.stringify({ fecha }),
      });
      onCreada(ventana);
      handleClose();
    } catch (err) {
      // FECHA_FUERA_DE_RANGO y VENTANA_YA_EXISTE traen un mensaje claro del backend.
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Crear ventana de asistencia">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <DatePicker label="Fecha" value={fecha} onChange={setFecha} />
        {inicio && fin && (
          <p className="text-xs text-text-muted">
            El congreso va del {formatFechaSolo(inicio)} al {formatFechaSolo(fin)}.
          </p>
        )}
        {fueraDeRango && (
          <Alert variant="error">La fecha debe estar dentro del rango de fechas del congreso.</Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} disabled={!fecha || fueraDeRango || submitting}>
            Crear ventana
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MarcarManualForm({ idCongreso, idVentana, onMarcada }) {
  const [tipo, setTipo] = useState('correo');
  const [valor, setValor] = useState('');
  const [resultado, setResultado] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const texto = valor.trim();
    if (!texto) return;
    setSubmitting(true);
    setResultado(null);
    try {
      // Solo uno de los dos campos: el backend responde VALIDATION_ERROR si llegan ambos.
      const data = await apiFetch(
        `/congresos/${idCongreso}/asistencia/ventanas/${idVentana}/marcar-manual`,
        { method: 'POST', body: JSON.stringify({ [tipo]: texto }) },
      );
      const nombre = `${capitalizar(data.usuario?.nombre)} ${capitalizar(data.usuario?.apellido)}`;
      if (data.ya_registrado) {
        setResultado({ variant: 'warning', mensaje: `${nombre} ya tenía su asistencia marcada para este día` });
      } else {
        setResultado({ variant: 'success', mensaje: `${nombre} — asistencia registrada` });
        setValor('');
        onMarcada();
      }
    } catch (err) {
      const mensaje =
        err.code === 'USUARIO_NOT_FOUND'
          ? `No existe ninguna cuenta con ese ${tipo === 'correo' ? 'correo' : 'número de cédula'}`
          : err.code === 'INSCRIPCION_NO_HABILITADA_PARA_ASISTIR'
            ? 'Esta persona no puede marcar asistencia: su inscripción no está confirmada ni tiene carta de compromiso.'
            : err.message;
      setResultado({ variant: 'error', mensaje });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Select
            label="Buscar por"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setResultado(null);
            }}
          >
            <option value="correo">Correo</option>
            <option value="cedula">Cédula</option>
          </Select>
        </div>
        <div className="min-w-48 flex-1">
          <Input
            label={tipo === 'correo' ? 'Correo' : 'Cédula'}
            type={tipo === 'correo' ? 'email' : 'text'}
            placeholder={tipo === 'correo' ? 'participante@correo.com' : '1234567890'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <Button type="submit" loading={submitting} disabled={!valor.trim() || submitting}>
          Registrar
        </Button>
      </div>
      {resultado && <Alert variant={resultado.variant}>{resultado.mensaje}</Alert>}
    </form>
  );
}

function VentanaCard({ ventana, idCongreso, onActualizada, onMarcada }) {
  const [accion, setAccion] = useState(null);
  const [error, setError] = useState('');
  const [marcarAbierto, setMarcarAbierto] = useState(false);

  async function ejecutar(ruta, nombreAccion) {
    setAccion(nombreAccion);
    setError('');
    try {
      const actualizada = await apiFetch(
        `/congresos/${idCongreso}/asistencia/ventanas/${ventana.id_ventana}/${ruta}`,
        { method: 'PATCH' },
      );
      onActualizada(actualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccion(null);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-lg font-semibold text-text-primary">{formatFechaSolo(ventana.fecha)}</h3>
        <Badge variant={ventana.habilitar_autochequeo ? 'revisado' : 'default'}>
          {ventana.habilitar_autochequeo ? 'Autochequeo activo' : 'Autochequeo inactivo'}
        </Badge>
      </div>

      {ventana.habilitar_autochequeo ? (
        <div className="mt-4 flex flex-col items-center gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Código de autochequeo</p>
          <p className="font-mono text-4xl tracking-widest text-accent">{ventana.codigo_autochequeo}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              loading={accion === 'regenerar'}
              disabled={accion !== null}
              onClick={() => ejecutar('regenerar-codigo', 'regenerar')}
            >
              Regenerar código
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={accion === 'deshabilitar'}
              disabled={accion !== null}
              onClick={() => ejecutar('deshabilitar-autochequeo', 'deshabilitar')}
            >
              Desactivar autochequeo
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <Button
            type="button"
            variant="primary"
            loading={accion === 'habilitar'}
            disabled={accion !== null}
            onClick={() => ejecutar('habilitar-autochequeo', 'habilitar')}
          >
            Activar autochequeo
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => setMarcarAbierto((v) => !v)}>
          {marcarAbierto ? 'Ocultar marcado manual' : 'Marcar asistencia manual'}
        </Button>
      </div>

      {marcarAbierto && (
        <MarcarManualForm idCongreso={idCongreso} idVentana={ventana.id_ventana} onMarcada={onMarcada} />
      )}
    </Card>
  );
}

function ConfiguracionUmbral({ idCongreso, diasRequeridos, totalVentanas, onGuardado }) {
  const [valor, setValor] = useState(diasRequeridos != null ? String(diasRequeridos) : '');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numero = Number(valor);
  const valido = valor !== '' && Number.isInteger(numero) && numero >= 1;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valido) return;
    setSubmitting(true);
    setError('');
    setExito('');
    try {
      await apiFetch(`/congresos/${idCongreso}/asistencia/configuracion`, {
        method: 'PATCH',
        body: JSON.stringify({ dias_asistencia_requeridos: numero }),
      });
      setExito('Umbral guardado.');
      onGuardado();
    } catch (err) {
      // UMBRAL_MAYOR_A_VENTANAS_DISPONIBLES: el mensaje del backend ya dice cuántas ventanas hay.
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Input
              type="number"
              min={1}
              step={1}
              label="Días de asistencia requeridos"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setExito('');
              }}
            />
          </div>
          <Button type="submit" loading={submitting} disabled={!valido || submitting}>
            Guardar
          </Button>
        </div>
        <p className="text-xs text-text-muted">
          {diasRequeridos == null ? 'Aún no se ha configurado el umbral. ' : ''}
          Ventanas creadas: {totalVentanas}.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        {exito && <Alert variant="success">{exito}</Alert>}
      </form>
    </Card>
  );
}

// Menos de 2 caracteres no se envía al backend (mismo criterio que los demás buscadores).
function busquedaEfectiva(texto) {
  const limpio = texto.trim();
  return limpio.length >= 2 ? limpio : '';
}

function FiltrosResumen({ filtros, onCambiar, busqueda, onBusquedaCambiada }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-72">
        <Input
          icon={<Search className="size-4" />}
          placeholder="Buscar por nombre, apellido o correo..."
          value={busqueda}
          onChange={(e) => onBusquedaCambiada(e.target.value)}
        />
      </div>
      <div className="w-56">
        <Select
          label="Estado de inscripción"
          value={filtros.estado_inscripcion}
          onChange={(e) => onCambiar({ ...filtros, estado_inscripcion: e.target.value })}
        >
          <option value="">Todos</option>
          {ESTADOS_INSCRIPCION.map((estado) => (
            <option key={estado} value={estado}>
              {ESTADO_INSCRIPCION_LABEL[estado]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-44">
        <Select
          label="Cumplimiento"
          value={filtros.cumple}
          onChange={(e) => onCambiar({ ...filtros, cumple: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="true">Cumple</option>
          <option value="false">No cumple</option>
        </Select>
      </div>
    </div>
  );
}

function nombreCompleto(usuario) {
  return `${capitalizar(usuario?.nombre)} ${capitalizar(usuario?.apellido)}`;
}

function EliminarAsistenciaModal({ objetivo, idCongreso, onClose, onEliminada }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    if (submitting) return;
    setError('');
    onClose();
  }

  async function handleEliminar() {
    setSubmitting(true);
    setError('');
    try {
      await apiFetch(`/congresos/${idCongreso}/asistencia/${objetivo.asistencia.id_asistencia}`, { method: 'DELETE' });
      onClose();
      onEliminada();
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        setError('Esta asistencia ya no existe o no pertenece a este congreso.');
        // Se refresca igual: si ya no existe, el resumen no debe seguir mostrándola.
        onEliminada();
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={Boolean(objetivo)} onClose={handleClose} title="Eliminar asistencia">
      {objetivo && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            ¿Eliminar la asistencia del {formatFechaSolo(objetivo.asistencia.fecha)} de {objetivo.nombre}? Esta
            acción no se puede deshacer.
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" loading={submitting} disabled={submitting} onClick={handleEliminar}>
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ResumenCumplimiento({ resumen, error, hayFiltros, idCongreso, onAsistenciaEliminada }) {
  const [expandido, setExpandido] = useState({});
  const [aEliminar, setAEliminar] = useState(null);
  const [emitiendo, setEmitiendo] = useState(null);
  const [resultadoEmision, setResultadoEmision] = useState(null);

  // Certificado de asistencia individual: solo se ofrece a quien ya cumple el umbral.
  async function emitirCertificado(d) {
    setEmitiendo(d.id_inscripcion);
    setResultadoEmision(null);
    const nombre = nombreCompleto(d.usuario);
    try {
      const data = await apiFetch(`/congresos/${idCongreso}/certificacion/emitir`, {
        method: 'POST',
        body: JSON.stringify({ id_inscripcion: d.id_inscripcion, tipo: 'asistencia' }),
      });
      setResultadoEmision({ nombre, data });
    } catch (err) {
      setResultadoEmision({ nombre, error: err });
    } finally {
      setEmitiendo(null);
    }
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  const detalle = resumen?.detalle ?? [];

  return (
    <>
      {/* Totales tal cual los manda el backend: ya reflejan el conjunto filtrado. */}
      <p className="text-lg text-text-primary">
        <span className="font-bold text-accent">{resumen?.cumplen_asistencia ?? 0}</span> de{' '}
        <span className="font-bold">{resumen?.total_inscripciones ?? 0}</span> inscritos cumplen asistencia
      </p>

      <ResultadoEmision resultado={resultadoEmision} idCongreso={idCongreso} />

      {detalle.length === 0 ? (
        <p className="text-sm text-text-muted">
          {hayFiltros
            ? 'Ninguna inscripción coincide con los filtros seleccionados.'
            : 'No hay inscripciones activas en este congreso.'}
        </p>
      ) : (
        // Orden del backend (no cumplen primero): no se reordena aquí.
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell className="w-10" />
              <Table.HeadCell>Nombre</Table.HeadCell>
              <Table.HeadCell>Correo</Table.HeadCell>
              <Table.HeadCell>Días marcados</Table.HeadCell>
              <Table.HeadCell>Estado</Table.HeadCell>
              <Table.HeadCell>Certificado</Table.HeadCell>
            </tr>
          </Table.Head>
          <tbody>
            {/* El resumen no trae id_usuario: se usa id_inscripcion (única por fila) como clave. */}
            {detalle.map((d) => {
              const abierto = Boolean(expandido[d.id_inscripcion]);
              const asistencias = d.asistencias ?? [];
              return (
                <Fragment key={d.id_inscripcion}>
                  <Table.Row>
                    <Table.Cell className="pr-0">
                      <button
                        type="button"
                        onClick={() => setExpandido((prev) => ({ ...prev, [d.id_inscripcion]: !prev[d.id_inscripcion] }))}
                        aria-expanded={abierto}
                        aria-label={abierto ? 'Ocultar asistencias' : 'Ver asistencias'}
                        className="flex text-text-muted transition-colors hover:text-text-primary"
                      >
                        <ChevronDown className={clsx('size-4 transition-transform', abierto && 'rotate-180')} />
                      </button>
                    </Table.Cell>
                    <Table.Cell>{nombreCompleto(d.usuario)}</Table.Cell>
                    <Table.Cell className="text-text-muted">{d.usuario?.correo}</Table.Cell>
                    <Table.Cell>{d.dias_marcados}</Table.Cell>
                    <Table.Cell>
                      <Badge variant={d.cumple === null ? 'default' : d.cumple ? 'revisado' : 'rechazado'}>
                        {d.cumple === null ? 'Sin definir' : d.cumple ? 'Cumple' : 'No cumple'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {d.cumple === true && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={emitiendo === d.id_inscripcion}
                          disabled={emitiendo !== null}
                          onClick={() => emitirCertificado(d)}
                        >
                          Emitir certificado
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                  {abierto && (
                    <tr className="border-b border-border last:border-0">
                      <td colSpan={6} className="px-4 pb-2 pl-14">
                        {asistencias.length === 0 ? (
                          <p className="py-2 text-sm text-text-muted">Sin asistencias marcadas.</p>
                        ) : (
                          asistencias.map((asistencia) => (
                            <div
                              key={asistencia.id_asistencia}
                              className="flex items-center justify-between border-t border-border py-2 text-sm"
                            >
                              <span>
                                {formatFechaSolo(asistencia.fecha)} —{' '}
                                {asistencia.marcado_por === 'autochequeo' ? 'Autochequeo' : asistencia.marcado_por}
                              </span>
                              <button
                                type="button"
                                onClick={() => setAEliminar({ asistencia, nombre: nombreCompleto(d.usuario) })}
                                aria-label="Eliminar asistencia"
                                className="text-error-text hover:text-error-text/80"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}

      <EliminarAsistenciaModal
        objetivo={aEliminar}
        idCongreso={idCongreso}
        onClose={() => setAEliminar(null)}
        onEliminada={onAsistenciaEliminada}
      />
    </>
  );
}

export function Asistencia() {
  const { congreso } = useCongreso();
  const idCongreso = congreso?.id_congreso;

  const [ventanas, setVentanas] = useState([]);
  const [errorVentanas, setErrorVentanas] = useState('');
  const [resumen, setResumen] = useState(null);
  const [errorResumen, setErrorResumen] = useState('');
  const [filtros, setFiltros] = useState({ estado_inscripcion: '', cumple: '' });
  const [errorFiltros, setErrorFiltros] = useState('');
  const [busqueda, setBusqueda] = useState('');
  // Solo se aplica la respuesta de la última petición: si el Admin cambia filtros rápido, una
  // respuesta lenta anterior no debe pisar la del filtro vigente.
  const ultimaPeticion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  // Las ventanas se programan una sola vez: colapsadas por defecto para no ocupar la vista.
  const [ventanasAbiertas, setVentanasAbiertas] = useState(false);
  // Igual que las ventanas: el umbral se configura una vez, colapsado por defecto.
  const [umbralAbierto, setUmbralAbierto] = useState(false);

  // El umbral no tiene GET propio: viene en el resumen (dias_requeridos).
  // Los filtros vacíos ("Todos") se omiten del query string; el backend los combina con AND.
  function cargarResumen(f = filtros, texto = busqueda) {
    const params = new URLSearchParams();
    if (f.estado_inscripcion) params.set('estado_inscripcion', f.estado_inscripcion);
    if (f.cumple) params.set('cumple', f.cumple);
    const textoBusqueda = busquedaEfectiva(texto);
    if (textoBusqueda) params.set('busqueda', textoBusqueda);
    const query = params.toString();
    const id = ++ultimaPeticion.current;

    return apiFetch(`/congresos/${idCongreso}/asistencia/resumen${query ? `?${query}` : ''}`)
      .then((data) => {
        if (id !== ultimaPeticion.current) return;
        setResumen(data);
        setErrorResumen('');
        setErrorFiltros('');
      })
      .catch((err) => {
        if (id !== ultimaPeticion.current) return;
        if (err.code === 'UMBRAL_NO_CONFIGURADO' && f.cumple) {
          // No dejar el filtro aplicado visualmente si la petición falló: se vuelve a "Todos" y
          // se conserva el último resumen válido (que ya corresponde a cumple = Todos).
          setErrorFiltros(MENSAJE_UMBRAL_NO_CONFIGURADO);
          setFiltros({ ...f, cumple: '' });
          return;
        }
        setErrorResumen(err.message);
      });
  }

  function handleFiltrosCambiados(nuevos) {
    setFiltros(nuevos);
    cargarResumen(nuevos);
  }

  // Debounce de la búsqueda (mismo patrón que InscripcionesAdmin): 1 carácter no dispara
  // petición; al vaciarse sí recarga, para volver a mostrar todo sujeto a los selectores activos.
  const esPrimerRenderBusqueda = useRef(true);
  useEffect(() => {
    if (esPrimerRenderBusqueda.current) {
      esPrimerRenderBusqueda.current = false;
      return;
    }
    if (busqueda.trim().length === 1) return;
    const timeoutId = setTimeout(() => cargarResumen(filtros, busqueda), 350);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      apiFetch(`/congresos/${idCongreso}/asistencia/ventanas`)
        .then((data) => setVentanas(data ?? []))
        .catch((err) => setErrorVentanas(err.message)),
      cargarResumen(),
    ]).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCongreso]);

  function handleVentanaCreada(ventana) {
    setVentanasAbiertas(true);
    setVentanas((prev) => [...prev, ventana].sort((a, b) => fechaDia(a.fecha).localeCompare(fechaDia(b.fecha))));
  }

  function handleVentanaActualizada(actualizada) {
    setVentanas((prev) => prev.map((v) => (v.id_ventana === actualizada.id_ventana ? actualizada : v)));
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Asistencia</h1>
        <p className="mt-1 text-sm text-text-muted">
          Ventanas de asistencia por día, autochequeo con código y cumplimiento de los inscritos.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setVentanasAbiertas((v) => !v)}
            aria-expanded={ventanasAbiertas}
            className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronDown className={clsx('size-4 transition-transform', ventanasAbiertas && 'rotate-180')} />
            Ventanas de asistencia ({ventanas.length})
          </button>
          <Button type="button" onClick={() => setModalAbierto(true)}>
            <Plus className="size-4" />
            Crear ventana
          </Button>
        </div>

        {errorVentanas ? (
          <Alert variant="error">{errorVentanas}</Alert>
        ) : !ventanasAbiertas ? null : ventanas.length === 0 ? (
          <p className="text-sm text-text-muted">Aún no hay ventanas de asistencia para este congreso.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {ventanas.map((ventana) => (
              <VentanaCard
                key={ventana.id_ventana}
                ventana={ventana}
                idCongreso={idCongreso}
                onActualizada={handleVentanaActualizada}
                onMarcada={() => cargarResumen()}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setUmbralAbierto((v) => !v)}
          aria-expanded={umbralAbierto}
          className="flex items-center gap-2 self-start text-sm font-medium uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronDown className={clsx('size-4 transition-transform', umbralAbierto && 'rotate-180')} />
          Configuración del umbral (
          {resumen?.dias_requeridos != null
            ? `${resumen.dias_requeridos} ${resumen.dias_requeridos === 1 ? 'día' : 'días'}`
            : 'sin configurar'}
          )
        </button>
        {umbralAbierto && (
          <ConfiguracionUmbral
            idCongreso={idCongreso}
            diasRequeridos={resumen?.dias_requeridos ?? null}
            totalVentanas={ventanas.length}
            onGuardado={() => cargarResumen()}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">Resumen de cumplimiento</h2>
        <FiltrosResumen
          filtros={filtros}
          onCambiar={handleFiltrosCambiados}
          busqueda={busqueda}
          onBusquedaCambiada={setBusqueda}
        />
        {errorFiltros && <Alert variant="error">{errorFiltros}</Alert>}
        <ResumenCumplimiento
          resumen={resumen}
          error={errorResumen}
          hayFiltros={Boolean(filtros.estado_inscripcion || filtros.cumple || busquedaEfectiva(busqueda))}
          idCongreso={idCongreso}
          onAsistenciaEliminada={() => cargarResumen()}
        />
      </section>

      <CrearVentanaModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        idCongreso={idCongreso}
        congreso={congreso}
        onCreada={handleVentanaCreada}
      />
    </div>
  );
}
