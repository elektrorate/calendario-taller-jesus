import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Eliminar',
    cancelText = 'Cancelar',
    isDestructive = true,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 md:p-10 soft-shadow relative text-center border border-neutral-border" onClick={e => e.stopPropagation()}>

                {isDestructive ? (
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                )}

                <h3 className="text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight mb-3">
                    {title}
                </h3>

                <p className="text-[14px] font-medium text-neutral-textSec mb-8 px-2 max-w-[280px] mx-auto leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-4 bg-neutral-alt text-neutral-textSec rounded-2xl font-extrabold uppercase tracking-widest text-[11px] hover:bg-neutral-border transition-colors outline-none focus:ring-2 focus:ring-neutral-border"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-4 rounded-2xl font-extrabold uppercase tracking-widest text-[11px] text-white soft-shadow hover:opacity-90 transition-opacity outline-none focus:ring-2 focus:ring-offset-2 ${isDestructive ? 'bg-red-500 focus:ring-red-500' : 'bg-brand focus:ring-brand'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
