import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK, type Chess, type PieceSymbol } from 'chess.js';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import { type BoardApi } from 'vue3-chessboard';
import { type SquareKey } from 'vue3-chessboard';
import type { DrawShape } from 'chessground/draw'

export class Engine {
  private stockfish: Worker | undefined;
  private boardApi: BoardApi | undefined;
  private ground: Api | undefined;
  private game: Chess;
  public bestMove: string | null = null;
  public target: Key | undefined;
  public options: Key[] = [];
  public fensCompared: string[] = [];
  public fensScore: number[] = [];

  constructor(game: Chess, boardApi?: BoardApi, ground?: Api) {
    this.boardApi = boardApi;
    this.stockfish = new Worker('stockfish.min.js');
    this.setupListeners();
    this.stockfish.postMessage('uci');
    this.game = game;
    this.ground = ground;
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

    console.log(data.data as string)
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

    if (uciStringSplitted[0] === 'info' && uciStringSplitted[9]) {
      this.fensScore[this.fensScore.length - 1] = parseInt(uciStringSplitted[9]);
    }

    if (uciStringSplitted[0] === 'bestmove' && uciStringSplitted[1]) {
      if (uciStringSplitted[1] !== this.bestMove) {
        this.bestMove = uciStringSplitted[1];
        if (this.boardApi?.getTurnColor() === 'black') {
          this.target = this.bestMove.slice(2, 4) as Key;
          this.options = this.getPossibleTargets().get(this.target) || [];
          if (this.options?.length === 1) return this.boardApi?.move(this.bestMove);
          let marks: DrawShape[] = this.options!.flatMap(option => [{
            orig: option,
            dest: this.target,
            brush: 'green',
            modifiers: {
              hilite: true,
              lineWidth: 6,
            },
          }, {
            orig: option,
            brush: 'green',
          }])
          this.ground?.setAutoShapes(marks);
        }
        else if (this.fensScore.length < this.fensCompared.length) {
          this.fensScore[this.fensScore.length] = 0;
          this.sendFen(this.fensCompared[this.fensScore.length]);
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

  public sendFen(fen: string) {
    this.stockfish?.postMessage(`position fen ${fen}`);
    this.stockfish?.postMessage('go movetime 100');
  }

  public compareFens(fens: string[]) {
    this.fensCompared = fens;
    this.fensScore = [0];
    this.sendFen(fens[0]);
  }

  public getPossibleTargets() {
    const targets = new Map<Key, Key[]>();
    ([PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING] as PieceSymbol[]).forEach(piece => 
      this.game.moves({ piece, verbose: true }).forEach(move => 
        targets.set(move.to, [...(targets.get(move.to) ?? []), move.from])
      )
    )
    return targets;
  }
}