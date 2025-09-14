;(function(){
  'use strict';
  console.log('[DBG] validation.js starting');

  const workerUrl = 'https://restless-lab-b579.amcham.workers.dev/';
  const formId    = '252484373306054';
  const fields = [
    { id: 'input_3',  errId: 'id_92', flag: 'emailExists'      },
    { id: 'input_38', errId: 'id_93', flag: 'personalIdExists'},
    { id: 'input_53', errId: 'id_94', flag: 'studentIdExists' }
  ];

  function clearDefaultErrors() {
    console.log('[DBG] clearDefaultErrors()');
    fields.forEach(f => {
      const inp = document.getElementById(f.id);
      const li  = inp?.closest('li.form-line');
      if (!li) return console.log('[DBG]  skip clear for', f.id);
      li.classList.remove('form-line-error');
      inp.classList.remove('form-validation-error');
      li.querySelectorAll('.form-error-message').forEach(el => el.remove());
    });
  }

  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log('[DBG] debounce fired');
        fn(...args);
      }, ms);
    };
  }

  function showDuplicateError(f, show) {
    console.log('[DBG] showDuplicateError()', f.id, 'show=', show);
    const inp = document.getElementById(f.id);
    const li  = inp?.closest('li.form-line');
    if (!li) return console.warn('[DBG] no field container for', f.id);

    const boxId = 'dup-error-' + f.id;
    let box = document.getElementById(boxId);

    if (show) {
      if (!box) {
        box = document.createElement('div');
        box.id = boxId;
        box.className = 'form-error-message fade-in';
        inp.insertAdjacentElement('afterend', box);
        console.log('[DBG] created error box for', f.id);
      }
      const msg = document.getElementById(f.errId)?.innerText.trim() || 'Duplicate entry';
      box.textContent = msg;
      li.classList.add('form-line-error');
      inp.classList.add('form-validation-error');
    } else if (box) {
      box.remove();
      li.classList.remove('form-line-error');
      inp.classList.remove('form-validation-error');
      console.log('[DBG] removed error box for', f.id);
    }
  }

  function toggleAction(disabled) {
    console.log('[DBG] toggleAction(', disabled, ')');
    document.querySelectorAll(
      '.form-pagebreak-next, button[type="submit"], input[type="submit"]'
    ).forEach(btn => {
      if (btn.offsetParent !== null) {
        btn.disabled = disabled;
        console.log('[DBG] button', btn, 'disabled=', disabled);
      }
    });
  }

  async function runValidation() {
    console.log('[DBG] runValidation() start');
    const visible = fields.filter(f => {
      const inp = document.getElementById(f.id);
      const ok = inp && inp.offsetParent !== null;
      console.log('[DBG]  field', f.id, 'visible=', ok);
      return ok;
    });

    if (visible.length === 0) {
      console.log('[DBG]  no visible fields → clear errors & enable');
      fields.forEach(f => showDuplicateError(f, false));
      toggleAction(false);
      return;
    }

    const payload = visible.reduce((acc, f) => {
      const v = document.getElementById(f.id).value.trim();
      acc[f.flag.replace(/Exists$/, '')] = v;
      console.log('[DBG]  payload', f.flag, '=', v);
      return acc;
    }, {});

    if (Object.values(payload).every(v => !v)) {
      console.log('[DBG]  all values empty → show none & disable next');
      visible.forEach(f => showDuplicateError(f, false));
      toggleAction(true);
      return;
    }

    console.log('[DBG]  fetching worker with', payload);
    let result = {};
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('[DBG]  worker response status', res.status);
      result = await res.json();
      console.log('[DBG]  worker response JSON', result);
    } catch (err) {
      console.error('[DBG]  fetch error', err);
      toggleAction(true);
      return;
    }

    let hasError = false;
    visible.forEach(f => {
      const exists = !!result[f.flag];
      console.log('[DBG]  duplicate?', f.flag, exists);
      showDuplicateError(f, exists);
      if (exists) hasError = true;
    });
    toggleAction(hasError);
    console.log('[DBG] runValidation() end → hasError=', hasError);
  }

  const debouncedRun = debounce(runValidation, 300);

  function attachListeners() {
    console.log('[DBG] attachListeners()');
    document.body.addEventListener('input', e => {
      if (fields.some(f => f.id === e.target.id)) {
        console.log('[DBG] input detected on', e.target.id);
        debouncedRun();
      }
    });
    document.body.addEventListener('blur', e => {
      if (fields.some(f => f.id === e.target.id)) {
        console.log('[DBG] blur detected on', e.target.id);
        runValidation();
      }
    }, true);
    document.body.addEventListener('click', e => {
      if (e.target.closest('.form-pagebreak-next, button[type="submit"], input[type="submit"]')) {
        console.log('[DBG] next/submit clicked');
        setTimeout(runValidation, 0);
      }
    });

    fields.forEach(f => {
      const inp = document.getElementById(f.id);
      if (!inp) return console.warn('[DBG] no input for paste/keypress on', f.id);

      inp.addEventListener('keypress', e => {
        if (e.key === ' ') {
          e.preventDefault();
          console.log('[DBG] blocked space on', f.id);
        }
      });
      inp.addEventListener('paste', () => {
        setTimeout(() => {
          const before = inp.value;
          inp.value = before.replace(/\s+/g, '');
          console.log('[DBG] stripped whitespace on paste for', f.id,
                      'before=', before, 'after=', inp.value);
        }, 0);
      });
    });
  }

  // Auto-resize
  window.addEventListener('message', e => {
    if (e.origin.includes('jotform') && (e.data.type === 'setHeight' || e.data.height)) {
      const h = e.data.height || e.data.messages?.setHeight;
      console.log('[DBG] postMessage from jotform → height=', h);
      const iframe = document.getElementById('JotFormIFrame-' + formId);
      if (iframe) {
        iframe.style.height = h + 'px';
        console.log('[DBG] iframe height set to', h);
      } else {
        console.warn('[DBG] iframe not found for auto-resize');
      }
    }
  });

  // Wait for form DOM to be ready
  function waitForForm() {
    console.log('[DBG] waitForForm() start');
    const obs = new MutationObserver((muts, o) => {
      if (fields.every(f => document.getElementById(f.id))) {
        console.log('[DBG] form fields detected, initializing');
        o.disconnect();
        clearDefaultErrors();
        attachListeners();
        runValidation();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  waitForForm();
})();
