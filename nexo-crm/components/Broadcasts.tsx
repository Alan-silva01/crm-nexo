import React, { useState } from 'react';
import { Send, Image as ImageIcon, Music, Clock, Calendar as CalendarIcon, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Lead } from '../types';

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
    const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
        if (!message.trim()) {
            alert('Por favor, escreva uma mensagem.');
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

        setIsSending(true);
        setStatus('idle');

        try {
            const targetLeads = leads.filter(lead =>
                lead.tags?.some(tag => selectedTags.includes(tag))
            ).map(l => ({
                nome: l.name,
                telefone: l.phone,
                etiquetas: l.tags
            }));

            if (targetLeads.length === 0) {
                alert('Nenhum contato encontrado com as etiquetas selecionadas.');
                setIsSending(false);
                return;
            }

            let imageBase64 = '';
            let audioBase64 = '';

            if (selectedImage) {
                imageBase64 = await fileToBase64(selectedImage);
            }
            if (selectedAudio) {
                audioBase64 = await fileToBase64(selectedAudio);
            }

            const payload = {
                config: {
                    mensagem: message,
                    imagem_base64: imageBase64,
                    audio_base64: audioBase64,
                    intervalo_segundos: parseInt(interval) || 30,
                    data_inicio: startDate,
                    hora_inicio: startTime,
                    tags_alvo: selectedTags
                },
                total_destinatarios: targetLeads.length,
                contatos: targetLeads
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
                {status === 'success' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 size={14} />
                        Disparo enviado com sucesso!
                    </div>
                )}
                {status === 'error' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={14} />
                        Erro ao enviar disparo.
                    </div>
                )}
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
                                {['cliente', 'lead', 'agendado', 'sem interesse', 'importante', 'parceiro'].map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => handleTagToggle(tag)}
                                        className={`px-4 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${selectedTags.includes(tag)
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-indigo-500/30'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
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
                                disabled={isSending}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Iniciar Disparos
                                    </>
                                )}
                            </button>
                            <button className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95">
                                Salvar Rascunho
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl flex gap-4 items-start">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <AlertCircle size={20} className="text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-indigo-400">Dica de Segurança</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Para evitar banimentos no WhatsApp, recomendamos um intervalo mínimo de 30 segundos entre as mensagens e o uso de variáveis para tornar cada mensagem única.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Broadcasts;
