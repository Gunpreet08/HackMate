// Simple, reusable popup modal for prompts and notifications
function showPopup({
    title = '',
    message = '',
    input = false,
    inputPlaceholder = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm = null,
    onCancel = null,
    inputType = 'text',
    inputValue = ''
}) {
    // Remove existing popup if present
    const existing = document.getElementById('custom-popup-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-popup-modal';
    modal.className = 'custom-popup-modal';
    modal.innerHTML = `
        <div class="custom-popup-content">
            <span class="custom-popup-close" tabindex="0">&times;</span>
            ${title ? `<h3>${title}</h3>` : ''}
            <div class="custom-popup-message">${message}</div>
            ${input ? `<input type="${inputType}" class="custom-popup-input" placeholder="${inputPlaceholder}" value="${inputValue}">` : ''}
            <div class="custom-popup-actions">
                <button class="custom-popup-confirm">${confirmText}</button>
                ${onCancel ? `<button class="custom-popup-cancel">${cancelText}</button>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    const closePopup = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 200);
    };

    // Close on X or ESC
    modal.querySelector('.custom-popup-close').onclick = closePopup;
    modal.querySelector('.custom-popup-close').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') closePopup(); };
    if (onCancel) {
        modal.querySelector('.custom-popup-cancel').onclick = () => { closePopup(); onCancel && onCancel(); };
    }
    modal.querySelector('.custom-popup-confirm').onclick = () => {
        let val = input ? modal.querySelector('.custom-popup-input').value : undefined;
        closePopup();
        onConfirm && onConfirm(val);
    };
    if (input) {
        modal.querySelector('.custom-popup-input').focus();
        modal.querySelector('.custom-popup-input').onkeydown = (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('.custom-popup-confirm').click();
            }
        };
    }
    // Prevent click outside from closing, but could add if wanted
}

// For notifications (success/error/info)
function showToast(message, type = 'info', duration = 2500) {
    const toast = document.createElement('div');
    toast.className = `custom-toast custom-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, duration);
}
