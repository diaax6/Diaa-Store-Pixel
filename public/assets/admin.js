let token = localStorage.getItem('admin_token') || '';
let currentPage = 'home';
let cachedStats = null;

async function adminApi(method, path, body) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, signal: controller.signal };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch('/admin' + path, opts);
        clearTimeout(timeoutId);
        if (res.status === 401) { adminLogout(); return { success: false }; }
        return await res.json();
    } catch(e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') return { success: false, error: 'Request timed out' };
        return { success: false, error: e.message };
    }
}

function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

async function adminLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const res = await fetch('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
    const data = await res.json();
    if (data.success) {
        token = data.token;
        localStorage.setItem('admin_token', token);
        document.getElementById('login-overlay').classList.remove('active');
        document.getElementById('admin-layout').style.display = 'flex';
        loadPage('home');
    } else {
        document.getElementById('login-error').textContent = data.error || 'Invalid credentials';
        document.getElementById('login-error').style.display = 'block';
    }
}

function adminLogout() { token = ''; localStorage.removeItem('admin_token'); location.reload(); }

const pages = [
    { id: 'home', icon: '📊', label: 'Dashboard' },
    { id: 'source-keys', icon: '🔑', label: 'Source CDKeys' },
    { id: 'platform-cdks', icon: '🎟️', label: 'Platform CDKs' },
    { id: 'orders', icon: '📋', label: 'Orders' },
    { id: 'deposits', icon: '💳', label: 'Deposits' },
    { id: 'activity', icon: '📜', label: 'Activity Log' },
    { id: 'pricing', icon: '💰', label: 'Pricing' },
    { id: 'announcement', icon: '📢', label: 'Announcement' },
    { id: 'branding', icon: '🎨', label: 'Branding' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
];

function renderSidebar() {
    document.getElementById('sidebar-nav').innerHTML = pages.map(p =>
        `<a href="#" class="sidebar-link ${p.id === currentPage ? 'active' : ''}" onclick="loadPage('${p.id}');return false;"><span class="icon">${p.icon}</span> ${p.label}</a>`
    ).join('');
}

async function updateHeaderBalance() {
    const data = await adminApi('GET', '/stats');
    if (data.success) {
        cachedStats = data.stats;
        const el = document.getElementById('header-balance');
        if (el) el.innerHTML = `
            <div class="header-pill source"><span class="pill-val">${data.stats.source_balance}</span><span class="pill-label">Source Credits</span></div>
            <div class="header-pill merchant"><span class="pill-val">${data.stats.merchant_points_remaining}</span><span class="pill-label">Merchant Pts</span></div>
            <div class="header-pill orders"><span class="pill-val">${data.stats.today_orders}</span><span class="pill-label">Today</span></div>
        `;
    }
}

async function loadPage(pageId) {
    currentPage = pageId;
    renderSidebar();
    updateHeaderBalance();
    const main = document.getElementById('admin-main');
    main.innerHTML = '<div style="text-align:center;padding:80px;"><div class="spinner" style="margin:0 auto;"></div></div>';
    switch (pageId) {
        case 'home': await renderHome(main); break;
        case 'source-keys': await renderSourceKeys(main); break;
        case 'platform-cdks': await renderPlatformCDKs(main); break;
        case 'orders': await renderOrders(main); break;
        case 'deposits': await renderDeposits(main); break;
        case 'activity': await renderActivity(main); break;
        case 'pricing': await renderPricing(main); break;
        case 'announcement': await renderAnnouncementPage(main); break;
        case 'branding': await renderBranding(main); break;
        case 'settings': renderSettings(main); break;
    }
}

// ===== HOME =====
async function renderHome(main) {
    const data = await adminApi('GET', '/stats');
    if (!data.success) return;
    const s = data.stats;
    main.innerHTML = `
    <div class="page-header"><h1>Dashboard Overview</h1><button class="btn btn-ghost btn-sm" onclick="loadPage('home')">↻ Refresh</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div class="card"><div class="card-header"><h3>Source Balance</h3>
            <button class="btn btn-cyan btn-sm" onclick="checkAllBalances()">Check All</button></div>
        <div class="card-body"><div class="stats-grid" style="grid-template-columns:1fr 1fr;">
            <div class="stat-card cyan"><div class="stat-label">Available Credits</div><div class="stat-value">${s.source_balance}</div><div class="stat-bar"></div></div>
            <div class="stat-card purple"><div class="stat-label">Source Keys</div><div class="stat-value">${s.source_keys_count}</div><div class="stat-bar"></div></div>
        </div></div></div>
        <div class="card"><div class="card-header"><h3>Merchant Points</h3></div>
        <div class="card-body"><div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr;">
            <div class="stat-card green"><div class="stat-label">Issued</div><div class="stat-value">${s.merchant_points_issued}</div><div class="stat-bar"></div></div>
            <div class="stat-card orange"><div class="stat-label">Used</div><div class="stat-value">${s.merchant_points_used}</div><div class="stat-bar"></div></div>
            <div class="stat-card purple"><div class="stat-label">Remaining</div><div class="stat-value">${s.merchant_points_remaining}</div><div class="stat-bar"></div></div>
        </div></div></div>
    </div>
    <div class="stats-grid">
        <div class="stat-card purple"><div class="stat-label">Total Orders</div><div class="stat-value">${s.orders.total}</div><div class="stat-bar"></div></div>
        <div class="stat-card orange"><div class="stat-label">Pending</div><div class="stat-value">${s.orders.pending}</div><div class="stat-bar"></div></div>
        <div class="stat-card green"><div class="stat-label">Success</div><div class="stat-value">${s.orders.success}</div><div class="stat-bar"></div></div>
        <div class="stat-card red"><div class="stat-label">Failed</div><div class="stat-value">${s.orders.failed}</div><div class="stat-bar"></div></div>
        <div class="stat-card cyan"><div class="stat-label">Active CDKs</div><div class="stat-value">${s.active_cdks}</div><div class="stat-bar"></div></div>
        <div class="stat-card green"><div class="stat-label">Revenue (pts)</div><div class="stat-value">${s.total_revenue}</div><div class="stat-bar"></div></div>
    </div>`;
}

async function checkAllBalances() {
    showToast('Checking all balances...', 'info');
    const res = await adminApi('POST', '/source-cdkeys/check-all');
    if (res.success) { showToast('Total: ' + res.total_balance + ' credits', 'success'); loadPage(currentPage); }
    else showToast('Failed', 'error');
}

// ===== SOURCE KEYS =====
async function renderSourceKeys(main) {
    const data = await adminApi('GET', '/source-cdkeys');
    const keys = data.cdkeys || [];
    main.innerHTML = `
    <div class="page-header"><h1>Source CDKeys</h1>
        <div style="display:flex;gap:8px;">
            <button class="btn btn-cyan btn-sm" onclick="checkAllBalances()">Check All</button>
            <button class="btn btn-primary btn-sm" onclick="openModal('add-source-modal')">+ Add Keys</button>
        </div>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper">
        <table><thead><tr><th>#</th><th>CDKey</th><th>Balance</th><th>Last Checked</th><th>Status</th><th style="width:200px;">Actions</th></tr></thead><tbody>
        ${keys.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No source keys yet. Click "+ Add Keys" to import.</td></tr>' :
        keys.map(k => `<tr>
            <td>${k.id}</td>
            <td><code style="font-size:12px;color:var(--accent-purple-light);">${k.cdkey}</code>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${k.cdkey}');showToast('Copied!','success')" style="margin-left:4px;">📋</button></td>
            <td style="font-weight:800;color:var(--accent-cyan-light);font-size:20px;">${k.cached_balance}</td>
            <td style="font-size:11px;color:var(--text-muted);">${k.last_checked ? new Date(k.last_checked).toLocaleString() : '—'}</td>
            <td><span class="badge badge-${k.is_active ? 'success' : 'failed'}">${k.is_active ? 'Active' : 'Off'}</span></td>
            <td>
                <button class="btn btn-cyan btn-sm" onclick="checkSourceBalance(${k.id})" title="Check balance">Check</button>
                <button class="btn btn-ghost btn-sm" onclick="toggleSourceKey(${k.id})" title="Toggle">${k.is_active ? 'Disable' : 'Enable'}</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDeleteSource(${k.id}, this)" title="Delete">Delete</button>
            </td>
        </tr>`).join('')}
        </tbody></table>
    </div></div></div>
    <div class="modal-overlay" id="add-source-modal">
        <div class="modal">
            <div class="modal-header"><h3>Import Source CDKeys</h3><button class="modal-close" onclick="closeModal('add-source-modal')">×</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Paste CDKeys (one per line)</label>
                <textarea class="form-control" id="bulk-source-keys" rows="6" placeholder="SYS-ABC123DEF456&#10;SYS-GHI789JKL012&#10;SYS-MNO345PQR678" style="font-family:monospace;font-size:13px;"></textarea></div>
                <p style="font-size:12px;color:var(--text-muted);">Each line = one CDKey. Names are auto-generated.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost btn-sm" onclick="closeModal('add-source-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="bulkAddSourceKeys()">Import</button>
            </div>
        </div>
    </div>`;
}

async function bulkAddSourceKeys() {
    const text = document.getElementById('bulk-source-keys').value.trim();
    if (!text) return showToast('Paste at least one CDKey', 'error');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let added = 0, errors = 0;
    for (const cdkey of lines) {
        const name = cdkey.length > 16 ? cdkey.substring(0,8) + '...' + cdkey.slice(-6) : cdkey;
        const res = await adminApi('POST', '/source-cdkeys', { name, cdkey });
        if (res.success) added++; else errors++;
    }
    showToast(`Imported ${added}/${lines.length} keys` + (errors ? ` (${errors} errors)` : ''), added > 0 ? 'success' : 'error');
    closeModal('add-source-modal');
    loadPage('source-keys');
}

async function checkSourceBalance(id) {
    showToast('Checking...', 'info');
    const res = await adminApi('POST', `/source-cdkeys/${id}/check-balance`);
    if (res.success) { showToast('Balance: ' + res.balance, 'success'); loadPage('source-keys'); }
    else showToast(res.error || 'Failed', 'error');
}

async function toggleSourceKey(id) {
    await adminApi('POST', `/source-cdkeys/${id}/toggle`);
    loadPage('source-keys');
}

async function confirmDeleteSource(id, btn) {
    // Double-click pattern: first click shows "Sure?", second click deletes
    if (!btn) btn = event.target;
    if (btn.dataset.confirming === 'true') {
        btn.textContent = 'Deleting...';
        btn.disabled = true;
        const res = await adminApi('DELETE', `/source-cdkeys/${id}`);
        if (res.success) { showToast('Deleted', 'success'); loadPage('source-keys'); }
        else { showToast(res.error || 'Failed', 'error'); btn.textContent = 'Delete'; btn.disabled = false; btn.dataset.confirming = 'false'; }
        return;
    }
    btn.dataset.confirming = 'true';
    btn.textContent = '⚠ Sure?';
    btn.style.background = '#dc2626';
    setTimeout(() => { if (btn) { btn.textContent = 'Delete'; btn.dataset.confirming = 'false'; btn.style.background = ''; } }, 3000);
}

// ===== PLATFORM CDKs =====
async function renderPlatformCDKs(main) {
    const data = await adminApi('GET', '/platform-cdks');
    const cdks = data.cdks || [];
    main.innerHTML = `
    <div class="page-header"><h1>Platform CDKs</h1>
        <button class="btn btn-primary btn-sm" onclick="openModal('create-cdk-modal')">+ Create CDK</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper">
        <table><thead><tr><th>Code</th><th>Label</th><th>Total</th><th>Remaining</th><th>Used</th><th>Source</th><th>Status</th><th style="width:220px;">Actions</th></tr></thead><tbody>
        ${cdks.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No CDKs yet</td></tr>' :
        cdks.map(c => `<tr>
            <td><code style="color:var(--accent-purple-light);font-weight:700;font-size:13px;">${c.code}</code>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${c.code}');showToast('Copied!','success')">📋</button></td>
            <td style="font-size:12px;">${c.label || '—'}</td>
            <td>${c.total_points}</td>
            <td style="font-weight:700;color:var(--accent-cyan-light);">${c.remaining_points}</td>
            <td style="color:var(--warning);">${(c.total_points - c.remaining_points).toFixed(1)}</td>
            <td style="font-size:11px;">${c.source_name || '—'}</td>
            <td><span class="badge badge-${c.status}">${c.status}</span></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="promptAddPoints(${c.id})">+Points</button>
                <button class="btn btn-ghost btn-sm" onclick="editCDK(${c.id},'${(c.label||'').replace(/'/g,"\\'")}')">Edit</button>
                <button class="btn btn-ghost btn-sm" onclick="toggleCDK(${c.id},'${c.status}')">${c.status==='active'?'Suspend':'Activate'}</button>
                <button class="btn btn-danger btn-sm" onclick="confirmDeleteCDK(${c.id}, this)" title="Delete">Delete</button>
            </td>
        </tr>`).join('')}
        </tbody></table>
    </div></div></div>
    <div class="modal-overlay" id="create-cdk-modal">
        <div class="modal"><div class="modal-header"><h3>Create Platform CDK</h3><button class="modal-close" onclick="closeModal('create-cdk-modal')">×</button></div>
        <div class="modal-body">
            <div class="form-group"><label>Points</label><input type="number" class="form-control" id="cdk-points" value="100"></div>
            <div class="form-group"><label>Count</label><input type="number" class="form-control" id="cdk-count" value="1" min="1" max="100"></div>
            <div class="form-group"><label>Label (optional)</label><input class="form-control" id="cdk-label" placeholder="VIP Customer"></div>
            <div class="form-group"><label>Prefix</label><input class="form-control" id="cdk-prefix" value="DS"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost btn-sm" onclick="closeModal('create-cdk-modal')">Cancel</button><button class="btn btn-primary" onclick="createCDK()">Create</button></div>
    </div></div>
    <div class="modal-overlay" id="edit-cdk-modal">
        <div class="modal"><div class="modal-header"><h3>Edit CDK</h3><button class="modal-close" onclick="closeModal('edit-cdk-modal')">×</button></div>
        <div class="modal-body"><input type="hidden" id="edit-cdk-id"><div class="form-group"><label>Label</label><input class="form-control" id="edit-cdk-label"></div></div>
        <div class="modal-footer"><button class="btn btn-ghost btn-sm" onclick="closeModal('edit-cdk-modal')">Cancel</button><button class="btn btn-primary" onclick="saveCDK()">Save</button></div>
    </div></div>`;
}

