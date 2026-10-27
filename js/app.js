(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var VALID = {
    '2': /^[01]+$/i,
    '8': /^[0-7]+$/i,
    '10': /^[0-9]+$/i,
    '16': /^[0-9a-f]+$/i
  };
  var NAME = { '2': 'Binary', '8': 'Octal', '10': 'Decimal', '16': 'Hex' };
  var BASES = ['2', '8', '10', '16'];

  function stripPrefix(v) {
    var s = String(v).trim();
    if (/^0x/i.test(s)) return s.slice(2);
    if (/^0b/i.test(s)) return s.slice(2);
    if (/^0o/i.test(s)) return s.slice(2);
    return s;
  }

  function parseToDecimal(digits, base) {
    var val = 0;
    for (var i = 0; i < digits.length; i++) {
      var c = digits[i].toUpperCase();
      var d = c >= 'A' ? c.charCodeAt(0) - 55 : c.charCodeAt(0) - 48;
      val = val * base + d;
    }
    return val;
  }

  function toAnyBase(value, base) {
    if (base === 10) return String(value);
    var out = [];
    while (value > 0) { out.push(value % base); value = Math.floor(value / base); }
    if (out.length === 0) out.push(0);
    out.reverse();
    var map = '0123456789ABCDEF';
    var s = '';
    for (var i = 0; i < out.length; i++) s += map[out[i]];
    return s;
  }

  function conv(v, base, upper) {
    var dec = parseToDecimal(v, base);
    var res = {};
    BASES.forEach(function (b) {
      res[b] = (b === 16 && !upper) ? toAnyBase(dec, b).toLowerCase() : toAnyBase(dec, b);
      if (b === 10) res[b] = String(dec);
    });
    res._dec = dec;
    return res;
  }

  function state() {
    var src = $('src-base').value;
    var tgt = $('tgt-base').value;
    var raw = $('val-input').value;
    return { src: src, tgt: tgt, raw: raw };
  }

  function updateTags() {
    var s = state();
    $('src-tag').textContent = NAME[s.src].toUpperCase() + ' \u00b7 ' + s.src;
    $('tgt-tag').textContent = NAME[s.tgt].toUpperCase() + ' \u00b7 ' + s.tgt;
  }

  function hexCase() {
    var btn = $('case-btn');
    return btn && btn.textContent.indexOf('LOWER') === 0 ? false : true;
  }

  function render(st) {
    var base = st.src;
    var raw = st.raw;
    var cleaned = stripPrefix(raw).replace(/[^0-9a-fA-F]/g, '');

    // strip chars not valid for source base
    var allowed = { '2':'01','8':'01234567','10':'0123456789','16':'0123456789abcdefABCDEF' }[base];
    var digits = '';
    for (var i = 0; i < cleaned.length; i++) if (allowed.indexOf(cleaned[i]) !== -1) digits += cleaned[i];

    if (digits.length === 0) {
      ['o-bin','o-oct','o-dec','o-hex'].forEach(function (id) { $(id).textContent = '\u2014'; });
      $('val-result').value = '';
      $('err-hint').textContent = 'Enter a valid ' + NAME[base].toLowerCase() + ' value.';
      $('digits').textContent = '0'; $('width').textContent = '0'; $('signed').textContent = '0';
      showSteps(null);
      return;
    }

    var upper = hexCase();
    var res = conv(digits.toUpperCase(), base, upper);
    var srcRep = (base === 16 && !upper) ? digits.toLowerCase() : digits.toUpperCase();
    var tgtOut = res[st.tgt];
    if (st.tgt === 16 && !upper) tgtOut = tgtOut.toLowerCase();

    $('val-result').value = tgtOut;

    $('o-bin').textContent = res['2'];
    $('o-oct').textContent = res['8'];
    $('o-dec').textContent = res['10'];
    $('o-hex').textContent = res['16'];

    var dec = res._dec;
    var bits = dec === 0 ? 1 : Math.floor(Math.log2(dec)) + 1;
    $('digits').textContent = digits.length;
    $('width').textContent = bits;
    var sgn = (dec >> (bits > 0 ? bits - 1 : 0)) & 1 ? 'negative \u03c0-ish' : '';
    $('signed').textContent = dec >= 2147483648 ? 'outside 32-bit' : 'fits 32-bit';
    $('err-hint').textContent = 'Converted ' + NAME[base] + ' \u2192 ' + NAME[st.tgt] + ' in real time.';
    showSteps({ base: base, digits: srcRep, dec: dec, res: res, tgt: st.tgt, upper: upper });
  }

  function showSteps(info) {
    var box = $('steps');
    var empty = $('steps-empty');
    if (!info) { empty.style.display = ''; box.innerHTML = ''; return; }
    empty.style.display = 'none';
    var b = info.base;
    var dec = info.dec;
    var parts = [];
    parts.push('<div class="steps-head"><b>Step 1 \u2014 Expand to decimal</b><span>each digit by its place value</span></div>');
    var expand = '';
    var digitsUp = info.digits.toUpperCase();
    for (var j = 0; j < digitsUp.length; j++) {
      var d2 = digitsUp[j];
      var place2 = Math.pow(b, digitsUp.length - 1 - j);
      expand += (j ? ' + ' : '') + d2 + '\u00d7' + place2;
    }
    expand += ' = <strong>' + dec + '</strong>';
    parts.push('<div class="formula">' + NAME[b] + ' ' + digitsUp + ' \u2192 ' + expand + '</div>');

    parts.push('<div class="steps-head"><b>Step 2 \u2014 Re-encode in every base</b><span>decimal value ' + dec + '</span></div>');
    BASES.forEach(function (bb) {
      var out = info.res[bb];
      if (bb === 16 && !info.upper) out = out.toLowerCase();
      parts.push('<div class="formula">' + NAME[bb] + ' <strong>' + out + '</strong></div>');
    });
    box.innerHTML = parts.join('');
  }

  function run() {
    updateTags();
    render(state());
  }

  function copyText(txt, btn) {
    if (!txt) return;
    var done = function () {
      if (btn) { var old = btn.textContent; btn.textContent = '\u2713'; setTimeout(function () { btn.textContent = old; }, 900); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallback(txt); done(); });
    } else { fallback(txt); done(); }
  }
  function fallback(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // Events
  $('val-input').addEventListener('input', run);
  ['src-base','tgt-base'].forEach(function (id) { $(id).addEventListener('change', run); });
  $('swap-btn').addEventListener('click', function () {
    var s = state();
    $('src-base').value = s.tgt;
    $('tgt-base').value = s.src;
    run();
  });
  $('clear-btn').addEventListener('click', function () {
    $('val-input').value = ''; run();
  });
  $('case-btn').addEventListener('click', function () {
    var upper = hexCase();
    $('case-btn').textContent = upper ? 'lowercase' : 'UPPERCASE';
    run();
  });
  $('copy-result').addEventListener('click', function () { copyText($('val-result').value, this); });
  document.querySelectorAll('.mini-copy').forEach(function (b) {
    b.addEventListener('click', function () { copyText($(b.getAttribute('data-copy')).textContent, b); });
  });

  // Theme toggle
  var themeBtn = $('theme-toggle');
  var savedTheme = (function () { try { return localStorage.getItem('theme'); } catch (e) { return null; } })();
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    try { localStorage.setItem('theme', cur); } catch (e) {}
  });


  // Mobile menu
  var navMenu = $('nav-menu');
  var yr = $('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Init
  $('case-btn').textContent = 'UPPERCASE';
  run();
})();
/* nav variant: accordion-js */
(function(){var b=document.getElementById('hh-bars'),s=document.getElementById('hh-sheet');if(!b||!s)return;function setOpen(v){if(v)s.removeAttribute('hidden');else s.setAttribute('hidden','');b.setAttribute('aria-expanded',String(v));}b.addEventListener('click',function(e){e.stopPropagation();setOpen(b.getAttribute('aria-expanded')!=='true');});s.addEventListener('click',function(e){if(e.target===s){setOpen(false);return;}var a=e.target.closest('a');if(a)setOpen(false);var h=e.target.closest('.hh-acch');if(h){var open=h.getAttribute('aria-expanded')==='true';h.setAttribute('aria-expanded',String(!open));var body=h.nextElementSibling;if(open)body.setAttribute('hidden','');else body.removeAttribute('hidden');}});document.addEventListener('click',function(e){if(b.getAttribute('aria-expanded')==='true'&&!s.contains(e.target)&&!b.contains(e.target))setOpen(false);});document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false);});})();

/* nav variant: overlay-unify-close */
(function(){var p=document.getElementById('hh-sheet');if(!p)return;if(p.parentNode!==document.body)document.body.appendChild(p);p.addEventListener('click',function(e){if(e.target===p)p.setAttribute('hidden','');});})();