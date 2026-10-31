import {Composition, Sequence, useCurrentFrame} from 'remotion';
import registry from '../compositions.json';
import {SlackThread} from './SlackThread';
import {OpenMuseLaunch, OpenDotsLaunch} from './ProductLaunch';
import {UiMockup} from './UiMockup';
import {Diagram} from './Diagram';
import {Field, Label} from './primitives';
import {settle} from './motion';
import {theme} from './theme';

function Intro() {
  const f = useCurrentFrame();
  return (
    <Field>
      <div style={{position: 'absolute', left: 130, top: 168}}>
        <Label>Demo skills / Launch starter</Label>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 324,
          width: 1590,
          fontSize: 118,
          letterSpacing: -5,
          lineHeight: 1.1,
          fontWeight: 600,
          transform: `translateY(${16 * (1 - settle(f))}px)`,
        }}
      >
        Show what your
        <br />
        <span style={{color: theme.accent}}>product makes possible.</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 138,
          top: 718,
          fontSize: 34,
          color: theme.muted,
          opacity: settle(f, 15),
        }}
      >
        The action. The decision. The result.
      </div>
    </Field>
  );
}

function Close() {
  const f = useCurrentFrame();
  return (
    <Field>
      <div style={{position: 'absolute', left: 130, top: 208}}>
        <Label>Make it your own</Label>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 324,
          fontSize: 108,
          fontWeight: 600,
          letterSpacing: -4,
        }}
      >
        Build your next demo.
      </div>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 491,
          fontSize: 34,
          color: theme.muted,
        }}
      >
        Three skills. Editable source. A clear path to the final cut.
      </div>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 652,
          width: 1450,
          height: 116,
          background: theme.raised,
          borderRadius: 20,
          border: `1px solid ${theme.line}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 38px',
          boxSizing: 'border-box',
          fontSize: 42,
          opacity: settle(f, 4),
        }}
      >
        <span style={{color: theme.mint, marginRight: 26}}>↗</span>
        github.com/jerelvelarde/demo-skills
      </div>
    </Field>
  );
}

function Launch() {
  return (
    <>
      <Sequence from={0} durationInFrames={120}>
        <Intro />
      </Sequence>
      <Sequence from={120} durationInFrames={360}>
        <UiMockup />
      </Sequence>
      <Sequence from={480} durationInFrames={120}>
        <Diagram />
      </Sequence>
      <Sequence from={600} durationInFrames={120}>
        <Close />
      </Sequence>
    </>
  );
}

function metadata(id: keyof typeof registry) {
  const {reviewFrames: _review, ...composition} = registry[id];
  return composition;
}

export function Root() {
  // Keep IDs/components literal for Studio's source navigation and prop editing.
  // Metadata spreads precede explicit props so Studio can resolve static IDs.
  return (
    <>
      <Composition {...metadata('Launch')} id="Launch" component={Launch} />
      <Composition
        {...metadata('UiMockup')}
        id="UiMockup"
        component={UiMockup}
      />
      <Composition
        {...metadata('DiagramLoop')}
        id="DiagramLoop"
        component={Diagram}
      />
      <Composition
        {...metadata('SlackThread')}
        id="SlackThread"
        component={SlackThread}
        defaultProps={{clean: true}}
      />
      <Composition
        {...metadata('OpenMuseLaunch')}
        id="OpenMuseLaunch"
        component={OpenMuseLaunch}
      />
      <Composition
        {...metadata('OpenDotsLaunch')}
        id="OpenDotsLaunch"
        component={OpenDotsLaunch}
      />
    </>
  );
}
