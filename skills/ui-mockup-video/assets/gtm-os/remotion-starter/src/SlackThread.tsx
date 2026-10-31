import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

// Adapted from the owner's earlier OpenDots/OpenTag Slack mock.
// Native chrome and choreography are retained; identities and content are synthetic.
import {Field} from './primitives';
import {theme} from './theme';
import {
  slackEvents as B,
  slackGeometry as W,
  slackColors as C,
  slackContent,
} from './slack-story';
import {
  ramp,
  Icon,
  Avatar,
  Mention,
  Enter,
  Message,
  Attachment,
  Reaction,
  WorkBlocks,
  PageBlocks,
  Composer,
  people,
} from './SlackUi';
const ASK = slackContent.request;
const Cursor = ({frame}: {frame: number}) => {
  const path = [
    {f: 0, x: W.send.x - 390, y: W.send.y - 53},
    {f: B.typed - 2, x: W.send.x - 390, y: W.send.y - 53},
    {f: B.send - 1, ...W.send},
    {f: B.send + 12, ...W.send},
    {f: B.clickThread - 3, ...W.threadTarget},
    {f: B.clickThread + 18, ...W.threadTarget},
    {f: B.approve - 32, ...W.threadTarget},
    {f: B.approve - 3, ...W.approve},
    {f: B.approve + 12, ...W.approve},
    {f: B.saved, x: 1780, y: 880},
  ];
  let x = path[0].x,
    y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    if (frame >= path[i].f) {
      x = path[i].x;
      y = path[i].y;
      continue;
    }
    const q = ramp(frame, path[i - 1].f, path[i].f);
    x = path[i - 1].x + (path[i].x - path[i - 1].x) * q;
    y = path[i - 1].y + (path[i].y - path[i - 1].y) * q;
    break;
  }
  const click = [B.send, B.clickThread, B.approve].find(
    (at) => frame >= at && frame < at + 12,
  );
  const q = click === undefined ? 0 : (frame - click) / 12;
  const visible =
    frame < B.clickThread + 36
      ? 1 - ramp(frame, B.clickThread + 21, B.clickThread + 36)
      : ramp(frame, B.approve - 38, B.approve - 32) *
        (1 - ramp(frame, B.saved, B.saved + 15));
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: visible,
      }}
    >
      {click !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: x - 18,
            top: y - 18,
            width: 36,
            height: 36,
            border: '2px solid #eee',
            borderRadius: '50%',
            opacity: 1 - q,
            transform: `scale(${0.4 + q})`,
          }}
        />
      )}
      <svg
        width={25}
        height={33}
        viewBox="0 0 26 33"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          filter: 'drop-shadow(0 2px 3px #0008)',
        }}
      >
        <path
          d="M2 1L22 19L13 20L9 29L2 1Z"
          fill="white"
          stroke="#171717"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

