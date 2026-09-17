/**
 * BrickByBrick - Checkout Module
 * Form Validation, Order Generation & Google Apps Script Dispatcher
 */

// Generate Order ID in format: BBB-YYYYMMDD-XXXXXX
function generateOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `BBB-${year}${month}${day}-${randomCode}`;
}

// Prefill customer information from Google Auth session
function prefillCustomerInfo() {
  const user = getCurrentUser();
  const nameInput = document.getElementById('custName');
  const emailInput = document.getElementById('custEmail');
  const authNotice = document.getElementById('checkoutAuthNotice');

  if (user && user.email) {
    if (nameInput && !nameInput.value) nameInput.value = user.name || '';
    if (emailInput) {
      emailInput.value = user.email || '';
      emailInput.readOnly = true;
    }
    if (authNotice) {
      authNotice.innerHTML = `
        <div class="auth-pill">
          <span class="auth-check">✓</span>
          <span>Ordering as <strong>${user.name}</strong> (${user.email})</span>
        </div>
      `;
    }
  } else {
    if (authNotice) {
      authNotice.innerHTML = `
        <div class="auth-warning-box">
          <p>You are not signed in. Please sign in with your Google account to proceed with checkout.</p>
          <button type="button" class="button outline small-btn" id="checkoutLoginPromptBtn">
            Sign In with Google
          </button>
        </div>
      `;
      const promptBtn = document.getElementById('checkoutLoginPromptBtn');
      if (promptBtn) {
        promptBtn.addEventListener('click', () => {
          showAuthModal(() => {
            prefillCustomerInfo();
          });
        });
      }
    }
  }
}

