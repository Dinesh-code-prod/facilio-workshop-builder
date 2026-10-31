// Native chrome primitives adapted from the owner's earlier Slack mock.
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {slackEvents as B, slackColors as C, slackContent} from './slack-story';

const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const ramp = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
const ICONS: Record<string, string> = {
  home: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
  chat: 'M4 4h16v12H9l-5 4z',
  bell: 'M6 16h12l-2-3V8a4 4 0 0 0-8 0v5z M10 20h4',
  more: 'M5 12h.1 M12 12h.1 M19 12h.1',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  chevron: 'M8 10l4 4 4-4',
  plus: 'M12 4v16 M4 12h16',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 13h4v7H4z M16 13h4v7h-4z',
  send: 'M3 3l18 9-18 9 4-9z M7 12h14',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6l4 2',
  file: 'M6 2h8l4 4v16H6z M14 2v5h4 M9 12h6 M9 16h6',
  check: 'M4 12l5 5L20 6',
  close: 'M6 6l12 12 M18 6L6 18',
  arrow: 'M7 17L17 7 M7 7h10v10',
  code: 'M8 6l-6 6 6 6 M16 6l6 6-6 6',
};
export const Icon = ({
  name,
  size = 22,
  color = 'currentColor',
}: {
  name: string;
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={ICONS[name] ?? ICONS.more} />
  </svg>
);
type Person = 'avery' | 'scout' | 'morgan' | 'jules';
export const people = slackContent.people;
export const Avatar = ({
  person,
  size = 48,
}: {
  person: Person;
  size?: number;
}) => (
  <div
    style={{
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: 9,
      background:
        person === 'scout'
          ? '#44365b'
          : person === 'avery'
            ? '#407da7'
            : person === 'morgan'
              ? '#b9d4c4'
              : '#c9bfdc',
      display: 'grid',
      placeItems: 'center',
      fontWeight: 700,
      fontSize: size * 0.38,
      color: person === 'avery' ? '#fff' : '#2d3139',
    }}
  >
    {person === 'scout' ? (
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 40 40">
        <rect x="6" y="12" width="28" height="22" rx="8" fill="#c5b7e6" />
        <path d="M20 6v6" stroke="#c5b7e6" strokeWidth="3" />
        <circle cx="20" cy="5" r="3" fill="#91dec2" />
        <circle cx="14" cy="21" r="2" fill="#44365b" />
        <circle cx="26" cy="21" r="2" fill="#44365b" />
        <path
          d="M15 28h10"
          stroke="#44365b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ) : person === 'avery' ? (
      'AL'
    ) : person === 'morgan' ? (
      'MC'
    ) : (
      'JR'
    )}
  </div>
);
export const Mention = () => (
  <span
    style={{
      padding: '1px 4px',
      background: '#193f55',
      color: '#a1d3ff',
      borderRadius: 4,
    }}
  >
    @Scout
  </span>
);
export const Enter = ({
  at,
  frame,
  children,
}: {
  at: number;
  frame: number;
  children: React.ReactNode;
}) => (
  <div
    style={{
      opacity: ramp(frame, at, at + 10),
      transform: `translateY(${ramp(frame, at, at + 14, 8, 0)}px)`,
    }}
  >
    {children}
  </div>
);
export const Message = ({
  person,
  children,
  time = '10:42',
  compact = false,
}: {
  person: Person;
  children: React.ReactNode;
  time?: string;
  compact?: boolean;
}) => (
  <div
    style={{display: 'flex', gap: compact ? 12 : 15, alignItems: 'flex-start'}}
  >
    <Avatar person={person} size={compact ? 42 : 48} />
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{height: 28, display: 'flex', alignItems: 'center', gap: 10}}>
        <strong style={{fontSize: compact ? 22 : 24}}>{people[person]}</strong>
        {person === 'scout' && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 650,
              color: '#c6c7cd',
              padding: '2px 5px',
              background: '#40434a',
              borderRadius: 3,
            }}
          >
            APP
          </span>
        )}
        <span style={{fontSize: 16, color: C.muted}}>{time}</span>
      </div>
      <div
        style={{fontSize: compact ? 22 : 24, lineHeight: 1.42, marginTop: 5}}
      >
        {children}
      </div>
    </div>
  </div>
);
export const Attachment = ({compact = false}: {compact?: boolean}) => (
  <div
    style={{
      width: compact ? 308 : 342,
      height: 65,
      marginTop: 13,
      border: `1px solid ${C.border}`,
      borderRadius: 9,
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      padding: '9px 13px',
      background: '#22262c',
    }}
  >
    <div
      style={{
        width: 37,
        height: 43,
        display: 'grid',
        placeItems: 'center',
        background: '#36435a',
        borderRadius: 6,
        color: '#bad1ff',
      }}
    >
      <Icon name="file" size={25} />
    </div>
    <div>
      <div style={{fontSize: 21, fontWeight: 650}}>release-notes.md</div>
      <div style={{color: C.muted, fontSize: 16, marginTop: 1}}>
        Markdown · 3.2 KB
      </div>
    </div>
  </div>
);
export const Reaction = ({
  emoji,
  count,
  at,
  frame,
}: {
  emoji: string;
  count: number;
  at: number;
  frame: number;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      border: '1px solid #657cad',
      background: '#243046',
      borderRadius: 18,
      height: 34,
      padding: '0 12px',
      fontSize: 19,
      opacity: ramp(frame, at, at + 8),
      transform: `scale(${ramp(frame, at, at + 12, 0.88, 1)})`,
    }}
  >
    <span>{emoji}</span>
    <span style={{fontSize: 17, color: '#c8dcff'}}>{count}</span>
  </div>
);

