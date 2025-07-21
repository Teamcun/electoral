import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import Header from './components/Header';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import Loader from './components/Loader';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import Test from './components/Test';
import RegistroBoletasPage from './components/delegado/RegistroBoletasPage';
import TestUploadExcel from './components/TestUploadExcel';
import RevisorPage from './components/revisor/RevisoresPage';




function Home() {
  return (
    <>
      <HeroSection />
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulamos carga de página con delay, ajusta si conectas con fetch o Firebase
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  if (loading) return <Loader />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/delegado/registro_electoral" element={<RegistroBoletasPage />} />
      <Route path="/revisor/registros_cargados" element={<RevisorPage />} />
      <Route path="/test" element={<Test />} />
      <Route path="/test2" element={<TestUploadExcel />} />

    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main style={{ minHeight: '80vh' }}>
        <AppContent />
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
