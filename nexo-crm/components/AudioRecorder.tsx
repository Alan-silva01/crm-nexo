import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Check, X, Play, Pause } from 'lucide-react';

interface AudioRecorderProps {
    onRecordComplete: (file: File) => void;
    onCancel: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Determine supported mime type
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                ''
            ];
            const supportedMimeType = mimeTypes.find(type => !type || MediaRecorder.isTypeSupported(type));

            const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const finalMimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: finalMimeType });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100); // Trigger ondataavailable every 100ms
            setIsRecording(true);
            setRecordingTime(0);
            setAudioUrl(null);
            setAudioBlob(null);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Não foi possível acessar o microfone. Verifique as permissões.');
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleConfirm = () => {
        if (audioBlob) {
            const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
            const file = new File([audioBlob], `recording_${Date.now()}.${extension}`, { type: audioBlob.type });
            onRecordComplete(file);
        }
    };

    const togglePlayback = () => {
        if (!audioPlayerRef.current) return;

        if (isPlaying) {
            audioPlayerRef.current.pause();
        } else {
            audioPlayerRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        startRecording();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                    <div className={`w-2 h-2 rounded-full bg-rose-500 ${isRecording ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-mono text-zinc-300 min-w-[40px]">
                        {formatTime(recordingTime)}
                    </span>
                </div>

                <div className="flex-1 min-w-[60px]">
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 ${isRecording ? 'w-full' : 'w-0'}`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {isRecording ? (
                        <button
                            onClick={stopRecording}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all active:scale-95"
                            title="Parar Gravação"
                        >
                            <Square size={16} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            onClick={onCancel}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all active:scale-95"
                            title="Excluir"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {!isRecording && audioUrl && (
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/50 animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={togglePlayback}
                        className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                    >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex-1">
                        Revisar áudio antes de enviar
                    </div>

                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                        <Check size={14} />
                        Confirmar
                    </button>

                    <audio
                        ref={audioPlayerRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;
