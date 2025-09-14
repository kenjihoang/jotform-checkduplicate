;(function(){
  'use strict';

  // ==== CẤU HÌNH ====
  const workerUrl = 'https://restless-lab-b579.amcham.workers.dev/';
  const formId    = '252484373306054';  // chỉ số form, ví dụ '123456789012345'
  const fields = [
    { id: 'input_3',  errId: 'id_92', flag: 'emailExists'      },
    { id: 'input_38', errId: 'id_93', flag: 'personalIdExists'},
    { id: 'input_53', errId: 'id_94', flag: 'studentIdExists' }
  ];

  // ==== HỖ TRỢ UI ====
  function clearDefaultErrors() {
    fields.forEach(f => {
      const inp = document.getElementById(f.id);
      const li  = inp?.closest('li.form-line');
      if (!li || !inp) return;
      li.classList.remove('form-line-error');
      inp.classList.remove('form-validation-error');
      li.querySelectorAll('.form-error-message').forEach(el => el.remove());
    });
  }

  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function showDuplicateError(f, show) {
    const inp = document.getElementById(f.id);
    const li  = inp?.closest('li.form-line');
    if (!li || !inp) return;

    const boxId = 'dup-error-' + f.id;
    let box = document.getElementById(boxId);

    if (show) {
      if (!box) {
        box = document.createElement('div');
        box.id = boxId;
        box.className = 'form-error-message fade-in';
        inp.insertAdjacentElement('afterend', box);
      }
      const msg = document.getElementById(f.errId)?.innerText.trim() || 'Duplicate entry';
      box.textContent = msg;
      li.classList.add('form-line-error');
      inp.classList.add('form-validation-error');
    } else if (box) {
      box.remove();
      li.classList.remove('form-line-error');
      inp.classList.remove('form-validation-error');
    }
  }

  function toggleAction(disabled) {
    document.querySelectorAll(
      '.form-pagebreak-next, button[type="submit"], input[type="submit"]'
    ).forEach(btn => {
      if (btn.offsetParent !== null) btn.disabled = disabled;
    });
  }

  // ==== XỬ LÝ VALIDATION & DUPLICATE-CHECK ====
  async function runValidation() {
    const visible = fields.filter(f => {
      const inp = document.getElementById(f.id);
      return inp && inp.offsetParent !== null;
    });

    if (visible.length === 0) {
      fields.forEach(f => showDuplicateError(f, false));
      toggleAction(false);
      return;
    }

    const payload = visible.reduce((acc, f) => {
      acc[f.flag.replace(/Exists$/, '')] = document.getElementById(f.id).value.trim();
      return acc;
    }, {});

    if (Object.values(payload).every(v => !v)) {
      visible.forEach(f => showDuplicateError(f, false));
      toggleAction(true);
      return;
    }

    let result = {};
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      result = await res.json();
    } catch {
      toggleAction(true);
      return;
    }

    let hasError = false;
    visible.forEach(f => {
      const exists = !!result[f.flag];
      showDuplicateError(f, exists);
      if (exists) hasError = true;
    });
    toggleAction(hasError);
  }

  const debouncedRun = debounce(runValidation, 300);

  // ==== GẮN LISTENER ====
  function attachListeners() {
    // debounce on input
    document.body.addEventListener('input', e => {
      if (fields.some(f => f.id === e.target.id)) debouncedRun();
    });
    // blur → validate
    document.body.addEventListener('blur', e => {
      if (fields.some(f => f.id === e.target.id)) runValidation();
    }, true);
    // next/submit click
    document.body.addEventListener('click', e => {
      if (e.target.closest('.form-pagebreak-next, button[type="submit"], input[type="submit"]')) {
        setTimeout(runValidation, 0);
      }
    });

    // block Space + strip whitespace on paste
    fields.forEach(f => {
      const inp = document.getElementById(f.id);
      if (!inp) return;
      inp.addEventListener('keypress', e => {
        if (e.key === ' ') e.preventDefault();
      });
      inp.addEventListener('paste', () => {
        setTimeout(() => {
          inp.value = inp.value.replace(/\s+/g, '');
        }, 0);
      });
    });
  }

  // ==== AUTO-RESIZE JOTFORM IFRAME ====
  window.addEventListener('message', function(e) {
    if (
      typeof e.data === 'object' &&
      e.origin.includes('jotform') &&
      (e.data.type === 'setHeight' || e.data.height)
    ) {
      const h = e.data.height || e.data.messages?.setHeight;
      const iframe = document.getElementById('JotFormIFrame-' + formId);
      if (iframe && h && !isNaN(h)) {
        iframe.style.height = h + 'px';
      }
    }
  }, false);

  // ==== KHỞI CHẠY KHI FORM SẴN SÀNG ====
  function initWhenReady() {
    if (fields.every(f => document.getElementById(f.id))) {
      clearDefaultErrors();
      attachListeners();
      runValidation();
    } else {
      setTimeout(initWhenReady, 100);
    }
  }

  initWhenReady();

})();
