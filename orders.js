/**
 * BrickByBrick - Orders Module
 * Customer Order History & Google Sheets Status Sync
 */

// Format date nicely: e.g. September 18, 2026
function formatOrderDate(dateString) {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString || 'Recently';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString || 'Recently';
  }
}

// Get status badge class and label
function getStatusBadgeHtml(status) {
  const s = (status || 'Pending').toLowerCase().trim();
  let badgeClass = 'status-pending';
  let icon = '⏳';

  if (s === 'order confirmed' || s === 'confirmed') {
    badgeClass = 'status-confirmed';
    icon = '✓';
  } else if (s === 'preparing') {
    badgeClass = 'status-preparing';
    icon = '🛠️';
  } else if (s === 'ready for delivery' || s === 'ready') {
    badgeClass = 'status-ready';
    icon = '📦';
  } else if (s === 'on the way' || s === 'shipped') {
    badgeClass = 'status-on-the-way';
    icon = '🚚';
  } else if (s === 'received' || s === 'delivered') {
    badgeClass = 'status-received';
    icon = '★';
  } else if (s === 'cancelled' || s === 'canceled') {
    badgeClass = 'status-cancelled';
    icon = '✕';
  }

  return `<span class="order-status-badge ${badgeClass}">${icon} ${status || 'Pending'}</span>`;
}

// Generate visual progress bar for active order stages
function getOrderProgressBarHtml(status) {
  const s = (status || 'Pending').toLowerCase().trim();

  if (s === 'cancelled' || s === 'canceled') {
    return `
      <div class="order-cancelled-banner">
        <span class="cancel-icon">✕</span>
        <span>This order was cancelled. If you believe this is a mistake, contact us at hello@brickbybrick.ph.</span>
      </div>
    `;
  }

  const stages = [
    { label: 'Pending', key: 'pending' },
    { label: 'Confirmed', key: 'order confirmed' },
    { label: 'Preparing', key: 'preparing' },
    { label: 'Ready', key: 'ready for delivery' },
    { label: 'On the Way', key: 'on the way' },
    { label: 'Received', key: 'received' }
  ];

  let activeIndex = 0;
  if (s === 'order confirmed' || s === 'confirmed') activeIndex = 1;
  else if (s === 'preparing') activeIndex = 2;
  else if (s === 'ready for delivery' || s === 'ready') activeIndex = 3;
  else if (s === 'on the way' || s === 'shipped') activeIndex = 4;
  else if (s === 'received' || s === 'delivered') activeIndex = 5;

  let stepsHtml = '';
  stages.forEach((stage, idx) => {
    let stateClass = 'step-todo';
    if (idx < activeIndex) stateClass = 'step-done';
    else if (idx === activeIndex) stateClass = 'step-active';

    stepsHtml += `
      <div class="progress-step ${stateClass}">
        <div class="step-dot">
          ${idx < activeIndex ? '✓' : (idx + 1)}
        </div>
        <span class="step-label">${stage.label}</span>
      </div>
    `;
  });

  return `
    <div class="order-progress-bar" aria-label="Order progress: ${status}">
      ${stepsHtml}
    </div>
  `;
}