async function createCDK() {
    const points = +document.getElementById('cdk-points').value;
    const count = +document.getElementById('cdk-count').value;
    const label = document.getElementById('cdk-label').value;
    const prefix = document.getElementById('cdk-prefix').value;
    const res = await adminApi('POST', '/platform-cdks', { points, count, label, prefix });
    if (res.success) {
        const codes = res.created.map(c => c.code).join('\n');
        navigator.clipboard.writeText(codes);
        showToast(res.count + ' CDK(s) created & copied!', 'success');
        closeModal('create-cdk-modal'); loadPage('platform-cdks');
    } else showToast(res.error, 'error');
}

function editCDK(id, label) {
    document.getElementById('edit-cdk-id').value = id;
    document.getElementById('edit-cdk-label').value = label;
    openModal('edit-cdk-modal');
}

async function saveCDK() {
    const id = document.getElementById('edit-cdk-id').value;
    const label = document.getElementById('edit-cdk-label').value;
    const res = await adminApi('PUT', '/platform-cdks/' + id, { label });
    if (res.success) { showToast('Updated!', 'success'); closeModal('edit-cdk-modal'); loadPage('platform-cdks'); }
    else showToast(res.error, 'error');
}

async function promptAddPoints(id) {
    const pts = prompt('Enter points to add:');
    if (!pts || +pts <= 0) return;
    const res = await adminApi('POST', '/platform-cdks/' + id + '/add-points', { points: +pts });
    if (res.success) { showToast('Points added!', 'success'); loadPage('platform-cdks'); }
    else showToast(res.error, 'error');
}

