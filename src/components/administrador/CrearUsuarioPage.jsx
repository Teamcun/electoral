import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import Loader from './Loader';
import styles from './CrearUsuarioPage.module.css';

export default function CrearUsuarioPage() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'delegado',  // Puedes agregar otros roles si quieres
    recinto: '',
  });

  const [recintos, setRecintos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Cargar recintos para asignar
  useEffect(() => {
    const cargarRecintos = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'recintos'));
        setRecintos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error cargando recintos', error);
        Swal.fire('Error', 'No se pudieron cargar los recintos', 'error');
      } finally {
        setLoading(false);
      }
    };
    cargarRecintos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombre || !form.apellido || !form.email || !form.password || !form.rol || !form.recinto) {
      Swal.fire('Error', 'Por favor completa todos los campos', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      // Verificar si email ya existe (opcional, para mejor UX)
      const methods = await fetchSignInMethodsForEmail(auth, form.email);
      if (methods.length > 0) {
        Swal.fire('Error', 'El email ya está registrado', 'error');
        setSubmitting(false);
        return;
      }

      // Crear usuario con cuenta temporal para obtener UID (sin cambiar sesión)
      // Para crear un usuario sin cambiar sesión, hay que usar el Admin SDK (backend)
      // O usar "createUserWithEmailAndPassword" con el usuario actual para crear un usuario delegado SIN iniciar sesión con él
      // Firebase Web SDK no soporta crear usuarios sin iniciar sesión en cliente,
      // por lo que la solución ideal es usar una Cloud Function o backend.
      // Como alternativa, se puede usar "firebase-admin" en backend para crear usuarios.

      // Aquí simulo crear usuario y volver a la sesión anterior:
      // WARNING: Este método cambiará sesión y debe manejarse cuidadosamente.
      // Por simplicidad, aquí solo muestro el proceso tradicional:

      // 1. Guardar UID actual:
      const usuarioActual = auth.currentUser;

      // 2. Crear nuevo usuario (esto inicia sesión con nuevo usuario):
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const nuevoUsuario = cred.user;

      // 3. Guardar datos del usuario creado en Firestore:
      await addDoc(collection(db, 'usuarios'), {
        uid: nuevoUsuario.uid,
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        rol: form.rol,
        recinto: form.recinto,
        creadoEn: new Date(),
        habilitado: true,
      });

      // 4. Volver a sesión anterior (si quieres evitar logout), pero Firebase no tiene función directa para eso
      // Esto es complejo, implica guardar token y reautenticar manualmente
      // Por eso la recomendación fuerte es manejar la creación de usuarios en backend

      // Para propósitos de esta demo, hacemos logout y login con usuario anterior:
      await auth.signOut();

      // Supongamos que tienes guardadas las credenciales del usuario actual (admin)
      // Las reingresas aquí (debes adaptar esta parte con tu sistema de auth)
      // Ejemplo:
      // await signInWithEmailAndPassword(auth, 'admin@example.com', 'adminpassword');

      // Aquí solo aviso éxito, para no complicar demo sin backend
      Swal.fire('Éxito', 'Usuario creado. Por favor inicia sesión nuevamente.', 'success');

      setForm({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        rol: 'delegado',
        recinto: '',
      });
    } catch (error) {
      console.error('Error creando usuario:', error);
      Swal.fire('Error', error.message || 'Error al crear usuario', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <h2>Crear Usuario Delegado</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          Nombre:
          <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required />
        </label>
        <label>
          Apellido:
          <input type="text" name="apellido" value={form.apellido} onChange={handleChange} required />
        </label>
        <label>
          Email:
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Contraseña:
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </label>
        <label>
          Rol:
          <select name="rol" value={form.rol} onChange={handleChange} required>
            <option value="delegado">Delegado</option>
            <option value="encargado">Encargado</option>
            {/* Otros roles si aplica */}
          </select>
        </label>
        <label>
          Recinto:
          <select name="recinto" value={form.recinto} onChange={handleChange} required>
            <option value="">-- Selecciona un recinto --</option>
            {recintos.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </label>

        <button type="submit" className={styles.btn} disabled={submitting}>
          {submitting ? 'Creando...' : 'Crear Usuario'}
        </button>
      </form>
    </div>
  );
}
