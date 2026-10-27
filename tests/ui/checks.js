// In-page geometry and semantics checks for the UI audit. Injected with page.addInitScript; call window.__uiAudit(scope).
// Each finding: { rule, sig (stable selector signature), text, detail }.
(function () {
  const vis = el => { if (!el.isConnected) return false; if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true, opacityProperty: true })) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  // how many lines one text node of an element occupies (the label itself wrapping, not stacked child blocks)
  const textLines = el => { let max = 1; for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); const tops = new Set([...rg.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top))); max = Math.max(max, tops.size); } return max; };
  const visibleRect = el => { const r = el.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom; for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) { const q = p.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } } return { left: L, top: T, right: R, bottom: B }; };
  const pinnedEl = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'sticky' || ps === 'fixed') return p; } return null; };
  const pinned = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'sticky' || ps === 'fixed') return true; } return false; };
  const sig = el => { const parts = []; let e = el; for (let i = 0; e && e !== document.body && i < 4; i++, e = e.parentElement) { let s = e.tagName.toLowerCase(); const c = [...e.classList].filter(x => !/^(on|active|open|in|mk|show)$/.test(x)).slice(0, 2); if (c.length) s += '.' + c.join('.'); if (e.id && !/\d{3,}/.test(e.id)) s += '#' + e.id; parts.unshift(s); } return parts.join(' > '); };
  const txt = el => (el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const CLICK = 'button, a[href], [data-act], [onclick], [role=button], [role=tab], [role=menuitem], summary, input[type=checkbox], input[type=radio], select';
  function inViewport(el) { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight * 6; }
  window.__uiAudit = function (scopeSel) {
    const scope = scopeSel ? document.querySelector(scopeSel) || document.body : document.body; const out = []; const add = (rule, el, detail) => out.push({ rule, sig: sig(el), text: txt(el), detail: detail || '' });
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push({ rule: 'page-hscroll', sig: 'html', text: '', detail: `${de.scrollWidth} > ${de.clientWidth}` });
    // elements wider than the viewport that are not inside a scroll container
    const all = [...scope.querySelectorAll('*')].filter(e => !(e instanceof SVGElement) || e.tagName === 'svg');
    const scrollParent = el => { for (let p = el.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return p; } return null; };
    for (const el of all) {
      if (!vis(el) || !inViewport(el)) continue; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (r.right > de.clientWidth + 2 && cs.position !== 'fixed' && !scrollParent(el)) add('overflow-viewport', el, `right ${Math.round(r.right)} > ${de.clientWidth}`);
      // clipped text: a text-bearing element whose content is wider/taller than its box and is cut without an ellipsis
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (hasText && r.width > 2 && !el.closest('.paper') && !/^(TEXTAREA|INPUT|SELECT|OPTION|SCRIPT|STYLE|PRE|CODE)$/.test(el.tagName)) {
        const clipX = el.scrollWidth > el.clientWidth + 2 && /(hidden|clip)/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis';
        const clipY = el.scrollHeight > el.clientHeight + 3 && /(hidden|clip)/.test(cs.overflowY) && !/-webkit-box/.test(cs.display) && el.clientHeight > 0 && !cs.webkitLineClamp?.match(/\d/);
        if (clipX || clipY) add('text-clipped', el, `${clipX ? 'x' : ''}${clipY ? 'y' : ''} scroll ${el.scrollWidth}x${el.scrollHeight} box ${el.clientWidth}x${el.clientHeight}`);
        const fs = parseFloat(cs.fontSize); if (fs < 11 && el.innerText.trim().length > 2) add('text-tiny', el, fs + 'px');
        // characters squeezed: line-height smaller than the font size cuts descenders on wrapped text
        const lh = parseFloat(cs.lineHeight); if (lh && lh < fs * 1.1 && textLines(el) > 1) add('text-crushed', el, `line-height ${lh} for ${fs}px, ${textLines(el)} lines`);
      }
    }
    // controls: semantics and look
    const ctrls = [...scope.querySelectorAll(CLICK)].filter(e => vis(e) && inViewport(e));
    for (const el of ctrls) {
      const tag = el.tagName; const role = el.getAttribute('role'); const cs = getComputedStyle(el);
      if ((el.hasAttribute('data-act') || el.hasAttribute('onclick')) && !/^(BUTTON|A|INPUT|SELECT|SUMMARY|LABEL|TEXTAREA|OPTION)$/.test(tag) && !role && !(/^(TR|TD|TH)$/.test(tag) && el.tabIndex >= 0)) add('click-nonsemantic', el, tag.toLowerCase());
      if ((el.hasAttribute('data-act') || role === 'button') && !/^(BUTTON|A|INPUT|SELECT|SUMMARY|TEXTAREA)$/.test(tag) && el.tabIndex < 0) add('click-no-keyboard', el, tag.toLowerCase());
      if (tag === 'BUTTON' || tag === 'A' || el.hasAttribute('data-act')) {
        const bg = cs.backgroundColor, bd = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth), ul = /underline/.test(cs.textDecorationLine), ptr = cs.cursor === 'pointer';
        const parentColor = el.parentElement ? getComputedStyle(el.parentElement).color : '';
        const plain = !/^(TR|TD|LI)$/.test(tag) && !el.matches('.dr-bar, .fn-row, .list-item') && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && bd === 0 && !ul && cs.color === parentColor && !el.querySelector('svg,img,.fi') && el.innerText.trim().length > 1 && !el.closest('.sidebar, .adm-nav, .tabs, .dtabs, .seg, .popover, #userPop, .um-i, .tbl th, nav, [role=tablist], [role=menu]');
        if (plain) add('action-looks-like-text', el, ptr ? 'pointer' : 'no-pointer');
        if (!ptr && !el.disabled && cs.pointerEvents !== 'none' && tag !== 'A') add('no-pointer-cursor', el, '');
        if (tag === 'BUTTON' && !el.innerText.trim() && !el.getAttribute('aria-label') && !el.title) add('icon-no-label', el, '');
        // a button or tab label that wraps onto two lines
        if (el.matches('.btn, .hm-btn, .tab, .dtab, [role=tab], .fchip, .seg button, .um-i, .sb-out, .rgdd-btn') && textLines(el) > 1) add('button-wraps', el, `${Math.round(el.getBoundingClientRect().height)}px tall`);
      }
    }
    // buttons off the size scale (sizes come from the shared variants: 32 compact, 36 standard, 40 prominent)
    for (const b of scope.querySelectorAll('.btn, .hm-btn')) { if (!vis(b) || !inViewport(b) || b.closest('.auth-box, .cn, .xe-tb, .wb-tb')) continue; const h = Math.round(b.getBoundingClientRect().height); if (![28, 30, 32, 34, 36, 40].includes(h)) add('button-off-scale', b, h + 'px'); }
    // form fields that do not fill their grid cell, and headings forced to capitals
    for (const f of scope.querySelectorAll('.fgrid input:not([type=checkbox]):not([type=radio]):not([type=file]), .fgrid select, .fgrid textarea, .afld input, .afld select')) { if (!vis(f)) continue; const cell = f.parentElement; const w = f.getBoundingClientRect().width, cw = cell.getBoundingClientRect().width; if (cw > 120 && w < cw * 0.9 && getComputedStyle(cell).display !== 'flex') add('input-narrow', f, `${Math.round(w)} of ${Math.round(cw)}`); }
    for (const h of scope.querySelectorAll('h1, h2, h3, .dialog-h')) { if (vis(h) && getComputedStyle(h).textTransform === 'uppercase') add('heading-uppercase', h, ''); }
    // action groups: buttons that sit side by side in one row should share a height and vertical centre
    const btnSel = 'button.btn, a.btn, .btn[data-act], button.hm-btn';
    const parents = new Set([...scope.querySelectorAll(btnSel)].filter(vis).map(b => b.parentElement));
    for (const p of parents) {
      const bs = [...p.children].filter(c => c.matches(btnSel) && vis(c)); if (bs.length < 2) continue;
      const rows = {}; for (const b of bs) { const r = b.getBoundingClientRect(); const k = Math.round((r.top + r.height / 2) / 10); (rows[k] = rows[k] || []).push({ b, r }); }
      for (const row of Object.values(rows)) { if (row.length < 2) continue; const hs = row.map(x => Math.round(x.r.height)); const mx = Math.max(...hs), mn = Math.min(...hs); const cs = row.map(x => x.r.top + x.r.height / 2); if (mx - mn > 2) add('group-height-mismatch', p, hs.join('/') + ' · ' + row.map(x => txt(x.b)).join(' | ')); else if (Math.max(...cs) - Math.min(...cs) > 2) add('group-misaligned', p, row.map(x => txt(x.b)).join(' | ')); }
    }
    // overlapping controls and labels (siblings drawn on top of each other)
    const modal = [...document.querySelectorAll('.scrim, [aria-modal=true]')].filter(vis).pop(); const oscope = modal || scope;
    const boxes = [...oscope.querySelectorAll('button, input, select, textarea, label, .btn, .tag, h1, h2, h3, h4')].filter(e => vis(e) && inViewport(e) && !e.closest('.popover, #userPop') && !e.closest('.cn, .auth-art, svg, .lsx, .switch')).map(e => ({ e, r: visibleRect(e) })).filter(x => x.r.right - x.r.left > 1 && x.r.bottom - x.r.top > 1);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (!modal && pinnedEl(a.e) !== pinnedEl(b.e)) continue; // content scrolling under a sticky bar is not an overlap
      if (ox > 4 && oy > 4) { const la = a.e.tagName === 'LABEL' && (a.e.control === b.e || a.e.htmlFor && a.e.htmlFor === b.e.id), lb = b.e.tagName === 'LABEL' && b.e.control === a.e; if (la || lb) continue; add('overlap', a.e, 'with ' + sig(b.e) + ' "' + txt(b.e) + '"'); }
    }
    // dialogs and drawers: fit in the viewport, footer never covers the body
    for (const d of document.querySelectorAll('.drawer, .dialog, [role=dialog]')) {
      if (!vis(d)) continue; const r = d.getBoundingClientRect();
      if (r.bottom > innerHeight + 1 || r.top < -1 || r.right > innerWidth + 1 || r.left < -1) add('dialog-offscreen', d, `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      const sc = [...d.querySelectorAll('*')].filter(e => { if (e.tagName === 'TEXTAREA') return false; const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2; }); if (sc.length > 1) add('nested-scroll', d, sc.map(sig).join(' || '));
    }
    return out;
  };
})();
