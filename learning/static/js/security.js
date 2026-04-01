function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

function attachCsrfTokenToForms() {
    const token = getCsrfToken();
    if (!token) return;

    document.querySelectorAll('form').forEach((form) => {
        if (form.querySelector('input[name="csrf_token"]')) {
            return;
        }

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = token;
        form.appendChild(input);
    });
}

function csrfFetch(url, options = {}) {
    const token = getCsrfToken();
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('X-CSRFToken', token);
    }

    return fetch(url, {
        ...options,
        headers
    });
}

window.getCsrfToken = getCsrfToken;
window.attachCsrfTokenToForms = attachCsrfTokenToForms;
window.csrfFetch = csrfFetch;

document.addEventListener('DOMContentLoaded', attachCsrfTokenToForms);
