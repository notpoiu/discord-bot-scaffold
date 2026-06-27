import chalk from "chalk";

const prefix = "┃";

class Logger {
  _logWithStyle(level, message) {
    let color;

    switch (level) {
      case "INFO":
        color = chalk.blue;
        break;
      case "WARN":
        color = chalk.yellow;
        break;
      case "ERROR":
        color = chalk.red;
        break;
      case "SUCCESS":
        color = chalk.green;
        break;
      case "DEBUG":
        color = chalk.magenta;
        break;
      default:
        color = chalk.white;
    }

    console.log(`${chalk.gray(prefix)} ${color(level.padEnd(8))} ${message}`);
  }

  info(message) {
    this._logWithStyle("INFO", message);
  }

  warn(message) {
    this._logWithStyle("WARN", message);
  }

  error(message) {
    this._logWithStyle("ERROR", message);
  }

  success(message) {
    this._logWithStyle("SUCCESS", message);
  }

  debug(message) {
    this._logWithStyle("DEBUG", message);
  }
}

export const logger = new Logger();
export default logger;

