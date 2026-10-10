/**
 * Global non-blocking toast notification system.
 * Replaces browser alert() which blocks the UI and causes the "dark screen" bug
 * when fired after a modal has already closed (backdrop stays, alert freezes everything).
 */

type ToastType = 'error' | 'success' | 'warning';

interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    error: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', icon: '✕' },
    success: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', icon: '✓' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⚠' },
};

let activeToast: HTMLDivElement | null = null;

export function showToast({ message, type = 'error', duration = 4000 }: ToastOptions) {
    // Remove existing toast
    if (activeToast) {
        activeToast.remove();
        activeToast = null;
    }

    const colors = COLORS[type];
    const toast = document.createElement('div');
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.tabIndex = 0;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 24px;
        border-radius: 16px;
        background: ${colors.bg};
        border: 1px solid ${colors.border};
        color: ${colors.text};
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        max-width: 90vw;
        animation: toastIn 0.3s ease-out;
        pointer-events: auto;
        cursor: pointer;
    `;

    const icon = document.createElement('span');
    icon.textContent = colors.icon;
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = 'width:24px;height:24px;border-radius:50%;background:' + colors.border + ';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0';

    const content = document.createElement('span');
    content.textContent = message;
    content.style.cssText = 'flex:1;line-height:1.4';

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar notificación');
    close.textContent = '×';
    close.style.cssText = 'border:0;background:transparent;color:inherit;font-size:20px;line-height:1;padding:0 0 2px 8px;cursor:pointer';
    toast.append(icon, content, close);

    const dismiss = () => {
        toast.style.animation = 'toastOut 0.2s ease-in forwards';
        setTimeout(() => { toast.remove(); if (activeToast === toast) activeToast = null; }, 200);
    };
    close.onclick = dismiss;
    toast.onclick = event => {
        if (event.target === toast) dismiss();
    };
    toast.onkeydown = event => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') dismiss();
    };

    // Inject animation keyframes if not present
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `
            @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(20px); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    activeToast = toast;

    // Auto-dismiss
    setTimeout(() => {
        if (activeToast === toast) {
            toast.style.animation = 'toastOut 0.2s ease-in forwards';
            setTimeout(() => { toast.remove(); if (activeToast === toast) activeToast = null; }, 200);
        }
    }, duration);
}

// Drop-in replacement for alert() — non-blocking
export function showError(message: string) {
    showToast({ message, type: 'error', duration: 5000 });
}

export function showSuccess(message: string) {
    showToast({ message, type: 'success', duration: 3000 });
}

export function showWarning(message: string) {
    showToast({ message, type: 'warning', duration: 4000 });
}
