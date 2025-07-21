// src/pages/RegistroBoletasPage.jsx
import React, { useEffect, useState } from 'react';
import { db, storage, auth } from '../firebaseConfig';
import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Loader from '../Loader';
import styles from './RegistroBoletasPage.module.css';
import Swal from 'sweetalert2';
import { FaSearch } from 'react-icons/fa'
import ClipLoader from 'react-spinners/ClipLoader';



const partidos = [
    'ALIANZA POPULAR (AP)',
    'LIBERTAD Y PROGRESO ADN (LYP-ADN)',
    'AUTONOMÍA PARA BOLIVIA SÚMATE (APB-SUMATE)',
    'LIBERTAD Y DEMOCRACIA (LIBRE)',
    'LA FUERZA DEL PUEBLO (FP)',
    'MAS-IPSP',
    'MORENA',
    'UNIDAD',
    'PARTIDO DEMOCRATA CRISTIANO (PDC)',
    'BIA-YUQUI',
    'OICH',
];

export default function RegistroBoletasPage() {
    const [form, setForm] = useState({
        departamento: '',
        circunscripcion: '',
        provincia: '',
        municipio: '',
        recinto: '',
        nroMesa: '',
        votosPresidente: {},
        votosDiputado: {},
        validosPresidente: '',
        validosDiputado: '',
        blancosPresidente: '',
        blancosDiputado: '',
        nulosPresidente: '',
        imagenActa: null,
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [departamentos, setDepartamentos] = useState([]);
    const [circunscripciones, setCircunscripciones] = useState([]);
    const [provincias, setProvincias] = useState([]);
    const [municipios, setMunicipios] = useState([]);
    const [recintos, setRecintos] = useState([]);
    // 👇 Aquí van los estados de búsqueda
    const [busquedaDepto, setBusquedaDepto] = useState('');
    const [busquedaCirc, setBusquedaCirc] = useState('');
    const [busquedaProv, setBusquedaProv] = useState('');
    const [busquedaMuni, setBusquedaMuni] = useState('');
    const [busquedaRecinto, setBusquedaRecinto] = useState('');

    // 👇 Y aquí inmediatamente después, los filtros
    const departamentosFiltrados = departamentos.filter(d =>
        d.nombre.toLowerCase().includes(busquedaDepto.toLowerCase())
    );

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


    // Carga inicial
    useEffect(() => {
        const cargarDepartamentos = async () => {
            const snap = await getDocs(collection(db, 'departamentos'));
            setDepartamentos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        cargarDepartamentos();
    }, []);

    // Cargar combos dependientes
    useEffect(() => {
        if (!form.departamento) return;
        const cargar = async () => {
            setLoading(true);
            const q = query(collection(db, 'circunscripciones'), where('idDepartamento', '==', form.departamento));
            const snap = await getDocs(q);
            setCircunscripciones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        cargar();
    }, [form.departamento]);

    useEffect(() => {
        if (!form.circunscripcion) return;
        const cargar = async () => {
            setLoading(true);
            const q = query(collection(db, 'provincias'), where('idCircunscripcion', '==', form.circunscripcion));
            const snap = await getDocs(q);
            setProvincias(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        cargar();
    }, [form.circunscripcion]);

    useEffect(() => {
        if (!form.provincia) return;
        const cargar = async () => {
            setLoading(true);
            const q = query(collection(db, 'municipios'), where('idProvincia', '==', form.provincia));
            const snap = await getDocs(q);
            setMunicipios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        cargar();
    }, [form.provincia]);

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            const q = query(collection(db, 'recintos'));
            const snap = await getDocs(q);
            setRecintos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        cargar();
    }, []);

    const handleChange = async (e) => {
        const { name, value, files, dataset } = e.target;

        if (dataset.tipo === 'presidente') {
            setForm(prev => ({
                ...prev,
                votosPresidente: { ...prev.votosPresidente, [name]: value },
            }));
        } else if (dataset.tipo === 'diputado') {
            setForm(prev => ({
                ...prev,
                votosDiputado: { ...prev.votosDiputado, [name]: value },
            }));
        } else if (name === 'imagenActa') {
            setForm(prev => ({ ...prev, imagenActa: files[0] }));
        } else if (name === 'recinto') {
            const recintoSeleccionado = recintos.find(r => r.id === value);

            if (recintoSeleccionado) {
                try {
                    setLoading(true);

                    // Obtener MUNICIPIO del recinto
                    const municipioSnap = await getDocs(
                        query(collection(db, 'municipios'), where('__name__', '==', recintoSeleccionado.idMunicipio))
                    );
                    const municipioDoc = municipioSnap.docs[0];
                    const idProvincia = municipioDoc.data().idProvincia;

                    // Obtener PROVINCIA del municipio
                    const provinciaSnap = await getDocs(
                        query(collection(db, 'provincias'), where('__name__', '==', idProvincia))
                    );
                    const provinciaDoc = provinciaSnap.docs[0];
                    const idCircunscripcion = provinciaDoc.data().idCircunscripcion;

                    // Obtener CIRCUNSCRIPCIÓN de la provincia
                    const circSnap = await getDocs(
                        query(collection(db, 'circunscripciones'), where('__name__', '==', idCircunscripcion))
                    );
                    const circDoc = circSnap.docs[0];
                    const idDepartamento = circDoc.data().idDepartamento;

                    // Actualizar formulario con autocompletado
                    setForm(prev => ({
                        ...prev,
                        recinto: value,
                        municipio: municipioDoc.id,
                        provincia: provinciaDoc.id,
                        circunscripcion: circDoc.id,
                        departamento: idDepartamento,
                    }));
                } catch (error) {
                    console.error('Error al autocompletar desde recinto:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                // Si no se encontró recinto, solo actualizar campo recinto
                setForm(prev => ({ ...prev, recinto: value }));
            }
        } else {
            // Para otros campos simples
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.imagenActa) {
            await Swal.fire({
                icon: 'warning',
                title: 'Archivo requerido',
                text: 'Debes subir el acta.',
                confirmButtonColor: '#d33',
            });
            return;
        }

        // Validar tamaño máximo de 3 MB
        const MAX_TAMANO_MB = 3;
        const tamanoArchivoMB = form.imagenActa.size / (1024 * 1024);

        if (tamanoArchivoMB > MAX_TAMANO_MB) {
            await Swal.fire({
                icon: 'warning',
                title: 'Archivo demasiado grande',
                text: 'El archivo no debe superar los 3 MB.',
                confirmButtonColor: '#d33',
            });
            return;
        }

        try {
            setSubmitting(true);
            const refFile = ref(storage, `actas/${form.nroMesa}_${Date.now()}`);
            await uploadBytes(refFile, form.imagenActa);
            const url = await getDownloadURL(refFile);

            const { imagenActa, ...formSinImagen } = form;

            await addDoc(collection(db, 'recepcion'), {
                ...formSinImagen,
                imagenActaUrl: url,
                creadoEn: serverTimestamp(),
                idUsuarioRecepcion: auth.currentUser?.uid ?? 'anon',
                estado: 'pendiente',
            });

            await Swal.fire({
                icon: 'success',
                title: 'Registro exitoso',
                text: 'La boleta fue enviada correctamente.',
                confirmButtonColor: '#0a58ca',
            });
            //setForm(estadoInicialForm);

        } catch (err) {
            console.error(err);
            await Swal.fire({
                icon: 'error',
                title: 'Error al enviar',
                text: 'Ocurrió un problema al registrar la boleta. Intenta nuevamente.',
                confirmButtonColor: '#d33',
            });
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div className={styles['select-group']}>
            <h2>Registro de Boleta Electoral</h2>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.columnas}>
                    {/* Departamento */}
                    <label>
                        Departamento:
                        <div className="input-icon-wrapper">
                            <FaSearch size={16} />
                            <input
                                type="text"
                                placeholder="Buscar departamento..."
                                value={busquedaDepto}
                                onChange={(e) => setBusquedaDepto(e.target.value)}
                            />
                        </div>
                        <select name="departamento" value={form.departamento} onChange={handleChange} required disabled={form.recinto}>
                            <option value="">-- Selecciona --</option>
                            {departamentosFiltrados.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                    </label>

                    {/* Circunscripción */}
                    <label>
                        Circunscripción:
                        <div className="input-icon-wrapper">
                            <FaSearch size={16} />
                            <input
                                type="text"
                                placeholder="Buscar circunscripción..."
                                value={busquedaCirc}
                                onChange={(e) => setBusquedaCirc(e.target.value)}
                            />
                        </div>
                        <select name="circunscripcion" value={form.circunscripcion} onChange={handleChange} required disabled={form.recinto}>
                            <option value="">-- Selecciona --</option>
                            {circunscripcionesFiltradas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </label>

                    {/* Provincia */}
                    <label>
                        Provincia:
                        <div className="input-icon-wrapper">
                            <FaSearch size={16} />
                            <input
                                type="text"
                                placeholder="Buscar provincia..."
                                value={busquedaProv}
                                onChange={(e) => setBusquedaProv(e.target.value)}
                            />
                        </div>
                        <select name="provincia" value={form.provincia} onChange={handleChange} required disabled={form.recinto}>
                            <option value="">-- Selecciona --</option>
                            {provinciasFiltradas.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </label>

                    {/* Municipio */}
                    <label>
                        Municipio:
                        <div className="input-icon-wrapper">
                            <FaSearch size={16} />
                            <input
                                type="text"
                                placeholder="Buscar municipio..."
                                value={busquedaMuni}
                                onChange={(e) => setBusquedaMuni(e.target.value)}
                            />
                        </div>
                        <select name="municipio" value={form.municipio} onChange={handleChange} required disabled={form.recinto}>
                            <option value="">-- Selecciona --</option>
                            {municipiosFiltrados.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </label>

                    {/* Recinto */}
                    <label>
                        Recinto:
                        <div className="input-icon-wrapper">
                            <FaSearch size={16} />
                            <input
                                type="text"
                                placeholder="Buscar recinto..."
                                value={busquedaRecinto}
                                onChange={(e) => setBusquedaRecinto(e.target.value)}
                            />
                        </div>
                        <select name="recinto" value={form.recinto} onChange={handleChange} required>
                            <option value="">-- Selecciona --</option>
                            {recintosFiltrados.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    </label>

                    {/* Número de mesa */}
                    <label>
                        Número de Mesa:
                        <input
                            type="text"
                            name="nroMesa"
                            value={form.nroMesa}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    {/* Subir foto */}
                    <label>
                        Subir Foto del Acta:
                        <input
                            type="file"
                            name="imagenActa"
                            accept="image/*"
                            onChange={handleChange}
                            required
                        />
                    </label>
                </div>


                {/* Tabla de votos por partido */}
                <div className={styles.tablaVotos}>
                    <table>
                        <thead>
                            <tr><th>Partido</th><th>Presidente</th><th>Diputado</th></tr>
                        </thead>
                        <tbody>
                            {partidos.map((p) => (
                                <tr key={p}>
                                    <td>{p}</td>
                                    <td>
                                        <input
                                            type="number"
                                            name={p}
                                            value={form.votosPresidente[p] || ''}
                                            onChange={handleChange}
                                            data-tipo="presidente"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            name={p}
                                            value={form.votosDiputado[p] || ''}
                                            onChange={handleChange}
                                            data-tipo="diputado"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totales */}
                <div className={styles.totales}>
                    <label>Válidos Presidente: <input name="validosPresidente" type="number" value={form.validosPresidente} onChange={handleChange} required /></label>
                    <label>Válidos Diputado: <input name="validosDiputado" type="number" value={form.validosDiputado} onChange={handleChange} required /></label>
                    <label>Blancos Presidente: <input name="blancosPresidente" type="number" value={form.blancosPresidente} onChange={handleChange} required /></label>
                    <label>Blancos Diputado: <input name="blancosDiputado" type="number" value={form.blancosDiputado} onChange={handleChange} required /></label>
                    <label>Nulos Presidente: <input name="nulosPresidente" type="number" value={form.nulosPresidente} onChange={handleChange} required /></label>
                </div>

                {/* Botón de envío */}
                <button
                    type="submit"
                    className={styles.btn}
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {submitting ? <ClipLoader size={20} color="#fff" /> : 'Registrar Boleta'}
                </button>

            </form>
        </div>
    );

}


