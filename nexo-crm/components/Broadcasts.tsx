import React, { useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Music, Clock, Calendar as CalendarIcon, AlertCircle, Loader2, CheckCircle2, Save, Trash2, FileText } from 'lucide-react';
import { Lead } from '../types';
import { tagsService, Tag } from '../src/lib/tagsService';

interface BroadcastsProps {
    leads: Lead[];
    profile: any;
}

const Broadcasts: React.FC<BroadcastsProps> = ({ leads, profile }) => {
    const [message, setMessage] = useState('');
    const [interval, setIntervalValue] = useState('30');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imageCaption, setImageCaption] = useState('');
    const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [hasCheckedConsent, setHasCheckedConsent] = useState(false);

    // Draft system
    interface Draft {
        id: string;
        name: string;
        message: string;
        interval: string;
        startDate: string;
        startTime: string;
        selectedTags: string[];
        imageCaption: string;
    }
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [draftName, setDraftName] = useState('');

    useEffect(() => {
        loadTags();
        loadDrafts();
    }, []);

    const loadDrafts = () => {
        try {
            const saved = localStorage.getItem('nero_broadcast_drafts');
            if (saved) {
                setDrafts(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Error loading drafts:', e);
        }
    };

    const saveDrafts = (newDrafts: Draft[]) => {
        try {
            localStorage.setItem('nero_broadcast_drafts', JSON.stringify(newDrafts));
            setDrafts(newDrafts);
        } catch (e) {
            console.error('Error saving drafts:', e);
        }
    };

    const handleSaveDraft = () => {
        if (drafts.length >= 2) {
            alert('Você já tem 2 rascunhos salvos. Exclua um para salvar outro.');
            return;
        }
        setShowDraftModal(true);
    };

    const confirmSaveDraft = () => {
        if (!draftName.trim()) {
            alert('Digite um nome para o rascunho.');
            return;
        }
        const newDraft: Draft = {
            id: Date.now().toString(),
            name: draftName.trim(),
            message,
            interval,
            startDate,
            startTime,
            selectedTags,
            imageCaption
        };
        saveDrafts([...drafts, newDraft]);
        setShowDraftModal(false);
        setDraftName('');
    };

    const loadDraft = (draft: Draft) => {
        setMessage(draft.message);
        setIntervalValue(draft.interval);
        setStartDate(draft.startDate);
        setStartTime(draft.startTime);
        setSelectedTags(draft.selectedTags);
        setImageCaption(draft.imageCaption);
    };

    const deleteDraft = (id: string) => {
        saveDrafts(drafts.filter(d => d.id !== id));
    };

    const loadTags = async () => {
        const tags = await tagsService.listTags();
        setAvailableTags(tags);
    };

    const handleTagToggle = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result as string;
                resolve(base64String.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleStartBroadcast = async () => {
        if (!message.trim() && !selectedImage && !selectedAudio) {
            alert('Por favor, adicione uma mensagem ou mídia para disparar.');
            return;
        }

        if (selectedTags.length === 0) {
            alert('Por favor, selecione ao menos uma etiqueta.');
            return;
        }

        const webhookUrl = profile?.disparos_whebhook;
        if (!webhookUrl) {
            alert('Webhook de disparos não configurado no seu perfil.');
            return;
        }

        if (!hasCheckedConsent) {
            setShowConsentModal(true);
            return;
        }

        setIsSending(true);
        setStatus('idle');

        try {
            const filteredLeads = leads.filter(lead =>
                lead.tags?.some(tag => selectedTags.includes(tag))
            );

            if (filteredLeads.length === 0) {
                alert('Nenhum contato encontrado com as etiquetas selecionadas.');
                setIsSending(false);
                return;
            }

            const formattedContacts = filteredLeads.map(l => {
                const cleanedPhone = l.phone.replace(/\D/g, '');
                return `nome: ${l.name}\ntelefone: ${cleanedPhone}@s.whatsapp.net`;
            }).join('\n\n');

            let imageBase64 = '';
            let audioBase64 = '';

            if (selectedImage) {
                imageBase64 = await fileToBase64(selectedImage);
            }
            if (selectedAudio) {
                audioBase64 = await fileToBase64(selectedAudio);
            }
            const contentTypes = [];
            if (message.trim()) contentTypes.push('texto');
            if (selectedImage) contentTypes.push('imagem');
            if (selectedAudio) contentTypes.push('audio');
            const enviado = contentTypes.join(' + ');

            const payload = {
                config: {
                    mensagem: message,
                    imagem_base64: imageBase64,
                    imagem_legenda: selectedImage ? imageCaption : '',
                    audio_base64: audioBase64,
                    intervalo_segundos: parseInt(interval) || 30,
                    data_inicio: startDate,
                    hora_inicio: startTime,
                    tags_alvo: selectedTags,
                    enviado: enviado
                },
                total_destinatarios: filteredLeads.length,
                contatos: formattedContacts
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Falha ao enviar para o webhook');
            }

            setStatus('success');
        } catch (error) {
            console.error('Erro ao iniciar disparo:', error);
            setStatus('error');
        } finally {
            setIsSending(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedAudio(e.target.files[0]);
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar bg-[#0c0c0e]">
            <header className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Disparos em Massa</h1>
                    <p className="text-zinc-500 text-sm">Configure suas campanhas de transmissão para o WhatsApp.</p>
                </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[2.5rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Send size={12} className="text-indigo-400" />
                                Mensagem do Disparo
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escreva aqui a mensagem que deseja disparar..."
                                className="w-full h-32 px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <ImageIcon size={12} className="text-indigo-400" />
                                    Imagem (Opcional)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl border-dashed flex items-center gap-3 transition-colors group-hover:border-indigo-500/50">
                                        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                                            <ImageIcon size={14} />
                                        </div>
                                        <span className="text-xs text-zinc-500 truncate">
                                            {selectedImage ? selectedImage.name : 'Selecionar imagem...'}
                                        </span>
                                    </div>
                                </div>
                                {selectedImage && (
                                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                            <Send size={10} className="text-emerald-400" />
                                            Legenda da Imagem (Caption)
                                        </label>
                                        <textarea
                                            value={imageCaption}
                                            onChange={(e) => setImageCaption(e.target.value)}
                                            placeholder="Digite a legenda que aparecerá junto com a imagem..."
                                            className="w-full h-20 px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                                        />
                                        <p className="text-[9px] text-zinc-600 leading-relaxed">
                                            💡 <strong>O que é a legenda?</strong> É o texto que aparece logo abaixo da imagem no WhatsApp, como uma descrição. Exemplo: "Confira nossa nova promoção! 🔥"
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Music size={12} className="text-indigo-400" />
                                    Áudio (Opcional)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudioChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl border-dashed flex items-center gap-3 transition-colors group-hover:border-indigo-500/50">
                                        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                                            <Music size={14} />
                                        </div>
                                        <span className="text-xs text-zinc-500 truncate">
                                            {selectedAudio ? selectedAudio.name : 'Selecionar áudio...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pb-4 border-b border-zinc-800/50">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <AlertCircle size={12} className="text-indigo-400" />
                                Filtrar por Etiquetas (Opcional)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => handleTagToggle(tag.name)}
                                        className={`px-4 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${selectedTags.includes(tag.name)
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-indigo-500/30'
                                            }`}
                                        style={selectedTags.includes(tag.name) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                                {availableTags.length === 0 && (
                                    <p className="text-[10px] text-zinc-600 italic">Crie etiquetas na aba "Etiquetas" para filtrar disparos.</p>
                                )}
                            </div>
                            <p className="text-[10px] text-zinc-600">Selecione uma ou mais etiquetas para direcionar o disparo.</p>
                        </div>

                        <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Clock size={12} className="text-indigo-400" />
                                    Intervalo (seg)
                                </label>
                                <input
                                    type="number"
                                    value={interval}
                                    onChange={(e) => setIntervalValue(e.target.value)}
                                    placeholder="30"
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <CalendarIcon size={12} className="text-indigo-400" />
                                    Data de Início
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Clock size={12} className="text-indigo-400" />
                                    Hora de Início
                                </label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex gap-4">
                            <button
                                onClick={handleStartBroadcast}
                                disabled={isSending || status === 'success'}
                                className={`flex-1 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed ${status === 'success'
                                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                    : status === 'error'
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 disabled:opacity-50'
                                    }`}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : status === 'success' ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Disparo Enviado com Sucesso!
                                    </>
                                ) : status === 'error' ? (
                                    <>
                                        <AlertCircle size={16} />
                                        Erro - Clique para Tentar Novamente
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Iniciar Disparos
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleSaveDraft}
                                className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Save size={14} />
                                Salvar Rascunho
                            </button>
                        </div>
                    </div>
                </div>

                {/* Rascunhos Salvos */}
                {drafts.length > 0 && (
                    <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl space-y-4">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} className="text-indigo-400" />
                            Rascunhos Salvos ({drafts.length}/2)
                        </h4>
                        <div className="space-y-2">
                            {drafts.map(draft => (
                                <div key={draft.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl">
                                    <div>
                                        <p className="text-sm font-bold text-zinc-200">{draft.name}</p>
                                        <p className="text-[10px] text-zinc-500 truncate max-w-xs">{draft.message || 'Sem mensagem de texto'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => loadDraft(draft)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                        >
                                            Carregar
                                        </button>
                                        <button
                                            onClick={() => deleteDraft(draft.id)}
                                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Aviso de Riscos */}
                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl flex gap-4 items-start">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                        <AlertCircle size={20} className="text-amber-400" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-amber-400">⚠️ Aviso Importante sobre Disparos</h4>
                        <ul className="text-xs text-zinc-500 leading-relaxed space-y-1 list-disc list-inside">
                            <li><strong>Risco de Bloqueio:</strong> Enviar muitas mensagens pode resultar em bloqueio do número pelo WhatsApp. Use com moderação.</li>
                            <li><strong>Limite Recomendado:</strong> Não aconselhamos fazer disparos para mais de <strong>100 contatos</strong> simultaneamente com API não oficial.</li>
                            <li><strong>Intervalo entre Mensagens:</strong> O tempo entre cada envio é crucial. Recomendamos no mínimo 30 segundos.</li>
                            <li><strong>Estabilidade do Número:</strong> Disparos frequentes aumentam o risco de restrições por parte da Meta.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modal de Salvar Rascunho */}
            {showDraftModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-4">Salvar Rascunho</h3>
                        <p className="text-xs text-zinc-500 mb-4">Dê um nome para identificar este rascunho (ex: "Disparo para Clientes")</p>
                        <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder="Nome do rascunho..."
                            className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDraftModal(false); setDraftName(''); }}
                                className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmSaveDraft}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                <Save size={12} />
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Termos e Responsabilidade (Consentimento) */}
            {showConsentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-[3rem] w-full max-w-lg p-10 shadow-[20px_20px_40px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-500">
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white uppercase tracking-[0.15em] mb-2 font-mono">Termos e Condições de Uso</h3>
                                <p className="text-[11px] text-amber-500/80 font-bold uppercase tracking-widest leading-normal">
                                    Leia atentamente antes de prosseguir com o disparo em massa
                                </p>
                            </div>
                        </div>

                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar no-scrollbar text-zinc-400">
                            <div className="space-y-4 text-xs leading-relaxed italic border-l-2 border-amber-500/20 pl-4">
                                <p>
                                    Ao utilizar a ferramenta de disparos em massa, você declara estar ciente de que o uso de APIs não oficiais para envio de mensagens automáticas via WhatsApp (Meta) infringe as diretrizes comerciais da plataforma.
                                </p>
                                <p>
                                    <strong>Risco de Bloqueio Irreversível:</strong> Existe um risco real de restrição ou banimento permanente do seu número de telefone por parte da Meta. Este risco aumenta conforme o volume de mensagens e a frequência dos disparos.
                                </p>
                                <p>
                                    <strong>Isenção de Responsabilidade:</strong> A <strong>NERO CRM</strong> e seus desenvolvedores não se responsabilizam por eventuais bloqueios, perdas de dados ou interrupções de serviço decorrentes do uso desta funcionalidade. O usuário assume total e exclusiva responsabilidade pelos riscos operacionais e estratégicos.
                                </p>
                                <p>
                                    <strong>Melhores Práticas:</strong> Você se compromete a respeitar intervalos mínimos de segurança e a não utilizar a ferramenta para fins ilícitos, spam ou assédio.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 group cursor-pointer" onClick={() => setHasCheckedConsent(!hasCheckedConsent)}>
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${hasCheckedConsent ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 bg-zinc-800/50 group-hover:border-zinc-500'}`}>
                                {hasCheckedConsent && <CheckCircle2 size={16} />}
                            </div>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest select-none">Estou ciente dos riscos e aceito os termos</span>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShowConsentModal(false); setHasCheckedConsent(false); }}
                                className="flex-1 py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-inner active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (hasCheckedConsent) {
                                        setShowConsentModal(false);
                                        handleStartBroadcast();
                                    }
                                }}
                                disabled={!hasCheckedConsent}
                                className={`flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${hasCheckedConsent ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'}`}
                            >
                                <Send size={14} />
                                Iniciar Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Broadcasts;
