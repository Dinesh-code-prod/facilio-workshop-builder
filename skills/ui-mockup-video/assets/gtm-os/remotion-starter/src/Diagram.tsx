import {useCurrentFrame} from 'remotion';
import {Field, Label} from './primitives';
import {pointOnPolyline} from './motion';
import {theme} from './theme';

const rows = [430, 586, 742];
const left = {x: 124, w: 400, h: 98};
const right = {x: 1396, w: 400, h: 98};
const hub = {x: 766, y: 492, w: 388, h: 188};
const centerY = hub.y + hub.h / 2;
const leftBus = 642;
const rightBus = 1278;

export function Diagram() {
  const f = useCurrentFrame();
  // Four 60-frame cycles per 240-frame composition. All other elements stay still.
  const phase = (f % 60) / 60;
  // Use a fixed route schedule that repeats at 240 frames as well as all traffic periods.
  const row = rows[[0, 1, 2, 1][Math.floor((f % 240) / 60)]];
  const route = [{x: left.x + left.w, y: row}, {x: leftBus, y: row}, {x: leftBus, y: centerY}, {x: hub.x, y: centerY}];
  const outgoing = [{x: hub.x + hub.w, y: centerY}, {x: rightBus, y: centerY}, {x: rightBus, y: row}, {x: right.x, y: row}];
  const p = pointOnPolyline(phase < 0.5 ? route : outgoing, phase < 0.5 ? phase * 2 : (phase - 0.5) * 2);
  return <Field>
    <Label style={{position: 'absolute', left: 124, top: 92}}>Architecture illustration</Label>
    <div style={{position: 'absolute', left: 124, top: 151, fontSize: 72, fontWeight: 600, letterSpacing: -2}}>Make the connection clear.</div>
    <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
      <g stroke={theme.line} strokeWidth="3" fill="none">
        <path d={`M ${leftBus} ${rows[0]} V ${rows[2]} M ${rightBus} ${rows[0]} V ${rows[2]}`} />
        {rows.map(y => <path key={y} d={`M ${left.x + left.w} ${y} H ${leftBus} M ${rightBus} ${y} H ${right.x}`} />)}
        <path d={`M ${leftBus} ${centerY} H ${hub.x} M ${hub.x + hub.w} ${centerY} H ${rightBus}`} />
      </g>
      <circle cx={p.x} cy={p.y} r="7" fill={phase < 0.5 ? theme.accent : theme.mint} opacity={Math.min(1, phase * 12, (1 - phase) * 12)} />
    </svg>
    {['Research agent', 'Planning agent', 'Writing agent'].map((label, i) => <div key={label} style={{position: 'absolute', left: left.x, top: rows[i] - left.h / 2, width: left.w, height: left.h, border: `1px solid ${theme.line}`, borderRadius: 16, background: theme.surface, display: 'flex', alignItems: 'center', paddingLeft: 30, boxSizing: 'border-box', fontSize: 28}}><span style={{color: theme.accent, marginRight: 18}}>◇</span>{label}</div>)}
    {['Web app', 'Mobile app', 'Team channel'].map((label, i) => <div key={label} style={{position: 'absolute', left: right.x, top: rows[i] - right.h / 2, width: right.w, height: right.h, border: `1px solid ${theme.line}`, borderRadius: 16, background: theme.surface, display: 'flex', alignItems: 'center', paddingLeft: 30, boxSizing: 'border-box', fontSize: 28}}><span style={{color: theme.mint, marginRight: 18}}>○</span>{label}</div>)}
    <div style={{position: 'absolute', ...{left: hub.x, top: hub.y, width: hub.w, height: hub.h}, background: theme.raised, border: `1px solid ${theme.accent}77`, borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>
      <div style={{fontSize: 38, fontWeight: 600}}>Shared interface</div>
      <div style={{fontSize: 24, color: theme.muted}}>Events in. UI updates out.</div>
    </div>
    <div style={{position: 'absolute', left: 124, top: 924, fontSize: 24, color: theme.muted}}>Example topology · Replace with your verified architecture</div>
  </Field>;
}
