import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill} from 'remotion';
import {theme} from './theme';

export function Field({children}: {children: ReactNode}) {
  return <AbsoluteFill style={{background: theme.bg, color: theme.text, fontFamily: theme.font}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 10% 100%, #13304277 0, transparent 58%), radial-gradient(ellipse at 90% 0%, #2a1d4677 0, transparent 55%)'}} />
    {children}
  </AbsoluteFill>;
}

export function Label({children, style}: {children: ReactNode; style?: CSSProperties}) {
  return <div style={{fontSize: 24, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: theme.muted, ...style}}>{children}</div>;
}

export function Cursor({x, y, pulse}: {x: number; y: number; pulse: number}) {
  return <div style={{position: 'absolute', left: x, top: y, pointerEvents: 'none'}}>
    {pulse > 0 && pulse < 1 && <div style={{position: 'absolute', width: 70, height: 70, borderRadius: '50%', border: `3px solid ${theme.mint}`, opacity: 1 - pulse, transform: `translate(-50%, -50%) scale(${0.4 + pulse})`}} />}
    <svg width="32" height="40" viewBox="0 0 32 40" style={{filter: 'drop-shadow(0 3px 5px #0008)'}}><path d="M2 2 L28 25 L17 26 L12 37 Z" fill="white" stroke="#080c14" strokeWidth="2" /></svg>
  </div>;
}
