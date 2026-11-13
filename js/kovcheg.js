// Ковчег site runtime: renders a page written in the .dc.html template format
// ({{holes}}, <sc-for>, <sc-if>, onClick) with a small component class per page.
// Pages exported for the web keep their markup in <template id="x-dc"> so placeholder
// image paths are never requested; the canvas preview server still serves <x-dc>.
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); window.__dcRender(); }
  }
  window.DCLogic = DCLogic;
  const get = (scope, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  const hole = /^\s*\{\{\s*([\w.]+)\s*\}\}\s*$/;
  const interp = (s, scope) => s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => { const v = get(scope, p); return v == null ? '' : v; });
  // SVG-safe clone-and-fill: walk a cloned tree instead of creating elements by name
  function fill(src, scope, parent) {
    for (const node of Array.from(src.childNodes)) {
      if (node.nodeType === 3) { parent.appendChild(document.createTextNode(interp(node.nodeValue, scope))); continue; }
      if (node.nodeType !== 1) continue;
      const tag = node.localName;
      if (tag === 'sc-for') {
        const m = (node.getAttribute('list') || '').match(hole); const list = m ? get(scope, m[1]) : [];
        const as = node.getAttribute('as');
        (list || []).forEach((it, i) => fill(node, Object.assign(Object.create(scope), { [as]: it }), parent));
        continue;
      }
      if (tag === 'sc-if') {
        const m = (node.getAttribute('value') || '').match(hole);
        if (m && get(scope, m[1])) fill(node, scope, parent);
        continue;
      }
      const el = node.cloneNode(false);
      for (const a of Array.from(el.attributes)) {
        if (a.name.startsWith('hint-')) { el.removeAttribute(a.name); continue; }
        if (/^on/i.test(a.name)) {
          const m = a.value.match(hole); el.removeAttribute(a.name);
          const fn = m && get(scope, m[1]);
          if (typeof fn === 'function') el.addEventListener(a.name.slice(2).toLowerCase(), fn);
          else console.warn('DC: handler missing', a.name, a.value);
          continue;
        }
        if (a.value.includes('{{')) el.setAttribute(a.name, interp(a.value, scope));
      }
      parent.appendChild(el);
      fill(node.localName === 'template' ? node.content : node, scope, el);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const x = document.querySelector('template#x-dc') || document.querySelector('x-dc');
    const tpl = document.createElement('template'); tpl.innerHTML = x.innerHTML;
    const helmet = tpl.content.querySelector('helmet');
    if (helmet) { document.head.insertAdjacentHTML('beforeend', helmet.innerHTML); helmet.remove(); }
    const host = document.createElement('div'); x.replaceWith(host);
    const code = document.querySelector('script[type="text/x-dc"]').textContent;
    const Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
    const c = new Component({});
    window.__dc = c;
    window.__dcRender = () => {
      const y = window.scrollY; const frag = document.createDocumentFragment();
      // keep what the visitor typed: re-rendering rebuilds the page
      const kept = {};
      host.querySelectorAll('input[id],select[id],textarea[id]').forEach(el => { kept[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
      const act = document.activeElement && document.activeElement.id;
      try { fill(tpl.content, c.renderVals(), frag); } catch (e) { console.error('DC render error', e); throw e; }
      host.replaceChildren(frag);
      for (const id in kept) { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = kept[id]; else el.value = kept[id]; } }
      if (act) { const el = document.getElementById(act); if (el && el.focus) el.focus({ preventScroll: true }); }
      window.scrollTo(0, y);
    };
    window.__dcRender();
    if (c.componentDidMount) c.componentDidMount();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
    document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a && a.getAttribute('href').length > 1) { const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) { e.preventDefault(); t.scrollIntoView(); } } });
  });
})();
