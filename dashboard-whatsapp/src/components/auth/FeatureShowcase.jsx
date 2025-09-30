// src/components/auth/FeatureShowcase.jsx

import { useState, useEffect } from 'react';

const features = [
  {
    image: '/assets/features/dark-theme.png',
    title: 'Interfaz Moderna y Reactiva',
    description: 'Gestiona todas tus conversaciones en tiempo real con un diseño elegante y funcional.'
  },
  {
    image: '/assets/features/light-theme.png',
    title: 'Temas Claro y Oscuro',
    description: 'Adapta la interfaz a tu gusto y cuida tu vista con nuestros temas cuidadosamente diseñados.'
  }
];

export default function FeatureShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 5000); // Cambia de imagen cada 5 segundos

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full">
      {features.map((feature, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={feature.image}
            alt={feature.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <h2 className="text-3xl font-bold">{feature.title}</h2>
            <p className="mt-2 text-lg text-white/80">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}