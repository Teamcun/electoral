import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from './firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from './LoginPage.module.css';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const images = document.querySelectorAll(`.${styles.bgCarousel} img`);
    const texts = [
      {
        title: "Transparencia Electoral",
        desc: "Garantiza procesos electorales limpios y confiables con datos abiertos y accesibles para todos.",
      },
      {
        title: "Gestión de Votantes",
        desc: "Administra el registro y la verificación de votantes para asegurar la legitimidad del padrón electoral.",
      },
      {
        title: "Monitoreo en Tiempo Real",
        desc: "Supervisa las actas y resultados electorales en tiempo real para una toma de decisiones rápida y precisa.",
      },
      {
        title: "Seguridad y Confidencialidad",
        desc: "Protege la información electoral con sistemas seguros y protocolos de confidencialidad rigurosos.",
      },
      {
        title: "Análisis de Resultados",
        desc: "Visualiza estadísticas y tendencias para evaluar el desempeño electoral y planificar futuras estrategias.",
      },
    ];


    const textContainer = document.querySelector(`.${styles.carouselText}`);
    let currentIndex = 0;

    const changeImage = () => {
      if (!images.length || !textContainer) return;

      // Cambiar imagen
      images[currentIndex].classList.remove(styles.active);
      currentIndex = (currentIndex + 1) % images.length;
      images[currentIndex].classList.add(styles.active);

      // Actualizar texto
      const h2 = textContainer.querySelector('h2');
      const p = textContainer.querySelector('p');

      // Quitar clase animación previa
      h2.classList.remove(styles.fadeIn);
      p.classList.remove(styles.fadeIn);

      // Forzar reflow para reiniciar animación
      void h2.offsetWidth;
      void p.offsetWidth;

      // Cambiar contenido
      h2.textContent = texts[currentIndex].title;
      p.textContent = texts[currentIndex].desc;

      // Agregar clase animación que incluye color blanco
      h2.classList.add(styles.fadeIn);
      p.classList.add(styles.fadeIn);
    };

    const interval = setInterval(changeImage, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Iniciando sesión con:', email, password);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Login exitoso:', user.email);

      const q = query(collection(db, 'usuarios'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      console.log('Documentos obtenidos:', querySnapshot.size);

      if (querySnapshot.empty) {
        throw new Error('No existe usuario en Firestore');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      console.log('Datos del usuario:', userData);

      if (!userData.habilitado) {
        throw new Error('Usuario no habilitado');
      }

      const rol = userData.rol?.toLowerCase();
      if (!rol) {
        throw new Error('Usuario sin rol');
      }

      console.log('Rol:', rol);

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
          navigate('/jefesR/GestionUsuariosPage');
          break;
        default:
          throw new Error('Rol no reconocido');
      }

    } catch (err) {
      console.error('Error atrapado:', err);
      setError(err.message || 'Error desconocido');
      setLoading(false);
    }
  };


  return (
    <div className={styles.mainContainer}>
      {/* Izquierda: carrusel con overlay */}
      <div className={styles.leftSection}>
        <div className={styles.bgCarousel}>
          <img src="/img/intro_1.jpg" alt="KPI" className={styles.active} />
          <img src="/img/intro_2.jpg" alt="Inventario" />
          <img src="/img/intro_3.jpg" alt="Flujo de Caja" />
          <img src="/img/intro_4.jpg" alt="Clientes" />
          <img src="/img/intro_5.jpg" alt="Mercado" />
        </div>
        <div className={styles.bgOverlay}></div>
        <div className={styles.carouselText}>
          <h2>Monitoreo en Tiempo Real</h2>
          <p>Supervisa las actas y resultados electorales en tiempo real para una toma de decisiones rápida y precisa.</p>
        </div>
      </div>

      {/* Derecha: formulario de login */}
      <div className={styles.rightSection}>
        <div className={styles.authContainer}>
          <div className={styles.logo}>
            <img src="/img/logo_libre.png" alt="Logo" />
          </div>
          <h2 className={styles.authTitle}>Iniciar Sesión</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formField}>
              <i className="fas fa-lock"></i>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className={styles.authBtn}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          <Link to="/signup" className={styles.authLink}>
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}






