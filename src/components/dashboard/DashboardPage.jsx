import React from 'react';
import { Link } from 'react-router-dom';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <h2 className={styles.title}>Panel de Control Electoral</h2>
      <p className={styles.subtitle}>Selecciona una sección para gestionar:</p>

      <div className={styles.grid}>
        <Link to="/dashboard/usuarios" className={styles.card}>
          <h3>👥 Usuarios</h3>
          <p>Gestiona el acceso de los operadores del sistema.</p>
        </Link>

        <Link to="/dashboard/recepcion" className={styles.card}>
          <h3>📩 Recepción</h3>
          <p>Registra las actas y papelógrafos recibidos por mesa.</p>
        </Link>

        <Link to="/dashboard/escrutinio" className={styles.card}>
          <h3>🗳️ Escrutinio</h3>
          <p>Ingresa y verifica los resultados por agrupación política.</p>
        </Link>
      </div>
    </div>
  );
}

