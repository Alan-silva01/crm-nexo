import React, { useState } from 'react';
import { Send, Image as ImageIcon, Music, Clock, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

const Broadcasts: React.FC = () => {
    const [message, setMessage] = useState('');
    const [interval, setIntervalValue] = useState('30');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<File | null>(null);

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
                {/* Main Card */}
                <div className="bg-[#0c0c0e] border border-zinc-800/50 p-8 rounded-[2.5rem] shadow-[15px_15px_30px_#050506,-15px_-15px_30px_#131316]">
                    <div className="space-y-6">
                        {/* Mensagem */}
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

                        {/* Mídia */}
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

                        {/* Configurações de Tempo */}
                        <div className="pt-4 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-3 gap-6">
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

                        {/* Action Buttons */}
                        <div className="pt-6 flex gap-4">
                            <button className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2">
                                <Send size={16} />
                                Iniciar Disparos
                            </button>
                            <button className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95">
                                Salvar Rascunho
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
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
