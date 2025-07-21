import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import styles from './SignupPage.module.css';

export default function SolicitarAccesoPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'usuarios'), {
        nombre,
        email,
        rol: 'pendiente', // rol provisional para acceso pendiente
        habilitado: false,
        fechaSolicitud: serverTimestamp(),
      });

      setSuccessMsg('Solicitud enviada. Espera la aprobación del administrador.');
      setNombre('');
      setEmail('');
    } catch (err) {
      setError('Error al enviar la solicitud: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signupContainer}>
      <h2>Solicitar Acceso</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>Nombre completo</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label>Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && <p className={styles.error}>{error}</p>}
        {successMsg && <p className={styles.success}>{successMsg}</p>}

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  );
}



