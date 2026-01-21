import React, { useState, useEffect } from 'react';
import { Tag as TagIcon, Plus, Trash2, Edit2, Check, X, Palette } from 'lucide-react';
import { Tag, tagsService } from '../src/lib/tagsService';
import { useAuth } from '../src/lib/AuthProvider';

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Rose
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#14b8a6', // Teal
];

interface LabelsProps {
    tags: Tag[];
    onTagsUpdate: (tags: Tag[]) => void;
}

const Labels: React.FC<LabelsProps> = ({ tags, onTagsUpdate }) => {
    const { effectiveUserId, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    // Estado para modal de exclusão
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; tag: Tag | null }>({
        isOpen: false,
        tag: null
    });

    // Reload tags when auth is ready (if not already loaded from parent)
    useEffect(() => {
        if (!authLoading && effectiveUserId && tags.length === 0) {
            console.log('[Labels] Tags empty, fetching...');
            loadTags();
        }
    }, [authLoading, effectiveUserId, tags.length]);

    const loadTags = async () => {
        setLoading(true);
        const data = await tagsService.listTags();
        console.log('[Labels] Loaded tags:', data.length);
        onTagsUpdate(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;

        const tag = await tagsService.createTag(newTagName.trim(), newTagColor);
        if (tag) {
            onTagsUpdate([...tags, tag].sort((a, b) => a.name.localeCompare(b.name)));
            setNewTagName('');
            setIsAdding(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        const success = await tagsService.updateTag(id, { name: editName.trim(), color: editColor });
        if (success) {
            onTagsUpdate(tags.map(t => t.id === id ? { ...t, name: editName.trim(), color: editColor } : t).sort((a, b) => a.name.localeCompare(b.name)));
            setEditingId(null);
        }
    };

    const openDeleteModal = (tag: Tag) => {
        setDeleteModal({ isOpen: true, tag });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, tag: null });
    };

    const confirmDelete = async () => {
        if (!deleteModal.tag) return;

        const success = await tagsService.deleteTag(deleteModal.tag.id);
        if (success) {
            onTagsUpdate(tags.filter(t => t.id !== deleteModal.tag!.id));
        }
        closeDeleteModal();
    };

    return (
        <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar bg-[#0c0c0e]">
            <header className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Gerenciar Etiquetas</h1>
                    <p className="text-zinc-500 text-sm">Crie etiquetas personalizadas para organizar seus contatos.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Plus size={14} />
                        Nova Etiqueta
                    </button>
                )}
            </header>

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Form de Criação */}
                {isAdding && (
                    <div className="bg-[#0c0c0e] border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] animate-in fade-in slide-in-from-top-4 duration-300">
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Nova Etiqueta</h3>
                                <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Nome da Etiqueta</label>
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        placeholder="Ex: Cliente VIP, Urgente..."
                                        className="w-full px-5 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                                        <Palette size={12} /> Cor Selecionada
                                    </label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-zinc-900/30 rounded-2xl border border-zinc-800/30">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setNewTagColor(color)}
                                                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${newTagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#09090b] scale-110' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                                                style={{ backgroundColor: color }}
                                            >
                                                {newTagColor === color && <Check size={14} className="text-white drop-shadow-md" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                                >
                                    <Check size={16} /> Criar Etiqueta
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Lista de Etiquetas */}
                <div className="bg-[#0c0c0e] border border-zinc-800/40 rounded-[2.5rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316] overflow-hidden">
                    <div className="px-8 py-6 border-b border-zinc-800/50 flex items-center gap-3 bg-zinc-900/10">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <TagIcon size={16} className="text-indigo-400" />
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                            Etiquetas Cadastradas
                            <span className="text-zinc-100 ml-2 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/50">{tags.length}</span>
                        </div>
                    </div>

                    <div className="p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        ) : tags.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center gap-4">
                                <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800 opacity-20">
                                    <TagIcon size={32} className="text-zinc-500" />
                                </div>
                                <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest">Nenhuma etiqueta criada ainda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tags.map(tag => (
                                    <div
                                        key={tag.id}
                                        className="group p-1 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl transition-all hover:bg-zinc-900/50 hover:border-zinc-700/50"
                                    >
                                        {editingId === tag.id ? (
                                            <div className="p-3 space-y-4">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                                                    autoFocus
                                                />
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {PRESET_COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => setEditColor(c)}
                                                            className={`w-5 h-5 rounded-full ${editColor === c ? 'ring-1 ring-white ring-offset-1 ring-offset-[#0c0c0e]' : 'opacity-40 hover:opacity-100'}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 justify-end pt-2">
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 text-zinc-500 hover:text-zinc-200"><X size={14} /></button>
                                                    <button onClick={() => handleUpdate(tag.id)} className="p-1.5 text-emerald-500 hover:text-emerald-400"><Check size={14} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                                        <TagIcon size={14} />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-zinc-200 uppercase tracking-tight">{tag.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(tag.id);
                                                            setEditName(tag.name);
                                                            setEditColor(tag.color);
                                                        }}
                                                        className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(tag)}
                                                        className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação de Exclusão */}
            {deleteModal.isOpen && deleteModal.tag && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                        {/* Ícone */}
                        <div className="mx-auto w-16 h-16 rounded-2xl mb-6 flex items-center justify-center bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                            <Trash2 size={28} className="text-rose-500" />
                        </div>

                        {/* Conteúdo */}
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                                Excluir Etiqueta
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                Tem certeza que deseja excluir a etiqueta{' '}
                                <span
                                    className="font-bold px-2 py-0.5 rounded-lg"
                                    style={{
                                        backgroundColor: deleteModal.tag.color + '20',
                                        color: deleteModal.tag.color
                                    }}
                                >
                                    {deleteModal.tag.name}
                                </span>
                                ?
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
                                Ela será removida de todos os contatos.
                            </p>
                        </div>

                        {/* Botões */}
                        <div className="flex gap-3">
                            <button
                                onClick={closeDeleteModal}
                                className="flex-1 py-3.5 px-6 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3.5 px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Labels;
