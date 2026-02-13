import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CellData, TileData } from '../types';
import Tile from './Tile';

interface BoardCellProps {
    cell: CellData;
    ghostTile: TileData | null;
}

const multiplierStyles: Record<string, string> = {
    'ТД': 'bg-accent-red text-white',
    'ДД': 'bg-accent-red/40 text-[#0d191c]',
    'ТБ': 'bg-primary text-white',
    'ДБ': 'bg-primary/40 text-[#0d191c]',
};

const BoardCell: React.FC<BoardCellProps> = ({ cell, ghostTile }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `cell-${cell.row}-${cell.col}`,
        data: { row: cell.row, col: cell.col },
        disabled: cell.tile !== null && !cell.isNew,
    });

    const isCenter = cell.row === 7 && cell.col === 7;
    const multiplierClass = cell.multiplier ? multiplierStyles[cell.multiplier] : '';
    const hoverClass = isOver && !cell.tile ? 'ring-2 ring-primary ring-inset bg-primary/10' : '';

    return (
        <div
            ref={setNodeRef}
            className={`board-cell rounded-sm ${cell.tile ? '' : multiplierClass} ${hoverClass} ${!cell.tile && !cell.multiplier && !isCenter ? 'bg-white' : ''
                } ${isCenter && !cell.tile ? 'bg-primary/20' : ''}`}
        >
            {cell.tile ? (
                cell.isNew ? (
                    <Tile tile={cell.tile} isOnBoard />
                ) : (
                    <div className="w-full h-full bg-[#fde68a] rounded-sm flex flex-col items-center justify-center shadow-sm border border-[#eab308]">
                        <span className="text-xs font-bold leading-none">{cell.tile.letter}</span>
                        <span className="text-[0.35rem] self-end pr-0.5 font-bold">{cell.tile.points}</span>
                    </div>
                )
            ) : ghostTile && isOver ? (
                <div className="ghost-tile w-full h-full bg-[#fde68a] rounded-sm flex flex-col items-center justify-center border border-dashed border-[#eab308]">
                    <span className="text-xs font-bold leading-none">{ghostTile.letter}</span>
                    <span className="text-[0.35rem] self-end pr-0.5 font-bold">{ghostTile.points}</span>
                </div>
            ) : isCenter && !cell.tile ? (
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '0.9rem' }}>
                    star
                </span>
            ) : cell.multiplier ? (
                <span>{cell.multiplier}</span>
            ) : null}
        </div>
    );
};

export default React.memo(BoardCell);
