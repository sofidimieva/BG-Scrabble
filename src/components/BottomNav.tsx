import React from 'react';

const BottomNav: React.FC = () => {
    return (
        <nav className="flex border-t border-[#e7f1f4] bg-background-light px-4 pb-4 pt-2">
            <a className="flex flex-1 flex-col items-center justify-center gap-1 text-primary" href="#">
                <span className="material-symbols-outlined">grid_view</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Игра</p>
            </a>
            <a className="flex flex-1 flex-col items-center justify-center gap-1 text-[#498e9c]" href="#">
                <span className="material-symbols-outlined">trophy</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Класация</p>
            </a>
            <a className="flex flex-1 flex-col items-center justify-center gap-1 text-[#498e9c]" href="#">
                <span className="material-symbols-outlined">shopping_bag</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Магазин</p>
            </a>
            <a className="flex flex-1 flex-col items-center justify-center gap-1 text-[#498e9c]" href="#">
                <span className="material-symbols-outlined">person</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">Профил</p>
            </a>
        </nav>
    );
};

export default React.memo(BottomNav);
