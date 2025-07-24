import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from './firebaseConfig'; // importa tu config de firebase
import styles from './Header.module.css';

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const cerrarMenu = () => setMenuAbierto(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);

      // Si no está logueado y no está en /login ni /signup, redirige a /login
      const path = window.location.pathname;
      if (!currentUser && !path.startsWith('/login') && !path.startsWith('/signup')) {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await auth.signOut();
    cerrarMenu();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link to="/" onClick={cerrarMenu}>
          <img 
            src="/img/logo_libre.png" 
            alt="Partido LIBRE Logo"
            className={styles.logoImg}
          />
          LIBRE
        </Link>
      </div>

      <button
        className={styles.hamburguesa}
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label="Menú"
      >
        ☰
      </button>

      <nav className={`${styles.nav} ${menuAbierto ? styles.abierto : ''}`}>
        <Link to="/" onClick={cerrarMenu}>Inicio</Link>
        <Link to="/delegado/registro_electoral" onClick={cerrarMenu}>Registro Electoral</Link>
        <Link to="/revisor/registros_cargados" onClick={cerrarMenu}>Revisor</Link>
        <Link to="/jefesR/GestionUsuariosPage" onClick={cerrarMenu}>Gestion de cuentas</Link>
        <Link to="/resultados" onClick={cerrarMenu}>Resultados</Link>
        
        {user ? (
          <button onClick={handleLogout} className={styles.Btn}>
            Salir
          </button>
        ) : (
          <>
            <Link to="/login" onClick={cerrarMenu}>Acceder</Link>
            <Link to="/signup" onClick={cerrarMenu}>Registrarse</Link>
          </>
        )}
      </nav>
    </header>
  );
}


