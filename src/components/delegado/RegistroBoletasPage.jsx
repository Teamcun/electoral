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
import { useNavigate } from 'react-router-dom';
import PasoIndicador from './PasoIndicador';



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
    const navigate = useNavigate();
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
    const [mesasDisponibles, setMesasDisponibles] = useState([]);


    const [misBoletas, setMisBoletas] = useState([]);

    const [imagenActaSrc, setImagenActaSrc] = useState(null);
    const [imagenHojaSrc, setImagenHojaSrc] = useState(null);

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [recortandoTipo, setRecortandoTipo] = useState(null); // 'acta' o 'hoja'
    const [userData, setUserData] = useState(null);
    const [usuarioActual, setUsuarioActual] = useState(null);


    // Cargar usuario actual y redirigir si no tiene permiso
    useEffect(() => {
        const cargarDatosUsuario = async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return navigate('/');

            const docSnap = await getDoc(doc(db, 'usuarios', uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUsuarioActual(data);

                // Redirigir si no es admin ni jefe de recinto
                if (data.rol !== 'administrador' && data.rol !== 'delegado' && data.rol !== 'jefe_recinto') {
                    navigate('/');
                }
            } else {
                navigate('/');
            }
        };
        cargarDatosUsuario();
    }, [navigate, auth]);



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


    // Filtra departamentos que contengan el texto buscado (sin importar mayúsculas/minúsculas)
    const departamentosFiltrados = departamentos.filter(d =>
        d.nombre.toLowerCase().includes(busquedaDepto.toLowerCase())
    );

    // Filtra circunscripciones que contengan el texto buscado
    const circunscripcionesFiltradas = circunscripciones.filter(c =>
        c.nombre.toLowerCase().includes(busquedaCirc.toLowerCase())
    );

    // Filtra provincias que contengan el texto buscado
    const provinciasFiltradas = provincias.filter(p =>
        p.nombre.toLowerCase().includes(busquedaProv.toLowerCase())
    );

    // Filtra municipios que contengan el texto buscado
    const municipiosFiltrados = municipios.filter(m =>
        m.nombre.toLowerCase().includes(busquedaMuni.toLowerCase())
    );

    // Filtra recintos que contengan el texto buscado
    const recintosFiltrados = recintos.filter(r =>
        r.nombre.toLowerCase().includes(busquedaRecinto.toLowerCase())
    );


    // Carga inicial de departamentos al montar el componente
    useEffect(() => {
        // Función asíncrona para obtener documentos de la colección 'departamentos'
        const cargarDepartamentos = async () => {
            const snap = await getDocs(collection(db, 'departamentos'));
            // Mapear documentos y actualizar estado con lista de departamentos
            setDepartamentos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false); // Indicar que la carga terminó
        };
        cargarDepartamentos(); // Ejecutar la función
    }, []); // Se ejecuta solo una vez al montar el componente


    // Listener para detectar cambios en el estado de autenticación del usuario
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('Usuario autenticado:', user.uid);
                // Cargar las boletas asociadas al usuario autenticado
                await cargarBoletasUsuario(user);
            } else {
                console.log('Usuario no autenticado');
                setMisBoletas([]); // Limpiar boletas si no hay usuario
            }
        });

        // Limpieza del listener cuando se desmonte el componente
        return () => unsubscribe();
    }, []); // Solo al montar el componente

    //cargar datos al form
    useEffect(() => {
        const cargarMesasDesdeRecinto = async () => {
            try {
                setLoading(true);

                const mesasSnap = await getDocs(
                    query(collection(db, 'mesas'), where('idRecinto', '==', userData.recintoId))
                );

                const mesas = mesasSnap.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                    .sort((a, b) => parseInt(b.codigo) - parseInt(a.codigo)); // 👈 Orden descendente

                setMesasDisponibles(mesas);
                console.log('Mesas disponibles cargadas y ordenadas:', mesas);

            } catch (error) {
                console.error('Error al cargar mesas desde el useEffect:', error);
            } finally {
                setLoading(false);
            }
        };
        if (userData) {
            // Setear el formulario con los datos jerárquicos
            setForm(prev => ({
                ...prev,
                departamento: userData.departamentoId,
                circunscripcion: userData.circunscripcionId,
                provincia: userData.provinciaId,
                municipio: userData.municipioId,
                recinto: userData.recintoId,
            }));

            // Cargar mesas disponibles
            cargarMesasDesdeRecinto();
        }
    }, [userData]);


    // Función para cargar boletas asociadas al usuario actual
    const cargarBoletasUsuario = async (user) => {
        try {
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                console.log('No existe documento usuario');
                setMisBoletas([]);
                return;
            }

            const data = userSnap.data();
            setUserData(data); // ⬅️ Guardamos los datos del usuario

            const esJefeRecinto = data.rol === 'jefe_recinto';
            const recintoId = data.recintoId;

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
            const dataBoletas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dataBoletas.sort((a, b) => parseInt(a.nroMesa) - parseInt(b.nroMesa));
            setMisBoletas(dataBoletas);

        } catch (error) {
            console.error('Error cargando registros del usuario:', error);
        }
    };


    // Cargar departamento del usuario
    useEffect(() => {
        if (!userData?.departamentoId) return;

        const cargar = async () => {
            const ref = doc(db, 'departamentos', userData.departamentoId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setDepartamentos([{ id: snap.id, ...snap.data() }]);
            }
        };
        cargar();
    }, [userData]);

    // Cargar circunscripción
    useEffect(() => {
        if (!userData?.circunscripcionId) return;

        const cargar = async () => {
            const ref = doc(db, 'circunscripciones', userData.circunscripcionId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setCircunscripciones([{ id: snap.id, ...snap.data() }]);
            }
        };
        cargar();
    }, [userData]);

    // Cargar provincia
    useEffect(() => {
        if (!userData?.provinciaId) return;

        const cargar = async () => {
            const ref = doc(db, 'provincias', userData.provinciaId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setProvincias([{ id: snap.id, ...snap.data() }]);
            }
        };
        cargar();
    }, [userData]);

    // Cargar municipio
    useEffect(() => {
        if (!userData?.municipioId) return;

        const cargar = async () => {
            const ref = doc(db, 'municipios', userData.municipioId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setMunicipios([{ id: snap.id, ...snap.data() }]);
            }
        };
        cargar();
    }, [userData]);

    // Cargar recinto
    useEffect(() => {
        if (!userData?.recintoId) return;

        const cargar = async () => {
            const ref = doc(db, 'recintos', userData.recintoId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setRecintos([{ id: snap.id, ...snap.data() }]);
            }
            setLoading(false); // Solo terminamos de cargar cuando todo esté listo
        };
        cargar();
    }, [userData]);

    // Función para mostrar advertencia con Swal
    const advertirSiInconsistente = (campo, votosTotales, papeletas) => {
        if (votosTotales > papeletas) {
            Swal.fire({
                icon: 'warning',
                title: `¡Advertencia en ${campo}!`,
                text: `La suma de votos (${votosTotales}) supera las papeletas en ánfora (${papeletas}).`,
                confirmButtonText: 'Entendido',
                timer: 4000,
            });
        }
    };
    // Helper para setear color rojo si hay error, sino quitar color
    const marcarInputError = (inputName, tieneError) => {
        const input = document.querySelector(`[name="${inputName}"]`);
        if (input) {
            input.style.borderColor = tieneError ? 'red' : '';
        }
    };


    const handleChange = async (e) => {
        const { name, value, files, dataset } = e.target;

        // Validar solo números enteros no negativos para campos numéricos
        const camposNumericos = [
            'validosPresidente',
            'validosDiputado',
            'blancosPresidente',
            'blancosDiputado',
            'nulosPresidente',
            'nulosDiputado',
            'papeletasAnfora',
            'papeletasNoUtilizadas',
            //campos numéricos que tengas en el form
        ];

        // Función auxiliar para validar entero >= 0 o vacío
        const esNumeroValido = (val) => val === '' || (/^\d+$/.test(val) && Number(val) >= 0);

        if (dataset?.tipo === 'presidente') {
            // Validar solo si el valor es válido para evitar letras o negativos
            if (esNumeroValido(value)) {
                setForm(prev => ({
                    ...prev,
                    votosPresidente: {
                        ...prev.votosPresidente,
                        [name]: value,
                    },
                }));
            }
        } else if (dataset?.tipo === 'diputado') {
            if (esNumeroValido(value)) {
                setForm(prev => ({
                    ...prev,
                    votosDiputado: {
                        ...prev.votosDiputado,
                        [name]: value,
                    },
                }));
            }
        } else if (name === 'imagenActa' || name === 'imagenHojaTrabajo') {
            const file = files[0];
            if (file) {
                setForm(prev => ({ ...prev, [name]: file }));

                const reader = new FileReader();
                reader.onloadend = () => {
                    if (name === 'imagenActa') {
                        setPreviewActa(reader.result);
                    } else {
                        setPreviewHoja(reader.result);
                    }
                };
                reader.readAsDataURL(file);
            }
        } else if (camposNumericos.includes(name)) {
            if (esNumeroValido(value)) {
                setForm(prev => {
                    const nuevoForm = { ...prev, [name]: value };

                    const sumaVotosPresidente = Object.values(nuevoForm.votosPresidente || {}).reduce(
                        (acc, val) => acc + (parseInt(val) || 0), 0
                    );
                    const sumaVotosDiputado = Object.values(nuevoForm.votosDiputado || {}).reduce(
                        (acc, val) => acc + (parseInt(val) || 0), 0
                    );

                    if (!nuevoForm.validosPresidente || nuevoForm.validosPresidente === '') {
                        nuevoForm.validosPresidente = sumaVotosPresidente.toString();
                    }
                    if (!nuevoForm.validosDiputado || nuevoForm.validosDiputado === '') {
                        nuevoForm.validosDiputado = sumaVotosDiputado.toString();
                    }

                    const papeletasPresidente =
                        (parseInt(nuevoForm.validosPresidente) || 0) +
                        (parseInt(nuevoForm.blancosPresidente) || 0) +
                        (parseInt(nuevoForm.nulosPresidente) || 0);

                    const papeletasDiputado =
                        (parseInt(nuevoForm.validosDiputado) || 0) +
                        (parseInt(nuevoForm.blancosDiputado) || 0) +
                        (parseInt(nuevoForm.nulosDiputado) || 0);

                    const maxPapeletas = Math.max(papeletasPresidente, papeletasDiputado);
                    nuevoForm.papeletasAnfora = maxPapeletas.toString();

                    advertirSiInconsistente('Presidente', papeletasPresidente, maxPapeletas);
                    advertirSiInconsistente('Diputado', papeletasDiputado, maxPapeletas);

                    marcarInputError('validosPresidente', papeletasPresidente > maxPapeletas);
                    marcarInputError('blancosPresidente', papeletasPresidente > maxPapeletas);
                    marcarInputError('nulosPresidente', papeletasPresidente > maxPapeletas);

                    marcarInputError('validosDiputado', papeletasDiputado > maxPapeletas);
                    marcarInputError('blancosDiputado', papeletasDiputado > maxPapeletas);
                    marcarInputError('nulosDiputado', papeletasDiputado > maxPapeletas);

                    marcarInputError('papeletasAnfora', false);

                    return nuevoForm;
                });
            }
        } else {
            // Para campos que no necesitan validación numérica
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };


    /*
    // 👇 antiguo protocolo de carga de datos los filtros
    // useEffect para cargar circunscripciones dependientes del departamento seleccionado
    useEffect(() => {
        if (!form.departamento) return; // Si no hay departamento seleccionado, no hacer nada

        const cargar = async () => {
            setLoading(true); // Indicar carga en progreso
            // Consulta filtrando circunscripciones por departamento seleccionado
            const q = query(collection(db, 'circunscripciones'), where('idDepartamento', '==', form.departamento));
            const snap = await getDocs(q);
            setCircunscripciones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); // Actualizar estado
            setLoading(false); // Fin de carga
        };

        cargar(); // Ejecutar la función de carga
    }, [form.departamento]); // Se ejecuta cada vez que cambia el departamento


    // useEffect para cargar provincias según circunscripción seleccionada
    useEffect(() => {
        if (!form.circunscripcion) return;

        const cargar = async () => {
            setLoading(true);
            // Consulta filtrando provincias por circunscripción seleccionada
            const q = query(collection(db, 'provincias'), where('idCircunscripcion', '==', form.circunscripcion));
            const snap = await getDocs(q);
            setProvincias(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };

        cargar();
    }, [form.circunscripcion]); // Se ejecuta al cambiar la circunscripción


    // useEffect para cargar municipios según provincia seleccionada
    useEffect(() => {
        if (!form.provincia) return;

        const cargar = async () => {
            setLoading(true);
            // Consulta filtrando municipios por provincia seleccionada
            const q = query(collection(db, 'municipios'), where('idProvincia', '==', form.provincia));
            const snap = await getDocs(q);
            setMunicipios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };

        cargar();
    }, [form.provincia]); // Se ejecuta al cambiar la provincia


    // useEffect para cargar recintos (sin filtro, todos)
    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            const q = query(collection(db, 'recintos')); // Trae todos los recintos
            const snap = await getDocs(q);
            setRecintos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };

        cargar(); // Se ejecuta una vez al montar el componente
    }, []);

    */

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

        if (!form.nroMesa) {
            await Swal.fire({
                icon: 'warning',
                title: 'Número de mesa requerido',
                text: 'Debes seleccionar el número de mesa.',
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
            console.log('Comparando recinto:', {
                recintoSeleccionadoEnFormulario: form.recinto,
                recintoAsignadoAlUsuario: recintoIdUsuario
            });

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

            // 🟢 Subir imágenes
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

            // ✅ Limpiar formulario
            setForm({
                recinto: recintoIdUsuario,
                nroMesa: '',
                votosPresidente: {},
                votosDiputado: {},
                validosPresidente: '',
                validosDiputado: '',
                blancosPresidente: '',
                blancosDiputado: '',
                nulosPresidente: '',
                nulosDiputado: '',
                papeletasAnfora: '',
                papeletasNoUtilizadas: '',
                imagenActa: null,
                imagenHojaTrabajo: null,
            });
            setPreviewActa(null);
            setPreviewHoja(null);

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
            <h2>Registro de Acta Electoral</h2>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* 📸 Subir imágenes */}
                <PasoIndicador
                    numero={1}
                    texto="Sube las imágenes del Acta y Hoja de trabajo"
                    ayuda="Puedes usar la cámara o seleccionar desde galería. Asegúrate de que la foto esté legible y bien encuadrada para facilitar la verificación."
                />
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

                {/* Información del recinto y ubicación asignada al usuario */}
                <PasoIndicador
                    numero={2}
                    texto="Confirma los datos automáticos del usuario"
                    ayuda="Los campos Departamento, Circunscripción, Provincia, Municipio y Recinto se completan automáticamente según tu perfil."
                />
                {userData && (
                    <div className={styles.columnas}>
                        <label>
                            Departamento:
                            <input type="text" value={userData.departamentoNombre} disabled />
                            <input type="hidden" name="departamento" value={userData.departamentoId} />
                        </label>

                        <label>
                            Circunscripción:
                            <input type="text" value={userData.circunscripcionNombre} disabled />
                            <input type="hidden" name="circunscripcion" value={userData.circunscripcionId} />
                        </label>

                        <label>
                            Provincia:
                            <input type="text" value={userData.provinciaNombre} disabled />
                            <input type="hidden" name="provincia" value={userData.provinciaId} />
                        </label>

                        <label>
                            Municipio:
                            <input type="text" value={userData.municipioNombre} disabled />
                            <input type="hidden" name="municipio" value={userData.municipioId} />
                        </label>

                        <label>
                            Recinto:
                            <input type="text" value={userData.recintoNombre} disabled />
                            <input type="hidden" name="recinto" value={userData.recintoId} />
                        </label>

                        {/* Número de Mesa */}
                        <label>
                            Número de Mesa:
                            <select
                                name="nroMesa"
                                value={form.nroMesa}
                                onChange={handleChange}
                                required
                            >
                                <option value="">-- Selecciona una mesa --</option>
                                {mesasDisponibles.map(mesa => (
                                    <option key={mesa.id} value={mesa.codigo}>
                                        Mesa {mesa.codigo}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}


                {/* Tabla de votos por partido */}

                <div className={styles.tablaVotos}>
                    <PasoIndicador
                        numero={3}
                        texto="Registra los votos de Presidente y Diputados Uninominales"
                        ayuda="Ingresa los votos en las columnas correspondientes. Solo se permiten números positivos y el sistema calcula automáticamente los totales para apoyo visual."
                    />
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
                <PasoIndicador
                        numero={4}
                        texto="Completa los campos adicionales sobre papeletas"
                        ayuda="Registra la cantidad de papeletas válidas, blancas, nulas, utilizadas y no utilizadas para mantener el control del material electoral."
                    />
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

            {/*console.log('📋 Datos de boletas:', misBoletas)*/}
            {
                misBoletas.length > 0 && (
                    <>
                        {/*console.log('🔍 Total de boletas cargadas:', misBoletas.length)*/}
                        {/*console.log('📋 Datos de boletas:', misBoletas)*/}

                        <div className={styles.seccionBoletas}>
                            <h3 style={{ marginTop: '2rem' }}>Registros Enviados</h3>
                            <div className={styles.boletasGrid}>
                                {misBoletas.map((b) => {
                                    {/*console.log(`🧾 Mesa ${b.nroMesa}:`, b);*/ }
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


