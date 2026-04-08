// API Base URL
const API_BASE_URL = window.location.origin;

// Token management
function getToken() {
    return localStorage.getItem('access_token');
}

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function isClientAuthenticated() {
    return Boolean(getToken() || getUser());
}

function syncAuthUI() {
    const body = document.body;
    const serverAuthenticated = body && body.dataset.serverAuthenticated === 'true';
    const clientAuthenticated = isClientAuthenticated();

    if (!serverAuthenticated && clientAuthenticated) {
        removeToken();
    }

    const authenticated = serverAuthenticated;
    const role = (body && body.dataset.userRole) || (getUser() && getUser().role) || '';

    const loggedInNav = document.getElementById('authLoggedInNav');
    const loggedInLogoutNav = document.getElementById('authLoggedInLogoutNav');
    const loggedOutNav = document.getElementById('authLoggedOutNav');

    if (loggedInNav) {
        loggedInNav.style.display = authenticated ? '' : 'none';
    }
    if (loggedInLogoutNav) {
        loggedInLogoutNav.style.display = authenticated ? '' : 'none';
    }
    if (loggedOutNav) {
        loggedOutNav.style.display = authenticated ? 'none' : '';
    }

    const sidebarLogoutWrapper = document.getElementById('sidebarLogoutWrapper');
    if (sidebarLogoutWrapper) {
        sidebarLogoutWrapper.style.display = authenticated && role !== 'Guest' ? '' : 'none';
    }
}

let adminIdleLogoutTimer = null;
let lastAdminHeartbeatAt = 0;
let adminIdleLogoutInitialized = false;

function stopAdminIdleTimers() {
    if (adminIdleLogoutTimer) {
        clearTimeout(adminIdleLogoutTimer);
        adminIdleLogoutTimer = null;
    }
}

function pingAdminHeartbeat() {
    csrfFetch('/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
        // Ignore transient heartbeat failures; the idle logout timer still protects the session.
    });
}

function setupAdminIdleLogout() {
    const body = document.body;
    const serverAuthenticated = body && body.dataset.serverAuthenticated === 'true';
    const role = body && body.dataset.userRole;

    stopAdminIdleTimers();

    if (!serverAuthenticated || role !== 'Admin') {
        return;
    }

    const idleLimitMs = 10 * 60 * 1000;
    const heartbeatIntervalMs = 60 * 1000;
    const activityEvents = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    const resetIdleTimer = () => {
        if (adminIdleLogoutTimer) {
            clearTimeout(adminIdleLogoutTimer);
        }
        adminIdleLogoutTimer = setTimeout(() => {
            logout();
        }, idleLimitMs);

        const now = Date.now();
        if (now - lastAdminHeartbeatAt >= heartbeatIntervalMs) {
            lastAdminHeartbeatAt = now;
            pingAdminHeartbeat();
        }
    };

    if (!adminIdleLogoutInitialized) {
        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, resetIdleTimer, { passive: true });
        });

        window.addEventListener('focus', resetIdleTimer);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                resetIdleTimer();
            }
        });
        adminIdleLogoutInitialized = true;
    }

    resetIdleTimer();
}

async function refreshAuthStateFromServer() {
    const body = document.body;
    if (!body) return;

    try {
        const response = await fetch('/auth/status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Auth status request failed');
        }

        const data = await response.json();
        body.dataset.serverAuthenticated = data.authenticated ? 'true' : 'false';
        body.dataset.userRole = data.role || '';

        if (!data.authenticated) {
            removeToken();
        }
    } catch (error) {
        // Fall back to the template-rendered auth state if the check fails.
    } finally {
        syncAuthUI();
        setupAdminIdleLogout();
    }
}

function bindSecurityInteractions() {
    const sidebarLogoutButton = document.getElementById('sidebarLogoutButton');
    if (sidebarLogoutButton) {
        sidebarLogoutButton.addEventListener('click', logout);
    }

    const profileLogoutButton = document.getElementById('profileLogoutButton');
    if (profileLogoutButton) {
        profileLogoutButton.addEventListener('click', logout);
    }

    document.querySelectorAll('form[data-confirm]').forEach((form) => {
        if (form.dataset.confirmBound === 'true') return;
        form.dataset.confirmBound = 'true';
        form.addEventListener('submit', (event) => {
            const message = form.getAttribute('data-confirm') || 'Are you sure?';
            if (!window.confirm(message)) {
                event.preventDefault();
            }
        });
    });

    const guestResetSelect = document.getElementById('guest_id');
    const guestResetForm = document.getElementById('guest-password-reset-form');
    if (guestResetSelect && guestResetForm && guestResetSelect.dataset.resetActionBase) {
        guestResetSelect.addEventListener('change', function () {
            const base = this.dataset.resetActionBase;
            guestResetForm.action = this.value ? `${base}/${this.value}/reset-password` : '#';
        });
    }

    document.querySelectorAll('[data-image-fallback="true"]').forEach((image) => {
        if (image.dataset.fallbackBound === 'true') return;
        image.dataset.fallbackBound = 'true';
        image.addEventListener('error', () => {
            image.style.display = 'none';
            if (image.nextElementSibling) {
                image.nextElementSibling.style.display = 'block';
            }
        });
    });
}

// API call helper
async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await csrfFetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Logout function
function logout() {
    removeToken();
    csrfFetch('/auth/logout', {
        method: 'POST'
    }).finally(() => {
        window.location.replace('/');
    });
}

// Active link highlighting
document.addEventListener('DOMContentLoaded', function () {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    syncAuthUI();
    refreshAuthStateFromServer();
    bindSecurityInteractions();
});

window.addEventListener('pageshow', function () {
    refreshAuthStateFromServer();
    bindSecurityInteractions();
});

// Sidebar is always visible; no toggle logic needed

// Date formatting
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Currency formatting
function formatCurrency(amount) {
    return `Rs. ${parseFloat(amount).toFixed(2)}`;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.role = 'alert';
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'alert');
    toast.appendChild(messageSpan);
    toast.appendChild(closeButton);

    document.getElementById('toastContainer').appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Form validation helper
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    return isValid;
}

// Loading spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

// Book Offer button logic (global, always active)
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.book-offer-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const offer = encodeURIComponent(this.getAttribute('data-offer'));
            window.location.href = `/guest/book?offer=${offer}`;
        });
    });
});

// Room filter button toggle logic (homepage)
document.addEventListener('DOMContentLoaded', function () {
    const filterBtns = document.querySelectorAll('.section-title ~ .d-flex .btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                // If already active, toggle off (optional: only if you want deselection)
                if (this.classList.contains('active')) {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    // Optionally, you can call filterRooms('all', this) or similar to reset
                } else {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
    }
});