// Render Order Summary in the checkout right sidebar
function renderCheckoutSummary() {
  const itemsContainer = document.getElementById('checkoutItemsList');
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const totalEl = document.getElementById('checkoutTotal');
  const cart = getCart();

  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="checkout-empty-cart">
        <p>Your cart is empty.</p>
        <a href="index.html" class="button primary small-btn">Return to Shop</a>
      </div>
    `;
    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) placeBtn.disabled = true;
    if (subtotalEl) subtotalEl.textContent = '₱0';
    if (totalEl) totalEl.textContent = '₱0';
    return;
  }

  let html = '';
  cart.forEach(item => {
    const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
    html += `
      <div class="checkout-item-row">
        <div class="checkout-item-thumb pixel-frame">
          <img src="${item.image}" alt="${item.character}">
          <span class="checkout-qty-badge">${item.quantity}</span>
        </div>
        <div class="checkout-item-info">
          <h4>${item.character} Display Set</h4>
          <span class="checkout-item-unit">${formatPrice(item.price)} each</span>
        </div>
        <div class="checkout-item-price">
          <strong>${formatPrice(itemTotal)}</strong>
        </div>
      </div>
    `;
  });

  itemsContainer.innerHTML = html;

  const subtotal = getCartSubtotal();
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(subtotal);
}

// Inline Form Validation
function validateCheckoutForm() {
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

  function setError(inputId, errorId, message) {
    isValid = false;
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (input) input.classList.add('has-error');
    if (err) err.textContent = message;
  }

  // 1. Check Google authentication
  if (!isAuthenticated()) {
    showAuthModal(() => {
      prefillCustomerInfo();
    });
    return false;
  }

  // 2. Name validation
  const name = document.getElementById('custName')?.value.trim();
  if (!name) {
    setError('custName', 'custNameError', 'Full name is required.');
  } else if (name.length < 2) {
    setError('custName', 'custNameError', 'Please enter a valid full name.');
  }

  // 3. Email validation
  const email = document.getElementById('custEmail')?.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    setError('custEmail', 'custEmailError', 'Please enter a valid email address.');
  }

  // 4. Phone validation
  const phone = document.getElementById('custPhone')?.value.trim();
  const phoneClean = phone.replace(/[^0-9]/g, '');
  if (!phone) {
    setError('custPhone', 'custPhoneError', 'Mobile phone number is required.');
  } else if (phoneClean.length < 7) {
    setError('custPhone', 'custPhoneError', 'Please enter a valid phone number (min 7 digits).');
  }

  // 5. Street Address validation
  const street = document.getElementById('custStreet')?.value.trim();
  if (!street) {
    setError('custStreet', 'custStreetError', 'Street address / House number is required.');
  }

  // 6. Barangay validation
  const barangay = document.getElementById('custBarangay')?.value.trim();
  if (!barangay) {
    setError('custBarangay', 'custBarangayError', 'Barangay is required.');
  }

  // 7. City validation
  const city = document.getElementById('custCity')?.value.trim();
  if (!city) {
    setError('custCity', 'custCityError', 'City or Municipality is required.');
  }

  // 8. Province validation
  const province = document.getElementById('custProvince')?.value.trim();
  if (!province) {
    setError('custProvince', 'custProvinceError', 'Province is required.');
  }

  // 9. Postal code validation
  const postalCode = document.getElementById('custPostalCode')?.value.trim();
  if (!postalCode) {
    setError('custPostalCode', 'custPostalCodeError', 'Postal / ZIP code is required.');
  }

  // 10. Cart check
  const cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty. Please add items to checkout.');
    return false;
  }

  return isValid;
}

// Handle Order Submission
async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (!validateCheckoutForm()) {
    return;
  }

  const placeBtn = document.getElementById('placeOrderBtn');
  const btnText = document.getElementById('placeOrderText');
  const btnSpinner = document.getElementById('placeOrderSpinner');
  const globalError = document.getElementById('checkoutGlobalError');

  // Disable button and show spinner
  if (placeBtn) placeBtn.disabled = true;
  if (btnText) btnText.textContent = 'PLACING ORDER...';
  if (btnSpinner) btnSpinner.classList.remove('hidden');
  if (globalError) globalError.textContent = '';

  const user = getCurrentUser();
  const cart = getCart();
  const orderId = generateOrderId();
  const timestamp = new Date().toISOString();
  const subtotal = getCartSubtotal();

  const orderPayload = {
    orderId: orderId,
    timestamp: timestamp,
    customer: {
      name: document.getElementById('custName')?.value.trim(),
      email: document.getElementById('custEmail')?.value.trim(),
      googleSub: user?.googleSub || ''
    },
    shipping: {
      phone: document.getElementById('custPhone')?.value.trim(),
      street: document.getElementById('custStreet')?.value.trim(),
      barangay: document.getElementById('custBarangay')?.value.trim(),
      city: document.getElementById('custCity')?.value.trim(),
      province: document.getElementById('custProvince')?.value.trim(),
      postalCode: document.getElementById('custPostalCode')?.value.trim()
    },
    items: cart.map(item => ({
      character: item.character,
      id: item.id,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 899,
      subtotal: (Number(item.price) || 899) * (Number(item.quantity) || 1),
      image: item.image
    })),
    subtotal: subtotal,
    shippingFee: 0,
    total: subtotal,
    paymentMethod: "Cash on Delivery",
    status: "Pending",
    idToken: user?.idToken || ''
  };

  const appsScriptUrl = window.BRICKBYBRICK_CONFIG?.APPS_SCRIPT_URL;
  const isUrlConfigured = typeof isAppsScriptConfigured === 'function'
    ? isAppsScriptConfigured()
    : !!(appsScriptUrl && !/YOUR_GOOGLE|PASTE_YOUR|REPLACE_ME/i.test(appsScriptUrl) && appsScriptUrl.includes('/exec'));

  try {
    if (isUrlConfigured) {
      // Send POST request to Google Apps Script Web App
      // Using text/plain to avoid CORS preflight issues natively with Apps Script
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(orderPayload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Google Sheets automation error');
      }

      if (result.total) {
        orderPayload.total = result.total;
        orderPayload.subtotal = result.total;
      }
    } else {
      console.warn('Apps Script URL not configured yet. Saving order locally for demonstration.');
      // Simulate network delay for realism
      await new Promise(res => setTimeout(res, 800));
    }

    // Save order locally for immediate client confirmation and My Orders view
    saveOrderLocally(orderPayload);

    // Clear cart
    clearCart();

    // Redirect to Order Confirmation page
    window.location.href = `order-success.html?orderId=${encodeURIComponent(orderPayload.orderId)}`;

  } catch (err) {
    console.error('Order submission failed:', err);

    // User-friendly error message - do not expose raw technical stack traces
    if (globalError) {
      globalError.textContent = "We couldn't place your order. Please try again.";
    }

    // Re-enable button
    if (placeBtn) placeBtn.disabled = false;
    if (btnText) btnText.textContent = 'PLACE ORDER';
    if (btnSpinner) btnSpinner.classList.add('hidden');
  }
}

// Save order to localStorage for instant local retrieval
function saveOrderLocally(order) {
  try {
    localStorage.setItem('brickbybrick_last_order', JSON.stringify(order));

    const userEmail = (order.customer?.email || '').toLowerCase().trim();
    const storageKey = `brickbybrick_orders_${userEmail || 'guest'}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.unshift(order);
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch (e) {
    console.error('Error saving order locally:', e);
  }
}

// Initialize Checkout Page
document.addEventListener('DOMContentLoaded', () => {
  prefillCustomerInfo();
  renderCheckoutSummary();

  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }

  window.addEventListener('brickbybrick:auth-change', () => {
    prefillCustomerInfo();
  });
});
