import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from './firebaseConfig'; // incluye también 'db' para obtener datos del usuario
import { doc, getDoc } from 'firebase/firestore';
import styles from './Header.module.css';

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Datos adicionales del usuario (rol, nombre)
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const navigate = useNavigate();
  const avatarRef = useRef();

  const cerrarMenu = () => setMenuAbierto(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async currentUser => {
      setUser(currentUser);

      if (currentUser) {
        const userDocRef = doc(db, 'usuarios', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      }

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

  // Cierra el menú usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setMenuUsuarioAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      {/* Logo */}
      <div className={styles.logoWrapper}>
        <Link to="/" onClick={cerrarMenu} className={styles.logo}>
          <img
            src="/img/logo_libre.png"
            alt="Partido LIBRE Logo"
            className={styles.logoImg}
          />
        </Link>
      </div>

      {/* Botón hamburguesa visible en móvil */}
      <button
        className={styles.hamburguesa}
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label="Menú"
      >
        ☰
      </button>

      {/* Navegación */}
      <nav className={`${styles.nav} ${menuAbierto ? styles.abierto : ''}`}>
        <a
          href="https://chatgpt.com/g/g-67e3fe14c71c8191844fa99fe1ee3162-libre-al-cambio"
          target="_blank"
          rel="noopener noreferrer"
          onClick={cerrarMenu}
        >
          <img
            src="/img/chat5.png"
            alt="Chat personalizado GPT"
            className={styles.iconoChat}
          />
          IA LIBRE
        </a>

        <Link to="/" onClick={cerrarMenu}>Inicio</Link>
        <Link to="/delegado/registro_electoral" onClick={cerrarMenu}>Registro Electoral</Link>
        <Link to="/revisor/registros_cargados" onClick={cerrarMenu}>Revisor</Link>
        <Link to="/jefesR/GestionUsuariosPage" onClick={cerrarMenu}>Gestión de cuentas</Link>
        <Link to="/resultados/resultados_graficos" onClick={cerrarMenu}>Resultados</Link>

        {/* Usuario */}
        {user ? (
          <div className={styles.usuarioWrapper} ref={avatarRef}>
            <div
              className={styles.avatarUsuario}
              onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}
              title={user.email}
            >
              {user.email?.charAt(0).toUpperCase()}
            </div>

            {menuUsuarioAbierto && (
              <div className={styles.menuUsuario}>
                <div className={styles.usuarioInfo}>
                  <strong>{user.email}</strong>
                  {userData?.rol && <div>Rol: {userData.rol}</div>}
                  {userData?.recintoNombre && <div>Recinto: {userData.recintoNombre}</div>}
                </div>
                <button onClick={handleLogout} className={styles.BtnSalir}>
                  Salir
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.linksAuth}>
            <Link to="/login" onClick={cerrarMenu}>Acceder</Link>
            <Link to="/signup" onClick={cerrarMenu}>Registrarse</Link>
          </div>
        )}
      </nav>
    </header>

  );
}


