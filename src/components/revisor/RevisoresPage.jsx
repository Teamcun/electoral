import React, { useEffect, useState } from 'react'; 
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import Loader from '../Loader';
import Swal from 'sweetalert2';
import styles from './RevisoresPage.module.css';

export default function RevisoresPage() {
  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('pendiente');

  // Diccionarios para nombres, índice por id
  const [nombresDepartamentos, setNombresDepartamentos] = useState({});
  const [nombresCircunscripciones, setNombresCircunscripciones] = useState({});
  const [nombresProvincias, setNombresProvincias] = useState({});
  const [nombresMunicipios, setNombresMunicipios] = useState({});
  const [nombresRecintos, setNombresRecintos] = useState({});

  useEffect(() => {
    const fetchNombres = async (coleccion, ids) => {
      const nombres = {};
      for (const id of ids) {
        if (!id) continue;
        const docRef = doc(db, coleccion, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          nombres[id] = docSnap.data().nombre || 'Sin nombre';
        } else {
          nombres[id] = 'No encontrado';
        }
      }
      return nombres;
    };

    const fetchBoletas = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'recepcion'), where('estado', '==', estadoFiltro));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Obtener ids únicos para cada categoría
        const deptosIds = [...new Set(data.map(b => b.departamento))];
        const circunsIds = [...new Set(data.map(b => b.circunscripcion))];
        const provinciasIds = [...new Set(data.map(b => b.provincia))];
        const municipiosIds = [...new Set(data.map(b => b.municipio))];
        const recintosIds = [...new Set(data.map(b => b.recinto))];

        // Obtener nombres para cada conjunto
        const [
          deptosNombres,
          circunsNombres,
          provinciasNombres,
          municipiosNombres,
          recintosNombres
        ] = await Promise.all([
          fetchNombres('departamentos', deptosIds),
          fetchNombres('circunscripciones', circunsIds),
          fetchNombres('provincias', provinciasIds),
          fetchNombres('municipios', municipiosIds),
          fetchNombres('recintos', recintosIds),
        ]);

        // Guardar nombres en estado
        setNombresDepartamentos(deptosNombres);
        setNombresCircunscripciones(circunsNombres);
        setNombresProvincias(provinciasNombres);
        setNombresMunicipios(municipiosNombres);
        setNombresRecintos(recintosNombres);

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
      cancelButtonText: 'No',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setProcesandoId(id);
      const boletaRef = doc(db, 'recepcion', id);
      await updateDoc(boletaRef, { estado: nuevoEstado });
      setBoletas(prev => prev.filter(b => b.id !== id));
      Swal.fire('¡Listo!', `Boleta ${nuevoEstado}`, 'success');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Swal.fire('Error', 'No se pudo actualizar la boleta.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <h2>Revisión de Boletas {estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1)}</h2>

      {/* Filtros */}
      <div className={styles.filtros}>
        <button
          className={estadoFiltro === 'pendiente' ? styles.activeFiltro : ''}
          onClick={() => setEstadoFiltro('pendiente')}
        >
          Pendientes
        </button>
        <button
          className={estadoFiltro === 'aprobado' ? styles.activeFiltro : ''}
          onClick={() => setEstadoFiltro('aprobado')}
        >
          Aprobados
        </button>
        <button
          className={estadoFiltro === 'rechazado' ? styles.activeFiltro : ''}
          onClick={() => setEstadoFiltro('rechazado')}
        >
          Rechazados
        </button>
      </div>

      {boletas.length === 0 ? (
        <p>No hay boletas {estadoFiltro} para mostrar.</p>
      ) : (
        <div className={styles.boletasList}>
          {boletas.map((boleta) => (
            <div key={boleta.id} className={styles.boletaCard}>
              <h3>Mesa: {boleta.nroMesa}</h3>

              {/* Mostrar nombres en vez de IDs para ubicaciones */}
              <p><strong>Departamento:</strong> {nombresDepartamentos[boleta.departamento] || boleta.departamento}</p>
              <p><strong>Circunscripción:</strong> {nombresCircunscripciones[boleta.circunscripcion] || boleta.circunscripcion}</p>
              <p><strong>Provincia:</strong> {nombresProvincias[boleta.provincia] || boleta.provincia}</p>
              <p><strong>Municipio:</strong> {nombresMunicipios[boleta.municipio] || boleta.municipio}</p>
              <p><strong>Recinto:</strong> {nombresRecintos[boleta.recinto] || boleta.recinto}</p>

              {/* Tabla votos */}
              <div className={styles.votosTableContainer}>
                <table className={styles.votosTable}>
                  <thead>
                    <tr>
                      <th>Partido</th>
                      <th>Votos Presidente</th>
                      <th>Votos Diputado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set([
                      ...Object.keys(boleta.votosPresidente || {}),
                      ...Object.keys(boleta.votosDiputado || {})
                    ])).map((partidoNombre) => (
                      <tr key={partidoNombre}>
                        <td>{partidoNombre}</td>
                        <td>{boleta.votosPresidente?.[partidoNombre] ?? '0'}</td>
                        <td>{boleta.votosDiputado?.[partidoNombre] ?? '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Campos extra */}
              <div className={styles.camposExtra}>
                <p><strong>Blancos Diputado:</strong> {boleta.blancosDiputado || '0'}</p>
                <p><strong>Blancos Presidente:</strong> {boleta.blancosPresidente || '0'}</p>
                <p><strong>Nulos Presidente:</strong> {boleta.nulosPresidente || '0'}</p>
                <p><strong>Válidos Diputado:</strong> {boleta.validosDiputado || '0'}</p>
                <p><strong>Válidos Presidente:</strong> {boleta.validosPresidente || '0'}</p>
              </div>

              {/* Imagen del acta */}
              <div className={styles.imagenActaContainer}>
                <img
                  src={boleta.imagenActaUrl}
                  alt={`Acta mesa ${boleta.nroMesa}`}
                  className={styles.imagenActa}
                />
              </div>

              {/* Botones solo si está en pendientes */}
              {estadoFiltro === 'pendiente' && (
                <div className={styles.botones}>
                  <button
                    onClick={() => manejarRevision(boleta.id, 'aprobado')}
                    disabled={procesandoId === boleta.id}
                    className={styles.aprobarBtn}
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => manejarRevision(boleta.id, 'rechazado')}
                    disabled={procesandoId === boleta.id}
                    className={styles.rechazarBtn}
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



