/**
 * BrickByBrick - Authentication Module
 * Google Identity Services (GIS) & Customer Session Management
 */

const USER_SESSION_KEY = 'brickbybrick_user';
let pendingAuthRedirect = null;

// Parse Google JWT credential without external libraries
function parseGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google JWT token:', e);
    return null;
  }
}

// Config validation helper
function checkGoogleAuthConfigured() {
  if (typeof isGoogleAuthConfigured === 'function') {
    return isGoogleAuthConfigured();
  }
  const cid = window.BRICKBYBRICK_CONFIG?.GOOGLE_CLIENT_ID;
  if (!cid || typeof cid !== 'string') return false;
  const clean = cid.trim();
  if (clean === '' || /YOUR_GOOGLE|PASTE_YOUR|REPLACE_ME/i.test(clean)) return false;
  return true;
}

// Get current logged-in customer session
function getCurrentUser() {
  try {
    const data = localStorage.getItem(USER_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error reading user session:', e);
    return null;
  }
}

// Check if user is authenticated
function isAuthenticated() {
  const user = getCurrentUser();
  return !!(user && user.email);
}

// Save customer session (only standard profile info, no secrets)
function saveUserSession(userData) {
  try {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
    window.dispatchEvent(new CustomEvent('brickbybrick:auth-change', { detail: userData }));
    renderAuthUI();
  } catch (e) {
    console.error('Error saving user session:', e);
  }
}

// Sign out customer
function signOut() {
  try {
    localStorage.removeItem(USER_SESSION_KEY);
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  } catch (e) {
    console.error('Error signing out:', e);
  }
  window.dispatchEvent(new CustomEvent('brickbybrick:auth-change', { detail: null }));
  renderAuthUI();
  if (typeof showToast === 'function') {
    showToast('Signed out successfully');
  }
  if (document.body.dataset.page === 'checkout' || document.body.dataset.page === 'orders') {
    window.location.reload();
  }
}

// Callback when Google Sign-In credential response is received
function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    console.error('Invalid Google credential response');
    return;
  }

  const payload = parseGoogleJwt(response.credential);
  if (!payload) {
    alert('Failed to authenticate with Google. Please try again.');
    return;
  }

  const firstName = payload.given_name || payload.name?.split(' ')[0] || 'Builder';
  const customer = {
    name: payload.name || firstName,
    firstName: firstName,
    email: payload.email,
    picture: payload.picture || '',
    googleSub: payload.sub || '',
    idToken: response.credential // Kept for server-side verification in Apps Script
  };

  saveUserSession(customer);
  hideAuthModal();

  if (typeof showToast === 'function') {
    showToast(`Welcome back, ${customer.firstName}!`);
  }

  if (pendingAuthRedirect) {
    const target = pendingAuthRedirect;
    pendingAuthRedirect = null;
    if (typeof target === 'function') {
      target();
    } else if (typeof target === 'string') {
      window.location.href = target;
    }
  }
}

// Initialize Google Identity Services
function initGoogleIdentity() {
  const isConfigured = checkGoogleAuthConfigured();
  if (!isConfigured) {
    renderAuthUI();
    return;
  }

  const clientId = window.BRICKBYBRICK_CONFIG.GOOGLE_CLIENT_ID;

  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    // Retry in 200ms if script is still loading
    setTimeout(initGoogleIdentity, 200);
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    renderAuthUI();
    renderGoogleSignInElements();
  } catch (err) {
    console.error('Error initializing Google Identity Services:', err);
  }
}

// Render Google button in nav and modal targets
function renderGoogleSignInElements() {
  const isConfigured = checkGoogleAuthConfigured();
  if (!isConfigured || !window.google?.accounts?.id) return;

  const navContainer = document.getElementById('gsiNavBtn');
  const modalContainer = document.getElementById('gsiModalBtn');

  if (navContainer) {
    navContainer.innerHTML = '';
    try {
      window.google.accounts.id.renderButton(navContainer, {
        theme: 'outline',
        size: 'medium',
        type: 'standard',
        shape: 'rectangular',
        text: 'signin_with',
        logo_alignment: 'left',
        locale: 'en'
      });
    } catch (e) {
      console.warn('Could not render GIS nav button:', e);
    }
  }

  if (modalContainer) {
    modalContainer.innerHTML = '';
    try {
      window.google.accounts.id.renderButton(modalContainer, {
        theme: 'filled_blue',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'left',
        locale: 'en'
      });
    } catch (e) {
      console.warn('Could not render GIS modal button:', e);
    }
  }
}

