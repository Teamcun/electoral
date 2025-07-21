import { useCallback } from 'react';
import { loadFull } from 'tsparticles';
import Particles from 'react-tsparticles';

export default function ParticlesBackground() {
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: false },
        particles: {
          number: { value: 120, density: { enable: true, value_area: 1000 } },
          color: { value: '#ffffff' },
          shape: { type: 'circle' },
          opacity: {
            value: 0.7,
            random: true,
            anim: { enable: true, speed: 1, opacity_min: 0.1 },
          },
          size: {
            value: 4,
            random: true,
            anim: { enable: true, speed: 4, size_min: 0.3 },
          },
          line_linked: {
            enable: true,
            distance: 180,
            color: '#ffffff',
            opacity: 0.4,
            width: 1.5,
          },
          move: {
            enable: true,
            speed: 3,
            direction: 'none',
            random: true,
            straight: false,
            out_mode: 'out',
            bounce: false,
          },
        },
        interactivity: {
          events: {
            onhover: { enable: true, mode: 'bubble' },
            resize: true,
          },
          modes: {
            bubble: {
              distance: 200,
              size: 6,
              duration: 2,
              opacity: 0.8,
              speed: 3,
            },
          },
        },
        retina_detect: true,
      }}
    />
  );
}
