// ===== Merchant Dashboard Logic =====

let activeCDK = localStorage.getItem('activeCDK') || '';
let cdkData = null;
let currentTab = 'dashboard';
let orders = [];
let orderFilter = 'all';
let pricing = {};

const API = '/api/v1';

// ===== API Helper =====
async function api(endpoint, body = {}) {
    try {
        const res = await fetch(API + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cdkey: activeCDK, ...body })
        });
        return await res.json();
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ===== Announcement =====
async function loadAnnouncement() {
    try {
        const res = await fetch('/api/announcement');
        const data = await res.json();
        const bar = document.getElementById('announcement-bar');
        const textEl = document.getElementById('announcement-text');
        const fixedBar = document.getElementById('announcement-fixed');
        const fixedTextEl = document.getElementById('announcement-fixed-text');

        // Scrolling announcement
        if (data.scrolling_enabled && data.text && data.text.trim()) {
            textEl.textContent = data.text;
            bar.className = 'announcement-bar';
            if (data.color && data.color !== 'default') {
                bar.classList.add('color-' + data.color);
            }
            const speedMap = { slow: 0.55, normal: 0.35, fast: 0.18 };
            const multiplier = speedMap[data.speed] || 0.35;
            const duration = Math.max(8, data.text.length * multiplier);
            textEl.style.setProperty('--ann-duration', duration + 's');
            bar.style.display = 'block';
        } else {
            bar.style.display = 'none';
        }

        // Fixed announcement
        if (data.fixed_enabled && data.fixed_text && data.fixed_text.trim()) {
            fixedTextEl.textContent = data.fixed_text;
            fixedBar.style.display = 'block';
        } else {
            fixedBar.style.display = 'none';
        }
    } catch(e) {}
}
// Only show announcements if no CDK stored (hero is visible)
if (!localStorage.getItem('activeCDK')) loadAnnouncement();

// ===== Site Info (Stock + Price + Branding) =====
let siteHasStock = true;
async function loadSiteInfo() {
    try {
        const res = await fetch('/api/site-info');
        const data = await res.json();
        const badge = document.getElementById('stock-badge');
        const text = document.getElementById('stock-text');
        const priceEl = document.getElementById('hero-price');

        siteHasStock = data.has_stock;
        const pointsAvailable = Math.floor((data.credits || 0) * 2);

        if (data.has_stock) {
            badge.className = 'stock-badge online';
            text.textContent = pointsAvailable + ' pts available';
        } else {
            badge.className = 'stock-badge offline';
            text.textContent = 'Out of Stock';
        }

        if (priceEl && data.point_price) {
            priceEl.textContent = '$' + data.point_price.toFixed(2);
        }

        // Apply branding
        const b = data.branding || {};
        if (b.brand_name) {
            const brandEl = document.getElementById('nav-brand-text');
            const subEl = document.getElementById('nav-brand-sub');
            if (brandEl) brandEl.innerHTML = b.brand_name + (b.brand_subtitle ? ' <span class="brand-sub" id="nav-brand-sub">' + b.brand_subtitle + '</span>' : '');
        }
        if (b.hero_title) { const el = document.getElementById('hero-title-main'); if (el) el.textContent = b.hero_title; }
        if (b.hero_subtitle) { const el = document.getElementById('hero-title-sub'); if (el) el.textContent = b.hero_subtitle; }
        if (b.hero_description) { const el = document.getElementById('hero-desc'); if (el) el.textContent = b.hero_description; }
        if (b.logo_url) {
            document.querySelectorAll('.dragon-img, .hero-dragon-img').forEach(img => img.src = b.logo_url);
        }
    } catch(e) {}
}
loadSiteInfo();