// Render Navbar Auth State (Profile avatar, First Name, Dropdown OR Sign In button)
function renderAuthUI() {
  const user = getCurrentUser();
  const authContainer = document.getElementById('navAuthSlot');
  if (!authContainer) return;

  if (user && user.email) {
    // Authenticated state: Profile avatar + Name + Dropdown
    const avatarHtml = user.picture
      ? `<img src="${user.picture}" alt="${user.name}" class="nav-avatar-img">`
      : `<span class="nav-avatar-fallback">${(user.firstName || 'B').charAt(0).toUpperCase()}</span>`;

    authContainer.innerHTML = `
      <div class="user-menu-wrap" id="userMenuWrap">
        <button class="user-menu-btn" id="userMenuBtn" type="button" aria-expanded="false" aria-haspopup="true">
          ${avatarHtml}
          <span class="user-first-name">${user.firstName || 'Account'}</span>
          <span class="menu-arrow" aria-hidden="true">▾</span>
        </button>
        <div class="user-dropdown" id="userDropdown" role="menu" aria-label="Account menu">
          <div class="user-dropdown-header">
            <strong>${user.name}</strong>
            <span>${user.email}</span>
          </div>
          <hr class="dropdown-divider">
          <a href="orders.html" class="dropdown-item" role="menuitem">
            <span class="item-icon">📦</span> My Orders
          </a>
          <button type="button" class="dropdown-item sign-out-btn" id="signOutBtn" role="menuitem">
            <span class="item-icon">🚪</span> Sign Out
          </button>
        </div>
      </div>
    `;

    // Dropdown toggle logic
    const menuBtn = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userDropdown');
    const signOutBtn = document.getElementById('signOutBtn');

    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', isOpen);
      });

      document.addEventListener('click', (e) => {
        if (!authContainer.contains(e.target)) {
          dropdown.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        signOut();
      });
    }
  } else {
    // Unauthenticated state
    const isConfigured = checkGoogleAuthConfigured();

    if (isConfigured) {
      authContainer.innerHTML = `
        <div class="nav-gsi-wrapper" id="navGsiWrapper">
          <div id="gsiNavBtn" class="gsi-slot"></div>
        </div>
      `;
      renderGoogleSignInElements();
    } else {
      authContainer.innerHTML = `
        <span class="auth-unconfigured-tag">Google Sign-In is not configured.</span>
      `;
    }
  }
}

// Show "Sign in to continue" Modal
function showAuthModal(redirectOrAction) {
  if (redirectOrAction) {
    pendingAuthRedirect = redirectOrAction;
  }

  let modal = document.getElementById('authModal');
  if (!modal) {
    createAuthModalDOM();
    modal = document.getElementById('authModal');
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  renderGoogleSignInElements();

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.focus();
}

// Hide Auth Modal
function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

// Create the Auth Modal in DOM
function createAuthModalDOM() {
  const isConfigured = checkGoogleAuthConfigured();

  const modalHtml = `
    <div class="auth-modal-overlay" id="authModal" aria-hidden="true" role="dialog" aria-labelledby="authModalTitle">
      <div class="auth-modal-card pixel-frame">
        <button class="modal-close" type="button" aria-label="Close dialog">×</button>
        <div class="auth-modal-body">
          <div class="auth-modal-mark">B</div>
          <h2 id="authModalTitle">Sign in to continue</h2>
          <p class="auth-modal-sub">Sign in with your Google account to checkout, track your builds, and view your order history.</p>
          
          <div class="auth-action-area">
            <div id="gsiModalBtn" class="gsi-slot"></div>
            
            ${!isConfigured ? `
              <div class="config-notice">
                <p>Google Sign-In is not configured.</p>
              </div>
            ` : ''}
          </div>
          
          <p class="auth-terms">By continuing, you agree to build your world brick by brick. No passwords stored.</p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('authModal');
  const closeBtn = modal.querySelector('.modal-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', hideAuthModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideAuthModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      hideAuthModal();
    }
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initGoogleIdentity();
  renderAuthUI();
});