async function toggleCDK(id, current) {
    const s = current === 'active' ? 'suspended' : 'active';
    await adminApi('POST', '/platform-cdks/' + id + '/status', { status: s });
    loadPage('platform-cdks');
}

async function confirmDeleteCDK(id, btn) {
    // Double-click pattern: first click shows "Sure?", second click deletes
    if (!btn) btn = event.target;
    if (btn.dataset.confirming === 'true') {
        btn.textContent = 'Deleting...';
        btn.disabled = true;
        const res = await adminApi('DELETE', '/platform-cdks/' + id);
        if (res.success) { showToast('Deleted', 'success'); loadPage('platform-cdks'); }
        else { showToast(res.error || 'Failed', 'error'); btn.textContent = 'Delete'; btn.disabled = false; btn.dataset.confirming = 'false'; }
        return;
    }
    btn.dataset.confirming = 'true';
    btn.textContent = '⚠ Sure?';
    btn.style.background = '#dc2626';
    setTimeout(() => { if (btn) { btn.textContent = 'Delete'; btn.dataset.confirming = 'false'; btn.style.background = ''; } }, 3000);
}

// ===== ORDERS =====
async function renderOrders(main) {
    const data = await adminApi('GET', '/orders');
    const orders = data.orders || [];
    main.innerHTML = `
    <div class="page-header"><h1>Orders (${orders.length})</h1>
        <button class="btn btn-ghost btn-sm" onclick="loadPage('orders')">↻ Refresh</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper">
        <table><thead><tr><th>#</th><th>CDK</th><th>Email</th><th>Type</th><th>Pts</th><th>Status</th><th>Message</th><th>Time</th></tr></thead><tbody>
        ${orders.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No orders</td></tr>' :
        orders.map(o => `<tr>
            <td>${o.id}</td>
            <td><code style="font-size:10px;">${o.cdk_code || '—'}</code></td>
            <td style="font-size:12px;">${o.email}</td>
            <td>${o.task_type}</td>
            <td style="color:var(--warning);font-weight:600;">${o.charged_points}</td>
            <td><span class="badge badge-${o.status}">${o.status}</span></td>
            <td style="max-width:180px;font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;">${o.result_message || '—'}</td>
            <td style="font-size:10px;color:var(--text-muted);">${o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
        </tr>`).join('')}
        </tbody></table>
    </div></div></div>`;
}

// ===== ACTIVITY =====
async function renderActivity(main) {
    const data = await adminApi('GET', '/activity?limit=100');
    const logs = data.logs || [];
    main.innerHTML = `
    <div class="page-header"><h1>Activity Log</h1>
        <button class="btn btn-danger btn-sm" onclick="clearAllLogs()">🗑 Clear All</button>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper">
        <table><thead><tr><th>Time</th><th>Action</th><th>Details</th><th style="width:50px;"></th></tr></thead><tbody>
        ${logs.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted);">No activity</td></tr>' :
        logs.map(l => `<tr>
            <td style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${new Date(l.created_at).toLocaleString()}</td>
            <td><span class="badge badge-${l.action.includes('delete')?'failed':l.action.includes('refund')?'running':'success'}">${l.action}</span></td>
            <td style="font-size:12px;">${l.details}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="deleteLogEntry(${l.id})" style="color:var(--error);font-size:10px;">🗑</button></td>
        </tr>`).join('')}
        </tbody></table>
    </div></div></div>`;
}

async function deleteLogEntry(id) {
    console.log('[DELETE LOG]', id);
    const res = await adminApi('DELETE', `/activity/${id}`);
    if (res.success) loadPage('activity');
    else showToast(res.error || 'Failed', 'error');
}

async function clearAllLogs() {
    console.log('[CLEAR ALL LOGS]');
    const res = await adminApi('DELETE', '/activity');
    if (res.success) { showToast('All logs cleared', 'success'); loadPage('activity'); }
    else showToast(res.error || 'Failed', 'error');
}

// ===== DEPOSITS =====
async function renderDeposits(main) {
    const data = await adminApi('GET', '/deposits');
    const deps = data.deposits || [];
    main.innerHTML = `
    <div class="page-header"><h1>Deposits</h1>
        <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:13px;color:var(--success);font-weight:700;">Total Revenue: $${(data.total_usdt || 0).toFixed(2)} USDT</div>
            <button class="btn btn-danger btn-sm" onclick="bulkDeleteDeps()" id="bulk-del-deps" style="display:none;">🗑 Delete Selected</button>
            <button class="btn btn-ghost btn-sm" onclick="loadPage('deposits')">↻ Refresh</button>
        </div>
    </div>
    <div class="card"><div class="card-body"><div class="table-wrapper">
        <table><thead><tr><th style="width:30px;"><input type="checkbox" id="sel-all-dep" onchange="toggleAllDeps(this)"></th><th>#</th><th>CDK</th><th>Amount</th><th>Points</th><th>Note</th><th>Status</th><th>Time</th><th style="width:140px;">Actions</th></tr></thead><tbody>
        ${deps.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);">No deposits yet</td></tr>' :
        deps.map(d => `<tr>
            <td><input type="checkbox" class="dep-sel" value="${d.id}"></td>
            <td>${d.id}</td>
            <td><code style="font-size:11px;">${d.cdk_code || '—'}</code></td>
            <td style="font-weight:700;color:var(--success);">$${parseFloat(d.amount_usdt).toFixed(2)}</td>
            <td style="color:var(--accent-cyan-light);font-weight:600;">${d.points_credited}</td>
            <td><code style="font-size:11px;color:var(--accent-purple-light);">${d.note || '—'}</code></td>
            <td><span class="badge badge-${d.status === 'paid' ? 'success' : d.status === 'rejected' || d.status === 'cancelled' || d.status === 'expired' ? 'failed' : 'running'}">${d.status.toUpperCase()}</span></td>
            <td style="font-size:11px;color:var(--text-muted);">${new Date(d.created_at).toLocaleString()}</td>
            <td>
                ${d.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="approveDeposit(${d.id})">✅</button><button class="btn btn-danger btn-sm" onclick="rejectDeposit(${d.id})">✖</button>` : ''}
                <button class="btn btn-ghost btn-sm" onclick="deleteDeposit(${d.id})" title="Delete" style="color:var(--error);">🗑</button>
            </td>
        </tr>`).join('')}
        </tbody></table>
    </div></div></div>`;
}

async function approveDeposit(id) {
    console.log('[APPROVE]', id);
    const res = await adminApi('POST', `/deposits/${id}/approve`);
    if (res.success) { showToast('Deposit approved! Points credited.', 'success'); loadPage('deposits'); }
    else showToast(res.error || 'Failed', 'error');
}

async function deleteDeposit(id) {
    console.log('[DELETE DEPOSIT]', id);
    const res = await adminApi('DELETE', `/deposits/${id}`);
    if (res.success) { showToast('Deposit deleted', 'success'); loadPage('deposits'); }
    else showToast(res.error || 'Failed', 'error');
}

async function rejectDeposit(id) {
    console.log('[REJECT]', id);
    const res = await adminApi('POST', `/deposits/${id}/reject`);
    if (res.success) { showToast('Deposit rejected', 'success'); loadPage('deposits'); }
    else showToast(res.error || 'Failed', 'error');
}

function toggleAllDeps(el) {
    document.querySelectorAll('.dep-sel').forEach(cb => cb.checked = el.checked);
    updateBulkBtn();
}

function updateBulkBtn() {
    const selected = document.querySelectorAll('.dep-sel:checked').length;
    const btn = document.getElementById('bulk-del-deps');
    if (btn) {
        btn.style.display = selected > 0 ? 'inline-flex' : 'none';
        btn.textContent = `🗑 Delete Selected (${selected})`;
    }
}

// Listen for individual checkbox changes
document.addEventListener('change', e => {
    if (e.target.classList.contains('dep-sel')) updateBulkBtn();
});

async function bulkDeleteDeps() {
    const ids = [...document.querySelectorAll('.dep-sel:checked')].map(cb => cb.value);
    if (ids.length === 0) return;
    showToast(`Deleting ${ids.length} deposit(s)...`, 'info');
    let ok = 0;
    for (const id of ids) {
        const res = await adminApi('DELETE', `/deposits/${id}`);
        if (res.success) ok++;
    }
    showToast(`Deleted ${ok}/${ids.length} deposits`, 'success');
    loadPage('deposits');
}

// ===== PRICING =====
async function renderPricing(main) {
    const data = await adminApi('GET', '/pricing');
    const pricing = data.pricing || [];
    const pointPrice = data.deposit_rate || 1;
    main.innerHTML = `
    <div class="page-header"><h1>Pricing</h1></div>
    <div class="card" style="margin-bottom:20px;"><div class="card-header"><h3>💳 Point Price</h3></div><div class="card-body">
        <div style="display:flex;align-items:center;gap:16px;">
            <div style="flex:1;"><div style="font-weight:600;">USDT per Point</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">How much each point costs in USDT</div></div>
            <input type="number" class="form-control" value="${pointPrice}" id="deposit-rate" style="width:80px;text-align:center;font-size:18px;font-weight:700;" step="0.01" min="0.01">
            <span style="color:var(--text-muted);font-size:12px;">$/pt</span>
            <button class="btn btn-primary btn-sm" onclick="updateDepositRate()">Save</button>
        </div>
    </div></div>
    <div class="card"><div class="card-header"><h3>🏷️ Service Pricing</h3></div><div class="card-body">
        ${pricing.map(p => `
            <div style="display:flex;align-items:center;gap:16px;padding:20px;border-bottom:1px solid var(--border);">
                <div style="flex:1;"><div style="font-weight:600;">${p.label_en}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${p.label_ar} · Source: ${p.source_credits} cr</div></div>
                <input type="number" class="form-control" value="${p.points_cost}" id="price-${p.task_type}" style="width:80px;text-align:center;font-size:18px;font-weight:700;">
                <span style="color:var(--text-muted);font-size:12px;">pts</span>
                <button class="btn btn-primary btn-sm" onclick="updatePrice('${p.task_type}')">Save</button>
            </div>`).join('')}
    </div></div>`;
}

async function updatePrice(type) {
    const val = +document.getElementById('price-' + type).value;
    const res = await adminApi('PUT', '/pricing/' + type, { points_cost: val });
    if (res.success) showToast('Saved!', 'success'); else showToast(res.error, 'error');
}

async function updateDepositRate() {
    const pricePerPoint = +document.getElementById('deposit-rate').value;
    if (pricePerPoint <= 0) return showToast('Price must be > 0', 'error');
    const res = await adminApi('PUT', '/deposit-rate', { rate: pricePerPoint });
    if (res.success) showToast(`Point price set to $${pricePerPoint}`, 'success'); else showToast(res.error, 'error');
}

// ===== ANNOUNCEMENT PAGE =====
let scrollingEnabled = true;
let fixedEnabled = true;

async function renderAnnouncementPage(main) {
    const annData = await adminApi('GET', '/announcement');
    const annText = annData.text || '';
    const annFixedText = annData.fixed_text || '';
    const annColor = annData.color || 'default';
    const annSpeed = annData.speed || 'normal';
    scrollingEnabled = annData.scrolling_enabled !== false;
    fixedEnabled = annData.fixed_enabled !== false;
    selectedAnnColor = annColor;
    selectedAnnSpeed = annSpeed;
    main.innerHTML = `
    <div class="page-header"><h1>📢 Announcement</h1></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between;"><h3>📢 Scrolling Announcement</h3>
            <label class="toggle-switch"><input type="checkbox" id="scrolling-toggle" ${scrollingEnabled ? 'checked' : ''} onchange="scrollingEnabled=this.checked"><span class="toggle-slider"></span></label>
        </div>
            <div class="card-body">
                <div class="form-group">
                    <label>Scrolling Text</label>
                    <textarea class="form-control" id="ann-text" rows="2" placeholder="Scrolling announcement...">${annText}</textarea>
                    <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Marquee text that scrolls right-to-left. Leave empty to hide.</p>
                </div>
                <div class="form-group">
                    <label>Color / Status</label>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;" id="ann-color-group">
                        <button type="button" class="ann-color-btn ${annColor === 'default' ? 'active' : ''}" data-color="default" onclick="selectAnnColor('default')" style="--btn-c:#a78bfa;--btn-bg:rgba(124,58,237,0.1);--btn-border:rgba(124,58,237,0.25);">⚪ Default</button>
                        <button type="button" class="ann-color-btn ${annColor === 'green' ? 'active' : ''}" data-color="green" onclick="selectAnnColor('green')" style="--btn-c:#34d399;--btn-bg:rgba(16,185,129,0.1);--btn-border:rgba(16,185,129,0.25);">🟢 Online</button>
                        <button type="button" class="ann-color-btn ${annColor === 'yellow' ? 'active' : ''}" data-color="yellow" onclick="selectAnnColor('yellow')" style="--btn-c:#fbbf24;--btn-bg:rgba(245,158,11,0.1);--btn-border:rgba(245,158,11,0.25);">🟡 Warning</button>
                        <button type="button" class="ann-color-btn ${annColor === 'red' ? 'active' : ''}" data-color="red" onclick="selectAnnColor('red')" style="--btn-c:#f87171;--btn-bg:rgba(239,68,68,0.1);--btn-border:rgba(239,68,68,0.25);">🔴 Urgent</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Scroll Speed</label>
                    <div style="display:flex;gap:6px;" id="ann-speed-group">
                        <button type="button" class="ann-speed-btn ${annSpeed === 'slow' ? 'active' : ''}" onclick="selectAnnSpeed('slow')">🐢 Slow</button>
                        <button type="button" class="ann-speed-btn ${annSpeed === 'normal' ? 'active' : ''}" onclick="selectAnnSpeed('normal')">▶ Normal</button>
                        <button type="button" class="ann-speed-btn ${annSpeed === 'fast' ? 'active' : ''}" onclick="selectAnnSpeed('fast')">⚡ Fast</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card"><div class="card-header" style="display:flex;align-items:center;justify-content:space-between;"><h3>📌 Fixed Notice</h3>
            <label class="toggle-switch"><input type="checkbox" id="fixed-toggle" ${fixedEnabled ? 'checked' : ''} onchange="fixedEnabled=this.checked"><span class="toggle-slider"></span></label>
        </div>
            <div class="card-body">
                <div class="form-group">
                    <label>Notice Text</label>
                    <textarea class="form-control" id="ann-fixed-text" rows="5" placeholder="Detailed instructions or notices...">${annFixedText}</textarea>
                    <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">Static text shown below the scrolling bar. Good for long instructions.</p>
                </div>
            </div>
        </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" onclick="saveAnnouncement()" style="flex:1;padding:12px;">Save Announcement</button>
        <button class="btn btn-ghost" onclick="clearAnnouncement()" style="padding:12px 24px;">Clear All</button>
    </div>`;
}

// ===== SETTINGS =====
async function renderSettings(main) {
    main.innerHTML = `
    <div class="page-header"><h1>Settings</h1></div>
    <div class="card" style="max-width:480px;"><div class="card-header"><h3>🔒 Change Password</h3></div>
        <div class="card-body">
            <div class="form-group"><label>Current Password</label><input type="password" class="form-control" id="cur-pass"></div>
            <div class="form-group"><label>New Password</label><input type="password" class="form-control" id="new-pass"></div>
            <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
        </div>
    </div>`;
}

function selectAnnColor(c) {
    selectedAnnColor = c;
    document.querySelectorAll('.ann-color-btn').forEach(b => b.classList.toggle('active', b.dataset.color === c));
}

function selectAnnSpeed(s) {
    selectedAnnSpeed = s;
    document.querySelectorAll('.ann-speed-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(s)));
}

async function saveAnnouncement() {
    const text = document.getElementById('ann-text').value;
    const fixed_text = document.getElementById('ann-fixed-text').value;
    const res = await adminApi('PUT', '/announcement', {
        text, fixed_text, color: selectedAnnColor, speed: selectedAnnSpeed,
        scrolling_enabled: scrollingEnabled, fixed_enabled: fixedEnabled
    });
    if (res.success) showToast('Announcement updated!', 'success');
    else showToast(res.error || 'Failed', 'error');
}

async function clearAnnouncement() {
    document.getElementById('ann-text').value = '';
    document.getElementById('ann-fixed-text').value = '';
    selectedAnnColor = 'default';
    selectedAnnSpeed = 'normal';
    scrollingEnabled = true;
    fixedEnabled = true;
    const res = await adminApi('PUT', '/announcement', { text: '', fixed_text: '', color: 'default', speed: 'normal', scrolling_enabled: true, fixed_enabled: true });
    if (res.success) { showToast('Announcement cleared', 'success'); loadPage('announcement'); }
}

async function changePassword() {
    const cur = document.getElementById('cur-pass').value;
    const newP = document.getElementById('new-pass').value;
    if (!cur || !newP) return showToast('Fill both', 'error');
    const res = await adminApi('POST', '/change-password', { current_password: cur, new_password: newP });
    if (res.success) showToast('Password changed!', 'success'); else showToast(res.error, 'error');
}

// ===== MODAL HELPERS =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        document.getElementById('login-overlay').classList.remove('active');
    document.getElementById('admin-layout').style.display = 'flex';
        loadPage('home');
    }
    document.getElementById('login-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
});

// ==================== BRANDING ====================
async function renderBranding(main) {
    const res = await adminApi('GET', '/branding');
    const b = res.success ? res.branding : {};
    main.innerHTML = `
    <div class="page-header"><h1>🎨 Site Branding</h1></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
            <div class="card-header"><h3>Header & Navigation</h3></div>
            <div class="card-body">
                <div class="form-group">
                    <label>Brand Name (Header)</label>
                    <input class="form-control" id="br-brand-name" value="${b.brand_name || 'Diaa Store'}" placeholder="Diaa Store">
                </div>
                <div class="form-group">
                    <label>Brand Subtitle (Header)</label>
                    <input class="form-control" id="br-brand-subtitle" value="${b.brand_subtitle || '(Gemini Pro Pixel Verify)'}" placeholder="(Gemini Pro Pixel Verify)">
                </div>
                <div class="form-group">
                    <label>Logo URL (Image URL or /assets/dragon-logo.png)</label>
                    <input class="form-control" id="br-logo-url" value="${b.logo_url || '/assets/dragon-logo.png'}" placeholder="/assets/dragon-logo.png">
                </div>
                <div style="text-align:center;padding:16px;background:rgba(0,0,0,0.2);border-radius:10px;margin-top:8px;">
                    <img src="${b.logo_url || '/assets/dragon-logo.png'}" id="br-logo-preview" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid rgba(229,62,62,0.3);">
                    <p style="font-size:11px;color:var(--text-muted);margin-top:6px;">Logo Preview</p>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>Hero Section (Main Page)</h3></div>
            <div class="card-body">
                <div class="form-group">
                    <label>Hero Title (Large Text)</label>
                    <input class="form-control" id="br-hero-title" value="${b.hero_title || 'Diaa Store'}" placeholder="Diaa Store" style="font-size:18px;font-weight:700;">
                </div>
                <div class="form-group">
                    <label>Hero Subtitle</label>
                    <input class="form-control" id="br-hero-subtitle" value="${b.hero_subtitle || 'Gemini Pro Pixel Verify'}" placeholder="Gemini Pro Pixel Verify">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="br-hero-desc" rows="3" placeholder="Automated Gemini Advanced...">${b.hero_description || 'Automated Gemini Advanced subscription activation platform for resellers.'}</textarea>
                </div>
            </div>
        </div>
    </div>
    <div style="text-align:center;margin-top:20px;">
        <button class="btn btn-primary" onclick="saveBranding()" style="padding:12px 40px;font-size:16px;">💾 Save Branding</button>
    </div>`;

    // Live preview logo
    document.getElementById('br-logo-url').addEventListener('input', function() {
        document.getElementById('br-logo-preview').src = this.value || '/assets/dragon-logo.png';
    });
}

async function saveBranding() {
    const body = {
        brand_name: document.getElementById('br-brand-name').value,
        brand_subtitle: document.getElementById('br-brand-subtitle').value,
        logo_url: document.getElementById('br-logo-url').value,
        hero_title: document.getElementById('br-hero-title').value,
        hero_subtitle: document.getElementById('br-hero-subtitle').value,
        hero_description: document.getElementById('br-hero-desc').value,
    };
    const res = await adminApi('PUT', '/branding', body);
    if (res.success) showToast('Branding saved!', 'success');
    else showToast(res.error || 'Failed', 'error');
}
