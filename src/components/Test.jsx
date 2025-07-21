import React from "react";
import Particles from "@tsparticles/react";
import { loadFull } from "tsparticles";

const Test = () => {
  const particlesInit = async (engine) => {
    await loadFull(engine);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: {
          color: "#0d47a1",
        },
        fullScreen: {
          enable: true,
          zIndex: -1,
        },
        particles: {
          number: {
            value: 120,
            density: {
              enable: true,
              area: 1000,
            },
          },
          color: {
            value: "#740a0aff",
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#000000",
            },
          },
          opacity: {
            value: 0.7,
            random: true,
            animation: {
              enable: true,
              speed: 1,
              minimumValue: 0.1,
              sync: false,
            },
          },
          size: {
            value: 4,
            random: true,
            animation: {
              enable: true,
              speed: 4,
              minimumValue: 0.3,
              sync: false,
            },
          },
          links: {
            enable: true,
            distance: 180,
            color: "#b90d0dff",
            opacity: 0.4,
            width: 1.5,
          },
          move: {
            enable: true,
            speed: 3,
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "out",
            },
            attract: {
              enable: true,
              rotate: {
                x: 600,
                y: 1200,
              },
            },
          },
        },
        interactivity: {
          detectsOn: "canvas",
          events: {
            onHover: {
              enable: true,
              mode: "bubble",
            },
            onClick: {
              enable: false,
              mode: "push",
            },
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
            push: {
              quantity: 6,
            },
          },
        },
        retina_detect: true,
      }}
    />
  );
};

export default Test;

