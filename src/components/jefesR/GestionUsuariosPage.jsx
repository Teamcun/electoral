import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebaseConfig';
import Swal from 'sweetalert2';
import UsuarioCard from '../UsuarioCard';

export default function GestionUsuariosPage() {
  const auth = getAuth();

  // Estados
  const [usuariosPendientes, setUsuariosPendientes] = useState([]);
  const [usuariosHabilitados, setUsuariosHabilitados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga usuarios Firestore
  const cargarUsuarios = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'usuarios'));
    const todos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsuariosPendientes(todos.filter(u => u.rol === 'pendiente' && !u.habilitado));
    setUsuariosHabilitados(todos.filter(u => u.habilitado));
    setLoading(false);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Crear cuenta en Auth + habilitar en Firestore
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
      // Crear cuenta en Authentication
      await createUserWithEmailAndPassword(auth, usuario.email, usuario.celular);

      // Actualizar Firestore: rol y habilitado
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        rol: 'delegado',
        habilitado: true,
      });

      Swal.fire('¡Usuario habilitado!', 'Se ha creado su cuenta y asignado rol delegado.', 'success');
      cargarUsuarios();
    } catch (error) {
      // Si el usuario ya existe en Authentication, puede fallar aquí
      Swal.fire('Error', error.message, 'error');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Usuarios Pendientes</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : usuariosPendientes.length === 0 ? (
        <p>No hay usuarios pendientes</p>
      ) : (
        usuariosPendientes.map((u) => (
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
      ) : usuariosHabilitados.length === 0 ? (
        <p>No hay usuarios habilitados</p>
      ) : (
        usuariosHabilitados.map((u) => (
          <UsuarioCard key={u.id} usuario={u} />
        ))
      )}
    </div>
  );
}


