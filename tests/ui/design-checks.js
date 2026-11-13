// In-page design checks for the UI audit: does what is on screen follow the Apple look of src/ui.css (CLAUDE.md, Look and feel)?
// Injected next to tests/ui/checks.js; window.__designAudit() returns findings { rule, sig, text, detail } like window.__uiAudit.
// Rules: system font, weights 400/500/600, capsule .btn, 12 px fields, 20 px cards, no gradients/glow/uppercase/violet. Art kept on purpose is skipped.
(function () {
  const SKIP = '.auth, .intro, #intro, .ci-art, .city, .nightcity, .dk-, .demokit, .wb-canvas, .whiteboard canvas, .paper, .doc-preview, iframe, svg, canvas, video, .page-header.dark, .lp-, .discover, .ls-, .login-';
  const skipped = el => { try { return !!el.closest(SKIP.split(', ').filter(s => !s.endsWith('-')).join(', ')) || [...el.classList].some(c => /^(dk-|lp-|ls-|login-|auth-|av-|intro|disc)/.test(c)) || !!el.closest('[class*="dk-"],[class*="auth-"],[class*="intro"],[class*="disc-"]'); } catch (e) { return false; } };
  const vis = el => { if (!el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; return r.bottom > 0 && r.top < innerHeight * 6; };
  const sig = el => { const parts = []; let e = el; for (let i = 0; e && e !== document.body && i < 3; i++, e = e.parentElement) { let s = e.tagName.toLowerCase(); const c = [...e.classList].filter(x => !/^(on|active|open|sel|is-)/.test(x)).slice(0, 2); if (c.length) s += '.' + c.join('.'); parts.unshift(s); } return parts.join('>'); };
  const txt = el => (el.innerText || el.getAttribute('aria-label') || el.title || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  // the UI font is Inter (user, 12 Nov 2026; public/fonts), plus the system and monospace faces
  const SYS = /^("?inter"?$|"?inter var|-apple-system|blinkmacsystemfont|"?sf pro|system-ui|"?segoe ui|"?helvetica neue|ui-monospace|menlo|consolas|monospace|"?sf mono|"?cascadia|courier)/i;
  const rgb = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(s || ''); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null; };
  const hue = c => { const r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return { h: 0, s: 0 }; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; const l = (mx + mn) / 2; return { h, s: d / (1 - Math.abs(2 * l - 1)) }; };
  const violet = s => { const c = rgb(s); if (!c || c.a < .2) return false; const x = hue(c); return x.s > .3 && x.h >= 255 && x.h <= 320; };
  const tinted = s => { const c = rgb(s); if (!c || c.a < .05) return false; return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 40; };
  window.__designAudit = function () {
    const out = []; const add = (rule, el, detail) => out.push({ rule, sig: sig(el), text: txt(el), detail });
    const all = [...document.body.querySelectorAll('*')].filter(e => !(e instanceof SVGElement) && vis(e) && !skipped(e));
    for (const el of all) {
      const cs = getComputedStyle(el); const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (hasText) {
        const fam = cs.fontFamily.split(',')[0].trim(); if (!SYS.test(fam) && !/icon|symbol|emoji/i.test(fam)) add('d-font', el, fam);
        if (+cs.fontWeight >= 700) add('d-weight', el, cs.fontWeight);
        if (cs.textTransform === 'uppercase') add('d-uppercase', el, '');
        if (violet(cs.color)) add('d-violet', el, 'text ' + cs.color);
      }
      if (/gradient\(/.test(cs.backgroundImage) && !el.closest('.page-header, .ph-hero, .banner, .hero, .cover')) add('d-gradient', el, cs.backgroundImage.slice(0, 60));
      if (violet(cs.backgroundColor)) add('d-violet', el, 'bg ' + cs.backgroundColor);
      if (cs.boxShadow && cs.boxShadow !== 'none' && cs.boxShadow.split(/,(?![^(]*\))/).some(p => { const c = rgb(p); return c && tinted(p) && c.a > .15 && !/inset/.test(p) && !/\b0px 0px 0px [123]px\b/.test(p); })) add('d-glow', el, cs.boxShadow.slice(0, 60));
    }
    const r = el => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    // buttons: capsules (Apple) unless inside a segmented control, tab list or menu
    for (const b of document.querySelectorAll('.btn')) { if (!vis(b) || skipped(b) || b.closest('.seg, [role=tablist], [role=menu], .tabs')) continue; const h = b.getBoundingClientRect().height; if (r(b) < Math.min(h / 2, 30) - 1.5) add('d-btn-shape', b, 'radius ' + r(b) + ' for height ' + Math.round(h)); }
    // buttons that are not .btn but look like old square buttons
    for (const b of document.querySelectorAll('main button:not(.btn), .drawer button:not(.btn), #drawer button:not(.btn)')) { if (!vis(b) || skipped(b) || b.closest('.seg, [role=tablist], [role=menu], .tabs, nav, .rail, .sidebar, table, .fl-dg, .wb, .flow')) continue; const cs = getComputedStyle(b); if (cs.borderStyle !== 'none' && parseFloat(cs.borderWidth) > 0 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && r(b) < 6 && b.getBoundingClientRect().height >= 24) add('d-old-button', b, 'radius ' + r(b)); }
    for (const f of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), select, textarea')) { if (!vis(f) || skipped(f) || f.closest('table, .xls, .wb, .flow, .seg')) continue; const v = r(f); if (v < 9 || v > 15) { if (!(f.type === 'search' && v >= 14)) add('d-field-radius', f, 'radius ' + v); } if (parseFloat(getComputedStyle(f).fontSize) < 12.5) add('d-field-font', f, getComputedStyle(f).fontSize); }
    for (const c of document.querySelectorAll('.card')) { if (!vis(c) || skipped(c)) continue; const v = r(c); if (v < 17 || v > 22) add('d-card-radius', c, 'radius ' + v); }
    return out;
  };
})();
