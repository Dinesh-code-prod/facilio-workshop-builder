export type SceneKind =
  | 'title'
  | 'protocol'
  | 'inbox'
  | 'browser'
  | 'goal'
  | 'terminal'
  | 'devices'
  | 'conversation'
  | 'approval'
  | 'page'
  | 'channels'
  | 'code'
  | 'cta';
export type Beat = {
  kind: SceneKind;
  title: string;
  caption: string;
  lines: string[];
};
export const productStories = {
  OpenMuse: {
    framesPerBeat: 135,
    beats: [
      {
        kind: 'title',
        title: 'OpenMuse',
        caption: 'An editable launch-film recipe',
        lines: [
          'A request becomes a plan.',
          'A plan becomes something useful.',
        ],
      },
      {
        kind: 'protocol',
        title: 'Start with the agent.',
        caption: 'Replace this diagram with your verified architecture.',
        lines: ['Agent endpoint', 'AG-UI', 'App surface'],
      },
      {
        kind: 'inbox',
        title: 'Find the starting point.',
        caption: 'Fictional inbox content, staged for this example.',
        lines: [
          'From: Demo school',
          'Subject: Aquarium field trip',
          'Permission slip due Friday.',
        ],
      },
      {
        kind: 'browser',
        title: 'Research the next step.',
        caption: 'Illustrative browser result; no live browsing occurs.',
        lines: [
          'Aquarium visit guide',
          'Plan travel, arrival, and the class checklist.',
          'Source: example.org / visit-guide',
        ],
      },
      {
        kind: 'goal',
        title: 'Turn context into a goal.',
        caption: 'Keep a review step visible before an external action.',
        lines: [
          'Prepare the aquarium trip',
          'Read the visit guide',
          'Draft the permission slip',
          'Review before sending',
        ],
      },
      {
        kind: 'terminal',
        title: 'Create an artifact.',
        caption:
          'Staged command and output; replace with real proof when required.',
        lines: [
          '$ python prepare_trip.py',
          'Saved: trip-brief.md',
          '✓ Travel, checklist, and next steps',
        ],
      },
      {
        kind: 'devices',
        title: 'One story, across screens.',
        caption: 'Illustrative device layout, not a mobile availability claim.',
        lines: [
          'Desktop workspace',
          'Mobile companion',
          'Trip brief ready for review',
        ],
      },
      {
        kind: 'cta',
        title: 'Make this launch your own.',
        caption: 'Set a verified product URL before publishing.',
        lines: [
          'OpenMuse launch template',
          'Product evidence → editable source → final film',
          'Your repository or launch URL',
        ],
      },
    ] satisfies Beat[],
  },
  OpenDots: {
    framesPerBeat: 120,
    beats: [
      {
        kind: 'title',
        title: 'OpenDots',
        caption: 'An editable launch-film recipe',
        lines: ['From conversation', 'to a shared working Page.'],
      },
      {
        kind: 'conversation',
        title: 'Start with a request.',
        caption:
          'Synthetic conversation; adapt it to observed product behavior.',
        lines: [
          'Avery',
          'Turn these release notes into a launch brief.',
          'Scout prepares a draft for review.',
        ],
      },
      {
        kind: 'approval',
        title: 'Keep the decision visible.',
        caption: 'The illustrated approval precedes the saved result.',
        lines: [
          'Launch brief',
          'Audience: app developers',
          'Review goal, scope, and next steps',
        ],
      },
      {
        kind: 'page',
        title: 'Give the work a home.',
        caption: 'An illustrative saved Page, not a live integration receipt.',
        lines: [
          'Launch studio / Launch brief',
          'Goal: explain the release',
          'Scope: story, proof, and CTA',
          'Next: review with the team',
        ],
      },
      {
        kind: 'channels',
        title: 'Follow the conversation.',
        caption: 'Generic channel labels explain a routing pattern.',
        lines: ['Team chat', 'Agent', 'Shared workspace'],
      },
      {
        kind: 'devices',
        title: 'Keep the result readable.',
        caption:
          'Replace these mock devices with approved full-viewport captures.',
        lines: ['Workspace view', 'Mobile view', 'Launch brief · saved Page'],
      },
      {
        kind: 'code',
        title: 'Show how it fits.',
        caption:
          'Illustrative pseudocode; use verified setup code for a real launch.',
        lines: [
          '// Illustrative integration',
          'const agent = connect(endpoint);',
          'workspace.attach(agent);',
        ],
      },
      {
        kind: 'cta',
        title: 'Build the next conversation.',
        caption: 'Set a verified product URL before publishing.',
        lines: [
          'OpenDots launch template',
          'Editable scenes. Clean demo footage. Editor notes.',
          'Your repository or launch URL',
        ],
      },
    ] satisfies Beat[],
  },
};
