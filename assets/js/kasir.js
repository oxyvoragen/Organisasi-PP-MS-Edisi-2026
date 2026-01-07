// kasir.js
// Logika kasir percetakan: tambah transaksi, simpan di localStorage, tampilkan recap, ekspor CSV.
// Menggunakan anime.js bila tersedia untuk efek sederhana.

document.addEventListener('DOMContentLoaded', () => {
  const storageKey = 'op3_transactions_v1';
  const txForm = document.getElementById('txForm');
  const buyerEl = document.getElementById('buyer');
  const dateEl = document.getElementById('date');
  const serviceEl = document.getElementById('service');
  const pagesEl = document.getElementById('pages');
  const unitPriceEl = document.getElementById('unitPrice');
  const discountEl = document.getElementById('discount');
  const notesEl = document.getElementById('notes');
  const subtotalEl = document.getElementById('subtotal');

  const txBody = document.getElementById('txBody');
  const txCount = document.getElementById('txCount');
  const grandTotalEl = document.getElementById('grandTotal');
  const btnExport = document.getElementById('btnExport');
  const btnClearAll = document.getElementById('btnClearAll');
  const filterDate = document.getElementById('filterDate');

  // helper: format currency (IDR)
  function formatIDR(n) {
    return 'Rp ' + Number(n).toLocaleString('id-ID');
  }

  // compute subtotal based on inputs
  function computeSubtotal() {
    const qty = Number(pagesEl.value) || 0;
    const unit = Number(unitPriceEl.value) || 0;
    const disc = Number(discountEl.value) || 0;
    const total = Math.max(0, qty * unit - disc);
    subtotalEl.textContent = formatIDR(total);
    return total;
  }

  // load/save
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Gagal memuat transaksi:', e);
      return [];
    }
  }

  function saveTransactions(list) {
    localStorage.setItem(storageKey, JSON.stringify(list));
  }

  // render table (optionally filtered by date)
  function renderTable(filter = null) {
    const list = loadTransactions();
    let filtered = list;
    if (filter) {
      filtered = list.filter(tx => tx.date === filter);
    }

    txBody.innerHTML = '';
    let grandTotal = 0;
    filtered.forEach((tx, idx) => {
      grandTotal += tx.total;
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-800/40';
      tr.innerHTML = `
        <td class="px-3 py-2 align-top">${idx + 1}</td>
        <td class="px-3 py-2 align-top">${tx.date}</td>
        <td class="px-3 py-2 align-top">${escapeHtml(tx.buyer)}</td>
        <td class="px-3 py-2 align-top">${escapeHtml(tx.service)}</td>
        <td class="px-3 py-2 align-top">${tx.pages}</td>
        <td class="px-3 py-2 align-top">${formatIDR(tx.unitPrice)}</td>
        <td class="px-3 py-2 align-top">${formatIDR(tx.discount)}</td>
        <td class="px-3 py-2 align-top font-semibold">${formatIDR(tx.total)}</td>
        <td class="px-3 py-2 align-top">
          <button data-idx="${tx.id}" class="btnDel px-2 py-1 rounded-md bg-red-600 text-black text-xs">Hapus</button>
        </td>
      `;
      txBody.appendChild(tr);

      // small reveal animation per-row
      if (typeof anime !== 'undefined') {
        anime({
          targets: tr,
          opacity: [0,1],
          translateY: [8,0],
          duration: 450,
          easing: 'easeOutCubic',
          delay: idx * 30
        });
      }
    });

    txCount.textContent = filtered.length;
    grandTotalEl.textContent = formatIDR(grandTotal);

    // attach delete handlers
    document.querySelectorAll('.btnDel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-idx');
        removeTransaction(id);
      });
    });
  }

  // create new transaction object
  function addTransaction(tx) {
    const list = loadTransactions();
    list.unshift(tx); // newest first
    saveTransactions(list);
    renderTable(filterDate.value || null);
  }

  function removeTransaction(id) {
    const list = loadTransactions();
    const next = list.filter(t => String(t.id) !== String(id));
    saveTransactions(next);
    renderTable(filterDate.value || null);
  }

  function clearAllTransactions() {
    if (!confirm('Hapus semua data transaksi? Tindakan ini tidak dapat dibatalkan.')) return;
    localStorage.removeItem(storageKey);
    renderTable();
  }

  function exportCSV() {
    const list = loadTransactions();
    if (!list.length) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    const headers = ['id','date','buyer','service','pages','unitPrice','discount','total','notes'];
    const rows = [headers.join(',')];
    list.forEach(tx => {
      const row = [
        `"${tx.id}"`,
        `"${tx.date}"`,
        `"${tx.buyer.replace(/"/g,'""')}"`,
        `"${tx.service.replace(/"/g,'""')}"`,
        tx.pages,
        tx.unitPrice,
        tx.discount,
        tx.total,
        `"${(tx.notes||'').replace(/"/g,'""')}"`
      ];
      rows.push(row.join(','));
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `op3_rekap_transaksi_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // utilities
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }

  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
  }

  // initialize date input to today
  function setToday() {
    const today = new Date().toISOString().slice(0,10);
    dateEl.value = today;
    filterDate.value = '';
  }

  // events
  pagesEl.addEventListener('input', computeSubtotal);
  unitPriceEl.addEventListener('input', computeSubtotal);
  discountEl.addEventListener('input', computeSubtotal);

  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pages = Math.max(1, Number(pagesEl.value) || 0);
    const unitPrice = Math.max(0, Number(unitPriceEl.value) || 0);
    const discount = Math.max(0, Number(discountEl.value) || 0);
    const total = Math.max(0, pages * unitPrice - discount);

    const tx = {
      id: uid(),
      date: dateEl.value,
      buyer: buyerEl.value.trim(),
      service: serviceEl.value,
      pages,
      unitPrice,
      discount,
      total,
      notes: notesEl.value.trim()
    };

    addTransaction(tx);

    // flash animation on add
    if (typeof anime !== 'undefined') {
      anime({
        targets: 'section.bg-gray-800.rounded-lg.p-6.shadow-sm',
        scale: [1, 0.995, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .6)'
      });
    }

    txForm.reset();
    setToday();
    computeSubtotal();
  });

  txForm.addEventListener('reset', () => {
    setTimeout(() => {
      setToday();
      computeSubtotal();
    }, 0);
  });

  btnExport.addEventListener('click', (e) => {
    e.preventDefault();
    exportCSV();
  });

  btnClearAll.addEventListener('click', (e) => {
    e.preventDefault();
    clearAllTransactions();
  });

  filterDate.addEventListener('change', () => {
    renderTable(filterDate.value || null);
  });

  // initial setup
  setToday();
  computeSubtotal();
  renderTable();

  // if there is no transaction sample, add a tiny sample (optional)
  // remove or comment out in production if unwanted
  (function seedIfEmpty() {
    const list = loadTransactions();
    if (list.length === 0) {
      const sample = {
        id: uid(),
        date: new Date().toISOString().slice(0,10),
        buyer: 'Contoh',
        service: 'Print Hitam Putih',
        pages: 2,
        unitPrice: 1000,
        discount: 0,
        total: 2*1000,
        notes: 'Contoh transaksi'
      };
      saveTransactions([sample]);
      renderTable();
    }
  })();
});
