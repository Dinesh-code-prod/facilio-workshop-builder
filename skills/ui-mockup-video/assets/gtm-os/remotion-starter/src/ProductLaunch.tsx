import type {ReactNode} from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import registry from '../compositions.json';
import {Field, Label} from './primitives';
import {settle} from './motion';
import {theme} from './theme';
import {productStories, type Beat} from './product-stories';

function Card({children, width = 1450}: {children: ReactNode; width?: number}) {
  return (
    <div
      style={{
        width,
        background: theme.surface,
        border: `1px solid ${theme.line}`,
        borderRadius: 24,
        padding: 44,
        boxSizing: 'border-box',
        boxShadow: '0 28px 70px #0003',
      }}
    >
      {children}
    </div>
  );
}
function Routing({lines}: {lines: string[]}) {
  const f = useCurrentFrame();
  const centers = [290, 790, 1290];
  return (
    <div style={{position: 'relative', width: 1580, height: 330}}>
      <svg width="1580" height="330" style={{position: 'absolute'}}>
        {[0, 1].map((i) => (
          <path
            key={i}
            d={`M ${centers[i] + 170} 160 H ${centers[i + 1] - 170}`}
            fill="none"
            stroke={theme.mint}
            strokeWidth="4"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - settle(f, 15 + i * 12, 32)}
          />
        ))}
      </svg>
      {lines.map((line, i) => (
        <div
          key={line}
          style={{
            position: 'absolute',
            top: 90,
            left: centers[i] - 170,
            width: 340,
            height: 140,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            borderRadius: 24,
            background: theme.surface,
            border: `1px solid ${theme.line}`,
            fontSize: 36,
            fontWeight: 600,
            color: i === 1 ? theme.mint : theme.text,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
function Devices({lines}: {lines: string[]}) {
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 60}}>
      <Card width={1030}>
        <Label style={{fontSize: 22}}>Desktop</Label>
        <div style={{fontSize: 39, fontWeight: 600, margin: '24px 0 30px'}}>
          {lines[0]}
        </div>
        <div
          style={{
            height: 240,
            borderRadius: 18,
            background: theme.raised,
            padding: 30,
            boxSizing: 'border-box',
            fontSize: 32,
          }}
        >
          {lines[2]}
          <div
            style={{
              height: 12,
              width: '80%',
              background: theme.line,
              borderRadius: 6,
              marginTop: 42,
            }}
          />
          <div
            style={{
              height: 12,
              width: '65%',
              background: theme.line,
              borderRadius: 6,
              marginTop: 25,
            }}
          />
        </div>
      </Card>
      <div
        style={{
          width: 320,
          height: 470,
          borderRadius: 42,
          border: `4px solid ${theme.line}`,
          background: theme.surface,
          padding: '42px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 70,
            height: 8,
            borderRadius: 4,
            background: theme.line,
            margin: '0 auto 44px',
          }}
        />
        <Label style={{fontSize: 18}}>Mobile</Label>
        <div style={{fontSize: 30, margin: '24px 0'}}>{lines[1]}</div>
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: theme.raised,
            fontSize: 24,
            lineHeight: 1.5,
          }}
        >
          {lines[2]}
        </div>
      </div>
    </div>
  );
}
function Content({beat}: {beat: Beat}) {
  const f = useCurrentFrame();
  if (beat.kind === 'protocol' || beat.kind === 'channels')
    return <Routing lines={beat.lines} />;
  if (beat.kind === 'devices') return <Devices lines={beat.lines} />;
  if (beat.kind === 'title' || beat.kind === 'cta')
    return (
      <div>
        {beat.lines.map((line, i) => (
          <div
            key={line}
            style={{
              fontSize: i === 0 ? 64 : 38,
              color: i === 0 ? theme.mint : theme.muted,
              fontWeight: i === 0 ? 600 : 400,
              marginBottom: 36,
              maxWidth: 1570,
              lineHeight: 1.3,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    );
  if (beat.kind === 'terminal' || beat.kind === 'code')
    return (
      <Card>
        <Label style={{fontSize: 23, marginBottom: 38}}>
          {beat.kind === 'code' ? 'Integration sketch' : 'Workspace / Terminal'}
        </Label>
        <pre
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 38,
            lineHeight: 1.9,
            color: theme.mint,
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}
        >
          {beat.lines.filter((_, i) => f >= i * 15).join('\n')}
        </pre>
      </Card>
    );
  if (beat.kind === 'approval') {
    const approved = f >= 65;
    return (
      <Card>
        <div style={{fontSize: 44, fontWeight: 600}}>{beat.lines[0]}</div>
        {beat.lines.slice(1).map((line) => (
          <div
            key={line}
            style={{fontSize: 33, color: theme.muted, marginTop: 25}}
          >
            {line}
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            gap: 32,
            alignItems: 'center',
            marginTop: 42,
          }}
        >
          <div
            style={{
              padding: '19px 30px',
              borderRadius: 12,
              background: theme.mint,
              color: theme.bg,
              fontSize: 30,
              fontWeight: 600,
              transform: f >= 65 && f < 70 ? 'scale(.97)' : undefined,
            }}
          >
            {approved ? 'Approved ✓' : 'Approve & save'}
          </div>
          <div style={{fontSize: 29, color: theme.muted}}>
            {approved ? 'Saving the reviewed draft…' : 'Ready for your review'}
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <Label style={{fontSize: 22, marginBottom: 30}}>
        {
          (
            {
              inbox: 'Inbox / Demo email',
              browser: 'Browser / example.org',
              goal: 'Suggested goal',
              conversation: 'Launch studio / Conversation',
              page: 'Saved Page',
            } as Partial<Record<Beat['kind'], string>>
          )[beat.kind]
        }
      </Label>
      {beat.lines.map((line, i) => (
        <div
          key={line}
          style={{
            fontSize: i === 0 ? 43 : 33,
            fontWeight: i === 0 ? 600 : 400,
            color: i === 0 ? theme.text : theme.muted,
            marginTop: i === 0 ? 0 : 28,
            lineHeight: 1.35,
          }}
        >
          {beat.kind === 'goal' && i > 0
            ? `${i === 3 || f < 38 + i * 13 ? '○' : '✓'} `
            : ''}
          {line}
        </div>
      ))}
    </Card>
  );
}
function ProductScene({
  product,
  beat,
  index,
  total,
}: {
  product: string;
  beat: Beat;
  index: number;
  total: number;
}) {
  const f = useCurrentFrame();
  return (
    <Field>
      <div
        style={{
          position: 'absolute',
          top: 62,
          left: 110,
          right: 110,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Label>{product} / launch recipe</Label>
        <span style={{fontSize: 23, color: theme.muted}}>
          Illustrative template · {String(index + 1).padStart(2, '0')} / {total}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 110,
          fontSize: beat.kind === 'title' ? 122 : 76,
          fontWeight: 600,
          letterSpacing: -3,
          lineHeight: 1.15,
        }}
      >
        {beat.title}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 360,
          left: 110,
          opacity: beat.kind === 'title' ? 1 : settle(f, 0, 12),
          transform: `translateY(${beat.kind === 'title' ? 0 : 12 * (1 - settle(f, 0, 12))}px)`,
        }}
      >
        <Content beat={beat} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          bottom: 62,
          right: 110,
          fontSize: 27,
          color: theme.muted,
          lineHeight: 1.4,
        }}
      >
        {beat.caption}
      </div>
    </Field>
  );
}
function ProductLaunch({product}: {product: keyof typeof productStories}) {
  const story = productStories[product];
  const metadata =
    registry[product === 'OpenMuse' ? 'OpenMuseLaunch' : 'OpenDotsLaunch'];
  if (story.beats.length * story.framesPerBeat !== metadata.durationInFrames) {
    throw new Error(
      `${product}: story length must match compositions.json durationInFrames`,
    );
  }
  return (
    <>
      {story.beats.map((beat, i) => (
        <Sequence
          key={beat.kind}
          name={`${product}: ${beat.kind}`}
          from={i * story.framesPerBeat}
          durationInFrames={story.framesPerBeat}
        >
          <ProductScene
            product={product}
            beat={beat}
            index={i}
            total={story.beats.length}
          />
        </Sequence>
      ))}
    </>
  );
}
export function OpenMuseLaunch() {
  return <ProductLaunch product="OpenMuse" />;
}
export function OpenDotsLaunch() {
  return <ProductLaunch product="OpenDots" />;
}
