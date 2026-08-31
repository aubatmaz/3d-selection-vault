import { env } from 'cloudflare:workers';
import initial from '../data/techniques.json';
import { validateCatalogue } from './catalogue.ts';
import {
  readCurationState,
  persistDecision,
  type SqlDatabase,
} from './curation-repository.ts';
import type { CurationDecision } from './model.ts';
const db = () => {
  const binding = (env as unknown as { DB?: SqlDatabase }).DB;
  if (!binding) throw new Error('Curation database is unavailable');
  return binding;
};
export const readState = () =>
  readCurationState(db(), validateCatalogue(initial));
export const saveDecision = (revision: number, decision: CurationDecision) =>
  persistDecision(db(), validateCatalogue(initial), revision, decision);
