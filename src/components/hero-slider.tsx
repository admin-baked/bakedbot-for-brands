'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  {
    title: 'Premium Cannabis Products',
    subtitle: 'Shop the finest selection',
    image: 'https://images.unsplash.com/photo-1556928045-16f7f50be0f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjYW5uYWJpcyUyMHByb2R1Y3RzfGVufDB8fHx8MTc2MjM3MTI2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: 'Fast & Reliable Pickup',
    subtitle: 'Order online, pickup in-store',
    image: 'https://images.unsplash.com/photo-1600880292210-f79b92641094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjYW5uYWJpcyUyMHN0b3JlfGVufDB8fHx8MTc2MjM3MTI2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: 'Exclusive Deals',
    subtitle: 'Save on your favorite products',
    image: 'https://images.unsplash.com/photo-1598406254238-015b3a654947?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxjYW5uYWJpcyUyMHNhbGV8ZW58MHx8fHwxNzYyMzcxMjYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);
  
  const slide = slides[currentSlide];
  
  return (
    <div 
      className="relative h-96 bg-gray-800 flex items-center justify-center text-white rounded-lg overflow-hidden"
    >
      <Image 
        src={slide.image} 
        alt={slide.title} 
        layout="fill" 
        objectFit="cover" 
        className="brightness-75"
        priority
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="text-center z-10 p-4">
        <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">{slide.title}</h1>
        <p className="text-2xl drop-shadow-md">{slide.subtitle}</p>
      </div>
      
      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
