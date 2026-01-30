import React from 'react';
import { Minus, Square, X } from 'lucide-react';

declare global {
    interface Window {
        electronAPI?: {
            minimizeWindow: () => void;
            maximizeWindow: () => void;
            closeWindow: () => void;
            isElectron: boolean;
            platform: string;
        };
    }
}

const WindowControls: React.FC = () => {
    const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
    const isMac = typeof window !== 'undefined' && window.electronAPI?.platform === 'darwin';

    // Don't render on web or macOS (macOS has native traffic lights)
    if (!isElectron || isMac) {
        return null;
    }

    return (
        <div className="flex items-center gap-1 -webkit-app-region-no-drag">
            <button
                onClick={() => window.electronAPI?.minimizeWindow()}
                className="p-2 hover:bg-zinc-700/50 rounded transition-colors"
                title="Minimizar"
            >
                <Minus size={14} className="text-zinc-400" />
            </button>
            <button
                onClick={() => window.electronAPI?.maximizeWindow()}
                className="p-2 hover:bg-zinc-700/50 rounded transition-colors"
                title="Maximizar"
            >
                <Square size={12} className="text-zinc-400" />
            </button>
            <button
                onClick={() => window.electronAPI?.closeWindow()}
                className="p-2 hover:bg-rose-500/80 rounded transition-colors group"
                title="Fechar"
            >
                <X size={14} className="text-zinc-400 group-hover:text-white" />
            </button>
        </div>
    );
};

export default WindowControls;
