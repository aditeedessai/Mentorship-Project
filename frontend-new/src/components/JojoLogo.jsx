import React from 'react';
import jojoLogo from '../assets/jojo-logo.png';

export default function JojoLogo({ className = "h-8 w-auto", alt = "JOT Logo" }) {
  return (
    <img
      src={jojoLogo}
      alt={alt}
      className={`object-contain select-none shrink-0 ${className}`}
      draggable={false}
    />
  );
}
