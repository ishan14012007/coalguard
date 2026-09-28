import React from 'react';

// Stylized Mining Hard Hat with Headlamp
export function MiningHelmetIcon({ className = "w-6 h-6", color = "#1F6B45" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 15C4 10.0294 7.58172 6 12 6C16.4183 6 20 10.0294 20 15V17H4V15Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M2 17H22V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V17Z" fill={color} stroke={color} strokeWidth="1.8"/>
      <path d="M10 6V4C10 3.44772 10.4477 3 11 3H13C13.5523 3 14 3.44772 14 4V6" stroke={color} strokeWidth="1.8"/>
      <circle cx="12" cy="11" r="2.5" fill="#B8860B" stroke={color} strokeWidth="1.2"/>
    </svg>
  );
}

// Crossed Pickaxe and Mining Drill
export function MiningPickaxeIcon({ className = "w-6 h-6", color = "#1F6B45" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M14.5 4.5L19.5 9.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 21L14 10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 3C17.5 3 20.5 5 21 6.5C19.5 7 17 10 17 10L14 7C14 7 17 4.5 16.5 3C16 3 15 3 15 3Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5"/>
      <path d="M21 21L10 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    </svg>
  );
}

// Coal Seam & Pit Slope Berm Icon
export function PitSlopeIcon({ className = "w-6 h-6", color = "#1F6B45" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 20H21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 20L7 13H12L16 7H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 13V20M12 13V20M16 7V20" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.5"/>
    </svg>
  );
}

// Colliery Safety Shield Logo with Primary Green & Gold Facet
export function CoalGuardEmblem({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M16 2L4 7V15C4 22.5 9.1 29.2 16 31C22.9 29.2 28 22.5 28 15V7L16 2Z" fill="#1F6B45" stroke="#17512F" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M16 5L6.5 9V15C6.5 21 10.5 26.5 16 28C21.5 26.5 25.5 21 25.5 15V9L16 5Z" fill="#17512F" fillOpacity="0.8"/>
      <path d="M16 9L12 15H20L16 9Z" fill="#F5EDD6" stroke="#B8860B" strokeWidth="0.8"/>
      <path d="M12 15L16 23L20 15H12Z" fill="#B8860B"/>
    </svg>
  );
}
