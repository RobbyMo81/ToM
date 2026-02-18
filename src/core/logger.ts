export const logger = {
  info: (message: string, payload?: unknown) => {
    const stamp = new Date().toISOString();
    if (payload === undefined) {
      console.log(`[${stamp}] INFO ${message}`);
      return;
    }
    console.log(`[${stamp}] INFO ${message}`, payload);
  },
  warn: (message: string, payload?: unknown) => {
    const stamp = new Date().toISOString();
    if (payload === undefined) {
      console.warn(`[${stamp}] WARN ${message}`);
      return;
    }
    console.warn(`[${stamp}] WARN ${message}`, payload);
  },
  error: (message: string, payload?: unknown) => {
    const stamp = new Date().toISOString();
    if (payload === undefined) {
      console.error(`[${stamp}] ERROR ${message}`);
      return;
    }
    console.error(`[${stamp}] ERROR ${message}`, payload);
  },
};
