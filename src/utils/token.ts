// Rolling Pickup Token (1 to 99999)
// Automatically increments sequentially up to 99999 and rolls over back to 1

const TOKEN_STORAGE_KEY = 'monopos_daily_token_state';

export const MAX_TOKEN_NUMBER = 99999;

interface DailyTokenState {
  date: string; // YYYY-MM-DD
  currentToken: number;
}

export const getNextDailyToken = (maxLimit = MAX_TOKEN_NUMBER, resetDaily = false): number => {
  const today = new Date().toISOString().slice(0, 10);
  let state: DailyTokenState = { date: today, currentToken: 0 };

  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.currentToken === 'number') {
        if (resetDaily && parsed.date !== today) {
          state = { date: today, currentToken: 0 };
        } else {
          state = { date: today, currentToken: parsed.currentToken };
        }
      }
    }
  } catch (err) {
    console.error('Failed to read daily token state', err);
  }

  // Increment and roll over after 99999 (1..99999)
  let next = state.currentToken + 1;
  if (next > maxLimit) {
    next = 1;
  }

  state = {
    date: today,
    currentToken: next,
  };

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save daily token state', err);
  }

  return next;
};

export const getCurrentDailyToken = (): number => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.currentToken === 'number') {
        return parsed.currentToken;
      }
    }
  } catch (err) {
    console.error('Failed to read token', err);
  }
  return 0;
};