function SlackSurface() {
  const f = useCurrentFrame();
  const open = ramp(f, B.open, B.open + 24);
  const mainWidth = W.w - W.rail - W.side;
  const channelWidth = mainWidth - W.thread * open;
  const typed =
    f >= B.send
      ? ''
      : ASK.slice(
          0,
          Math.floor(
            interpolate(f, [B.type, B.typed], [0, ASK.length], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          ),
        );
  const resultTop = 347 + (312 - ramp(f, B.saved + 14, B.saved + 32) * 268);
  const scroll =
    ramp(f, B.result + 8, B.result + 35, 0, 218) +
    ramp(f, B.reply - 5, B.reply + 18, 0, 99) +
    ramp(f, B.secondReply - 5, B.secondReply + 18, 0, 65);
  const replies =
    f >= B.secondReply ? 4 : f >= B.reply ? 3 : f >= B.result ? 2 : 1;
  return (
    <AbsoluteFill
      className="slack-surface"
      style={{fontFamily: theme.font, color: C.fg, background: C.bg}}
    >
      <style>{`.slack-surface, .slack-surface *{box-sizing:border-box}`}</style>
      <div
        style={{
          position: 'absolute',
          left: W.x,
          top: W.y,
          width: W.w,
          height: W.h,
          overflow: 'hidden',
          background: C.bg,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: 50,
            background: C.rail,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 19,
          }}
        >
          <div
            style={{position: 'absolute', left: 22, display: 'flex', gap: 8}}
          >
            {['#e46b63', '#dfb95e', '#65b888'].map((color) => (
              <div
                key={color}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 8,
                  background: color,
                }}
              />
            ))}
          </div>
          <Icon name="clock" size={21} />
          <div
            style={{
              width: 700,
              height: 32,
              border: '1px solid #6b546f',
              borderRadius: 6,
              background: '#44314b',
              color: '#d9cedc',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '0 12px',
              fontSize: 17,
            }}
          >
            <Icon name="search" size={17} />
            Search {slackContent.workspace}
          </div>
          <span
            style={{
              position: 'absolute',
              right: 23,
              color: '#c7b9cc',
              fontSize: 20,
            }}
          >
            ?
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 50,
            bottom: 0,
            width: W.rail,
            background: C.rail,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 27,
            paddingTop: 18,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              display: 'grid',
              placeItems: 'center',
              background: '#d6cee5',
              color: '#31273e',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            D
          </div>
          {[
            ['home', 'Home'],
            ['chat', 'DMs'],
            ['bell', 'Activity'],
            ['more', 'More'],
          ].map(([icon, name], i) => (
            <div key={name} style={{textAlign: 'center', color: '#d5c9da'}}>
              <div
                style={{
                  padding: 9,
                  borderRadius: 10,
                  height: 42,
                  background: i === 0 ? '#5c4166' : 'transparent',
                }}
              >
                <Icon name={icon} />
              </div>
              <div style={{fontSize: 12, marginTop: 6}}>{name}</div>
            </div>
          ))}
          <div style={{position: 'absolute', bottom: 20}}>
            <Avatar person="avery" size={39} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: W.rail,
            top: 50,
            bottom: 0,
            width: W.side,
            background: C.side,
            borderRight: '1px solid #4c3c53',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '0 18px',
              borderBottom: '1px solid #4a3b50',
              fontSize: 24,
              fontWeight: 750,
            }}
          >
            {slackContent.workspace}
            <Icon name="chevron" size={17} />
          </div>
          <div
            style={{
              padding: '17px 18px',
              fontSize: 20,
              lineHeight: 1.85,
              color: '#d1c6d7',
            }}
          >
            <div>◉ &nbsp; Threads</div>
            <div>☷ &nbsp; Drafts & sent</div>
          </div>
          <div style={{padding: '8px 18px', fontSize: 17, color: '#ac9fb5'}}>
            ⌄ &nbsp; Channels
          </div>
          {['general', 'launch-studio', 'engineering', 'product', 'random'].map(
            (name) => (
              <div
                key={name}
                style={{
                  padding: '9px 18px',
                  fontSize: 19,
                  background:
                    name === 'launch-studio' ? '#245a7e' : 'transparent',
                  color: name === 'launch-studio' ? '#fff' : '#c9bdd1',
                }}
              >
                # &nbsp; {name}
              </div>
            ),
          )}
          <div
            style={{padding: '24px 18px 12px', fontSize: 17, color: '#ac9fb5'}}
          >
            ⌄ &nbsp; Direct messages
          </div>
          {[people.morgan, people.jules].map((name) => (
            <div
              key={name}
              style={{padding: '8px 18px', color: '#c9bdd1', fontSize: 19}}
            >
              <span style={{color: '#65b690', fontSize: 12}}>●</span> &nbsp;{' '}
              {name}
            </div>
          ))}
          <div
            style={{padding: '24px 18px 12px', fontSize: 17, color: '#ac9fb5'}}
          >
            ⌄ &nbsp; Apps
          </div>
          <div
            style={{
              padding: '0 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 19,
            }}
          >
            <Avatar person="scout" size={28} />
            Scout
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: W.rail + W.side,
            top: 50,
            bottom: 0,
            width: channelWidth,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 64,
              padding: '0 26px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 26,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{color: C.muted}}>#</span>launch-studio
            <Icon name="chevron" size={18} />
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: 21,
                color: C.muted,
              }}
            >
              <Icon name="headphones" />
              <Icon name="search" />
            </div>
          </div>
          <div
            style={{
              height: 43,
              padding: '10px 26px',
              borderBottom: `1px solid ${C.border}`,
              color: '#a6abb5',
              fontSize: 17,
            }}
          >
            Messages &nbsp;&nbsp; Files &nbsp;&nbsp; +
          </div>
          <div
            style={{
              position: 'absolute',
              top: 107,
              left: 0,
              right: 0,
              bottom: 166,
              overflow: 'hidden',
              padding: '0 26px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                margin: '18px 0',
                color: '#a2a6af',
                fontSize: 15,
              }}
            >
              <div style={{height: 1, background: C.border, flex: 1}} />
              Today
              <div style={{height: 1, background: C.border, flex: 1}} />
            </div>
            <div style={{opacity: 0.66}}>
              <Message person="jules" time="10:40" compact>
                <span>
                  Release notes are ready.
                  <br />
                  Let’s turn them into the launch brief.
                </span>
              </Message>
            </div>
            {f >= B.send && (
              <div
                style={{position: 'absolute', top: 183, left: 26, right: 26}}
              >
                <Enter at={B.send} frame={f}>
                  <Message person="avery" time="10:41" compact>
                    <div style={{maxWidth: 990}}>
                      <Mention /> {ASK.slice(7)}
                    </div>
                    <Attachment compact />
                    {f >= B.replyLink && (
                      <div
                        style={{
                          marginTop: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          color: C.link,
                          fontSize: 19,
                        }}
                      >
                        <Avatar person="scout" size={24} />
                        <strong>
                          {replies} {replies === 1 ? 'reply' : 'replies'}
                        </strong>
                        <span style={{fontSize: 15, color: '#9298a4'}}>
                          Last reply just now
                        </span>
                      </div>
                    )}
                  </Message>
                </Enter>
              </div>
            )}
          </div>
          <Composer
            typed={typed}
            typing={f >= B.type && f < B.send}
            frame={f}
          />
        </div>
        {f >= B.open && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 50,
              bottom: 0,
              width: W.thread,
              transform: `translateX(${(1 - open) * W.thread}px)`,
              background: C.bg,
              borderLeft: '1px solid #52505c',
              boxShadow: '-12px 0 35px #0002',
            }}
          >
            <div
              style={{
                height: 64,
                borderBottom: `1px solid ${C.border}`,
                padding: '0 29px',
                display: 'flex',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <strong style={{fontSize: 27}}>Thread</strong>
              <span style={{color: C.muted, fontSize: 20}}>
                # launch-studio
              </span>
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  gap: 22,
                  color: C.muted,
                }}
              >
                <Icon name="more" />
                <Icon name="close" />
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                top: 64,
                left: 0,
                right: 0,
                bottom: 148,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 30,
                  right: 32,
                  top: 20 - scroll,
                }}
              >
                <Message person="avery" time="10:41">
                  <Mention /> {ASK.slice(7)}
                  <Attachment />
                </Message>
                <div
                  style={{
                    position: 'absolute',
                    top: 184,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: '#8d939e',
                    fontSize: 16,
                  }}
                >
                  {replies} {replies === 1 ? 'reply' : 'replies'}
                  <div style={{flex: 1, height: 1, background: C.border}} />
                </div>
                {f >= B.ack && (
                  <div
                    style={{position: 'absolute', top: 215, left: 0, right: 0}}
                  >
                    <Enter at={B.ack} frame={f}>
                      <Message person="scout">
                        {slackContent.acknowledgement}
                        {f >= B.work && (
                          <Enter at={B.work} frame={f}>
                            <WorkBlocks frame={f} />
                          </Enter>
                        )}
                      </Message>
                    </Enter>
                  </div>
                )}
                {f >= B.result && (
                  <div
                    style={{
                      position: 'absolute',
                      top: resultTop,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <Enter at={B.result} frame={f}>
                      <Message person="scout" time="10:43">
                        Done. The launch brief is saved in{' '}
                        <strong>Launch studio</strong>.<PageBlocks />
                        {f >= B.reaction && (
                          <div style={{display: 'flex', gap: 8, marginTop: 12}}>
                            <Reaction
                              emoji="🙌"
                              count={3}
                              at={B.reaction}
                              frame={f}
                            />
                            <Reaction
                              emoji="🔥"
                              count={2}
                              at={B.reaction + 12}
                              frame={f}
                            />
                          </div>
                        )}
                      </Message>
                    </Enter>
                  </div>
                )}
                {f >= B.reply && (
                  <div
                    style={{
                      position: 'absolute',
                      top: resultTop + 432,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <Enter at={B.reply} frame={f}>
                      <Message person="morgan" time="10:43">
                        {slackContent.replies[0]}
                        {f >= B.reaction + 25 && (
                          <div style={{display: 'flex', marginTop: 8}}>
                            <Reaction
                              emoji="💜"
                              count={2}
                              at={B.reaction + 25}
                              frame={f}
                            />
                          </div>
                        )}
                      </Message>
                    </Enter>
                  </div>
                )}
                {f >= B.secondReply && (
                  <div
                    style={{
                      position: 'absolute',
                      top: resultTop + 557,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <Enter at={B.secondReply} frame={f}>
                      <Message person="jules" time="10:44">
                        {slackContent.replies[1]}
                      </Message>
                    </Enter>
                  </div>
                )}
              </div>
            </div>
            {f >= B.reply - 35 && f < B.reply && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 135,
                  left: 31,
                  fontSize: 16,
                  color: C.muted,
                }}
              >
                Morgan is typing…
              </div>
            )}
            {f >= B.secondReply - 35 && f < B.secondReply && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 135,
                  left: 31,
                  fontSize: 16,
                  color: C.muted,
                }}
              >
                Jules is typing…
              </div>
            )}
            <Composer thread frame={f} />
          </div>
        )}
        <Cursor frame={f} />
      </div>
    </AbsoluteFill>
  );
}

export function SlackThread({clean = true}: {clean?: boolean}) {
  if (clean) return <SlackSurface />;
  return (
    <Field>
      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 30,
          fontSize: 40,
          fontWeight: 600,
        }}
      >
        A conversation becomes a useful Page.
      </div>
      <div
        style={{
          position: 'absolute',
          left: 192,
          top: 120,
          width: 1536,
          height: 864,
          overflow: 'hidden',
          borderRadius: 18,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 1920,
            height: 1080,
            transform: 'scale(.8)',
            transformOrigin: 'top left',
          }}
        >
          <SlackSurface />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 96,
          bottom: 40,
          fontSize: 24,
          color: theme.muted,
        }}
      >
        {slackContent.note}
      </div>
    </Field>
  );
}
