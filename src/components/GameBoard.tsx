import React from 'react';
import type { CellData, TileData } from '../types';
import BoardCell from './BoardCell';

interface GameBoardProps {
    board: CellData[][];
    ghostTile: TileData | null;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, ghostTile }) => {
    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="w-full bg-[#d1e1e4] p-1 shadow-inner overflow-hidden scrabble-board">
                {board.flat().map((cell) => (
                    <BoardCell
                        key={`${cell.row}-${cell.col}`}
                        cell={cell}
                        ghostTile={ghostTile}
                    />
                ))}
            </div>
        </main>
    );
};

export default React.memo(GameBoard);