// ===== Toast =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===== CDK Activation =====
async function activateCDK() {
    const input = document.getElementById('cdk-input');
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    if (!siteHasStock) {
        showToast('Service is currently out of stock. Please try again later.', 'error');
        return;
    }

    const btn = document.getElementById('cdk-activate-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    const result = await api('/balance', { cdkey: code });

    if (result.success) {
        activeCDK = code;
        localStorage.setItem('activeCDK', code);
        cdkData = result;
        await loadDashboard();
    } else {
        showToast(t('msg_invalid_cdk'), 'error');
    }

    btn.disabled = false;
    btn.innerHTML = `<span>${t('activate_btn')}</span>`;
}

// ===== Load Dashboard =====
async function loadDashboard() {
    document.getElementById('cdk-hero-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('active-cdk-display').textContent = activeCDK;

    // Hide announcements on dashboard
    const annBar = document.getElementById('announcement-bar');
    const fixedBar = document.getElementById('announcement-fixed');
    if (annBar) annBar.style.display = 'none';
    if (fixedBar) fixedBar.style.display = 'none';

    const [balanceRes, statsRes, ordersRes, pricingRes] = await Promise.all([
        api('/balance'),
        api('/stats'),
        api('/orders'),
        api('/pricing')
    ]);

    if (!balanceRes.success) {
        logout();
        showToast(t('msg_invalid_cdk'), 'error');
        return;
    }

    cdkData = { remaining: balanceRes.remaining_uses };
    if (statsRes.success) cdkData.stats = statsRes.stats;
    if (ordersRes.success) orders = ordersRes.orders || [];
    if (pricingRes.success) pricing = pricingRes.pricing || {};

    currentTab = getTabFromPath();
    renderUI();
}

function logout() {
    activeCDK = '';
    localStorage.removeItem('activeCDK');
    cdkData = null;
    document.getElementById('cdk-hero-section').style.display = '';
    document.getElementById('dashboard-section').style.display = 'none';
    history.replaceState(null, '', '/');
    // Show announcements again
    loadAnnouncement();
}

// ===== Render UI =====
function renderUI() {
    renderNavbar();
    renderStats();
    renderTabs();
    renderTabContent();
}

function renderNavbar() {
    document.getElementById('nav-lang').textContent = t('language');
}

function renderStats() {
    const stats = cdkData?.stats || { total: 0, pending: 0, success: 0, failed: 0 };
    const remaining = cdkData?.remaining || 0;

    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card purple">
            <div class="stat-label">${t('remaining_points')}</div>
            <div class="stat-value">${remaining}</div>
            <div class="stat-bar"></div>
        </div>
        <div class="stat-card cyan">
            <div class="stat-label">${t('total_orders')}</div>
            <div class="stat-value">${stats.total || 0}</div>
            <div class="stat-bar"></div>
        </div>
        <div class="stat-card orange">
            <div class="stat-label">${t('pending_running')}</div>
            <div class="stat-value">${stats.pending || 0}</div>
            <div class="stat-bar"></div>
        </div>
        <div class="stat-card green">
            <div class="stat-label">${t('success_count')}</div>
            <div class="stat-value">${stats.success || 0}</div>
            <div class="stat-bar"></div>
        </div>
        <div class="stat-card red">
            <div class="stat-label">${t('failed_count')}</div>
            <div class="stat-value">${stats.failed || 0}</div>
            <div class="stat-bar"></div>
        </div>
    `;
}

function renderTabs() {
    const tabs = ['dashboard', 'submit', 'orders', 'deposit', 'api', 'settings'];
    const labels = { dashboard: t('tab_dashboard'), submit: t('tab_submit'), orders: t('tab_orders'), deposit: 'Deposit', api: t('tab_api'), settings: t('tab_settings') };
    document.getElementById('dashboard-tabs').innerHTML = tabs.map(tab =>
        `<button class="tab ${tab === currentTab ? 'active' : ''}" onclick="switchTab('${tab}')">${labels[tab]}</button>`
    ).join('');
}

function switchTab(tab) {
    currentTab = tab;
    history.replaceState(null, '', '/' + tab);
    renderTabs();
    renderTabContent();
}

// Handle URL routing on load
function getTabFromPath() {
    const path = window.location.pathname.replace('/', '').toLowerCase();
    const validTabs = ['dashboard', 'submit', 'orders', 'deposit', 'api', 'settings'];
    return validTabs.includes(path) ? path : 'dashboard';
}

function renderTabContent() {
    const c = document.getElementById('tab-content');
    switch (currentTab) {
        case 'dashboard': c.innerHTML = renderDashboardTab(); break;
        case 'submit': c.innerHTML = renderSubmitTab(); break;
        case 'orders': c.innerHTML = renderOrdersTab(); break;
        case 'deposit': c.innerHTML = renderDepositTab(); break;
        case 'api': c.innerHTML = renderApiTab(); break;
        case 'settings': c.innerHTML = renderSettingsTab(); break;
    }
}

// ===== Dashboard Tab =====
function renderDashboardTab() {
    const recent = orders.slice(0, 10);
    if (recent.length === 0) {
        return `<div class="card"><div class="card-body"><div class="empty-state">
            <div class="icon">📋</div><p>${t('no_orders')}</p>
        </div></div></div>`;
    }
    return `<div class="card">
        <div class="card-header"><h3>${t('recent_orders')}</h3>
            <button class="btn btn-ghost btn-sm" onclick="refreshData()">🔄 ${t('refresh')}</button>
        </div>
        <div class="card-body"><div class="table-wrapper">${renderOrderTable(recent)}</div></div>
    </div>`;
}

// ===== Submit Tab =====
function renderSubmitTab() {
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
            <div class="card-header"><h3>📝 ${t('submit_title')}</h3></div>
            <div class="card-body">
                <div class="form-group"><label>${t('email')}</label>
                    <input type="email" class="form-control" id="submit-email" placeholder="user@gmail.com"></div>
                <div class="form-group"><label>${t('password')}</label>
                    <input type="text" class="form-control" id="submit-password" placeholder="••••••••"></div>
                <div class="form-group"><label>${t('twofa')}</label>
                    <input type="text" class="form-control" id="submit-twofa" placeholder="ABCDEF123456"></div>
                <div class="form-group"><label>${t('task_type')}</label>
                    <select class="form-control" id="submit-type">
                        <option value="extract" selected>${t('extract_label')}</option>
                        <option value="full">${t('full_label')}</option>
                    </select></div>
                <button class="btn btn-primary" onclick="submitOrder()" id="submit-btn" style="width:100%;">${t('submit_btn')}</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>📥 ${t('batch_import')}</h3></div>
            <div class="card-body">
                <div class="form-group"><label>${t('batch_hint')}</label>
                    <textarea class="form-control" id="batch-input" rows="8" placeholder="email@gmail.com|password|2FA&#10;email2@gmail.com,password2,2FA2&#10;email3@gmail.com----password3----2FA3" style="font-family:monospace;font-size:13px;"></textarea></div>
                <p style="font-size:11px;color:var(--text-muted);margin-top:-8px;margin-bottom:12px;">Supports: <code>|</code> <code>,</code> <code>;</code> <code>----</code> <code>tab</code> as separators. 2FA is optional.</p>
                <div class="form-group"><label>${t('task_type')}</label>
                    <select class="form-control" id="batch-type">
                        <option value="extract" selected>${t('extract_label')}</option>
                        <option value="full">${t('full_label')}</option>
                    </select></div>
                <button class="btn btn-cyan" onclick="batchImport()" style="width:100%;">📥 ${t('batch_import')}</button>
            </div>
        </div>
    </div>`;
}

// ===== Orders Tab =====
function renderOrdersTab() {
    const statuses = ['all', 'pending', 'running', 'success', 'failed', 'cancelled'];
    const filtered = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);
    return `
    <div class="section-header">
        <h2>${t('orders_title')}</h2>
        <button class="btn btn-ghost btn-sm" onclick="refreshData()">🔄 ${t('refresh')}</button>
    </div>
    <div class="tabs" style="border:none;margin-bottom:16px;">
        ${statuses.map(s => `<button class="tab ${s === orderFilter ? 'active' : ''}" onclick="filterOrders('${s}')">${t(s)}</button>`).join('')}
    </div>
    <div class="card">
        <div class="card-body">
            ${filtered.length === 0
                ? `<div class="empty-state"><div class="icon">📋</div><p>${t('no_orders')}</p></div>`
                : `<div class="table-wrapper">${renderOrderTable(filtered)}</div>`}
        </div>
    </div>`;
}

function renderOrderTable(orderList) {
    return `<table><thead><tr>
        <th>${t('order_id')}</th><th>${t('order_email')}</th><th>${t('order_status')}</th>
        <th>${t('order_type')}</th><th>${t('order_details')}</th><th>${t('order_time')}</th><th>${t('order_action')}</th>
    </tr></thead><tbody>
        ${orderList.map(o => `<tr>
            <td style="font-weight:600;color:var(--text-secondary);">#${o.id}</td>
            <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.email}</td>
            <td><span class="badge badge-${o.status}">${o.status.toUpperCase()}</span></td>
            <td><span style="background:rgba(124,58,237,0.1);color:var(--accent-purple-light);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;text-transform:uppercase;">${o.task_type}</span></td>
            <td style="max-width:240px;">${formatOrderDetails(o)}</td>
            <td style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${formatTime(o.created_at)}</td>
            <td>${renderOrderActions(o)}</td>
        </tr>`).join('')}
    </tbody></table>`;
}

