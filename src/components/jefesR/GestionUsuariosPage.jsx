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
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { db, auth, firebaseConfig } from '../firebaseConfig';
import { initializeApp } from 'firebase/app';
import Swal from 'sweetalert2';
import UsuarioCard from '../UsuarioCard';
import { useNavigate } from 'react-router-dom';
import styles from './GestionUsuariosPage.module.css';

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

  const cambiarRolUsuario = async (usuario) => {
    const { value: nuevoRol } = await Swal.fire({
      title: `Cambiar rol de ${usuario.nombre}`,
      input: 'select',
      inputOptions: {
        delegado: 'Delegado',
        revisor: 'Revisor',
        jefe_recinto: 'Jefe de recinto',
      },
      inputPlaceholder: 'Selecciona un nuevo rol',
      inputValue: usuario.rol,
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
    });

    if (!nuevoRol || nuevoRol === usuario.rol) return;

    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        rol: nuevoRol,
      });

      Swal.fire('Rol actualizado', `Nuevo rol: ${nuevoRol}`, 'success');
      cargarUsuarios();
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      Swal.fire('Error', 'No se pudo actualizar el rol.', 'error');
    }
  };



  const habilitarUsuario = async (usuario) => {
    let rolSeleccionado = 'delegado';

    if (usuarioActual.rol === 'administrador') {
      const { value: rol } = await Swal.fire({
        title: `Asignar rol a ${usuario.nombre}`,
        input: 'select',
        inputOptions: {
          delegado: 'Delegado',
          revisor: 'Revisor',
          jefe_recinto: 'Jefe de recinto',
        },
        inputPlaceholder: 'Selecciona un rol',
        showCancelButton: true,
        confirmButtonText: 'Habilitar',
        cancelButtonText: 'Cancelar',
      });

      if (!rol) return;
      rolSeleccionado = rol;
    } else {
      const confirm = await Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a habilitar a ${usuario.nombre} con rol "delegado" y contraseña su número celular.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, habilitar',
        cancelButtonText: 'Cancelar',
      });

      if (!confirm.isConfirmed) return;
    }

    try {
      // Crear app secundaria para crear usuario sin cerrar sesión del admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        usuario.email,
        usuario.celular
      );

      const nuevoUID = cred.user.uid;

      const datosUsuario = {
        ...usuario,
        rol: rolSeleccionado,
        habilitado: true,
      };
      delete datosUsuario.id;

      await setDoc(doc(db, 'usuarios', nuevoUID), datosUsuario);
      await deleteDoc(doc(db, 'solicitudes', usuario.id));

      // Cerrar sesión del usuario creado para mantener activo al admin
      await secondaryAuth.signOut();
      // Liberar recursos
      secondaryApp.delete?.();

      Swal.fire(
        '¡Usuario habilitado!',
        `Se ha creado su cuenta y asignado rol "${rolSeleccionado}".`,
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
    <div className={styles.container}>
      <h2>Filtro por recinto electoral y celular</h2>
      <div className={styles.filtros}>
        <input
          type="text"
          placeholder="Filtrar por recinto electoral"
          value={filtroRecinto}
          onChange={(e) => setFiltroRecinto(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por número de celular"
          value={filtroCelular}
          onChange={(e) => setFiltroCelular(e.target.value)}
        />
      </div>

      <h2>Solicitudes Pendientes</h2>
      {loading ? (
        <p className={styles.mensaje}>Cargando...</p>
      ) : filtrarUsuarios(usuariosPendientes).length === 0 ? (
        <p className={styles.mensaje}>No hay solicitudes pendientes con ese filtro</p>
      ) : (
        <div className={styles.listaUsuarios}>
          {filtrarUsuarios(usuariosPendientes).map((u) => (
            <UsuarioCard
              key={u.id}
              usuario={u}
              puedeHabilitar
              onHabilitar={habilitarUsuario}
            />
          ))}
        </div>
      )}

      <hr className={styles.separador} />

      <h2>Usuarios Habilitados</h2>
      {loading ? (
        <p className={styles.mensaje}>Cargando...</p>
      ) : filtrarUsuarios(usuariosHabilitados).length === 0 ? (
        <p className={styles.mensaje}>No hay usuarios habilitados con ese filtro</p>
      ) : (
        <div className={styles.listaUsuarios}>
          {filtrarUsuarios(usuariosHabilitados).map((u) => (
            <UsuarioCard
              key={u.id}
              usuario={u}
              onCambiarRol={
                usuarioActual.rol === 'administrador' ? cambiarRolUsuario : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}





