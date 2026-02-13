import React from 'react';

interface GameScoreboardProps {
    playerName: string;
    opponentName: string;
    playerScore: number;
    opponentScore: number;
    myTimeLeft: number;
    opponentTimeLeft: number;
    formatTime: (secs: number) => string;
    isMyTurn: boolean;
    gameCode: string;
    onExit: () => void;
}

const GameScoreboard: React.FC<GameScoreboardProps> = ({
    playerName,
    opponentName,
    playerScore,
    opponentScore,
    myTimeLeft,
    opponentTimeLeft,
    formatTime,
    isMyTurn,
    gameCode,
    onExit,
}) => {
    return (
        <header className="p-4 flex items-center justify-between gap-3 bg-white shadow-sm">
            {/* Player (me) */}
            <div
                className={`flex items-center gap-2 p-2 rounded-lg border-2 flex-1 min-w-0 ${isMyTurn
                    ? 'border-primary bg-primary/10'
                    : 'border-[#cee4e8] opacity-70'
                    }`}
            >
                <div className="relative flex-shrink-0">
                    <div className="size-10 rounded-full border-2 border-primary bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">person</span>
                    </div>
                    {isMyTurn && (
                        <div className="absolute -bottom-1 -right-1 size-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    {isMyTurn && (
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none">На ход</p>
                    )}
                    <p className="text-sm font-bold leading-tight truncate">{playerName}</p>
                    <div className="flex items-center gap-2">
                        <p className={`text-lg font-black leading-none ${isMyTurn ? 'text-primary' : 'text-[#498e9c]'}`}>
                            {playerScore}
                        </p>
                        <div className={`ml-auto px-1.5 py-0.5 rounded font-mono font-bold text-xs ${isMyTurn
                            ? myTimeLeft <= 30 ? 'bg-red-100 text-red-600' : 'bg-primary/20 text-primary'
                            : 'bg-slate-100 text-slate-500'
                            }`}>
                            {formatTime(myTimeLeft)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Center: code + exit */}
            <div className="flex flex-col items-center flex-shrink-0">
                <div className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-bold text-primary tracking-wider">
                    {gameCode}
                </div>
                <button
                    onClick={onExit}
                    className="mt-1 flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
                    ИЗХОД
                </button>
            </div>

            {/* Opponent */}
            <div
                className={`flex items-center gap-2 p-2 rounded-lg border-2 flex-1 min-w-0 ${!isMyTurn
                    ? 'border-primary bg-primary/10'
                    : 'border-[#cee4e8] opacity-70'
                    }`}
            >
                <div className="text-right min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#498e9c] uppercase tracking-wider leading-none">Опонент</p>
                    <p className="text-sm font-bold leading-tight truncate">{opponentName}</p>
                    <div className="flex items-center gap-2 justify-end">
                        <div className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs ${!isMyTurn
                            ? opponentTimeLeft <= 30 ? 'bg-red-100 text-red-600' : 'bg-primary/20 text-primary'
                            : 'bg-slate-100 text-slate-500'
                            }`}>
                            {formatTime(opponentTimeLeft)}
                        </div>
                        <p className={`text-lg font-black leading-none ${!isMyTurn ? 'text-primary' : 'text-[#498e9c]'}`}>
                            {opponentScore}
                        </p>
                    </div>
                </div>
                <div className="size-10 rounded-full border-2 border-slate-300 bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-500 text-xl">person</span>
                </div>
            </div>
        </header>
    );
};

export default React.memo(GameScoreboard);
