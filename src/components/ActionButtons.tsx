import React from 'react';

interface ActionButtonsProps {
    onPass: () => void;
    onExchange: () => void;
    onPlay: () => void;
    onShuffle: () => void;
    onRecall: () => void;
    canPlay: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    onPass,
    onExchange,
    onPlay,
    onShuffle,
    onRecall,
    canPlay,
}) => {
    return (
        <div className="space-y-3">
            {/* Utility buttons row */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={onShuffle}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined text-base">shuffle</span>
                    РАЗБЪРКАЙ
                </button>
                <button
                    onClick={onRecall}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined text-base">undo</span>
                    ВЪРНИ
                </button>
            </div>

            {/* Main action buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onPass}
                    className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold hover:bg-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined mb-1">skip_next</span>
                    <span className="text-xs">ПАС</span>
                </button>
                <button
                    onClick={onExchange}
                    className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold hover:bg-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined mb-1">published_with_changes</span>
                    <span className="text-xs">СМЯНА</span>
                </button>
                <button
                    onClick={onPlay}
                    disabled={!canPlay}
                    className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-black text-lg shadow-lg transition-all ${canPlay
                            ? 'bg-primary text-white shadow-primary/30 hover:brightness-110 active:scale-95'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        }`}
                >
                    <span className="material-symbols-outlined">send</span>
                    <span>ИГРАЙ</span>
                </button>
            </div>
        </div>
    );
};

export default React.memo(ActionButtons);
