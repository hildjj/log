import {Writable} from 'node:stream';
import {pino} from 'pino';
import pretty from 'pino-pretty';

export interface LogOptions extends pino.LoggerOptions<never, false> {

  /**
   * Increase (or decrease if negative) log verbosity by this much.
   * -3: fatal, -2: error, -1: warn, 0: info, 1: debug, 2: trace.
   * Useful for -qqqvvvv option processing.
   */
  logLevel?: number;

  /** If a string, create this log file and write to it. */
  logFile?: string | null;

  /** If true, do not log to stdout. */
  mute?: boolean;

  /** If logFile is set, write synchronously if true (for testing). */
  sync?: boolean;
}

/**
 * "Write" to dev/null.
 */
class WriteSink extends Writable {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  public _write(
    _chunk: any,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    callback(null);
  }
}

const prettyIgnore = 'pid,hostname,name,host,port';

/**
 * Create a new log instance.  Mostly useful for testing.
 *
 * @param opts Logging options.
 * @param bindings Extra fields to put into every log item.
 * @returns Logging object.
 */
export function createLog(
  opts: LogOptions = {},
  bindings?: pino.Bindings
): pino.Logger {
  const {
    logLevel,
    logFile,
    mute = false,
    sync = false,
    ...baseOpts
  } = opts;

  if (logLevel !== undefined) {
    let levelNum = Math.round(3 - logLevel);
    if (levelNum < 1) {
      levelNum = 1;
    } else if (levelNum > 6) {
      levelNum = 6;
    }
    baseOpts.level = pino.levels.labels[levelNum * 10];
  }

  let ret: pino.Logger | undefined = undefined;
  if (mute && !logFile) {
    // Shh.
    ret = pino(baseOpts, new WriteSink());
  } else if (logFile) {
    const dest = pino.destination({
      dest: logFile,
      sync,
      append: true,
      mkdir: true,
    });
    if (mute) {
      ret = pino(baseOpts, dest);
    } else {
      ret = pino(baseOpts, pino.multistream([{
        level: baseOpts.level,
        stream: dest,
      }, {
        level: baseOpts.level,
        stream: pretty({
          ignore: prettyIgnore,
        }),
      }]));
    }
  } else {
    ret = pino(baseOpts, pretty({
      ignore: prettyIgnore,
    }));
  }

  if (bindings) {
    ret.setBindings(bindings);
  }
  return ret;
}

let instance: pino.Logger | undefined = undefined;

/**
 * Get a singleton logging object.  Opts and bindings are used the first time,
 * and ignored thereafter.
 *
 * @param opts Logging options.
 * @param bindings Extra fields to put into every log item.
 * @returns Singleton logging object.
 */
export function getLog(
  opts: LogOptions,
  bindings: pino.Bindings = {}
): pino.Logger {
  if (!instance) {
    instance = createLog(opts, bindings);
  }
  return instance;
}
