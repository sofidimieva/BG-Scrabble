import React from 'react';
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { TileData } from '../types';

interface TileRackProps {
    tiles: TileData[];
}

const SortableTile: React.FC<{ tile: TileData }> = ({ tile }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: tile.id,
        data: { tile, source: 'rack' },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, touchAction: 'none' }}
            {...attributes}
            {...listeners}
            className={`
        size-12 bg-[#fde68a] rounded-lg shadow-md
        border-b-4 border-slate-300
        flex flex-col items-center justify-center
        transform hover:-translate-y-1 transition-transform
        cursor-grab active:cursor-grabbing select-none
      `}
        >
            <p className="text-xl font-bold leading-none">{tile.letter}</p>
            <p className="text-[0.6rem] self-end pr-1.5 font-bold">{tile.points}</p>
        </div>
    );
};

const TileRack: React.FC<TileRackProps> = ({ tiles }) => {
    // Make the entire rack area droppable
    const { setNodeRef } = useDroppable({
        id: 'tile-rack',
        data: { source: 'rack' },
    });

    return (
        <div ref={setNodeRef}>
            <SortableContext items={tiles.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex justify-center gap-2">
                    {tiles.map((tile) => (
                        <SortableTile key={tile.id} tile={tile} />
                    ))}
                    {/* Fill empty slots */}
                    {Array.from({ length: Math.max(0, 7 - tiles.length) }).map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="size-12 rounded-lg border-2 border-dashed border-slate-300 opacity-30"
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
};

export default React.memo(TileRack);
