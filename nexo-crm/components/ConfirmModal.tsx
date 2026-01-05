import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    hideCancel?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
    hideCancel = false
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'bg-rose-500/10 text-rose-500',
            button: 'bg-rose-500 hover:bg-rose-600 text-white'
        },
        warning: {
            icon: 'bg-amber-500/10 text-amber-500',
            button: 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
        },
        info: {
            icon: 'bg-indigo-500/10 text-indigo-500',
            button: 'bg-indigo-500 hover:bg-indigo-600 text-white'
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#0c0c0e] border border-zinc-800 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className={`mx-auto w-16 h-16 rounded-3xl mb-6 flex items-center justify-center ${colors[type].icon}`}>
                    <AlertTriangle size={32} />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 text-center px-4">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-8 text-center px-4">
                    {message}
                </p>

                <div className="flex gap-3 px-2">
                    {!hideCancel && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-bold text-xs bg-[#121214] border border-zinc-800 text-zinc-500 hover:text-white transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-4 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-lg ${hideCancel ? 'w-full' : ''} ${colors[type].button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
