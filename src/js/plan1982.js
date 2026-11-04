import '../styles/main.css';
import { initPensumApp } from './core.js';
import { PENSUM_1982 } from '../data/pensum1982.js';

document.addEventListener('DOMContentLoaded', () => {
  initPensumApp('1982', PENSUM_1982);
});