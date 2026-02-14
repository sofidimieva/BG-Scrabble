import { useState, useEffect } from 'react';

interface ValentineScreenProps {
    onDismiss: () => void;
}

export default function ValentineScreen({ onDismiss }: ValentineScreenProps) {
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setCursorPos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            onClick={onDismiss}
            className="fixed inset-0 z-[100] bg-[#800020] flex items-center justify-center cursor-none"
        >
            <div className="text-white text-center font-bold text-4xl max-w-4xl px-8 leading-relaxed">
                Скъпо Мое Яудесно Прекрасно Уникално БонБонБОнБОнЧЕ ще ми бъдеш ли моята заъъъъВИНАГИ МУХАХХАХАХАХАХА
            </div>

            <div
                className="fixed pointer-events-none w-20 h-20 rounded-full bg-white text-[#800020] font-black text-2xl flex items-center justify-center shadow-2xl z-[110]"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    transform: 'translate(-50%, -50%)',
                }}
            >
                ДА
            </div>
        </div>
    );
}
