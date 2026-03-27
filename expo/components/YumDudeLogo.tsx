import React from 'react';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface YumDudeLogoProps {
  size?: number;
  color?: string;
  accent?: string;
}

export function YumDudeLogo({
  size = 72,
  color = '#FF6B35',
  accent = '#8B5CF6',
}: YumDudeLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <Defs>
        <LinearGradient id="primary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF6B35" />
          <Stop offset="100%" stopColor="#FF8254" />
        </LinearGradient>
        <LinearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#A78BFA" />
        </LinearGradient>
      </Defs>
      
      {/* Outer Circle Background */}
      <Circle cx="36" cy="36" r="34" fill="#FFFFFF" opacity="0.95" />
      
      {/* Delivery Box/Package Icon - Modern Abstract */}
      <G>
        {/* Box Base */}
        <Path 
          d="M20 32 L36 24 L52 32 L52 48 L36 56 L20 48 Z" 
          fill="url(#primary-gradient)" 
          opacity="0.15"
        />
        
        {/* Box Top Face */}
        <Path 
          d="M20 32 L36 24 L52 32 L36 40 Z" 
          fill="url(#primary-gradient)" 
        />
        
        {/* Box Side Face */}
        <Path 
          d="M36 40 L36 56 L52 48 L52 32 Z" 
          fill={color} 
          opacity="0.8"
        />
        
        {/* Box Front Face */}
        <Path 
          d="M20 32 L20 48 L36 56 L36 40 Z" 
          fill={color} 
          opacity="0.6"
        />
        
        {/* Center Line - Package Tape */}
        <Path 
          d="M36 24 L36 56" 
          stroke="url(#accent-gradient)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        
        {/* Horizontal Tape */}
        <Path 
          d="M20 40 L52 40" 
          stroke="url(#accent-gradient)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          opacity="0.7"
        />
      </G>
      
      {/* Speed/Motion Lines */}
      <Path 
        d="M12 20 L18 20" 
        stroke={accent} 
        strokeWidth="2" 
        strokeLinecap="round"
        opacity="0.4"
      />
      <Path 
        d="M10 26 L16 26" 
        stroke={accent} 
        strokeWidth="2" 
        strokeLinecap="round"
        opacity="0.3"
      />
      <Path 
        d="M14 32 L18 32" 
        stroke={accent} 
        strokeWidth="2" 
        strokeLinecap="round"
        opacity="0.25"
      />
    </Svg>
  );
}
