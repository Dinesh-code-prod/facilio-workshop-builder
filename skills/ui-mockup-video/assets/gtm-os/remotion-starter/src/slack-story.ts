// Timing follows the earlier native Slack demo, with an explicit review decision.
export const slackEvents = {
  type: 16,
  typed: 112,
  send: 126,
  replyLink: 148,
  clickThread: 164,
  open: 168,
  ack: 207,
  work: 239,
  read: 294,
  draft: 363,
  approve: 429,
  saved: 465,
  result: 501,
  reply: 609,
  secondReply: 714,
  reaction: 797,
};
export const slackGeometry = {
  x: 0,
  y: 0,
  w: 1920,
  h: 1080,
  rail: 68,
  side: 220,
  thread: 996,
  send: {x: 1862, y: 1037},
  threadTarget: {x: 450, y: 506},
  approve: {x: 1108, y: 701},
};
export const slackColors = {
  bg: '#1a1d21',
  panel: '#222529',
  border: '#393d43',
  fg: '#eeeef0',
  muted: '#a8abb2',
  link: '#88bcf5',
  side: '#261b2b',
  rail: '#1f1624',
  mint: '#91dec2',
};
export const slackContent = {
  workspace: 'Demo team',
  people: {
    avery: 'Avery Lane',
    scout: 'Scout',
    morgan: 'Morgan Chen',
    jules: 'Jules Rivera',
  },
  acknowledgement:
    'On it — I’ll read the notes and draft a Page for your approval.',
  replies: [
    'This is exactly what we needed. Ready for the launch!',
    'All from this thread. Love it, Scout. 🙌',
  ],
  highlights: [
    'Explain the release in one clear story.',
    'Show the request, decision, and result.',
    'Keep the brief in Launch studio.',
  ],
  request:
    '@Scout turn these release notes into a launch brief. Let me review it before saving.',
  note: 'Illustrative Slack UI • Synthetic content • No live API calls',
};
