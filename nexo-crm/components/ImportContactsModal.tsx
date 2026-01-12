import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { parseContactsFile, ParsedContact } from '../src/lib/formatters';
import { leadsService } from '../src/lib/leadsService';
import { Lead } from '../types';

interface ImportContactsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: (newLeads: Lead[]) => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

const ImportContactsModal: React.FC<ImportContactsModalProps> = ({
    isOpen,
    onClose,
    onImportComplete
}) => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
    const [hasHeader, setHasHeader] = useState(true);
    const [fileName, setFileName] = useState('');
    const [importResult, setImportResult] = useState<{ created: number; errors: number }>({ created: 0, errors: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setStep('upload');
        setParsedContacts([]);
        setHasHeader(true);
        setFileName('');
        setImportResult({ created: 0, errors: 0 });
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const contacts = parseContactsFile(content, hasHeader);
            setParsedContacts(contacts);
            setStep('preview');
        };
        reader.readAsText(file);
    }, [hasHeader]);

    const handleReparse = useCallback(() => {
        if (fileInputRef.current?.files?.[0]) {
            const file = fileInputRef.current.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const contacts = parseContactsFile(content, hasHeader);
                setParsedContacts(contacts);
            };
            reader.readAsText(file);
        }
    }, [hasHeader]);

    const handleImport = useCallback(async () => {
        setStep('importing');

        const validContacts = parsedContacts.filter(c => c.isValid);
        console.log('[Import] Contatos válidos:', validContacts.length);
        console.log('[Import] Primeiro contato:', validContacts[0]);

        const leadsToCreate = validContacts.map(c => ({
            name: c.name,
            phone: c.phone,
            avatar: null,
            status: 'Novos Leads',
            email: null,
            company_name: null,
            last_message: null,
            dados: null,
            dataHora_Agendamento: null,
            servico_interesse: null
        }));

        try {
            const result = await leadsService.createLeadsBatch(leadsToCreate as Omit<Lead, 'id' | 'user_id'>[]);
            const invalidCount = parsedContacts.filter(c => !c.isValid).length;

            setImportResult({
                created: result.created.length,
                errors: invalidCount + result.errorCount
            });

            setStep('complete');

            if (result.created.length > 0) {
                onImportComplete(result.created);
            }
        } catch (error) {
            console.error('Import error:', error);
            setImportResult({
                created: 0,
                errors: parsedContacts.length
            });
            setStep('complete');
        }
    }, [parsedContacts, onImportComplete]);

    const validCount = parsedContacts.filter(c => c.isValid).length;
    const invalidCount = parsedContacts.filter(c => !c.isValid).length;

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-[#0c0c0e] border border-zinc-800/80 rounded-[2rem] shadow-[0_25px_100px_rgba(0,0,0,0.9)] w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto animate-in zoom-in-95 fade-in duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
                        <div>
                            <h2 className="text-lg font-bold text-zinc-100">Importar Contatos</h2>
                            <p className="text-xs text-zinc-500 mt-1">Faça upload de arquivo CSV ou texto com nome e telefone</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {step === 'upload' && (
                            <div className="space-y-6">
                                {/* Upload Area */}
                                <div
                                    className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center hover:border-indigo-500/50 transition-colors cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                        <Upload size={28} className="text-indigo-400" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-300 mb-2">Clique para selecionar arquivo</p>
                                    <p className="text-xs text-zinc-500">Suporte para CSV e arquivos de texto</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt,.text"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>

                                {/* Options */}
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hasHeader}
                                            onChange={(e) => setHasHeader(e.target.checked)}
                                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/50"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-zinc-300">Primeira linha é cabeçalho</span>
                                            <p className="text-xs text-zinc-500">Marque se seu arquivo tem títulos de coluna</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Format Info */}
                                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                        <div className="text-xs text-zinc-400">
                                            <p className="font-medium text-zinc-300 mb-1">Formato esperado:</p>
                                            <p>Cada linha deve conter <span className="text-indigo-400">Nome,Telefone</span> separados por vírgula, ponto-e-vírgula ou tab.</p>
                                            <p className="mt-2 text-zinc-500">Exemplo: Maria Silva,99 91372552</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'preview' && (
                            <div className="space-y-4">
                                {/* File Info */}
                                <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                                    <FileText size={20} className="text-indigo-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-zinc-200">{fileName}</p>
                                        <p className="text-xs text-zinc-500">{parsedContacts.length} linhas encontradas</p>
                                    </div>
                                    <button
                                        onClick={resetState}
                                        className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        Trocar arquivo
                                    </button>
                                </div>

                                {/* Header Option */}
                                <div className="flex items-center gap-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hasHeader}
                                            onChange={(e) => {
                                                setHasHeader(e.target.checked);
                                                setTimeout(handleReparse, 0);
                                            }}
                                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
                                        />
                                        <span className="text-xs text-zinc-400">Primeira linha é cabeçalho</span>
                                    </label>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-emerald-400">{validCount}</div>
                                        <div className="text-xs text-emerald-400/80 font-medium">Válidos</div>
                                    </div>
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-rose-400">{invalidCount}</div>
                                        <div className="text-xs text-rose-400/80 font-medium">Inválidos</div>
                                    </div>
                                </div>

                                {/* Preview Table */}
                                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                                    <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800">
                                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pré-visualização</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Status</th>
                                                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Nome</th>
                                                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Telefone</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {parsedContacts.slice(0, 50).map((contact, idx) => (
                                                    <tr key={idx} className={contact.isValid ? '' : 'bg-rose-500/5'}>
                                                        <td className="px-4 py-2">
                                                            {contact.isValid ? (
                                                                <CheckCircle size={14} className="text-emerald-400" />
                                                            ) : (
                                                                <XCircle size={14} className="text-rose-400" />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-xs text-zinc-300">{contact.name || '-'}</td>
                                                        <td className="px-4 py-2">
                                                            {contact.isValid ? (
                                                                <span className="text-xs text-zinc-300 font-mono">{contact.phone}</span>
                                                            ) : (
                                                                <span className="text-xs text-rose-400">{contact.error || contact.originalPhone}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {parsedContacts.length > 50 && (
                                            <div className="px-4 py-2 text-xs text-zinc-500 text-center bg-zinc-900/50">
                                                ...e mais {parsedContacts.length - 50} contatos
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'importing' && (
                            <div className="py-12 text-center">
                                <Loader2 size={48} className="mx-auto text-indigo-400 animate-spin mb-4" />
                                <p className="text-sm font-medium text-zinc-300">Importando contatos...</p>
                                <p className="text-xs text-zinc-500 mt-1">Isso pode levar alguns segundos</p>
                            </div>
                        )}

                        {step === 'complete' && (
                            <div className="py-8 text-center space-y-6">
                                <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={40} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-zinc-100">Importação Concluída!</p>
                                    <p className="text-sm text-zinc-500 mt-1">Veja o resumo abaixo</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                                        <div className="text-3xl font-bold text-emerald-400">{importResult.created}</div>
                                        <div className="text-xs text-emerald-400/80">Importados</div>
                                    </div>
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                                        <div className="text-3xl font-bold text-rose-400">{importResult.errors}</div>
                                        <div className="text-xs text-rose-400/80">Descartados</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800/50">
                        {step === 'upload' && (
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        )}

                        {step === 'preview' && (
                            <>
                                <button
                                    onClick={resetState}
                                    className="px-5 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={validCount === 0}
                                    className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    Importar {validCount} Contatos
                                </button>
                            </>
                        )}

                        {step === 'complete' && (
                            <button
                                onClick={handleClose}
                                className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                            >
                                Fechar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImportContactsModal;
