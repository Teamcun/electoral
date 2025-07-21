import styles from './HeroSection.module.css';
import { Link } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <h2 className={styles.title}>Partido LIBRE - Control Electoral</h2>
      <p className={styles.subtitle}>Fortaleciendo la democracia con transparencia y participación ciudadana.</p>
      <HashLink smooth to="/#resultados" className={styles.button}>
        Comenzar a trabajar
      </HashLink>
    </section>
  );
}

