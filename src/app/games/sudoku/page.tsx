import { GameSudoku } from "@/games/sudoku";

export const metadata = {
  title: "Sudoku | Game Portal",
  description: "Play classic Sudoku online with difficulty levels and live validation.",
};

export default function SudokuPage() {
  return (
    <div className="w-full animate-in fade-in duration-500">
      <GameSudoku />
    </div>
  );
}
