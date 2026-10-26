import crypto from 'node:crypto';
export const id = (prefix = '') => `${prefix}${crypto.randomUUID()}`;
export const now = () => new Date();
