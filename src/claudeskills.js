/* Claude skills for guides and videos: small add-ons the team can install in their own Claude (Claude Desktop or claude.ai) so it does better work on
   user guides and videos. They live in this app (public/skills, one ZIP each; the source folders are in the repo under /skills). Prompts that ask Claude for a guide
   or a video name these skills and say to carry on without them if they are not installed. Nothing here calls Claude. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const SKILLS = [
    ['video-to-user-guide', 'Turns a recorded walkthrough (and what was said in it) into accurate step-by-step guide text.'],
    ['demo-video', 'Plans and builds a product demo video: scenes, screen recordings, voice-over and final render.'],
    ['ui-mockup-video', 'Builds an animated product screen from screenshots, with cursor moves, typing and clicks, and renders it as a video.'],
    ['video-editing', 'Cuts footage and assembles clips into one video.'],
    ['remotion-create', 'Starts a new video project in Remotion.'],
    ['remotion-captions', 'Adds and animates captions (the words shown on screen).'],
    ['remotion-multimedia', 'Brings video, audio and images into a Remotion video.'],
    ['remotion-render', 'Exports the finished video file.']
  ];
  // the line added to every prompt that asks Claude to produce a guide or a video
  V.skillsPromptLine = 'SKILLS: if your Claude has any of these skills installed, use them: video-to-user-guide (steps from a recorded walkthrough), demo-video, ui-mockup-video, video-editing and the remotion skills (building and rendering the video). If a skill is not installed, carry on without it and say which part you could not build.';
  V.skillsNote = () => `<div class="notice" style="margin:10px 0"><span><b>Tip:</b> add a few skills to your Claude (Claude Desktop or claude.ai) and it does better work on guides and videos. <button type="button" class="btn sm" data-act="skillsHelp">Get the skills</button></span></div>`;
  ACT.skillsHelp = () => V.drawer('Skills for your Claude', `<p class="small" style="margin-top:0">Skills are small add-ons that teach Claude how to do a job well. These help with <b>user guides and videos</b>. You install them once in your own Claude; Delivery Studio does not install anything for you and does not need them to work.</p>
    <ol class="small" style="line-height:1.7"><li>Download the ZIP for each skill you want (one ZIP per skill).</li><li>In Claude Desktop open <b>Customize</b>, then <b>Skills</b>, and upload the ZIP. (In claude.ai it is in the same place. In Claude Code, unzip it into your <code>.claude/skills</code> folder.)</li><li>Open Claude from Delivery Studio as usual. The prompt already names these skills, so Claude picks them up. Without them it still works, with less polish.</li></ol>
    <div class="tg2-grid" style="margin-top:10px">${SKILLS.map(([n, d]) => `<div class="tg2-tile"><b>${esc(n)}</b><span>${esc(d)}</span><a class="btn sm" href="skills/${esc(n)}.zip" download>Download ZIP</a></div>`).join('')}</div>
    <p class="xs muted" style="margin-top:12px">These come from the open skill libraries the team already uses. For a video, attach your recorded screen video to the Claude chat yourself; very large recordings (over a few hundred MB) are better trimmed first.</p>`, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>', { wide: true });
})(typeof window !== 'undefined' ? window : globalThis);
