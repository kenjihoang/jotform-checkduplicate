;(function(){
  'use strict';

  const workerUrl = 'https://restless-lab-b579.amcham.workers.dev/';
  const fields = [
    { id: 'input_3',  errId: 'id_92', flag: 'emailExists'      },
    { id: 'input_38', errId: 'id_93', flag: 'personalIdExists'},
    { id: 'input_53', errId: 'id_94', flag: 'studentIdExists' }
  ];

  // 1) Xóa lỗi đỏ mặc định của JotForm trên các field track
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

  // 2) Debounce helper
  function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // 3) Hiển thị/ẩn lỗi duplicate giống hệt required
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
      const txt = document.getElementById(f.errId)?.innerText.trim() || 'Duplicate entry';
      box.textContent = txt;
      li.classList.add('form-line-error');
      inp.classList.add('form-validation-error');
    } else if (box) {
      box.remove();
      li.classList.remove('form-line-error');
      inp.classList.remove('form-validation-error');
    }
  }

  // 4) Enable/disable Next & Submit
  function toggleAction(disabled) {
    document.querySelectorAll(
      '.form-pagebreak-next, button[type="submit"], input[type="submit"]'
    ).forEach(btn => {
      if (btn.offsetParent !== null) btn.disabled = disabled;
    });
  }

  // 5) Chạy kiểm tra duplicate
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

  // 6) Gắn listener & block space
  function attachListeners() {
    // input debounce
    document.body.addEventListener('input', e => {
      if (fields.some(f => f.id === e.target.id)) debouncedRun();
    });
    // blur (khi click ra ngoài)
    document.body.addEventListener('blur', e => {
      if (fields.some(f => f.id === e.target.id)) runValidation();
    }, true);
    // Next/Submit click
    document.body.addEventListener('click', e => {
      if (e.target.closest('.form-pagebreak-next, button[type="submit"], input[type="submit"]')) {
        setTimeout(runValidation, 0);
      }
    });

    // chặn space & strip khoảng trắng khi paste cho cả 3 field
    fields.forEach(f => {
      const inp = document.getElementById(f.id);
      if (inp) {
        inp.addEventListener('keypress', e => {
          if (e.key === ' ') e.preventDefault();
        });
        inp.addEventListener('paste', () => {
          setTimeout(() => {
            inp.value = inp.value.replace(/\s+/g, '');
          }, 0);
        });
      }
    });
  }

  // 7) Khởi chạy khi form render xong
  document.addEventListener('DOMContentLoaded', () => {
    const mo = new MutationObserver((_, obs) => {
      if (fields.every(f => document.getElementById(f.id))) {
        obs.disconnect();
        clearDefaultErrors();
        attachListeners();
        runValidation();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  });

  // -- Hàm init chỉ chạy khi form đã hiện đủ các field --
  function initWhenReady() {
    const f3 = document.getElementById('input_3');
    const f38 = document.getElementById('input_38');
    const f53 = document.getElementById('input_53');
    if (f3 && f38 && f53) {
      clearDefaultErrors();
      attachListeners();
      runValidation();
    } else {
      // nếu chưa xong, thử lại sau 100ms
      setTimeout(initWhenReady, 100);
    }
  }

  // Khởi động polling
  initWhenReady();

window.addEventListener("message", function(e) {
    if (e.origin.indexOf("jotform") > -1 && e.data.type === "setHeight") {
      const id = "JotFormIFrame-" + 252484373306054;
      const iframe = document.getElementById(id);
      if (iframe) {
        iframe.style.height = e.data.height + "px";
      }
    }
  }, false);

})();
