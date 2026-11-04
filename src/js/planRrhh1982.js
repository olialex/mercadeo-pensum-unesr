import '../styles/main.css';
import { initPensumApp } from './core.js';
import { PENSUM_RRHH_1982 } from '../data/pensumRrhh1982.js';

document.addEventListener('DOMContentLoaded', () => {
  initPensumApp('rrhh_1982', PENSUM_RRHH_1982);
});