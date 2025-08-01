import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { db } from '../firebaseConfig';
import Swal from 'sweetalert2';
import UsuarioCard from '../UsuarioCard';
import { useNavigate } from 'react-router-dom';

export default function GestionUsuariosPage() {
  const auth = getAuth();
  const navigate = useNavigate();

  // Estados
  const [usuariosPendientes, setUsuariosPendientes] = useState([]); // de colección solicitudes
  const [usuariosHabilitados, setUsuariosHabilitados] = useState([]); // de colección usuarios
  const [loading, setLoading] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Estados de filtros
  const [filtroRecinto, setFiltroRecinto] = useState('');
  const [filtroCelular, setFiltroCelular] = useState('');

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
        if (data.rol !== 'administrador' && data.rol !== 'jefe_recinto') {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    };
    cargarDatosUsuario();
  }, [navigate, auth]);

  // Cargar pendientes de colección 'solicitudes' y habilitados de 'usuarios'
  const cargarUsuarios = async () => {
    if (!usuarioActual) return;
    setLoading(true);

    const solicitudesSnap = await getDocs(collection(db, 'solicitudes'));
    const usuariosSnap = await getDocs(collection(db, 'usuarios'));

    const solicitudes = solicitudesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const usuarios = usuariosSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (usuarioActual.rol === 'administrador') {
      setUsuariosPendientes(solicitudes);
      setUsuariosHabilitados(usuarios.filter((u) => u.habilitado));
    } else if (usuarioActual.rol === 'jefe_recinto') {
      const recintoId = usuarioActual.recintoId;
      setUsuariosPendientes(
        solicitudes.filter((u) => u.recintoId === recintoId)
      );
      setUsuariosHabilitados(
        usuarios.filter((u) => u.habilitado && u.recintoId === recintoId)
      );
    }

    setLoading(false);
  };


  useEffect(() => {
    if (usuarioActual) cargarUsuarios();
  }, [usuarioActual]);


  // Habilitar solicitud: crear cuenta Auth + mover datos a usuarios + borrar solicitud
  const habilitarUsuario = async (usuario) => {
    const resultado = await Swal.fire({
      title: '¿Estás seguro?',
      text: `Vas a habilitar a ${usuario.nombre} con rol "delegado" y contraseña su número celular.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, habilitar',
      cancelButtonText: 'Cancelar',
    });

    if (!resultado.isConfirmed) return;

    try {
      // Crear usuario en Authentication
      const cred = await createUserWithEmailAndPassword(
        auth,
        usuario.email,
        usuario.celular
      );
      const nuevoUID = cred.user.uid;

      // Copiar datos a la colección 'usuarios' con el UID nuevo como id
      const datosUsuario = {
        ...usuario,
        rol: 'delegado',
        habilitado: true,
      };
      delete datosUsuario.id; // para evitar conflicto con doc id

      await setDoc(doc(db, 'usuarios', nuevoUID), datosUsuario);

      // Borrar solicitud de la colección 'solicitudes'
      await deleteDoc(doc(db, 'solicitudes', usuario.id));

      Swal.fire(
        '¡Usuario habilitado!',
        'Se ha creado su cuenta y asignado rol delegado.',
        'success'
      );
      cargarUsuarios();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  };

  // Filtro combinado por recinto y celular
  const filtrarUsuarios = (usuarios) => {
    const recintoFiltro = filtroRecinto.trim().toLowerCase();
    const celularFiltro = filtroCelular.trim().toLowerCase();

    return usuarios.filter((u) => {
      const recinto = (u.recintoNombre || '').trim().toLowerCase();
      const celular = (u.celular || '').trim().toLowerCase();

      const coincideRecinto =
        recintoFiltro === '' || recinto.includes(recintoFiltro);
      const coincideCelular =
        celularFiltro === '' || celular.includes(celularFiltro);

      return coincideRecinto && coincideCelular;
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Filtro por recinto electoral y celular</h2>
      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Filtrar por recinto electoral"
          value={filtroRecinto}
          onChange={(e) => setFiltroRecinto(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            border: '1.5px solid #ccc',
          }}
        />
        <input
          type="text"
          placeholder="Filtrar por número de celular"
          value={filtroCelular}
          onChange={(e) => setFiltroCelular(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1.5px solid #ccc',
          }}
        />
      </div>

      <h2>Solicitudes Pendientes</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : filtrarUsuarios(usuariosPendientes).length === 0 ? (
        <p>No hay solicitudes pendientes con ese filtro</p>
      ) : (
        filtrarUsuarios(usuariosPendientes).map((u) => (
          <UsuarioCard
            key={u.id}
            usuario={u}
            puedeHabilitar
            onHabilitar={habilitarUsuario}
          />
        ))
      )}

      <hr style={{ margin: '3rem 0' }} />

      <h2>Usuarios Habilitados</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : filtrarUsuarios(usuariosHabilitados).length === 0 ? (
        <p>No hay usuarios habilitados con ese filtro</p>
      ) : (
        filtrarUsuarios(usuariosHabilitados).map((u) => (
          <UsuarioCard key={u.id} usuario={u} />
        ))
      )}
    </div>
  );
}





