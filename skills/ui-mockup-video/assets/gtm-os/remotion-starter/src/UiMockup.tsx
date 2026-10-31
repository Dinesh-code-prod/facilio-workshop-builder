import {useCurrentFrame} from 'remotion';
import {Cursor, Field, Label} from './primitives';
import {mix, progress, settle} from './motion';
import {theme} from './theme';

export const UI_EVENTS = {type: 12, submit: 76, answer: 100, draft: 144, moveToApprove: 194, approve: 226, saved: 250};
const panel = {x: 104, y: 248, w: 1712, h: 740};
const card = {x: 304, y: 282, w: 1304, h: 276};
const approve = {x: card.x + card.w - 278, y: card.y + card.h - 84, w: 250, h: 56};
const sendTarget = {x: panel.x + card.x + card.w - 48, y: panel.y + panel.h - 68};
const approveTarget = {x: panel.x + approve.x + approve.w / 2, y: panel.y + approve.y + approve.h / 2};
const request = 'Turn these notes into a launch brief.';
const answer = 'I drafted a page with the goal, scope, and next steps. Review it before saving.';

export function UiMockup() {
  const f = useCurrentFrame();
  const submitted = f >= UI_EVENTS.submit;
  const approved = f >= UI_EVENTS.approve;
  const saved = f >= UI_EVENTS.saved;
  const draftP = settle(f, UI_EVENTS.draft);
  const toSend = settle(f, 48, 22);
  const toApprove = settle(f, UI_EVENTS.moveToApprove, 24);
  const away = settle(f, UI_EVENTS.saved + 16, 22);
  const x = mix(mix(mix(1450, sendTarget.x, toSend), approveTarget.x, toApprove), 1740, away);
  const y = mix(mix(mix(956, sendTarget.y, toSend), approveTarget.y, toApprove), 850, away);
  const pulse = f >= UI_EVENTS.approve ? progress(f, UI_EVENTS.approve, 18) : progress(f, UI_EVENTS.submit, 18);

  return <Field>
    <Label style={{position: 'absolute', left: 104, top: 66}}>Illustrative UI · Demo data</Label>
    <div style={{position: 'absolute', left: 104, top: 118, fontSize: 64, fontWeight: 600, letterSpacing: -2}}>A request. A decision. A useful result.</div>
    <div style={{position: 'absolute', left: panel.x, top: panel.y, width: panel.w, height: panel.h, border: `1px solid ${theme.line}`, borderRadius: 24, overflow: 'hidden', background: theme.surface, boxShadow: '0 36px 90px #0005'}}>
      <div style={{height: 72, borderBottom: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', padding: '0 30px', gap: 12}}>
        <div style={{width: 16, height: 16, borderRadius: 6, background: theme.mint}} />
        <span style={{fontSize: 26, fontWeight: 600}}>Workspace</span>
        <span style={{fontSize: 24, color: theme.muted, marginLeft: 'auto'}}>Personal / Launch studio</span>
      </div>
      <div style={{position: 'absolute', left: 0, top: 73, bottom: 0, width: 262, padding: '34px 22px', boxSizing: 'border-box', borderRight: `1px solid ${theme.line}`, background: '#0c131e'}}>
        <Label style={{fontSize: 16, letterSpacing: 2, marginBottom: 26}}>Spaces</Label>
        {['Everyday', 'Launch studio', ...(saved ? ['Launch brief'] : [])].map((item, i) => <div key={item} style={{fontSize: 24, padding: '17px 15px', marginBottom: 10, borderRadius: 10, background: i === (saved ? 2 : 1) ? theme.raised : 'transparent', color: i === (saved ? 2 : 1) ? theme.text : theme.muted}}>{item}</div>)}
        <div style={{position: 'absolute', left: 36, bottom: 38, color: theme.muted, fontSize: 19}}>Demo workspace</div>
      </div>
      {submitted && <div style={{position: 'absolute', left: card.x, top: 116, width: card.w, height: 74, borderRadius: 16, background: theme.raised, display: 'flex', alignItems: 'center', padding: '0 26px', boxSizing: 'border-box', fontSize: 30}}>{request}</div>}
      {f >= UI_EVENTS.answer && <div style={{position: 'absolute', left: card.x, top: 216, width: card.w, fontSize: 27, color: theme.muted}}>{answer.slice(0, Math.floor(answer.length * progress(f, UI_EVENTS.answer, 40)))}</div>}
      {f >= UI_EVENTS.draft && <div style={{position: 'absolute', left: card.x, top: card.y, width: card.w, height: card.h, border: `1px solid ${saved ? theme.mint + '88' : theme.line}`, borderRadius: 18, background: theme.raised, boxSizing: 'border-box', padding: 28, opacity: draftP, transform: `translateY(${(1 - draftP) * 14}px)`}}>
        <div style={{fontSize: 31, fontWeight: 600}}>{saved ? 'Launch brief saved' : 'Review: Launch brief'}</div>
        <div style={{fontSize: 24, color: theme.muted, marginTop: 16}}>Goal: turn a conversation into a working document.</div>
        <div style={{display: 'flex', gap: 12, marginTop: 22}}>{['Goal', 'Scope', 'Next steps'].map(label => <span key={label} style={{fontSize: 20, padding: '8px 14px', borderRadius: 8, border: `1px solid ${theme.line}`, color: theme.muted}}>{label}</span>)}</div>
        <div style={{position: 'absolute', left: 28, bottom: 42, fontSize: 23, color: saved ? theme.mint : theme.muted}}>{saved ? '✓ Available in Launch studio / Launch brief' : approved ? 'Saving your page…' : 'You decide what gets saved.'}</div>
        <div style={{position: 'absolute', left: approve.x - card.x, top: approve.y - card.y, width: approve.w, height: approve.h, borderRadius: 10, background: approved ? '#284b40' : theme.mint, color: approved ? theme.mint : '#0d201c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24, fontWeight: 600, transform: `scale(${f >= UI_EVENTS.approve && f < UI_EVENTS.approve + 5 ? 0.97 : 1})`}}>{saved ? 'Saved ✓' : approved ? 'Approved ✓' : 'Approve & save'}</div>
      </div>}
      <div style={{position: 'absolute', left: card.x, bottom: 30, width: card.w, height: 76, borderRadius: 14, border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', padding: '0 24px', boxSizing: 'border-box', fontSize: 27, color: submitted ? theme.muted : theme.text}}>
        {submitted ? 'Ask a follow-up…' : request.slice(0, Math.floor(request.length * progress(f, UI_EVENTS.type, 44)))}
        <div style={{position: 'absolute', right: 22, width: 50, height: 50, background: theme.accent, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#171128', fontSize: 32}}>↑</div>
      </div>
    </div>
    <Cursor x={x} y={y} pulse={pulse} />
  </Field>;
}
