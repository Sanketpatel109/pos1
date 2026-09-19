import { describe, it, expect } from 'vitest';
import { normalizeEmail, isEmailWhitelisted } from '../../services/adminWhitelistService';

describe('Admin Email Whitelist Logic', () => {
  it('normalizes email addresses correctly', () => {
    expect(normalizeEmail('  SanketPatel109@Gmail.COM  ')).toBe('sanketpatel109@gmail.com');
    expect(normalizeEmail('Test@EXAMPLE.com')).toBe('test@example.com');
  });

  it('correctly validates whitelisted emails case-insensitively', () => {
    const whitelist = ['sanketpatel109@gmail.com', 'partner@monopos.in'];

    expect(isEmailWhitelisted('sanketpatel109@gmail.com', whitelist)).toBe(true);
    expect(isEmailWhitelisted('SanketPatel109@GMAIL.com', whitelist)).toBe(true);
    expect(isEmailWhitelisted('PARTNER@MONOPOS.IN', whitelist)).toBe(true);
  });

  it('rejects unauthorized stranger emails', () => {
    const whitelist = ['sanketpatel109@gmail.com', 'partner@monopos.in'];

    expect(isEmailWhitelisted('hacker@gmail.com', whitelist)).toBe(false);
    expect(isEmailWhitelisted('stranger@yahoo.com', whitelist)).toBe(false);
    expect(isEmailWhitelisted('', whitelist)).toBe(false);
  });
});
