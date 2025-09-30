// src/components/auth/CustomLogo.jsx

import React from 'react';

// Este es un SVG inspirado en la cara del robot.
// Usamos 'currentColor' para que tome el color del texto del tema.
export const CustomLogo = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 52 52"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.33331 15.1667L26 4.33333L47.6666 15.1667V36.8333L26 47.6667L4.33331 36.8333V15.1667Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M26 28.1667C30.2467 28.1667 33.6666 24.7467 33.6666 20.5C33.6666 16.2533 30.2467 12.8333 26 12.8333C21.7533 12.8333 18.3333 16.2533 18.3333 20.5"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 32.5V30.3333C13 28.8913 13.5795 27.5093 14.6109 26.4779C15.6423 25.4465 17.0243 24.8667 18.4667 24.8667H33.5333C34.9757 24.8667 36.3577 25.4465 37.3891 26.4779C38.4205 27.5093 39 28.8913 39 30.3333V32.5"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);