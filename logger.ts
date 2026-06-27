import chalk from "chalk";

const prefix = "┃";

type LogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS" | "DEBUG";

class Logger {
  private logWithStyle(level: LogLevel, message: string) {
    const colors: Record<LogLevel, (value: string) => string> = {
      INFO: chalk.blue,
      WARN: chalk.yellow,
      ERROR: chalk.red,
      SUCCESS: chalk.green,
      DEBUG: chalk.magenta,
    };

    console.log(`${chalk.gray(prefix)} ${colors[level](level.padEnd(8))} ${message}`);
  }

  info(message: string) {
    this.logWithStyle("INFO", message);
  }

  warn(message: string) {
    this.logWithStyle("WARN", message);
  }

  error(message: string) {
    this.logWithStyle("ERROR", message);
  }

  success(message: string) {
    this.logWithStyle("SUCCESS", message);
  }

  debug(message: string) {
    this.logWithStyle("DEBUG", message);
  }
}

export const logger = new Logger();
export default logger;