function formatOrderDetails(order) {
    const msg = order.message || '';
    if (!msg) return '<span style="color:var(--text-muted);">—</span>';
    
    // Extract URL from message
    const urlMatch = msg.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : (order.offer_url || '');
    
    // Clean text (remove URL and Chinese prefix)
    let cleanMsg = msg.replace(/(https?:\/\/[^\s]+)/g, '').replace(/提取成功[:：]?\s*/g, '').trim();
    
    if (url) {
        // Show link as a nice compact element
        const domain = url.replace(/https?:\/\//, '').split('/')[0];
        return `<div style="display:flex;flex-direction:column;gap:4px;">
            ${cleanMsg ? `<span style="font-size:11px;color:var(--success);font-weight:500;">✓ ${cleanMsg || 'Completed'}</span>` : '<span style="font-size:11px;color:var(--success);font-weight:500;">✓ Link Ready</span>'}
            <a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--accent-cyan-light);background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.12);padding:2px 8px;border-radius:6px;text-decoration:none;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${url}">🔗 ${domain}</a>
        </div>`;
    }
    
    // No URL - show clean message
    if (msg.length > 60) {
        return `<span style="font-size:11px;color:var(--text-secondary);" title="${msg.replace(/"/g, '&quot;')}">${msg.substring(0, 60)}…</span>`;
    }
    return `<span style="font-size:11px;color:var(--text-secondary);">${msg}</span>`;
}

function renderOrderActions(order) {
    let a = '';
    // Info button — always show
    const safeEmail = (order.email || '').replace(/'/g, "\\'");
    const safePass = (order.password || '').replace(/'/g, "\\'");
    const safe2fa = (order.twofa || '').replace(/'/g, "\\'");
    a += `<button class="btn btn-ghost btn-sm" onclick="showOrderInfo('${safeEmail}','${safePass}','${safe2fa}', ${order.id})" title="Account Info" style="font-size:12px;">ℹ️</button>`;
    if (order.status === 'pending') a += `<button class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">${t('cancel_btn')}</button>`;
    if (order.has_offer_url && order.status === 'failed') a += `<button class="btn btn-cyan btn-sm" onclick="purchaseLink(${order.id})">${t('buy_link')}</button>`;
    if (order.offer_url && order.status === 'success') a += `<button class="btn btn-sm" style="background:rgba(52,211,153,0.1);color:#34d399;border:1px solid rgba(52,211,153,0.2);" onclick="copyText('${order.offer_url}')">📋 ${t('copy_link')}</button>`;
    return a;
}

function showOrderInfo(email, password, twofa, orderId) {
    // Remove existing modal if any
    const existing = document.getElementById('order-info-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'order-info-modal';
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div class="modal" style="max-width:420px;">
            <div class="modal-header">
                <h3>📋 Account Info — Order #${orderId}</h3>
                <button class="modal-close" onclick="document.getElementById('order-info-modal').remove()">×</button>
            </div>
            <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">📧 Email</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <code style="flex:1;font-size:14px;color:var(--accent-cyan-light);word-break:break-all;">${email}</code>
                        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${email.replace(/'/g, "\\'")}');showToast('Copied!','success')" style="flex-shrink:0;">📋</button>
                    </div>
                </div>
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">🔑 Password</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <code style="flex:1;font-size:14px;color:var(--accent-purple-light);word-break:break-all;">${password || '—'}</code>
                        ${password ? `<button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${password.replace(/'/g, "\\'")}');showToast('Copied!','success')" style="flex-shrink:0;">📋</button>` : ''}
                    </div>
                </div>
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">🔐 2FA Secret</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <code style="flex:1;font-size:14px;color:var(--warning);word-break:break-all;">${twofa || '—'}</code>
                        ${twofa ? `<button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${twofa.replace(/'/g, "\\'")}');showToast('Copied!','success')" style="flex-shrink:0;">📋</button>` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="justify-content:center;">
                <button class="btn btn-ghost" onclick="document.getElementById('order-info-modal').remove()">Close</button>
                <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${email.replace(/'/g, "\\'")}|${password.replace(/'/g, "\\'")}|${twofa.replace(/'/g, "\\'")}');showToast('All copied!','success')">📋 Copy All</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Close on overlay click
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ===== API Tab =====
function renderApiTab() {
    const baseUrl = window.location.origin + '/api/v1';
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
            <div class="card-header"><h3>🔗 ${t('api_title')}</h3></div>
            <div class="card-body">
                <p style="color:var(--text-secondary);margin-bottom:20px;font-size:14px;line-height:1.7;">${t('api_description')}</p>
                <div class="form-group">
                    <label>${t('api_your_key')}</label>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input class="form-control" value="${activeCDK}" readonly style="font-weight:700;color:var(--accent-purple-light);letter-spacing:1px;font-size:16px;">
                        <button class="btn btn-ghost btn-sm" onclick="copyText('${activeCDK}')">📋</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>${t('api_base_url')}</label>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input class="form-control" value="${baseUrl}" readonly style="font-size:13px;font-family:monospace;">
                        <button class="btn btn-ghost btn-sm" onclick="copyText('${baseUrl}')">📋</button>
                    </div>
                </div>
                <a href="/docs" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px;">📖 ${t('api_view_docs')}</a>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>💡 Quick Example</h3></div>
            <div class="card-body">
                <pre style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:16px;font-size:12px;line-height:1.7;color:var(--text-primary);overflow-x:auto;">
<span style="color:var(--accent-cyan-light);">// Submit an order via API</span>
<span style="color:var(--accent-purple-light);">const</span> res = <span style="color:var(--accent-purple-light);">await</span> fetch(<span style="color:var(--success);">'${baseUrl}/submit'</span>, {
  method: <span style="color:var(--success);">'POST'</span>,
  headers: { <span style="color:var(--success);">'Content-Type'</span>: <span style="color:var(--success);">'application/json'</span> },
  body: JSON.stringify({
    cdkey: <span style="color:var(--success);">'${activeCDK}'</span>,
    email: <span style="color:var(--success);">'user@gmail.com'</span>,
    password: <span style="color:var(--success);">'pass123'</span>,
    twofa: <span style="color:var(--success);">'SECRET'</span>,
    task_type: <span style="color:var(--success);">'full'</span>
  })
});
<span style="color:var(--accent-purple-light);">const</span> data = <span style="color:var(--accent-purple-light);">await</span> res.json();
console.log(data.order_id);</pre>
            </div>
        </div>
    </div>`;
}

// ===== Deposit Tab =====
function renderDepositTab() {
    setTimeout(loadDepositInfo, 200);
    // Generate amount buttons as multiples of point price
    const price = depositRate || 0.9;
    const pointCounts = [1, 2, 3, 4, 5, 10, 15, 20, 50, 100];
    const btnHtml = pointCounts.map(pts => {
        const amt = (pts * price).toFixed(2).replace(/\.?0+$/, '');
        return `<button class="amount-btn" onclick="document.getElementById('deposit-amount').value=${amt};updateDepPreview()"><span style="font-size:15px;font-weight:700;">$${amt}</span><span style="display:block;font-size:10px;color:var(--text-muted);margin-top:2px;">${pts} pt${pts>1?'s':''}</span></button>`;
    }).join('');

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card">
            <div class="card-header"><h3>Deposit via Binance Pay</h3></div>
            <div class="card-body">
                <div id="dep-price-box" style="text-align:center;margin-bottom:20px;padding:16px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.12);border-radius:10px;">
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Price per Point</div>
                    <div style="font-size:32px;font-weight:800;color:#34d399;">$${price}</div>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">USDT per point</div>
                </div>
                <div id="dep-btn-grid" class="amount-grid" style="grid-template-columns:repeat(5,1fr);gap:6px;">
                    ${btnHtml}
                </div>
                <div class="form-group" style="margin-top:14px;">
                    <label>Amount (USDT)</label>
                    <input type="number" class="form-control" id="deposit-amount" value="${price}" min="0.1" step="0.1" style="font-size:18px;font-weight:700;text-align:center;" oninput="updateDepPreview()">
                </div>
                <div id="deposit-rate-info" style="text-align:center;color:var(--text-secondary);font-size:12px;margin-bottom:14px;">Loading rate...</div>
                <button class="btn btn-primary" onclick="createDeposit()" id="deposit-btn" style="width:100%;padding:12px;">Pay with Binance</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>Deposit History</h3></div>
            <div class="card-body" id="deposit-history"><div class="empty-state"><div class="icon">📋</div><p>Loading...</p></div></div>
        </div>
    </div>`;
}

let depositRate = 1;
let depositPayId = '';

async function loadDepositInfo() {
    const res = await api('/deposit/history');
    if (res.success) {
        depositRate = res.rate || 1;
        depositPayId = res.pay_id || '';
        window._depositHistory = res.deposits;

        // Refresh price display and buttons with real rate
        const priceBox = document.getElementById('dep-price-box');
        if (priceBox) priceBox.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Price per Point</div><div style="font-size:32px;font-weight:800;color:#34d399;">$${depositRate}</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">USDT per point</div>`;
        const btnGrid = document.getElementById('dep-btn-grid');
        if (btnGrid) {
            const pointCounts = [1, 2, 3, 4, 5, 10, 15, 20, 50, 100];
            btnGrid.innerHTML = pointCounts.map(pts => {
                const amt = (pts * depositRate).toFixed(2).replace(/\.?0+$/, '');
                return `<button class="amount-btn" onclick="document.getElementById('deposit-amount').value=${amt};updateDepPreview()"><span style="font-size:15px;font-weight:700;">$${amt}</span><span style="display:block;font-size:10px;color:var(--text-muted);margin-top:2px;">${pts} pt${pts>1?'s':''}</span></button>`;
            }).join('');
        }
        // Set default amount to 1 point
        const amtInput = document.getElementById('deposit-amount');
        if (amtInput && amtInput.value == '1') amtInput.value = depositRate;

        updateDepPreview();
        const el = document.getElementById('deposit-history');
        if (!el) return;
        if (res.deposits.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No deposits yet</p></div>';
        } else {
            el.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Amount</th><th>Points</th><th>Note</th><th>Status</th><th>Time</th><th>Action</th></tr></thead><tbody>
                ${res.deposits.map(d => `<tr class="deposit-row" data-trade="${d.trade_no}" style="cursor:pointer;">
                    <td style="font-weight:700;color:var(--success);">$${parseFloat(d.amount_usdt).toFixed(2)}</td>
                    <td style="color:var(--accent-cyan-light);font-weight:600;">${d.points_credited}</td>
                    <td><code style="font-size:11px;color:var(--accent-purple-light);">${d.note || '—'}</code></td>
                    <td><span class="badge badge-${d.status === 'paid' ? 'success' : d.status === 'expired' || d.status === 'cancelled' || d.status === 'rejected' ? 'failed' : 'running'}">${d.status.toUpperCase()}</span></td>
                    <td style="font-size:11px;color:var(--text-muted);">${formatTime(d.created_at)}</td>
                    <td>${d.status === 'pending' ? `<button class="btn btn-danger btn-sm cancel-dep-btn" data-trade="${d.trade_no}">✖ Cancel</button>` : '—'}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
            // Attach event listeners
            el.querySelectorAll('.cancel-dep-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    cancelDeposit(this.dataset.trade);
                });
            });
            el.querySelectorAll('.deposit-row').forEach(row => {
                row.addEventListener('click', function() {
                    viewDepositDetail(this.dataset.trade);
                });
            });
        }
    }
}

function viewDepositDetail(tradeNo) {
    const d = (window._depositHistory || []).find(x => x.trade_no === tradeNo);
    if (!d) return;
    const payId = depositPayId;
    const amt = parseFloat(d.amount_usdt).toFixed(2);
    const statusClass = d.status === 'paid' ? 'success' : d.status === 'expired' || d.status === 'cancelled' || d.status === 'rejected' ? 'failed' : 'running';

    document.getElementById('tab-content').innerHTML = `
    <div class="card" style="max-width:560px;margin:0 auto;">
        <div class="card-header"><h3>📋 Deposit #${d.id}</h3></div>
        <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Amount</div>
                    <div style="font-size:22px;font-weight:800;color:var(--success);">$${amt}</div>
                </div>
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Points</div>
                    <div style="font-size:22px;font-weight:800;color:var(--accent-cyan-light);">${d.points_credited}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Note/Memo</div>
                    <div style="font-size:18px;font-weight:800;color:var(--accent-purple-light);letter-spacing:2px;">${d.note || '—'}</div>
                </div>
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Status</div>
                    <div style="margin-top:4px;"><span class="badge badge-${statusClass}" style="font-size:14px;padding:6px 14px;">${d.status.toUpperCase()}</span></div>
                </div>
            </div>
            <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px;">
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Pay ID</div>
                <div style="font-size:16px;font-weight:700;color:var(--accent-purple-light);">${payId}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">Created: ${formatTime(d.created_at)}${d.paid_at ? ' · Paid: ' + formatTime(d.paid_at) : ''}</div>
            ${d.status === 'pending' ? `
            <div id="deposit-check-status" style="margin-bottom:12px;"></div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                <button class="btn btn-ghost" onclick="switchTab('deposit')">← Back</button>
                <button class="btn btn-primary" id="ive-paid-btn" onclick="checkMyDeposit('${d.trade_no}')">✅ I've Paid — Check Now</button>
                <button class="btn btn-danger" onclick="cancelDeposit('${d.trade_no}')">✖ Cancel</button>
            </div>` : `
            <div style="display:flex;gap:8px;justify-content:center;">
                <button class="btn btn-ghost" onclick="switchTab('deposit')">← Back to Deposits</button>
            </div>`}
        </div>
    </div>`;
}

function updateDepPreview() {
    const el = document.getElementById('deposit-rate-info');
    const input = document.getElementById('deposit-amount');
    if (!el || !input) return;
    const amount = parseFloat(input.value) || 0;
    const points = Math.floor(amount / depositRate);
    el.innerHTML = `<span style="font-size:16px;font-weight:700;color:var(--accent-cyan-light);">${points}</span> points for <span style="font-weight:700;color:var(--success);">$${amount}</span> USDT <span style="font-size:11px;">(Price: $${depositRate}/pt)</span>`;
}

async function createDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
    const btn = document.getElementById('deposit-btn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    const res = await api('/deposit', { amount });
    if (res.success) {
        const payId = res.pay_id || depositPayId;
        const exactAmount = parseFloat(res.amount_usdt).toFixed(2);
        const tradeNo = res.trade_no;
        const note = res.note || '';
        // Show payment instructions
        document.getElementById('tab-content').innerHTML = `
        <div class="card" style="max-width:560px;margin:0 auto;">
            <div class="card-header"><h3>💳 Complete Your Deposit</h3></div>
            <div class="card-body" style="text-align:center;">
                <p style="color:var(--text-secondary);margin-bottom:24px;font-size:14px;">Send the amount below via <strong>Binance Pay</strong> to complete your deposit.</p>
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;">
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Send To (Binance Pay ID)</div>
                    <div style="font-size:22px;font-weight:800;color:var(--accent-purple-light);letter-spacing:2px;margin-bottom:8px;">${payId}</div>
                    <button class="btn btn-ghost btn-sm" onclick="copyText('${payId}')">📋 Copy ID</button>
                </div>
                <div style="background:rgba(0,0,0,0.3);border:1px solid var(--success);border-radius:12px;padding:20px;margin-bottom:16px;">
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Amount (USDT)</div>
                    <div style="font-size:28px;font-weight:900;color:var(--success);">$${exactAmount}</div>
                    <button class="btn btn-ghost btn-sm" onclick="copyText('${exactAmount}')">📋 Copy Amount</button>
                </div>
                <div style="background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.4);border-radius:12px;padding:20px;margin-bottom:16px;">
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">⚠️ Note / Memo (REQUIRED)</div>
                    <div style="font-size:24px;font-weight:900;color:var(--accent-purple-light);letter-spacing:3px;margin-bottom:8px;">${note}</div>
                    <button class="btn btn-ghost btn-sm" onclick="copyText('${note}')">📋 Copy Note</button>
                </div>
                <div style="background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;text-align:left;">
                    <div style="font-weight:700;color:var(--text-primary);margin-bottom:10px;font-size:13px;">📝 Transfer Steps:</div>
                    <ol style="color:var(--text-secondary);font-size:12px;line-height:2;margin:0;padding-left:18px;">
                        <li>Open <strong>Binance App</strong> → Pay → Send</li>
                        <li>Enter Pay ID: <strong style="color:var(--accent-purple-light);">${payId}</strong></li>
                        <li>Enter Amount: <strong style="color:var(--success);">$${exactAmount} USDT</strong></li>
                        <li>In the <strong>Note/Memo</strong> field, paste: <strong style="color:var(--accent-purple-light);">${note}</strong></li>
                        <li>Confirm and send the payment</li>
                        <li>Click <strong>"I've Paid"</strong> below to verify</li>
                    </ol>
                </div>
                <div style="background:rgba(255,200,0,0.08);border:1px solid rgba(255,200,0,0.3);border-radius:10px;padding:12px;margin-bottom:16px;">
                    <p style="color:var(--warning);font-size:12px;font-weight:600;margin:0;">⚠️ You MUST include the note <strong>${note}</strong> in your transfer. Without it, your payment won't be detected automatically.</p>
                </div>
                <div id="deposit-check-status" style="margin-bottom:12px;"></div>
                <div style="display:flex;gap:8px;justify-content:center;">
                    <button class="btn btn-ghost" onclick="switchTab('deposit')">← Back</button>
                    <button class="btn btn-primary" id="ive-paid-btn" onclick="checkMyDeposit('${tradeNo}')">✅ I've Paid — Check Now</button>
                </div>
            </div>
        </div>`;
        showToast('Deposit created! Follow the instructions to pay.', 'success');
    } else {
        showToast(res.error || 'Failed to create deposit', 'error');
    }
    btn.disabled = false;
    btn.textContent = '💳 Pay with Binance';
}

async function checkMyDeposit(tradeNo) {
    const btn = document.getElementById('ive-paid-btn');
    const status = document.getElementById('deposit-check-status');
    if (btn) { btn.disabled = true; btn.textContent = '🔄 Checking...'; }
    if (status) status.innerHTML = '<p style="color:var(--warning);font-size:13px;">⏳ Checking Binance for your payment...</p>';
    
    const res = await api('/deposit/check', { trade_no: tradeNo });
    
    if (res.success && res.status === 'paid') {
        if (status) status.innerHTML = '<p style="color:var(--success);font-size:14px;font-weight:700;">✅ Payment confirmed! Points credited.</p>';
        showToast('Payment confirmed! Points added.', 'success');
        setTimeout(() => { refreshData(); switchTab('deposit'); }, 2000);
    } else if (res.success && res.status === 'pending') {
        if (status) status.innerHTML = '<p style="color:var(--warning);font-size:13px;">⏳ Payment not detected yet. Try again in a moment.</p>';
        if (btn) { btn.disabled = false; btn.textContent = '✅ I\'ve Paid — Check Again'; }
    } else {
        if (status) status.innerHTML = `<p style="color:var(--error);font-size:13px;">${res.error || 'Check failed'}</p>`;
        if (btn) { btn.disabled = false; btn.textContent = '✅ I\'ve Paid — Check Again'; }
    }
}

async function cancelDeposit(tradeNo) {
    console.log('[CANCEL] clicked, trade_no:', tradeNo);
    showToast('Cancelling...', 'info');
    try {
        const res = await api('/deposit/cancel', { trade_no: tradeNo });
        console.log('[CANCEL] response:', JSON.stringify(res));
        if (res.success) {
            showToast('Deposit cancelled', 'success');
            switchTab('deposit');
        } else {
            showToast(res.error || 'Failed to cancel', 'error');
        }
    } catch (err) {
        console.error('[CANCEL] error:', err);
        showToast('Error: ' + err.message, 'error');
    }
}

// ===== Settings Tab =====
function renderSettingsTab() {
    const remaining = cdkData?.remaining || 0;
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
            <div class="card" style="margin-bottom:20px;">
                <div class="card-header"><h3>🔔 ${t('webhook_title')}</h3></div>
                <div class="card-body">
                    <p style="color:var(--text-secondary);margin-bottom:16px;font-size:13px;line-height:1.7;">${t('webhook_hint')}</p>
                    <div class="form-group">
                        <label>${t('webhook_url')}</label>
                        <input type="url" class="form-control" id="webhook-url" placeholder="https://your-bot.com/webhook">
                    </div>
                    <p style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">📡 ${t('webhook_events')}</p>
                    <button class="btn btn-primary" onclick="saveWebhook()" style="width:100%;">💾 ${t('save_btn')}</button>
                </div>
            </div>
        </div>
        <div>
            <div class="card" style="margin-bottom:20px;">
                <div class="card-header"><h3>🎟️ ${t('cdk_info_title')}</h3></div>
                <div class="card-body">
                    <div style="display:grid;gap:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:10px;">
                            <span style="color:var(--text-secondary);font-size:13px;">${t('cdk_code_label')}</span>
                            <code style="font-weight:700;color:var(--accent-purple-light);font-size:15px;letter-spacing:1px;">${activeCDK}</code>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:10px;">
                            <span style="color:var(--text-secondary);font-size:13px;">${t('cdk_remaining_label')}</span>
                            <span style="font-weight:800;color:var(--accent-cyan-light);font-size:20px;">${remaining}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body" style="text-align:center;">
                    <button class="btn btn-ghost" onclick="logout()" style="width:100%;">🚪 ${t('logout_btn')}</button>
                </div>
            </div>
        </div>
    </div>`;
}

// ===== Actions =====
async function submitOrder() {
    const email = document.getElementById('submit-email').value.trim();
    const password = document.getElementById('submit-password').value.trim();
    const twofa = document.getElementById('submit-twofa').value.trim();
    const task_type = document.getElementById('submit-type').value;
    if (!email || !password) { showToast(t('email') + ' & ' + t('password') + ' required', 'error'); return; }
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    const result = await api('/submit', { email, password, twofa, task_type });
    if (result.success) {
        showToast(t('msg_submitted'), 'success');
        cdkData.remaining = result.remaining_uses;
        await refreshData();
        switchTab('orders');
    } else { showToast(result.error || t('msg_error'), 'error'); }
    btn.disabled = false;
}

async function batchImport() {
    const text = document.getElementById('batch-input').value.trim();
    const task_type = document.getElementById('batch-type').value;
    if (!text) return showToast('Paste at least one account', 'error');
    const lines = text.split('\n').filter(l => l.trim());
    let submitted = 0, failed = 0;
    for (const line of lines) {
        // Smart delimiter: try ----, then |, then comma, then semicolon, then tab, then multiple spaces
        let parts;
        if (line.includes('----')) {
            parts = line.split('----').map(p => p.trim());
        } else if (line.includes('|')) {
            parts = line.split('|').map(p => p.trim());
        } else if (line.includes(';')) {
            parts = line.split(';').map(p => p.trim());
        } else if (line.includes(',')) {
            parts = line.split(',').map(p => p.trim());
        } else if (line.includes('\t')) {
            parts = line.split('\t').map(p => p.trim());
        } else if (line.includes('--')) {
            parts = line.split('--').map(p => p.trim());
        } else {
            // Try splitting by 2+ spaces
            parts = line.split(/\s{2,}/).map(p => p.trim());
        }
        parts = parts.filter(p => p.length > 0);
        if (parts.length < 2) continue;
        const [email, password, twofa] = parts;
        const result = await api('/submit', { email, password, twofa: twofa || '', task_type });
        if (result.success) submitted++; else failed++;
    }
    showToast(`${submitted}/${lines.length} orders submitted` + (failed ? ` (${failed} failed)` : ''), submitted > 0 ? 'success' : 'error');
    await refreshData();
}

async function cancelOrder(orderId) {
    const result = await api('/cancel', { order_id: orderId });
    if (result.success) { showToast(t('msg_cancelled'), 'success'); cdkData.remaining = result.remaining_uses; await refreshData(); }
    else showToast(result.error || t('msg_error'), 'error');
}

async function purchaseLink(orderId) {
    const result = await api('/purchase_link', { order_id: orderId });
    if (result.success) { showToast(t('msg_link_bought'), 'success'); copyText(result.offer_url); await refreshData(); }
    else showToast(result.error || t('msg_error'), 'error');
}

async function saveWebhook() {
    const url = document.getElementById('webhook-url').value.trim();
    const result = await api('/webhook', { webhook_url: url });
    if (result.success) showToast(t('msg_webhook_saved'), 'success');
    else showToast(result.error || t('msg_error'), 'error');
}

async function refreshData() {
    const [b, s, o] = await Promise.all([api('/balance'), api('/stats'), api('/orders')]);
    if (b.success) cdkData.remaining = b.remaining_uses;
    if (s.success) cdkData.stats = s.stats;
    if (o.success) orders = o.orders || [];
    renderStats();
    // Don't re-render submit tab while user might be typing
    if (currentTab !== 'submit') {
        renderTabContent();
    }
}

function filterOrders(status) { orderFilter = status; renderTabContent(); }

// ===== Helpers =====
function formatTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
}

// ===== Public CDK Creation =====
async function createPublicCDK() {
    // Check if already created one
    if (localStorage.getItem('cdk_created')) {
        const existingCode = localStorage.getItem('cdk_created');
        showToast(`You already created a CDK: ${existingCode}. Enter it above to activate.`, 'error');
        return;
    }

    const nameInput = document.getElementById('create-cdk-name');
    const name = nameInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!name || name.length < 2) {
        showToast('Enter a name (at least 2 letters/numbers)', 'error');
        return;
    }

    const btn = document.getElementById('create-cdk-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch('/api/create-cdk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();

        if (data.success) {
            // Save to localStorage to prevent creating another
            localStorage.setItem('cdk_created', data.code);
            
            // Show result
            const section = document.getElementById('create-cdk-section');
            section.innerHTML = `
                <div class="create-cdk-result">
                    <p style="font-size:13px;color:var(--success);font-weight:600;">✅ Your CDK has been created!</p>
                    <code>${data.code}</code>
                    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
                        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${data.code}');showToast('Copied!','success')">📋 Copy</button>
                        <button class="btn btn-primary btn-sm" onclick="document.getElementById('cdk-input').value='${data.code}';activateCDK()">⚡ Activate Now</button>
                    </div>
                    <p class="hint">Save this code! You can deposit points after activating.</p>
                </div>`;
            
            showToast(`CDK created: ${data.code}`, 'success');
        } else {
            showToast(data.error || 'Failed to create CDK', 'error');
        }
    } catch (err) {
        showToast('Network error, try again', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<span>Create</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    if (currentLang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
    }
    // Apply i18n to static elements
    setLang(currentLang);

    // Validate stored created CDK still exists on server
    const createSection = document.getElementById('create-cdk-section');
    const storedCreatedCDK = localStorage.getItem('cdk_created');
    if (createSection && storedCreatedCDK) {
        // Show it temporarily while checking
        createSection.innerHTML = `
            <div class="create-cdk-result">
                <p style="font-size:12px;color:var(--text-muted);">Your CDK</p>
                <code>${storedCreatedCDK}</code>
                <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="document.getElementById('cdk-input').value='${storedCreatedCDK}';activateCDK()">⚡ Activate</button>
            </div>`;
        // Verify it still exists on the server
        fetch('/api/v1/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cdkey: storedCreatedCDK })
        }).then(r => r.json()).then(data => {
            if (!data.success) {
                // CDK was deleted — clear localStorage and restore create form
                localStorage.removeItem('cdk_created');
                createSection.innerHTML = `
                    <div class="create-cdk-divider"><span>or</span></div>
                    <div class="create-cdk-card" id="create-cdk-card">
                        <p class="create-cdk-label">Don't have a CDK? Create one with your name</p>
                        <div class="cdk-card-inner">
                            <input type="text" class="cdk-input" id="create-cdk-name" placeholder="Your Name" autocomplete="off" spellcheck="false" maxlength="12" style="text-transform:uppercase;">
                            <button class="cdk-btn create-cdk-btn" id="create-cdk-btn" onclick="createPublicCDK()">
                                <span>Create</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                        </div>
                    </div>`;
                // Re-attach Enter key listener
                const newInput = document.getElementById('create-cdk-name');
                if (newInput) newInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') createPublicCDK(); });
            }
        }).catch(() => {});
    }

    if (activeCDK) {
        document.getElementById('cdk-input').value = activeCDK;
        loadDashboard();
    }

    document.getElementById('cdk-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') activateCDK();
    });

    const createNameInput = document.getElementById('create-cdk-name');
    if (createNameInput) {
        createNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') createPublicCDK();
        });
    }

    setInterval(() => { if (activeCDK && cdkData) refreshData(); }, 30000);
});
