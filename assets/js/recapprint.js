// assets/js/recapprint.js
// Fokus: render rekap transaksi, filter, hapus, hapus semua, ekspor CSV

(function () {
  const storageKey = 'op3_transactions_v1';
  const txBody = document.getElementById('txBody');
  const txCount = document.getElementById('txCount');
  const grandTotalEl = document.getElementById('grandTotal');
  const btnExport = document.getElementById('btnExport');
  const btnClearAll = document.getElementById('btnClearAll');
  const filterDate = document.getElementById('filterDate');

  if (!txBody) return;

  function formatIDR(n) {
    return 'Rp ' + Number(n).toLocaleString('id-ID');
  }

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

  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
  }

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
        <td class="px-3 py-2 align-top">${escapeHtml(tx.notes)}</td>
        <td class="px-3 py-2 align-top">
          <button data-id="${tx.id}" class="btnDel px-2 py-1 rounded-md bg-red-600 text-black text-xs disable">Hapus</button>
        </td>
      `;
      txBody.appendChild(tr);

      if (typeof anime !== 'undefined') {
        anime({
          targets: tr,
          opacity: [0,1],
          translateY: [8,0],
          duration: 450,
          easing: 'easeOutCubic',
          delay: idx * 20
        });
      }
    });

    txCount.textContent = filtered.length;
    grandTotalEl.textContent = formatIDR(grandTotal);

    // attach delete handlers
    document.querySelectorAll('.btnDel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        removeTransaction(id);
      });
    });
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
        `"${(tx.buyer||'').replace(/"/g,'""')}"`,
        `"${(tx.service||'').replace(/"/g,'""')}"`,
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

  // init
  if (btnExport) btnExport.addEventListener('click', (e) => { e.preventDefault(); exportCSV(); });
  if (btnClearAll) btnClearAll.addEventListener('click', (e) => { e.preventDefault(); clearAllTransactions(); });
  if (filterDate) filterDate.addEventListener('change', () => { renderTable(filterDate.value || null); });

  renderTable();
})();
