import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import styles from './SignupPage.module.css';

export default function SolicitarAccesoPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    departamento: '',
    circunscripcion: '',
    provincia: '',
    municipio: '',
    recinto: '',
  });

  const [departamentos, setDepartamentos] = useState([]);
  const [circunscripciones, setCircunscripciones] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [recintos, setRecintos] = useState([]);

  const [busquedaCirc, setBusquedaCirc] = useState('');
  const [busquedaProv, setBusquedaProv] = useState('');
  const [busquedaMuni, setBusquedaMuni] = useState('');
  const [busquedaRecinto, setBusquedaRecinto] = useState('');

  const circunscripcionesFiltradas = circunscripciones.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCirc.toLowerCase())
  );
  const provinciasFiltradas = provincias.filter(p =>
    p.nombre.toLowerCase().includes(busquedaProv.toLowerCase())
  );
  const municipiosFiltrados = municipios.filter(m =>
    m.nombre.toLowerCase().includes(busquedaMuni.toLowerCase())
  );
  const recintosFiltrados = recintos.filter(r =>
    r.nombre.toLowerCase().includes(busquedaRecinto.toLowerCase())
  );

  useEffect(() => {
    const cargarDepartamentos = async () => {
      const snap = await getDocs(collection(db, 'departamentos'));
      setDepartamentos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargarDepartamentos();
  }, []);

  useEffect(() => {
    if (!form.departamento) return;
    const cargar = async () => {
      const q = query(collection(db, 'circunscripciones'), where('idDepartamento', '==', form.departamento));
      const snap = await getDocs(q);
      setCircunscripciones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargar();
  }, [form.departamento]);

  useEffect(() => {
    if (!form.circunscripcion) return;
    const cargar = async () => {
      const q = query(collection(db, 'provincias'), where('idCircunscripcion', '==', form.circunscripcion));
      const snap = await getDocs(q);
      setProvincias(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargar();
  }, [form.circunscripcion]);

  useEffect(() => {
    if (!form.provincia) return;
    const cargar = async () => {
      const q = query(collection(db, 'municipios'), where('idProvincia', '==', form.provincia));
      const snap = await getDocs(q);
      setMunicipios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargar();
  }, [form.provincia]);

  useEffect(() => {
    if (!form.municipio) return;
    const cargar = async () => {
      const q = query(collection(db, 'recintos'), where('idMunicipio', '==', form.municipio));
      const snap = await getDocs(q);
      setRecintos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargar();
  }, [form.municipio]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const departamentoNombre = departamentos.find(d => d.id === form.departamento)?.nombre || '';
      const circunscripcionNombre = circunscripciones.find(c => c.id === form.circunscripcion)?.nombre || '';
      const provinciaNombre = provincias.find(p => p.id === form.provincia)?.nombre || '';
      const municipioNombre = municipios.find(m => m.id === form.municipio)?.nombre || '';
      const recintoNombre = recintos.find(r => r.id === form.recinto)?.nombre || '';

      await addDoc(collection(db, 'solicitudes'), {
        nombre,
        email,
        celular,
        departamentoId: form.departamento,
        departamentoNombre,
        circunscripcionId: form.circunscripcion,
        circunscripcionNombre,
        provinciaId: form.provincia,
        provinciaNombre,
        municipioId: form.municipio,
        municipioNombre,
        recintoId: form.recinto,
        recintoNombre,
        rol: 'pendiente',
        habilitado: false,
        fechaSolicitud: serverTimestamp(),
      });

      setSuccessMsg('Solicitud enviada. Espera la aprobación del administrador.');
      setNombre('');
      setEmail('');
      setCelular('');
      setForm({
        departamento: '',
        circunscripcion: '',
        provincia: '',
        municipio: '',
        recinto: '',
      });
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
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

        <label>Correo electrónico</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Número de celular</label>
        <input type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} required />

        <label>Departamento</label>
        <select
          value={form.departamento}
          onChange={(e) => setForm({ ...form, departamento: e.target.value, circunscripcion: '', provincia: '', municipio: '', recinto: '' })}
          required
        >
          <option value="">Seleccione un departamento</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>

        <label>Buscar circunscripción</label>
        <input type="text" value={busquedaCirc} onChange={(e) => setBusquedaCirc(e.target.value)} />
        <select
          value={form.circunscripcion}
          onChange={(e) => setForm({ ...form, circunscripcion: e.target.value, provincia: '', municipio: '', recinto: '' })}
          required
        >
          <option value="">Seleccione una circunscripción</option>
          {circunscripcionesFiltradas.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <label>Buscar provincia</label>
        <input type="text" value={busquedaProv} onChange={(e) => setBusquedaProv(e.target.value)} />
        <select
          value={form.provincia}
          onChange={(e) => setForm({ ...form, provincia: e.target.value, municipio: '', recinto: '' })}
          required
        >
          <option value="">Seleccione una provincia</option>
          {provinciasFiltradas.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>

        <label>Buscar municipio</label>
        <input type="text" value={busquedaMuni} onChange={(e) => setBusquedaMuni(e.target.value)} />
        <select
          value={form.municipio}
          onChange={(e) => setForm({ ...form, municipio: e.target.value, recinto: '' })}
          required
        >
          <option value="">Seleccione un municipio</option>
          {municipiosFiltrados.map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        <label>Buscar recinto</label>
        <input type="text" value={busquedaRecinto} onChange={(e) => setBusquedaRecinto(e.target.value)} />
        <select
          value={form.recinto}
          onChange={(e) => setForm({ ...form, recinto: e.target.value })}
          required
        >
          <option value="">Seleccione un recinto</option>
          {recintosFiltrados.map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>

        {error && <p className={styles.error}>{error}</p>}
        {successMsg && <p className={styles.success}>{successMsg}</p>}
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#555' }}>
          Si no conoces alguno de estos datos, puedes consultar en{' '}
          <a href="https://yoparticipo.oep.org.bo/" target="_blank" rel="noopener noreferrer" style={{ color: '#155FBF', textDecoration: 'underline' }}>
            Yo Participo
          </a>.
        </p>

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      </form>
    </div>
  );
}




