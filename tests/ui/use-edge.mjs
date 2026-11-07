// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/use-edge.mjs
// Run any browser check in Microsoft Edge when Playwright's own browser is not installed: node --import ./tests/ui/use-edge.mjs tests/ui/<check>.mjs [url]
import { chromium } from 'playwright';
const launch = chromium.launch.bind(chromium); chromium.launch = (o = {}) => launch(Object.assign({ channel: process.env.PW_CHANNEL || 'msedge' }, o));
