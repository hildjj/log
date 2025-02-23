# @cto.af/log

A thin wrapper around [Pino](https://getpino.io/#/) to insulate multiple
projects from the dependency, and to normalize a common pattern in those
projects.

In particular:

- Singleton log object.
- Write pretty output to stdout, JSON to a file, both, or neither.

## Installation

```sh
npm install @cto.af/log
```

## API

Full [API documentation](http://cto-af.github.io/log/) is available.  Options
are the Pino [options](https://getpino.io/#/docs/api?id=options) plus:

- logLevel: Suitable for -v and -q CLI arguments:
  - -3: fatal
  - -2: error
  - -1: warn
  - 0: info
  - 1: debug
  - 2: trace.
- logFile: Write to this file, creating the directory if needed.
- mute: Disable stdout logging if true.
- prettyIgnore: Ignore these comma-separated fields in the stdout.
  Default: 'pid,hostname,name,host,port'

Example:

```js
const log = getLog();
log.info('foo');
log.warn({clientId: 17}, 'Client %d did things', 17);
```

---
[![Build Status](https://github.com/cto-af/log/workflows/Tests/badge.svg)](https://github.com/cto-af/log/actions?query=workflow%3ATests)
[![codecov](https://codecov.io/github/cto-af/log/graph/badge.svg?token=tWlUsafC9g)](https://codecov.io/github/cto-af/log)
