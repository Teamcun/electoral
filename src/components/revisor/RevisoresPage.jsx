import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import Loader from '../Loader';
import styles from './RevisoresPage.module.css';
import { useNavigate } from 'react-router-dom';


export default function RevisoresPage() {
  const navigate = useNavigate();

  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('pendiente');
  const [abiertaId, setAbiertaId] = useState(null);
  const [imagenZoomUrl, setImagenZoomUrl] = useState(null);

  const [nombresDepartamentos, setNombresDepartamentos] = useState({});
  const [nombresCircunscripciones, setNombresCircunscripciones] = useState({});
  const [nombresProvincias, setNombresProvincias] = useState({});
  const [nombresMunicipios, setNombresMunicipios] = useState({});
  const [nombresRecintos, setNombresRecintos] = useState({});
  const [nombresUsuarios, setNombresUsuarios] = useState({});
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Cargar usuario actual y redirigir si no tiene permiso
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return navigate('/');

      const docSnap = await getDoc(doc(db, 'usuarios', uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsuarioActual(data);

        // Redirigir si no es admin ni jefe de recinto
        if (data.rol !== 'administrador' && data.rol !== 'revisor') {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    };
    cargarDatosUsuario();
  }, [navigate, auth]);

  const registrarHistorial = async ({ boletaId, accion, campo, valorAnterior, valorNuevo }) => {
    const usuario = auth.currentUser;
    if (!usuario) return;

    try {
      await addDoc(collection(db, 'historial'), {
        boletaId,
        accion,
        campo,
        valorAnterior,
        valorNuevo,
        usuarioId: usuario.uid,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error al registrar historial:', err);
    }
  };

  useEffect(() => {
    const fetchNombres = async (coleccion, ids) => {
      const nombres = {};
      for (const id of ids) {
        if (!id) continue;
        const docRef = doc(db, coleccion, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) nombres[id] = docSnap.data().nombre || 'Sin nombre';
        else nombres[id] = 'No encontrado';
      }
      return nombres;
    };

    const fetchBoletas = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'recepcion'), where('estado', '==', estadoFiltro));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const deptosIds = [...new Set(data.map(b => b.departamento))];
        const circunsIds = [...new Set(data.map(b => b.circunscripcion))];
        const provinciasIds = [...new Set(data.map(b => b.provincia))];
        const municipiosIds = [...new Set(data.map(b => b.municipio))];
        const recintosIds = [...new Set(data.map(b => b.recinto))];
        const idUsuarioRecepcion = [...new Set(data.map(b => b.idUsuarioRecepcion).filter(Boolean))];

        const [deptosNombres, circunsNombres, provinciasNombres, municipiosNombres, recintosNombres] = await Promise.all([
          fetchNombres('departamentos', deptosIds),
          fetchNombres('circunscripciones', circunsIds),
          fetchNombres('provincias', provinciasIds),
          fetchNombres('municipios', municipiosIds),
          fetchNombres('recintos', recintosIds),
        ]);

        const usuariosNombres = {};
        //console.log('🟡 Cargando nombres de usuarios para los siguientes IDs:', idUsuarioRecepcion);
        for (const id of idUsuarioRecepcion) {
          const usuarioRef = doc(db, 'usuarios', id);
          const usuarioSnap = await getDoc(usuarioRef);

          if (usuarioSnap.exists()) {
            const userData = usuarioSnap.data();
            //console.log(`✅ Usuario encontrado [${id}]:`, userData);

            usuariosNombres[id] = userData.nombre || userData.email || 'Sin nombre';
          } else {
            //console.warn(`⚠️ Usuario no encontrado para ID: ${id}`);
            usuariosNombres[id] = 'Desconocido';
          }
        }

        console.log('🟢 Resultado final usuariosNombres:', usuariosNombres);

        setNombresDepartamentos(deptosNombres);
        setNombresCircunscripciones(circunsNombres);
        setNombresProvincias(provinciasNombres);
        setNombresMunicipios(municipiosNombres);
        setNombresRecintos(recintosNombres);
        setNombresUsuarios(usuariosNombres);
        setBoletas(data);
      } catch (error) {
        console.error('Error cargando boletas:', error);
        Swal.fire('Error', 'No se pudieron cargar las boletas.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchBoletas();
  }, [estadoFiltro]);

  const manejarRevision = async (id, nuevoEstado) => {
    const confirmacion = await Swal.fire({
      title: `¿Seguro que quieres marcar como ${nuevoEstado}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setProcesandoId(id);
      await updateDoc(doc(db, 'recepcion', id), { estado: nuevoEstado });

      await registrarHistorial({
        boletaId: id,
        accion: `marcar como ${nuevoEstado}`,
        campo: 'estado',
        valorAnterior: 'pendiente',
        valorNuevo: nuevoEstado
      });

      setBoletas(prev => prev.filter(b => b.id !== id));
      Swal.fire('¡Listo!', `Boleta ${nuevoEstado}`, 'success');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Swal.fire('Error', 'No se pudo actualizar la boleta.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const editarCampo = async (boleta, campo) => {
    const { value } = await Swal.fire({
      title: `Editar ${campo}`,
      input: 'number',
      inputValue: boleta[campo] || 0,
      inputAttributes: { min: 0, step: 1 },
      showCancelButton: true,
      confirmButtonText: 'Guardar'
    });

    if (value !== undefined) {
      try {
        await updateDoc(doc(db, 'recepcion', boleta.id), { [campo]: parseInt(value) });

        await registrarHistorial({
          boletaId: boleta.id,
          accion: 'editar campo',
          campo,
          valorAnterior: boleta[campo],
          valorNuevo: parseInt(value)
        });

        setBoletas(prev => prev.map(b => b.id === boleta.id ? { ...b, [campo]: parseInt(value) } : b));
        Swal.fire('Actualizado', `${campo} editado`, 'success');
      } catch (err) {
        Swal.fire('Error', 'No se pudo editar.', 'error');
      }
    }
  };

  const editarVoto = async (boleta, tipo, partido) => {
    const campo = tipo === 'presidente' ? 'votosPresidente' : 'votosDiputado';
    const anterior = boleta[campo]?.[partido] || 0;

    const { value } = await Swal.fire({
      title: `Editar votos ${tipo} (${partido})`,
      input: 'number',
      inputValue: anterior,
      inputAttributes: { min: 0 },
      showCancelButton: true
    });

    if (value !== undefined) {
      const nuevoCampo = { ...(boleta[campo] || {}), [partido]: parseInt(value) };
      try {
        await updateDoc(doc(db, 'recepcion', boleta.id), { [campo]: nuevoCampo });

        await registrarHistorial({
          boletaId: boleta.id,
          accion: 'editar voto',
          campo: `${campo}.${partido}`,
          valorAnterior: anterior,
          valorNuevo: parseInt(value)
        });

        setBoletas(prev => prev.map(b => b.id === boleta.id ? { ...b, [campo]: nuevoCampo } : b));
      } catch (err) {
        Swal.fire('Error', 'No se pudo editar el voto.', 'error');
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <div className="pagina-revisor">
        <h2 className={styles.titulo}>Revisión de Boletas {estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1)}</h2>
      </div>
      <div className={styles.filtros}>
        {['pendiente', 'aprobado', 'observado'].map(estado => (
          <button
            key={estado}
            className={estadoFiltro === estado ? styles.activeFiltro : ''}
            onClick={() => setEstadoFiltro(estado)}
          >
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </button>
        ))}
      </div>

      {boletas.length === 0 ? (
        <p>No hay boletas {estadoFiltro} para mostrar.</p>
      ) : (
        <div className={styles.boletasList}>
          {boletas.map((boleta) => {
            const abierta = abiertaId === boleta.id;
            return (
              <div key={boleta.id} className={styles.boletaCard}>
                <div className={styles.tituloCard} onClick={() => setAbiertaId(abierta ? null : boleta.id)}>
                  <strong>Mesa {boleta.nroMesa}</strong> – {nombresRecintos[boleta.recinto] || 'Recinto'}
                  <span style={{ float: 'right' }}>{abierta ? '▲' : '▼'}</span>
                </div>
                {abierta && (
                  <div className={styles.detalle}>
                    <p><strong>Subido por:</strong> {nombresUsuarios[boleta.idUsuarioRecepcion] || 'Desconocido'}</p>
                    <p><strong>Departamento:</strong> {nombresDepartamentos[boleta.departamento]}</p>
                    <p><strong>Circunscripción:</strong> {nombresCircunscripciones[boleta.circunscripcion]}</p>
                    <p><strong>Provincia:</strong> {nombresProvincias[boleta.provincia]}</p>
                    <p><strong>Municipio:</strong> {nombresMunicipios[boleta.municipio]}</p>
                    <p><strong>Recinto:</strong> {nombresRecintos[boleta.recinto]}</p>

                    <table className={styles.votosTable}>
                      <thead>
                        <tr><th>Partido</th><th>Presidente</th><th>Diputado</th></tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set([
                          ...Object.keys(boleta.votosPresidente || {}),
                          ...Object.keys(boleta.votosDiputado || {})
                        ])).map(p => (
                          <tr key={p}>
                            <td>{p}</td>
                            <td onClick={() => editarVoto(boleta, 'presidente', p)}>{boleta.votosPresidente?.[p] ?? '0'} ✎</td>
                            <td onClick={() => editarVoto(boleta, 'diputado', p)}>{boleta.votosDiputado?.[p] ?? '0'} ✎</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {['blancosPresidente', 'blancosDiputado', 'nulosPresidente', 'validosPresidente', 'validosDiputado'].map(campo => (
                      <p key={campo}><strong>{campo}:</strong> {boleta[campo]}
                        <button onClick={() => editarCampo(boleta, campo)} className={styles.editBtn}>✎</button></p>
                    ))}

                    <div className={styles.imagenesContainer}>
                      {boleta.imagenActaUrl && (
                        <div>
                          <p><strong>Acta Electoral:</strong></p>
                          <img src={boleta.imagenActaUrl} alt="Acta" className={styles.imagenActa} onClick={() => setImagenZoomUrl(boleta.imagenActaUrl)} />
                        </div>
                      )}
                      {boleta.imagenHojaTrabajoUrl && (
                        <div>
                          <p><strong>Hoja de Trabajo:</strong></p>
                          <img src={boleta.imagenHojaTrabajoUrl} alt="Hoja de trabajo" className={styles.imagenHoja} onClick={() => setImagenZoomUrl(boleta.imagenHojaTrabajoUrl)} />
                        </div>
                      )}
                    </div>

                    {estadoFiltro === 'pendiente' && (
                      <div className={styles.botones}>
                        <button onClick={() => manejarRevision(boleta.id, 'aprobado')} disabled={procesandoId === boleta.id} className={styles.aprobarBtn}>Aprobar</button>
                        <button onClick={() => manejarRevision(boleta.id, 'observado')} disabled={procesandoId === boleta.id} className={styles.rechazarBtn}>Rechazar</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {imagenZoomUrl && (
        <div className={styles.zoomOverlay} onClick={() => setImagenZoomUrl(null)}>
          <img src={imagenZoomUrl} alt="Zoom" className={styles.zoomImagen} />
        </div>
      )}
    </div>
  );
}




