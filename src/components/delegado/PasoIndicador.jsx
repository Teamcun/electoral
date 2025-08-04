import { useEffect, useRef, useState } from 'react';
import styles from './PasoIndicador.module.css';

export default function PasoIndicador({ numero, texto, ayuda }) {
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.pasoContainer}>
      <div className={styles.circuloNumero}>{numero}</div>
      <h3 className={styles.textoPaso}>
        {texto}
        {ayuda && (
          <span
            ref={tooltipRef}
            onClick={() => setVisible(v => !v)}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            tabIndex={0}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            aria-label="Información adicional"
            className={styles.iconoAyuda}
          >
            ❓
            {visible && <div className={styles.tooltip}>{ayuda}</div>}
          </span>
        )}
      </h3>
    </div>
  );
}

