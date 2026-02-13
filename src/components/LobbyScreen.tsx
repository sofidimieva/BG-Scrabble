import React, { useState, useCallback } from 'react';

type LobbyView = 'main' | 'create-name' | 'join';

interface GameConfig {
    gameCode: string;
    isHost: boolean;
    myName: string;
    opponentName: string;
    timerSeconds: number;
}

interface LobbyScreenProps {
    onStartGame: (config: GameConfig) => void;
}

const TIME_OPTIONS = [
    { label: '1:00', value: 60 },
    { label: '1:30', value: 90 },
    { label: '2:00', value: 120 },
    { label: '3:00', value: 180 },
];

function generateGameCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ onStartGame }) => {
    const [view, setView] = useState<LobbyView>('main');
    const [myName, setMyName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [timerSeconds, setTimerSeconds] = useState(120);

    const handleCreateGame = useCallback(() => {
        setView('create-name');
    }, []);

    const handleJoinView = useCallback(() => {
        setView('join');
    }, []);

    const handleHostStart = useCallback(() => {
        if (myName.trim().length < 1) return;
        const code = generateGameCode();
        // This opens the channel in App and goes directly to game screen.
        // The host will wait there for the guest to connect via the game screen.
        onStartGame({
            gameCode: code,
            isHost: true,
            myName: myName.trim(),
            opponentName: '',
            timerSeconds,
        });
    }, [myName, timerSeconds, onStartGame]);

    const handleJoinGame = useCallback(() => {
        if (joinCode.trim().length < 4 || myName.trim().length < 1) return;
        const code = joinCode.trim().toUpperCase();
        onStartGame({
            gameCode: code,
            isHost: false,
            myName: myName.trim(),
            opponentName: '',
            timerSeconds,
        });
    }, [joinCode, myName, timerSeconds, onStartGame]);

    const handleBack = useCallback(() => {
        setView('main');
        setJoinCode('');
    }, []);

    return (
        <div className="bg-background-light font-display min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-10 w-40 h-40 bg-accent-red/5 rounded-full blur-2xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/15 rounded-2xl mb-4">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '2.5rem' }}>
                            grid_view
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-[#0d191c] mb-1 tracking-tight">СКРАБЪЛ</h1>
                    <p className="text-sm font-medium text-[#498e9c]">Българска версия</p>
                </div>

                {/* ===== MAIN MENU ===== */}
                {view === 'main' && (
                    <div className="space-y-4 animate-[tile-pop_0.3s_ease-out]">
                        <button
                            onClick={handleCreateGame}
                            className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all group border border-[#e7f1f4] hover:border-primary/30"
                        >
                            <div className="flex-shrink-0 w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                                <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-[#0d191c]">Започни нова игра</p>
                                <p className="text-xs text-[#498e9c] font-medium">Създай стая и покани приятел</p>
                            </div>
                            <span className="material-symbols-outlined text-[#cee4e8] ml-auto group-hover:text-primary transition-colors">chevron_right</span>
                        </button>

                        <button
                            onClick={handleJoinView}
                            className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all group border border-[#e7f1f4] hover:border-primary/30"
                        >
                            <div className="flex-shrink-0 w-12 h-12 bg-accent-red/10 rounded-xl flex items-center justify-center group-hover:bg-accent-red/20 transition-colors">
                                <span className="material-symbols-outlined text-accent-red text-2xl">login</span>
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-[#0d191c]">Влез в игра с код</p>
                                <p className="text-xs text-[#498e9c] font-medium">Въведи код и се присъедини</p>
                            </div>
                            <span className="material-symbols-outlined text-[#cee4e8] ml-auto group-hover:text-accent-red transition-colors">chevron_right</span>
                        </button>

                        {/* Decorative tiles */}
                        <div className="flex justify-center gap-2 mt-8 opacity-60">
                            {['С', 'К', 'Р', 'А', 'Б', 'Ъ', 'Л'].map((letter) => (
                                <div
                                    key={letter}
                                    className="size-9 bg-[#fde68a] rounded-lg shadow-sm border-b-2 border-slate-300 flex flex-col items-center justify-center"
                                >
                                    <span className="text-sm font-bold leading-none">{letter}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== CREATE: NAME + TIME SETUP ===== */}
                {view === 'create-name' && (
                    <div className="animate-[tile-pop_0.3s_ease-out]">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-[#e7f1f4]">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/15 rounded-full mb-3">
                                    <span className="material-symbols-outlined text-primary text-3xl">person</span>
                                </div>
                                <h2 className="text-xl font-bold text-[#0d191c]">Нова игра</h2>
                                <p className="text-sm text-[#498e9c] mt-1">Настрой играта</p>
                            </div>

                            {/* Name input */}
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-[#498e9c] uppercase tracking-wider mb-2">
                                    Твоето име
                                </label>
                                <input
                                    type="text"
                                    value={myName}
                                    onChange={(e) => setMyName(e.target.value.slice(0, 15))}
                                    placeholder="Въведи име..."
                                    maxLength={15}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-[#e7f1f4] rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg font-bold text-[#0d191c] placeholder:text-slate-300 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Time selection */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-[#498e9c] uppercase tracking-wider mb-2">
                                    Време за ход
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {TIME_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTimerSeconds(opt.value)}
                                            className={`py-2.5 rounded-lg font-bold text-sm transition-all ${timerSeconds === opt.value
                                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                : 'bg-slate-100 text-[#498e9c] hover:bg-slate-200'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Create + Start button */}
                            <button
                                onClick={handleHostStart}
                                disabled={myName.trim().length < 1}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-lg shadow-lg transition-all ${myName.trim().length >= 1
                                    ? 'bg-primary text-white shadow-primary/30 hover:brightness-110 active:scale-[0.98]'
                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                <span className="material-symbols-outlined">add_circle</span>
                                СЪЗДАЙ СТАЯ
                            </button>
                        </div>

                        <button
                            onClick={handleBack}
                            className="w-full mt-4 flex items-center justify-center gap-1 py-2 text-[#498e9c] font-bold text-sm hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Назад
                        </button>
                    </div>
                )}

                {/* ===== JOIN GAME ===== */}
                {view === 'join' && (
                    <div className="animate-[tile-pop_0.3s_ease-out]">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-[#e7f1f4]">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent-red/10 rounded-full mb-3">
                                    <span className="material-symbols-outlined text-accent-red text-3xl">login</span>
                                </div>
                                <h2 className="text-xl font-bold text-[#0d191c]">Влез в игра</h2>
                                <p className="text-sm text-[#498e9c] mt-1">Въведи кода и твоето име</p>
                            </div>

                            {/* Name input */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-[#498e9c] uppercase tracking-wider mb-2">
                                    Твоето име
                                </label>
                                <input
                                    type="text"
                                    value={myName}
                                    onChange={(e) => setMyName(e.target.value.slice(0, 15))}
                                    placeholder="Въведи име..."
                                    maxLength={15}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-[#e7f1f4] rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg font-bold text-[#0d191c] placeholder:text-slate-300 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Code input */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-[#498e9c] uppercase tracking-wider mb-2">
                                    Код на играта
                                </label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                    placeholder="ABCD12"
                                    maxLength={6}
                                    className="w-full text-center text-3xl font-black tracking-[0.4em] py-4 px-6 bg-slate-50 border-2 border-[#e7f1f4] rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-300 placeholder:tracking-[0.4em] transition-all text-[#0d191c]"
                                />
                            </div>

                            {/* Join button */}
                            <button
                                onClick={handleJoinGame}
                                disabled={joinCode.trim().length < 4 || myName.trim().length < 1}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-lg shadow-lg transition-all ${joinCode.trim().length >= 4 && myName.trim().length >= 1
                                    ? 'bg-primary text-white shadow-primary/30 hover:brightness-110 active:scale-[0.98]'
                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                <span className="material-symbols-outlined">login</span>
                                ПРИСЪЕДИНИ СЕ
                            </button>
                        </div>

                        <button
                            onClick={handleBack}
                            className="w-full mt-4 flex items-center justify-center gap-1 py-2 text-[#498e9c] font-bold text-sm hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Назад
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LobbyScreen;