// Native Block Kit spacing: sections and context live directly on the message
// surface. Only action elements receive borders; there is no custom app card.
const BlockDivider = () => (
  <div style={{height: 1, background: C.border, margin: '12px 0'}} />
);
const BlockContext = ({children}: {children: React.ReactNode}) => (
  <div style={{fontSize: 18, lineHeight: '24px', color: C.muted}}>
    {children}
  </div>
);
const BlockButton = ({
  children,
  primary = false,
}: {
  children: React.ReactNode;
  primary?: boolean;
}) => (
  <div
    style={{
      height: 39,
      padding: '0 17px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${primary ? '#4b9c70' : '#777a7e'}`,
      borderRadius: 4,
      background: primary ? '#007a5a' : 'transparent',
      color: '#f8f8f8',
      fontSize: 20,
      fontWeight: 700,
      lineHeight: 1,
    }}
  >
    {children}
  </div>
);
export const WorkBlocks = ({frame}: {frame: number}) => {
  const steps = [
    ['Read release-notes.md', B.work, B.read],
    ['Write the launch brief', B.read, B.draft],
    ['Save approved brief', B.approve, B.saved],
  ] as const;
  const collapse = ramp(frame, B.saved + 14, B.saved + 32);
  const workHeight = frame >= B.draft ? 312 : 164;
  return (
    <div
      style={{
        position: 'relative',
        height: workHeight - collapse * (workHeight - 44),
        overflow: 'hidden',
        marginTop: 15,
      }}
    >
      <div style={{opacity: 1 - collapse, paddingTop: 2}}>
        {steps.map(([label, start, done]) => (
          <div
            key={label}
            style={{
              height: 49,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color:
                frame >= done ? '#c4c7cc' : frame >= start ? C.fg : '#858991',
              fontSize: 21,
            }}
          >
            {frame >= done ? (
              <span style={{width: 23, fontSize: 20}}>✅</span>
            ) : (
              <div style={{width: 23, display: 'grid', placeItems: 'center'}}>
                <div
                  style={{
                    width: 17,
                    height: 17,
                    border: `2px solid ${frame >= start ? '#666a72' : '#50545b'}`,
                    borderTopColor: frame >= start ? '#d6d9df' : '#50545b',
                    borderRadius: '50%',
                    transform: `rotate(${frame >= start ? (frame - start) * 7 : 0}deg)`,
                  }}
                />
              </div>
            )}
            <span>{label}</span>
          </div>
        ))}
        {frame >= B.draft && (
          <div
            style={{height: 84, marginTop: 8, fontSize: 20, lineHeight: '26px'}}
          >
            <strong>Draft: Launch brief</strong>
            <div>Goal: explain the release. Scope: story, proof, and CTA.</div>
            <div>Next: review the brief before sharing.</div>
          </div>
        )}
        {frame >= B.draft && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <div
              style={{
                transform:
                  frame >= B.approve && frame < B.approve + 5
                    ? 'scale(.96)'
                    : undefined,
              }}
            >
              <BlockButton primary>
                {frame >= B.approve ? 'Approved ✓' : 'Approve & save'}
              </BlockButton>
            </div>
            <BlockContext>
              {frame >= B.approve
                ? 'Saving reviewed draft…'
                : 'Draft ready for your review'}
            </BlockContext>
          </div>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 8,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          opacity: collapse,
        }}
      >
        <span style={{fontSize: 19}}>✅</span>
        <BlockContext>Brief saved to Launch studio</BlockContext>
      </div>
    </div>
  );
};
export const PageBlocks = () => (
  <div style={{marginTop: 14, width: '100%', lineHeight: 1.25}}>
    <div style={{fontSize: 26, lineHeight: '32px', fontWeight: 700}}>
      📄 Launch brief
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginTop: 12,
        fontSize: 21,
        lineHeight: '26px',
      }}
    >
      <div>
        <strong>Space</strong>
        <div>Launch studio</div>
      </div>
      <div>
        <strong>Status</strong>
        <div>Ready for review</div>
      </div>
    </div>
    <BlockDivider />
    <div style={{fontSize: 21, lineHeight: '28px'}}>
      {slackContent.highlights.map((line) => (
        <div key={line}>• {line}</div>
      ))}
    </div>
    <div style={{display: 'flex', gap: 12, marginTop: 15}}>
      <BlockButton primary>Open page</BlockButton>
      <BlockButton>View in space</BlockButton>
    </div>
    <div style={{marginTop: 10}}>
      <BlockContext>Created by Scout · Demo workspace</BlockContext>
    </div>
  </div>
);
export const Composer = ({
  thread = false,
  typed = '',
  typing = false,
  frame,
}: {
  thread?: boolean;
  typed?: string;
  typing?: boolean;
  frame: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: 27,
      right: 27,
      bottom: 24,
      height: thread ? 105 : 125,
      border: '1px solid #616670',
      borderRadius: 9,
      background: '#222529',
      overflow: 'hidden',
    }}
  >
    {!thread && (
      <div
        style={{
          height: 33,
          background: '#292d34',
          padding: '5px 15px',
          color: '#b3b7c0',
          fontSize: 18,
          letterSpacing: 12,
        }}
      >
        <b>B</b> <i>I</i> <u>U</u>
        <span>≡</span>
      </div>
    )}
    <div
      style={{
        padding: '10px 15px 3px',
        height: thread ? 60 : 54,
        fontSize: 22,
        color: typed ? C.fg : '#969ba4',
        whiteSpace: 'nowrap',
      }}
    >
      {typed || (thread ? 'Reply…' : 'Message #launch-studio')}
      {typing && frame % 25 < 15 && (
        <span style={{borderRight: '2px solid #eee', marginLeft: 1}} />
      )}
    </div>
    <div
      style={{
        padding: '0 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 17,
        color: '#bcc1ca',
        height: 33,
      }}
    >
      <Icon name="plus" size={21} />
      <span style={{fontSize: 21}}>Aa</span>
      <span style={{fontSize: 25}}>☺</span>
      <span style={{fontSize: 23}}>@</span>
      <div
        style={{
          marginLeft: 'auto',
          background: typed ? '#237950' : 'transparent',
          width: 51,
          height: 31,
          borderRadius: 5,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name="send" size={21} />
      </div>
    </div>
  </div>
);
