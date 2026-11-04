import '../styles/main.css';
import { initPensumApp } from './core.js';
import { PENSUM_2024 } from '../data/pensum2024.js';

document.addEventListener('DOMContentLoaded', () => {
  initPensumApp('2024', PENSUM_2024);
});