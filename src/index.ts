import {assertDisjoint, nameSet, select} from '@cto.af/utils';
import pino from 'pino';
import pretty from 'pino-pretty';

export interface CtoLogOptions {

  /**
   * Increase (or decrease if negative) log verbosity by this much.
   * -3: fatal, -2: error, -1: warn, 0: info, 1: debug, 2: trace.
   * Useful for -qqqvvvv option processing.  Default: 0.
   */
  logLevel?: number;

  /** If a string, create this log file and write to it. */
  logFile?: string | null;

  /** If true, do not log to stdout. */
  mute?: boolean;

  /** If logFile is set, write synchronously if true (for testing). */
  sync?: boolean;

  /**
   * Ignore this set of comma-separated fields when pretty printing logs
   * to stdout.  Default: 'pid,hostname,name,host,port'.
   */
  prettyIgnore?: string;

  /**
   * Log instance, created by the first layer to call createLog.  Alternative
   * to getLog for times when multiple loggers are needed.
   */
  log?: Logger | null;
}

export const DEFAULT_LOG_OPTIONS: Required<CtoLogOptions> = {
  log: null,
  logFile: null,
  logLevel: 0,
  mute: false,
  prettyIgnore: 'pid,hostname,name,host,port',
  sync: false,
};
const CTO_LOG_OPTIONS_NAMES = nameSet(DEFAULT_LOG_OPTIONS);
const PINO_OPTIONS_NAMES = new Set([
  'base',
  'browser',
  'crlf',
  'customLevels',
  'depthLimit',
  'edgeLimit',
  'enabled',
  'errorKey',
  'formatters',
  'hooks',
  'level',
  'levelComparison',
  'levelVal',
  'messageKey',
  'mixin',
  'mixinMergeStrategy',
  'msgPrefix',
  'name',
  'nestedKey',
  'onChild',
  'redact',
  'safe',
  'serializers',
  'timestamp',
  'transport',
  'useOnlyCustomLevels',
]) as Set<keyof pino.LoggerOptions<never, false>>;

assertDisjoint(CTO_LOG_OPTIONS_NAMES, PINO_OPTIONS_NAMES);
export const LOG_OPTIONS_NAMES =
  new Set([...CTO_LOG_OPTIONS_NAMES, ...PINO_OPTIONS_NAMES]);
export type LogOptions = CtoLogOptions & pino.LoggerOptions<never, false>;
export type Logger = pino.Logger;

/**
 * "Write" to dev/null.
 */
class WriteSink {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  public write(_msg: string): void {
    // No-op.
  }
}

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
): Logger {
  const [logOpts, pinoOpts] = select(opts, DEFAULT_LOG_OPTIONS);

  if (logOpts.log) {
    return logOpts.log;
  }

  let levelNum = Math.round(3 - logOpts.logLevel);
  if (levelNum < 1) {
    levelNum = 1;
  } else if (levelNum > 6) {
    levelNum = 6;
  }
  pinoOpts.level = pino.levels.labels[levelNum * 10];

  let ret: Logger | undefined = undefined;
  if (logOpts.mute && !logOpts.logFile) {
    // Shh.
    ret = pino(pinoOpts, new WriteSink());
  } else if (logOpts.logFile) {
    const dest = pino.destination({
      dest: logOpts.logFile,
      sync: logOpts.sync,
      append: true,
      mkdir: true,
    });
    if (logOpts.mute) {
      ret = pino(pinoOpts, dest);
    } else {
      ret = pino(pinoOpts, pino.multistream([{
        level: pinoOpts.level,
        stream: dest,
      }, {
        level: pinoOpts.level,
        stream: pretty({
          ignore: logOpts.prettyIgnore,
        }),
      }]));
    }
  } else {
    ret = pino(pinoOpts, pretty({
      ignore: logOpts.prettyIgnore,
    }));
  }

  if (bindings) {
    ret.setBindings(bindings);
  }

  opts.log = ret;
  return ret;
}

let instance: Logger | undefined = undefined;

/**
 * Get a singleton logging object.  Opts and bindings are used the first time,
 * and ignored thereafter.  Ideally the highest-level layer will call this
 * first before any lower layer.
 *
 * @param opts Logging options.
 * @param bindings Extra fields to put into every log item.
 * @returns Singleton logging object.
 */
export function getLog(
  opts?: LogOptions,
  bindings: pino.Bindings = {}
): Logger {
  if (opts?.log) {
    return opts.log;
  }
  if (!instance) {
    instance = createLog(opts, bindings);
  }
  return instance;
}
