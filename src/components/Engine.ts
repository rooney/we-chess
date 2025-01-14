import { type BoardApi } from 'vue3-chessboard';
import { type SquareKey } from 'vue3-chessboard';

export class Engine {
  private stockfish: Worker | undefined;
  private boardApi: BoardApi | undefined;
  public bestMove: string | null = null;

  constructor(boardApi: BoardApi) {
    this.boardApi = boardApi;
    this.stockfish = new Worker('stockfish.min.js');
    this.setupListeners();
    this.stockfish.postMessage('uci');
  }

  private setupListeners(): void {
    this.stockfish?.addEventListener('message', (data) =>
      this.handleEngineStdout(data),
    );

    this.stockfish?.addEventListener('error', (err) => console.error(err));

    this.stockfish?.addEventListener('messageerror', (err) =>
      console.error(err),
    );
  }

  private handleEngineStdout(data: MessageEvent<unknown>) {
    const uciStringSplitted = (data.data as string).split(' ');

    if (uciStringSplitted[0] === 'uciok') {
      this.setOption('UCI_AnalyseMode', 'true');
      this.setOption('Analysis Contempt', 'Off');

      this.stockfish?.postMessage('ucinewgame');
      this.stockfish?.postMessage('isready');
      return;
    }

    if (uciStringSplitted[0] === 'readyok') {
      this.stockfish?.postMessage('go movetime 1500');
      return;
    }

    if (uciStringSplitted[0] === 'bestmove' && uciStringSplitted[1]) {
      if (uciStringSplitted[1] !== this.bestMove) {
        this.bestMove = uciStringSplitted[1];
        if (this.boardApi?.getTurnColor() === 'black') {
          this.boardApi.move({
            from: this.bestMove.slice(0, 2) as SquareKey,
            to: this.bestMove.slice(2, 4) as SquareKey,
          });
        }
      }
    }
  }

  private setOption(name: string, value: string): void {
    this.stockfish?.postMessage(`setoption name ${name} value ${value}`);
  }

  public sendPosition(position: string) {
    this.stockfish?.postMessage(`position startpos moves ${position}`);
    this.stockfish?.postMessage('go movetime 2000');
  }
}