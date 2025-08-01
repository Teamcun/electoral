// src/pages/RegistroBoletasPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { db, storage, auth } from '../firebaseConfig';
import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Loader from '../Loader';
import styles from './RegistroBoletasPage.module.css';
import Swal from 'sweetalert2';
import { FaSearch } from 'react-icons/fa'
import ClipLoader from 'react-spinners/ClipLoader';
import Cropper from 'react-easy-crop';
import getCroppedImg, { mejorarEstiloDocumento } from '../utils/cropImage';
import { motion, AnimatePresence } from 'framer-motion';

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
        nulosDiputado: '',         // nuevo
        papeletasAnfora: '',       // nuevo
        papeletasNoUtilizadas: '', // nuevo
        imagenActa: null,
        imagenHojaTrabajo: null,
    });
    const [previewActa, setPreviewActa] = useState(null);
    const [previewHoja, setPreviewHoja] = useState(null);

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

    const [misBoletas, setMisBoletas] = useState([]);

    const [imagenActaSrc, setImagenActaSrc] = useState(null);
    const [imagenHojaSrc, setImagenHojaSrc] = useState(null);

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [recortandoTipo, setRecortandoTipo] = useState(null); // 'acta' o 'hoja'

    const handlePreview = (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (tipo === 'acta') {
                setPreviewActa(reader.result);
                setImagenActaSrc(reader.result);
                setForm(prev => ({ ...prev, imagenActa: file })); // ✅ guardar archivo
            } else {
                setPreviewHoja(reader.result);
                setImagenHojaSrc(reader.result);
                setForm(prev => ({ ...prev, imagenHojaTrabajo: file })); // ✅ guardar archivo
            }
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((_, croppedArea) => {
        setCroppedAreaPixels(croppedArea);
    }, []);

    const iniciarRecorte = (tipo) => {
        setRecortandoTipo(tipo);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
    };

    const urlToFile = async (dataUrl, filename) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
    };

    const aplicarRecorte = async () => {
        const originalSrc = recortandoTipo === 'acta' ? imagenActaSrc : imagenHojaSrc;
        const resultado = await getCroppedImg(originalSrc, croppedAreaPixels);
        const mejorado = await mejorarEstiloDocumento(resultado);
        const fileFinal = await urlToFile(mejorado, `${recortandoTipo}_${Date.now()}.jpg`);

        if (recortandoTipo === 'acta') {
            setPreviewActa(mejorado);
            setForm(prev => ({ ...prev, imagenActa: fileFinal }));
        } else {
            setPreviewHoja(mejorado);
            setForm(prev => ({ ...prev, imagenHojaTrabajo: fileFinal }));
        }

        setRecortandoTipo(null);
    };

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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('Usuario autenticado:', user.uid);
                await cargarBoletasUsuario(user);
            } else {
                console.log('Usuario no autenticado');
                setMisBoletas([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const cargarBoletasUsuario = async (user) => {
        try {
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) {
                console.log('No existe documento usuario');
                setMisBoletas([]);
                return;
            }

            const userData = userSnap.data();
            const esJefeRecinto = userData.rol === 'jefe_recinto';
            const recintoId = userData.recinto;

            let boletasQuery;
            if (esJefeRecinto && recintoId) {
                boletasQuery = query(
                    collection(db, 'recepcion'),
                    where('recinto', '==', recintoId)
                );
            } else {
                boletasQuery = query(
                    collection(db, 'recepcion'),
                    where('idUsuarioRecepcion', '==', user.uid)
                );
            }

            const snap = await getDocs(boletasQuery);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            data.sort((a, b) => parseInt(a.nroMesa) - parseInt(b.nroMesa));
            setMisBoletas(data);

        } catch (error) {
            console.error('Error cargando registros del usuario:', error);
        }
    };

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
        } else if (name === 'imagenActa' || name === 'imagenHojaTrabajo') {
            const file = files[0];
            if (file) {
                setForm(prev => ({ ...prev, [name]: file }));

                const reader = new FileReader();
                reader.onloadend = () => {
                    name === 'imagenActa' ? setPreviewActa(reader.result) : setPreviewHoja(reader.result);
                };
                reader.readAsDataURL(file);
            }
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

        if (!form.imagenActa || !form.imagenHojaTrabajo) {
            await Swal.fire({
                icon: 'warning',
                title: 'Archivos requeridos',
                text: 'Debes subir el acta y la hoja de trabajo.',
                confirmButtonColor: '#d33',
            });
            return;
        }

        const archivos = [
            { archivo: form.imagenActa, nombre: 'Acta' },
            { archivo: form.imagenHojaTrabajo, nombre: 'Hoja de Trabajo' },
        ];
        const MAX_TAMANO_MB = 3;
        for (const { archivo, nombre } of archivos) {
            const tamanoMB = archivo.size / (1024 * 1024);
            if (tamanoMB > MAX_TAMANO_MB) {
                await Swal.fire({
                    icon: 'warning',
                    title: `Archivo demasiado grande`,
                    text: `El archivo de ${nombre} no debe superar los 3 MB.`,
                    confirmButtonColor: '#d33',
                });
                return;
            }
        }

        try {
            setSubmitting(true);

            // ✅ Obtener UID y verificar autenticación
            const user = auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            // ✅ Obtener recinto del usuario
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) throw new Error('Usuario no encontrado');

            const userData = userSnap.data();
            // 🔍 Log para identificar al usuario que intenta subir el registro
            console.log('🧑 Usuario intentando subir registro:', {
                uid: user.uid,
                nombre: userData.nombre,
                email: userData.email,
                recintoId: userData.recintoId,
                recintoNombre: userData.recintoNombre,
                rol: userData.rol,
            });

            const recintoIdUsuario = userData.recintoId;

            // ✅ Verificar si se está intentando registrar en otro recinto (solo permitido el suyo)
            if (form.recinto !== recintoIdUsuario) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Recinto inválido',
                    text: 'Solo puedes registrar boletas en tu propio recinto.',
                    confirmButtonColor: '#d33',
                });
                return;
            }

            // ✅ Verificar si ya existe una boleta para este recinto y nroMesa
            const q = query(
                collection(db, 'recepcion'),
                where('recinto', '==', recintoIdUsuario),
                where('nroMesa', '==', form.nroMesa)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Número de mesa duplicado',
                    text: `Ya se ha registrado una boleta con el número de mesa ${form.nroMesa} en tu recinto.`,
                    confirmButtonColor: '#d33',
                });
                return;
            }

            // 🟢 Continuar con carga de imágenes y registro...
            const refActa = ref(storage, `actas/${form.nroMesa}_${Date.now()}`);
            await uploadBytes(refActa, form.imagenActa);
            const urlActa = await getDownloadURL(refActa);

            const refHoja = ref(storage, `hojas_trabajo/${form.nroMesa}_${Date.now()}`);
            await uploadBytes(refHoja, form.imagenHojaTrabajo);
            const urlHoja = await getDownloadURL(refHoja);

            const { imagenActa, imagenHojaTrabajo, ...formSinImagenes } = form;

            await addDoc(collection(db, 'recepcion'), {
                ...formSinImagenes,
                imagenActaUrl: urlActa,
                imagenHojaTrabajoUrl: urlHoja,
                creadoEn: serverTimestamp(),
                idUsuarioRecepcion: user.uid,
                estado: 'pendiente',
            });

            await Swal.fire({
                icon: 'success',
                title: 'Registro exitoso',
                text: 'La boleta fue enviada correctamente.',
                confirmButtonColor: '#0a58ca',
            });

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

    const RecorteBotones = ({ aplicarRecorte, cancelarRecorte }) => {
        return (
            <>
                <motion.button
                    className={`${styles.botonRecorte} ${styles.botonAplicar}`}
                    onClick={aplicarRecorte}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.4 }}
                    type="button"
                >
                    ✅ Aplicar
                </motion.button>

                <motion.button
                    className={`${styles.botonRecorte} ${styles.botonCancelar}`}
                    onClick={cancelarRecorte}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.4 }}
                    type="button"
                >
                    ❌ Cancelar
                </motion.button>
            </>
        );
    };



    return (
        <div className={styles['select-group']}>
            <h2>Registro de Boleta Electoral</h2>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* 📸 Subir imágenes */}

                {/* ===== Foto del Acta ===== */}
                <div>
                    <label>Foto del Acta:</label>
                    <div className={styles.selectorContainer}>
                        {/* Botón para tomar con cámara */}
                        <label className={styles.iconButton}>
                            📷 Cámara
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handlePreview(e, 'acta')}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {/* Botón para seleccionar de galería */}
                        <label className={styles.iconButton}>
                            🖼️ Galería
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePreview(e, 'acta')}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    <AnimatePresence>
                        {previewActa && !recortandoTipo && (
                            <motion.div
                                key="previewActa"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img
                                    src={previewActa}
                                    alt="Vista previa acta"
                                    className={styles.imagenPreview}
                                />
                                <br />
                                <button
                                    type="button"
                                    onClick={() => iniciarRecorte('acta')}
                                    style={{ marginTop: 5 }}
                                >
                                    ✂️ Recortar Acta
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ===== Foto de la Hoja de Trabajo ===== */}
                <div>
                    <label>Foto de la Hoja de Trabajo:</label>
                    <div className={styles.selectorContainer}>
                        {/* Botón para tomar con cámara */}
                        <label className={styles.iconButton}>
                            📷 Cámara
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handlePreview(e, 'hoja')}
                                style={{ display: 'none' }}
                            />
                        </label>

                        {/* Botón para seleccionar de galería */}
                        <label className={styles.iconButton}>
                            🖼️ Galería
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePreview(e, 'hoja')}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>

                    <AnimatePresence>
                        {previewHoja && !recortandoTipo && (
                            <motion.div
                                key="previewHoja"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img
                                    src={previewHoja}
                                    alt="Vista previa hoja"
                                    className={styles.imagenPreview}
                                />
                                <br />
                                <button
                                    type="button"
                                    onClick={() => iniciarRecorte('hoja')}
                                    style={{ marginTop: 5 }}
                                >
                                    ✂️ Recortar Hoja
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Recorte */}
                {recortandoTipo && (
                    <div style={{ position: 'relative', width: '100%', height: 300, marginBottom: 20 }}>
                        <Cropper
                            image={recortandoTipo === 'acta' ? imagenActaSrc : imagenHojaSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={4 / 3}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                        />

                        <RecorteBotones
                            aplicarRecorte={aplicarRecorte}
                            cancelarRecorte={() => setRecortandoTipo(null)}
                        />
                    </div>
                )}

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
                </div>


                {/* Tabla de votos por partido */}
                <div className={styles.tablaVotos}>
                    <table>
                        <thead>
                            <tr>
                                <th>Partido</th>
                                <th>Presidente</th>
                                <th>Diputado</th>
                            </tr>
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

                            {/* Fila de totales */}
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                <td>Total</td>
                                <td>
                                    {
                                        Object.values(form.votosPresidente).reduce((acc, val) => acc + (parseInt(val) || 0), 0)
                                    }
                                </td>
                                <td>
                                    {
                                        Object.values(form.votosDiputado).reduce((acc, val) => acc + (parseInt(val) || 0), 0)
                                    }
                                </td>
                            </tr>
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
                    <label>Nulos Diputado:
                        <input name="nulosDiputado" type="number" value={form.nulosDiputado} onChange={handleChange} required />
                    </label>
                    <label>Papeletas en ánfora (utilizadas):
                        <input name="papeletasAnfora" type="number" value={form.papeletasAnfora} onChange={handleChange} required />
                    </label>
                    <label>Papeletas no utilizadas:
                        <input name="papeletasNoUtilizadas" type="number" value={form.papeletasNoUtilizadas} onChange={handleChange} required />
                    </label>
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

            {console.log('📋 Datos de boletas:', misBoletas)}
            {
                misBoletas.length > 0 && (
                    <>
                        {console.log('🔍 Total de boletas cargadas:', misBoletas.length)}
                        {console.log('📋 Datos de boletas:', misBoletas)}

                        <div className={styles.seccionBoletas}>
                            <h3 style={{ marginTop: '2rem' }}>Registros Enviados</h3>
                            <div className={styles.boletasGrid}>
                                {misBoletas.map((b) => {
                                    console.log(`🧾 Mesa ${b.nroMesa}:`, b);
                                    return (
                                        <div key={b.id} className={styles.boletaItem}>
                                            <div className={styles.boletaBarra}>
                                                <span className={styles.nroMesa}>Mesa {b.nroMesa}</span>
                                                {b.estado === 'pendiente' && (
                                                    <span className={styles.checkIcon}>✔️</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )
            }


        </div >
    );

}


