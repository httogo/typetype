const LOG_PREFIX = '[TypeType]';

export const logger = {
  error(context: string, error?: unknown) {
    console.error(`${LOG_PREFIX} [${context}]`, error ?? '');
  },
  warn(context: string, message?: string) {
    console.warn(`${LOG_PREFIX} [${context}]`, message ?? '');
  },
  info(context: string, message?: string) {
    if (import.meta.env.DEV) {
      console.info(`${LOG_PREFIX} [${context}]`, message ?? '');
    }
  },
  debug(context: string, ...args: unknown[]) {
    if (import.meta.env.DEV) {
      console.debug(`${LOG_PREFIX} [${context}]`, ...args);
    }
  },
};
