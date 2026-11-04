import '../styles/main.css';
import { initPensumApp } from './core.js';
import { PENSUM_RRHH_2024 } from '../data/pensumRrhh2024.js';

document.addEventListener('DOMContentLoaded', () => {
  initPensumApp('rrhh_2024', PENSUM_RRHH_2024);
});