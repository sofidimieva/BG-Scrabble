import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { TileData } from '../types';

interface TileProps {
    tile: TileData;
    isOnBoard?: boolean;
    isDragOverlay?: boolean;
}

const Tile: React.FC<TileProps> = ({ tile, isOnBoard = false, isDragOverlay = false }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: tile.id,
        data: { tile, source: isOnBoard ? 'board' : 'rack' },
    });

    const baseClasses = `
    flex flex-col items-center justify-center
    bg-[#fde68a] rounded-lg shadow-md
    border-b-4 border-slate-300
    cursor-grab active:cursor-grabbing
    select-none
    transition-transform duration-150
  `;

    const sizeClasses = isOnBoard
        ? 'w-full h-full text-[0.55rem] rounded-sm'
        : 'size-12 hover:-translate-y-1';

    const overlayClasses = isDragOverlay ? 'drag-overlay-tile' : '';
    const draggingClasses = isDragging && !isDragOverlay ? 'opacity-30 scale-90' : '';

    if (isDragOverlay) {
        return (
            <div className={`${baseClasses} size-12 ${overlayClasses}`}>
                <p className="text-xl font-bold leading-none">{tile.letter}</p>
                <p className="text-[0.6rem] self-end pr-1.5 font-bold">{tile.points}</p>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`${baseClasses} ${sizeClasses} ${draggingClasses} ${isOnBoard ? 'tile-placed' : ''}`}
        >
            {isOnBoard ? (
                <>
                    <span className="text-xs font-bold leading-none">{tile.letter}</span>
                    <span className="text-[0.35rem] self-end pr-0.5 font-bold">{tile.points}</span>
                </>
            ) : (
                <>
                    <p className="text-xl font-bold leading-none">{tile.letter}</p>
                    <p className="text-[0.6rem] self-end pr-1.5 font-bold">{tile.points}</p>
                </>
            )}
        </div>
    );
};

export default React.memo(Tile);
