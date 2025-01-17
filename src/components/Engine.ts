import { WorkQueue } from "./WorkQueue";

type Analysis = { move: string, countermove: string, score: number }
export class Engine {
  private stockfish: Worker;
  private analysis: WorkQueue<Analysis>;

  constructor() {
    this.analysis = new WorkQueue();
    this.stockfish = new Worker('stockfish.min.js');
    this.setupListeners();
    this.cmd('uci');
  }

  private setupListeners(): void {
    this.stockfish.addEventListener('message', (data) =>
      this.handleEngineStdout(data),
    );
    this.stockfish.addEventListener('error', (err) => console.error(err));
    this.stockfish.addEventListener('messageerror', (err) => console.error(err));
  }

  private setOption(name: string, value: string): void {
    this.cmd(`setoption name ${name} value ${value}`);
  }

  private cmd(msg: string) {
    // console.log('>>', msg);
    this.stockfish.postMessage(msg)
  }

  private handleEngineStdout(data: MessageEvent<unknown>) {
    // console.log('<<', data.data as string)
    const uciStringSplitted = (data.data as string).split(' ');
    if (uciStringSplitted[0] === 'uciok') {
      this.setOption('UCI_AnalyseMode', 'true');
      this.setOption('Analysis Contempt', 'Off');
      this.cmd('ucinewgame');
      this.cmd('isready');
      return;
    }
    if (uciStringSplitted[0] === 'readyok') {
      return;
    }
    if (uciStringSplitted[0] === 'info' && uciStringSplitted[9]) {
      this.analysis.update(data => ({ ...data, score: parseInt(uciStringSplitted[9]) }));
    }
    if (uciStringSplitted[0] === 'bestmove' && uciStringSplitted[1]) {
      this.analysis.update(data => ({ ...data, countermove: uciStringSplitted[1] }));
      this.analysis.pop();
    }
  }

  public analyze(fen: string, move: string, timeLimit: number): Promise<Analysis> {
    const engine = this
    return new Promise<Analysis>((resolve) => {
      this.analysis.push({ 
        begin() {
          engine.cmd(`position fen ${fen} moves ${move}`);
          engine.cmd(`go movetime ${timeLimit}`);
          return { move, countermove: '?', score: NaN };
        },
        end: resolve,
      })
    });
  }
}