// Fetch orders for customer
async function loadCustomerOrders() {
  const container = document.getElementById('ordersListContainer');
  const emptyState = document.getElementById('ordersEmptyState');
  const authPrompt = document.getElementById('ordersAuthPrompt');

  if (!container) return;

  const user = getCurrentUser();

  // If not authenticated, require sign in
  if (!user || !user.email) {
    if (container) container.innerHTML = '';
    if (emptyState) emptyState.classList.add('hidden');
    if (authPrompt) authPrompt.classList.remove('hidden');
    return;
  }

  if (authPrompt) authPrompt.classList.add('hidden');

  const userEmail = user.email.toLowerCase().trim();
  const localKey = `brickbybrick_orders_${userEmail}`;
  let orders = [];

  // 1. Read locally cached orders first
  try {
    const localRaw = localStorage.getItem(localKey);
    if (localRaw) {
      orders = JSON.parse(localRaw);
    }
  } catch (e) {
    console.error('Error reading local orders:', e);
  }

  // 2. Fetch latest live order statuses from Google Sheets Web App if configured
  const appsScriptUrl = window.BRICKBYBRICK_CONFIG?.APPS_SCRIPT_URL;
  const isUrlConfigured = typeof isAppsScriptConfigured === 'function'
    ? isAppsScriptConfigured()
    : !!(appsScriptUrl && !/YOUR_GOOGLE|PASTE_YOUR|REPLACE_ME/i.test(appsScriptUrl) && appsScriptUrl.includes('/exec'));

  if (isUrlConfigured) {
    try {
      const url = `${appsScriptUrl}?action=getOrders&email=${encodeURIComponent(userEmail)}&idToken=${encodeURIComponent(user.idToken || '')}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
        // Merge with local orders to get thumbnails/rich data while using Sheet's current status
        const sheetOrders = data.orders.map(so => {
          const matchingLocal = orders.find(lo => lo.orderId === so.orderId);
          return {
            orderId: so.orderId,
            timestamp: so.date || matchingLocal?.timestamp || new Date().toISOString(),
            status: so.status || 'Pending',
            total: so.total || matchingLocal?.total || 899,
            paymentMethod: so.paymentMethod || 'Cash on Delivery',
            itemsSummary: so.products,
            items: matchingLocal?.items || [],
            shipping: matchingLocal?.shipping || {
              street: so.street,
              barangay: so.barangay,
              city: so.city,
              province: so.province,
              postalCode: so.postalCode
            }
          };
        });

        // Use authoritative sheet orders
        orders = sheetOrders;
        // Update local cache
        localStorage.setItem(localKey, JSON.stringify(orders));
      }
    } catch (err) {
      console.warn('Could not fetch live orders from Google Sheets. Using local cache:', err);
    }
  }

  // 3. Render orders or empty state
  if (orders.length === 0) {
    if (container) container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  let html = '';
  orders.forEach(order => {
    const dateFormatted = formatOrderDate(order.timestamp || order.date);
    const statusBadge = getStatusBadgeHtml(order.status);
    
    // Build items preview
    let itemsHtml = '';
    if (Array.isArray(order.items) && order.items.length > 0) {
      itemsHtml = '<div class="order-items-preview">';
      order.items.forEach(item => {
        const prod = getProductById(item.character || item.id);
        const imgSrc = item.image || prod?.image || 'images/kuromi.png';
        itemsHtml += `
          <div class="order-mini-item">
            <div class="order-mini-thumb pixel-frame">
              <img src="${imgSrc}" alt="${item.character}">
            </div>
            <div class="order-mini-meta">
              <strong>${item.character}</strong>
              <span>Qty: ${item.quantity} × ${formatPrice(item.unitPrice || prod?.price || 899)}</span>
            </div>
          </div>
        `;
      });
      itemsHtml += '</div>';
    } else if (order.itemsSummary) {
      itemsHtml = `<p class="order-simple-summary"><strong>Items:</strong> ${order.itemsSummary}</p>`;
    }

    const shipping = order.shipping || {};
    const addressStr = [shipping.street, shipping.barangay, shipping.city, shipping.province, shipping.postalCode]
      .filter(Boolean)
      .join(', ');

    html += `
      <article class="order-card pixel-frame">
        <div class="order-card-header">
          <div class="order-id-group">
            <span class="order-id-label">ORDER #</span>
            <strong class="order-id-val">${order.orderId}</strong>
          </div>
          <div class="order-status-wrap">
            ${statusBadge}
          </div>
        </div>

        <div class="order-card-body">
          ${getOrderProgressBarHtml(order.status)}

          <div class="order-meta-grid">
            <div>
              <span class="meta-label">Placed On</span>
              <strong class="meta-val">${dateFormatted}</strong>
            </div>
            <div>
              <span class="meta-label">Payment Method</span>
              <strong class="meta-val">${order.paymentMethod || 'Cash on Delivery'}</strong>
            </div>
            <div>
              <span class="meta-label">Total Amount</span>
              <strong class="meta-val highlight">${formatPrice(order.total)}</strong>
            </div>
          </div>

          <div class="order-items-wrap">
            ${itemsHtml}
          </div>

          ${addressStr ? `
            <div class="order-shipping-summary">
              <span class="meta-label">Delivery Address:</span>
              <p class="address-text">${addressStr}</p>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  });

  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomerOrders();

  const authBtn = document.getElementById('ordersLoginBtn');
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      showAuthModal(() => {
        loadCustomerOrders();
      });
    });
  }

  window.addEventListener('brickbybrick:auth-change', () => {
    loadCustomerOrders();
  });
});
