import styles from './HeroSection.module.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const frases = [
  '“No venimos a figurar, venimos a servir.”',
  '“Podemos volver a creer, pero esta vez con pruebas.”',
  '“No vamos a reiniciar Bolivia. Vamos a hacer que por fin funcione.”',
];

export default function HeroSection() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [indexFrase, setIndexFrase] = useState(0);
  const [textoVisible, setTextoVisible] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);

  // Ref para controlar índice sin perder valor en closure
  const indexRef = useRef(0);

  // Efecto máquina de escribir corregido
  useEffect(() => {
    const fraseActual = frases[indexFrase];
    setTextoVisible('');
    setEscribiendo(true);
    indexRef.current = -1;

    const escribir = setInterval(() => {
      if (indexRef.current < fraseActual.length-1) {
        setTextoVisible((prev) => prev + fraseActual[indexRef.current]);
        indexRef.current++;
      } else {
        clearInterval(escribir);
        setEscribiendo(false);
      }
    }, 50);

    return () => clearInterval(escribir);
  }, [indexFrase]);

  // Cambiar frase después de que se haya escrito
  useEffect(() => {
    if (!escribiendo) {
      const timeout = setTimeout(() => {
        setIndexFrase((prev) => (prev + 1) % frases.length);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [escribiendo]);

  const handleComenzar = async () => {
    setLoading(true);
    const user = auth.currentUser;

    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No existe usuario en Firestore');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (!userData.habilitado) {
        throw new Error('Usuario no habilitado');
      }

      const rol = userData.rol?.toLowerCase();

      switch (rol) {
        case 'delegado':
          navigate('/delegado/registro_electoral');
          break;
        case 'revisor':
          navigate('/revisor/registros_cargados');
          break;
        case 'administrador':
          navigate('/');
          break;
        case 'jefe_recinto':
          navigate('/delegado/registro_electoral');
          break;
        default:
          throw new Error('Rol no reconocido');
      }
    } catch (error) {
      alert('Error: ' + error.message);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.hero}>
      <h2 className={styles.title}>Partido LIBRE - Control Electoral</h2>

      <p className={styles.subtitle}>
        {textoVisible}
        <span className={styles.cursor}>|</span>
      </p>

      <button
        className={styles.button}
        onClick={handleComenzar}
        disabled={loading}
      >
        {loading ? 'Verificando...' : 'Comenzar a trabajar'}
      </button>
    </section>
  );
}





