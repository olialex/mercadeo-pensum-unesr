import Chart from 'chart.js/auto';


const STORAGE_KEY = 'unesr_mercadeo_state_multiplan_v2';

let appPlanKey = '2024';
let appPensumData = [];

let userState = {
  plan2024: {
    grades: {},
    status: {},
    courseGroup: {},
    groups: [
      { id: 'group_1', title: 'Semestre 2024-1', color: '#3b82f6' },
      { id: 'group_2', title: 'Semestre 2024-2', color: '#10b981' }
    ]
  },
  plan1982: {
    grades: {},
    status: {},
    courseGroup: {},
    groups: [
      { id: 'group_1982_1', title: 'Período I', color: '#3b82f6' }
    ]
  }
};

let ucChartInstance = null;
let statusChartInstance = null;

export function initPensumApp(planKey, pensumData) {
  appPlanKey = planKey;
  appPensumData = pensumData;

  loadState();
  initCharts();
  renderGroups();
  renderAllTables();
  updateDashboard();

  // Attach DOM Listeners
  document.getElementById('searchInput')?.addEventListener('input', renderAllTables);
  document.getElementById('filterStatus')?.addEventListener('change', renderAllTables);
  document.getElementById('filterGroup')?.addEventListener('change', renderAllTables);
  
  document.getElementById('btnOpenGroupModal')?.addEventListener('click', toggleGroupModal);
  document.getElementById('btnCancelGroupModal')?.addEventListener('click', toggleGroupModal);
  document.getElementById('btnSaveGroup')?.addEventListener('click', saveCustomGroup);

  document.getElementById('btnExport')?.addEventListener('click', exportData);
  document.getElementById('importFile')?.addEventListener('change', importData);
  document.getElementById('btnReset')?.addEventListener('click', () => toggleResetModal(true));
  document.getElementById('btnCancelReset')?.addEventListener('click', () => toggleResetModal(false));
  document.getElementById('btnConfirmReset')?.addEventListener('click', executeReset);
}

function getActiveState() {
  return appPlanKey === '2024' ? userState.plan2024 : userState.plan1982;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.plan2024 && parsed.plan1982) {
        userState = parsed;
      }
    } catch (e) {
      console.error("Error cargando localStorage", e);
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
  updateDashboard();
}

export function renderAllTables() {
  const container = document.getElementById('tables-wrapper');
  if (!container) return;

  container.innerHTML = '';
  const activeState = getActiveState();

  const cycles = [
    { id: 'INTRO', name: 'Ciclo Introductorio', minUc: 15, bg: 'from-blue-600/10 via-slate-800 to-slate-900 border-blue-500/30' },
    { id: 'GEN', name: 'Ciclo General', minUc: 60, bg: 'from-indigo-600/10 via-slate-800 to-slate-900 border-indigo-500/30' },
    { id: 'PROF', name: 'Ciclo Profesional', minUc: 77, bg: 'from-purple-600/10 via-slate-800 to-slate-900 border-purple-500/30' },
    { id: 'ELEC', name: 'Cursos Electivos', minUc: appPlanKey === '1982' ? 23 : 0, bg: 'from-emerald-600/10 via-slate-800 to-slate-900 border-emerald-500/30' }
  ];

  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('filterStatus')?.value || 'ALL';
  const groupFilter = document.getElementById('filterGroup')?.value || 'ALL';

  cycles.forEach(cycle => {
    let items = appPensumData.filter(item => item.cycle === cycle.id);

    if (searchTerm) {
      items = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm) || 
        i.code.toLowerCase().includes(searchTerm) || 
        i.req.toLowerCase().includes(searchTerm)
      );
    }

    if (statusFilter !== 'ALL') {
      items = items.filter(i => (activeState.status[i.code] || 'PENDING') === statusFilter);
    }

    if (groupFilter !== 'ALL') {
      if (groupFilter === 'UNGROUPED') {
        items = items.filter(i => !activeState.courseGroup[i.code]);
      } else {
        items = items.filter(i => activeState.courseGroup[i.code] === groupFilter);
      }
    }

    if (items.length === 0 && (searchTerm || statusFilter !== 'ALL' || groupFilter !== 'ALL')) {
      return; 
    }

    const totalUcCycle = items.reduce((acc, curr) => acc + curr.uc, 0);
    const passedUcCycle = items.reduce((acc, curr) => {
      return (activeState.status[curr.code] === 'PASSED') ? acc + curr.uc : acc;
    }, 0);

    const section = document.createElement('section');
    section.className = `rounded-2xl border ${cycle.bg} bg-gradient-to-r p-5 shadow-xl transition-all duration-300`;

    section.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/60">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            ${cycle.name}
            ${cycle.minUc ? `<span class="text-xs font-normal text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">Mínimo: ${cycle.minUc} UC</span>` : ''}
          </h3>
        </div>
        <div class="text-xs text-slate-300 font-semibold bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/80 self-start sm:self-auto">
          Avance: <span class="text-blue-400 font-bold">${passedUcCycle}</span> / ${cycle.minUc || totalUcCycle} UC
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th class="py-2.5 px-3 w-10 text-center">Check</th>
              <th class="py-2.5 px-3">Código</th>
              <th class="py-2.5 px-3">Asignatura</th>
              <th class="py-2.5 px-3 text-center">U/C</th>
              <th class="py-2.5 px-3 text-center">H. Teo / Prac</th>
              <th class="py-2.5 px-3">Prelación</th>
              <th class="py-2.5 px-3">Grupo / Semestre</th>
              <th class="py-2.5 px-3 text-center">Estado</th>
              <th class="py-2.5 px-3 text-center w-24">Nota (1-5)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-xs">
            ${items.map(course => renderTableRow(course)).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(section);
  });

  bindTableEvents();
}

function renderTableRow(course) {
  const activeState = getActiveState();
  const status = activeState.status[course.code] || 'PENDING';
  const grade = activeState.grades[course.code] ?? '';
  const assignedGroupId = activeState.courseGroup[course.code] || '';
  
  const assignedGroup = activeState.groups.find(g => g.id === assignedGroupId);
  const groupColor = assignedGroup ? assignedGroup.color : null;
  const isPassed = status === 'PASSED';

  const rowBgStyle = groupColor 
    ? `background-color: ${groupColor}15; border-left: 4px solid ${groupColor};` 
    : '';

  return `
    <tr class="hover:bg-slate-800/40 transition" style="${rowBgStyle}">
      <td class="py-2.5 px-3 text-center">
        <input type="checkbox" data-code="${course.code}" class="js-checkbox w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer" ${isPassed ? 'checked' : ''}>
      </td>
      <td class="py-2.5 px-3 font-mono text-slate-300 font-semibold">${course.code}</td>
      <td class="py-2.5 px-3 font-medium text-slate-100">
        <div class="flex items-center gap-2">
          ${groupColor ? `<span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${groupColor}"></span>` : ''}
          <span>${course.name}</span>
        </div>
      </td>
      <td class="py-2.5 px-3 text-center font-bold text-blue-400">${course.uc}</td>
      <td class="py-2.5 px-3 text-center text-slate-400">${course.ht} T / ${course.hp} P</td>
      <td class="py-2.5 px-3 text-slate-400 italic">${course.req || '<span class="text-slate-600">-</span>'}</td>
      <td class="py-2.5 px-3">
        <select data-code="${course.code}" class="js-select-group w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500">
          <option value="">Sin Grupo / Semestre</option>
          ${activeState.groups.map(g => `
            <option value="${g.id}" ${assignedGroupId === g.id ? 'selected' : ''}>${g.title}</option>
          `).join('')}
        </select>
      </td>
      <td class="py-2.5 px-3 text-center">
        <select data-code="${course.code}" class="js-select-status bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500">
          <option value="PENDING" ${status === 'PENDING' ? 'selected' : ''}>Pendiente</option>
          <option value="ENROLLED" ${status === 'ENROLLED' ? 'selected' : ''}>Cursando</option>
          <option value="PASSED" ${status === 'PASSED' ? 'selected' : ''}>Aprobada</option>
        </select>
      </td>
      <td class="py-2.5 px-3 text-center">
        <input type="number" min="1" max="5" step="0.1" placeholder="1-5" value="${grade}" data-code="${course.code}" class="js-input-grade w-16 bg-slate-900 border border-slate-700 text-center rounded-lg px-2 py-1 text-slate-100 text-xs focus:outline-none ${grade >= 3 ? 'text-emerald-400 font-bold' : (grade !== '' ? 'text-rose-400 font-bold' : '')}">
      </td>
    </tr>
  `;
}

function bindTableEvents() {
  document.querySelectorAll('.js-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const activeState = getActiveState();
      activeState.status[e.target.dataset.code] = e.target.checked ? 'PASSED' : 'PENDING';
      saveState();
      renderAllTables();
    });
  });

  document.querySelectorAll('.js-select-group').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const activeState = getActiveState();
      const code = e.target.dataset.code;
      if (!e.target.value) delete activeState.courseGroup[code];
      else activeState.courseGroup[code] = e.target.value;
      saveState();
      renderGroups();
      renderAllTables();
    });
  });

  document.querySelectorAll('.js-select-status').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const activeState = getActiveState();
      activeState.status[e.target.dataset.code] = e.target.value;
      saveState();
      renderAllTables();
    });
  });

  document.querySelectorAll('.js-input-grade').forEach(input => {
    input.addEventListener('change', (e) => {
      const activeState = getActiveState();
      const code = e.target.dataset.code;
      const val = e.target.value;

      if (val === '') delete activeState.grades[code];
      else {
        let num = parseFloat(val);
        if (num > 5) num = 5;
        if (num < 1) num = 1;
        activeState.grades[code] = num;
        if (num >= 3.0) activeState.status[code] = 'PASSED';
      }
      saveState();
      renderAllTables();
    });
  });
}

export function renderGroups() {
  const container = document.getElementById('groups-container');
  const select = document.getElementById('filterGroup');
  if (!container || !select) return;

  const activeState = getActiveState();
  container.innerHTML = '';
  select.innerHTML = `
    <option value="ALL">Todos los Grupos / Semestres</option>
    <option value="UNGROUPED">Sin Grupo Asignado</option>
  `;

  activeState.groups.forEach(group => {
    let groupUcTotal = 0;
    let groupCount = 0;

    appPensumData.forEach(c => {
      if (activeState.courseGroup[c.code] === group.id) {
        groupUcTotal += c.uc;
        groupCount++;
      }
    });

    const badge = document.createElement('div');
    badge.className = 'flex items-center gap-2.5 bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-xl text-xs text-slate-200 shadow-sm';
    badge.style.borderLeft = `4px solid ${group.color}`;

    badge.innerHTML = `
      <input type="color" value="${group.color}" data-id="${group.id}" class="js-group-color w-4 h-4 rounded bg-transparent border-0 cursor-pointer p-0">
      <div class="flex flex-col">
        <span class="font-bold text-white">${group.title}</span>
        <span class="text-[10px] text-slate-400">${groupCount} materias (${groupUcTotal} UC)</span>
      </div>
      <button data-id="${group.id}" class="js-delete-group text-slate-500 hover:text-rose-400 ml-2" title="Eliminar grupo">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    container.appendChild(badge);

    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = `${group.title} (${groupUcTotal} UC)`;
    select.appendChild(option);
  });

  document.querySelectorAll('.js-group-color').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const group = activeState.groups.find(g => g.id === e.target.dataset.id);
      if (group) {
        group.color = e.target.value;
        saveState();
        renderGroups();
        renderAllTables();
      }
    });
  });

  document.querySelectorAll('.js-delete-group').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      Object.keys(activeState.courseGroup).forEach(code => {
        if (activeState.courseGroup[code] === id) delete activeState.courseGroup[code];
      });
      activeState.groups = activeState.groups.filter(g => g.id !== id);
      saveState();
      renderGroups();
      renderAllTables();
    });
  });
}

function toggleGroupModal() {
  document.getElementById('groupModal')?.classList.toggle('hidden');
}

function saveCustomGroup() {
  const titleInput = document.getElementById('groupTitleInput');
  const colorInput = document.getElementById('groupColorInput');
  const title = titleInput?.value.trim();
  const color = colorInput?.value || '#3b82f6';

  if (!title) return;

  const activeState = getActiveState();
  activeState.groups.push({
    id: 'group_' + Date.now(),
    title: title,
    color: color
  });

  if (titleInput) titleInput.value = '';
  saveState();
  renderGroups();
  renderAllTables();
  toggleGroupModal();
}

export function updateDashboard() {
  const activeState = getActiveState();
  let ucPassed = { INTRO: 0, GEN: 0, PROF: 0, ELEC: 0 };
  let ucTotalPassed = 0;

  let gradeSum = { INTRO: 0, GEN: 0, PROF: 0, ELEC: 0, TOTAL: 0 };
  let gradeCount = { INTRO: 0, GEN: 0, PROF: 0, ELEC: 0, TOTAL: 0 };
  let statusCounts = { PASSED: 0, ENROLLED: 0, PENDING: 0 };

  appPensumData.forEach(course => {
    const st = activeState.status[course.code] || 'PENDING';
    statusCounts[st]++;

    if (st === 'PASSED') {
      ucPassed[course.cycle] += course.uc;
      ucTotalPassed += course.uc;
    }

    const grade = activeState.grades[course.code];
    if (grade !== undefined && grade !== null && grade !== '') {
      gradeSum[course.cycle] += grade;
      gradeCount[course.cycle]++;
      gradeSum.TOTAL += grade;
      gradeCount.TOTAL++;
    }
  });

  const targetIntro = 15;
  const targetGen = 60;
  const targetProf = 77;
  const targetTotal = 152;

  const pctIntro = Math.min(100, Math.round((ucPassed.INTRO / targetIntro) * 100));
  const pctGen = Math.min(100, Math.round((ucPassed.GEN / targetGen) * 100));
  const pctProf = Math.min(100, Math.round((ucPassed.PROF / targetProf) * 100));
  const pctGlobal = Math.min(100, Math.round((ucTotalPassed / targetTotal) * 100));

  const gpaIntro = gradeCount.INTRO ? (gradeSum.INTRO / gradeCount.INTRO).toFixed(2) : '0.00';
  const gpaGen = gradeCount.GEN ? (gradeSum.GEN / gradeCount.GEN).toFixed(2) : '0.00';
  const gpaProf = gradeCount.PROF ? (gradeSum.PROF / gradeCount.PROF).toFixed(2) : '0.00';
  const gpaTotal = gradeCount.TOTAL ? (gradeSum.TOTAL / gradeCount.TOTAL).toFixed(2) : '0.00';

  // Elements Updates
  const elHeaderUc = document.getElementById('header-uc');
  if (elHeaderUc) elHeaderUc.innerText = `${ucTotalPassed} / ${targetTotal}`;

  const elHeaderGpa = document.getElementById('header-gpa');
  if (elHeaderGpa) elHeaderGpa.innerText = `${gpaTotal} pts`;

  const elHeaderProgress = document.getElementById('header-progress');
  if (elHeaderProgress) elHeaderProgress.innerText = `${pctGlobal}%`;

  const elBarIntro = document.getElementById('bar-intro');
  if (elBarIntro) elBarIntro.style.width = `${pctIntro}%`;

  const elBarGen = document.getElementById('bar-gen');
  if (elBarGen) elBarGen.style.width = `${pctGen}%`;

  const elBarProf = document.getElementById('bar-prof');
  if (elBarProf) elBarProf.style.width = `${pctProf}%`;

  const elUcIntro = document.getElementById('uc-intro');
  if (elUcIntro) elUcIntro.innerHTML = `${ucPassed.INTRO} <span class="text-xs font-normal text-slate-400">/ 15 UC</span>`;

  const elUcGen = document.getElementById('uc-gen');
  if (elUcGen) elUcGen.innerHTML = `${ucPassed.GEN} <span class="text-xs font-normal text-slate-400">/ 60 UC</span>`;

  const elUcProf = document.getElementById('uc-prof');
  if (elUcProf) elUcProf.innerHTML = `${ucPassed.PROF} <span class="text-xs font-normal text-slate-400">/ 77 UC</span>`;

  const elGpaIntro = document.getElementById('gpa-intro');
  if (elGpaIntro) elGpaIntro.innerText = `${gpaIntro} pts`;

  const elGpaGen = document.getElementById('gpa-gen');
  if (elGpaGen) elGpaGen.innerText = `${gpaGen} pts`;

  const elGpaProf = document.getElementById('gpa-prof');
  if (elGpaProf) elGpaProf.innerText = `${gpaProf} pts`;

  const elecPassedCount = appPensumData.filter(c => c.cycle === 'ELEC' && activeState.status[c.code] === 'PASSED').length;
  const elUcElec = document.getElementById('uc-elec');
  if (elUcElec) elUcElec.innerHTML = `${ucPassed.ELEC} <span class="text-xs font-normal text-slate-400">UC Total</span>`;

  const elEfficiency = document.getElementById('efficiency-index');
  if (elEfficiency) elEfficiency.innerText = (pctGlobal / 100 * (parseFloat(gpaTotal) / 5)).toFixed(2);

  updateCharts(ucPassed, statusCounts);
}

function initCharts() {
  const ctxUc = document.getElementById('chartUcDistribution')?.getContext('2d');
  const ctxStatus = document.getElementById('chartStatusDistribution')?.getContext('2d');

  if (ctxUc) {
    ucChartInstance = new Chart(ctxUc, {
      type: 'doughnut',
      data: {
        labels: ['Introduct.', 'General', 'Profesional', 'Electivas'],
        datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#3b82f6', '#6366f1', '#a855f7', '#10b981'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } }, cutout: '70%' }
    });
  }

  if (ctxStatus) {
    statusChartInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Aprobadas', 'Cursando', 'Pendientes'],
        datasets: [{ data: [0, 0, 0], backgroundColor: ['#10b981', '#f59e0b', '#334155'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } }, cutout: '70%' }
    });
  }
}

function updateCharts(ucPassed, statusCounts) {
  if (ucChartInstance) {
    ucChartInstance.data.datasets[0].data = [ucPassed.INTRO, ucPassed.GEN, ucPassed.PROF, ucPassed.ELEC];
    ucChartInstance.update();
  }
  if (statusChartInstance) {
    statusChartInstance.data.datasets[0].data = [statusCounts.PASSED, statusCounts.ENROLLED, statusCounts.PENDING];
    statusChartInstance.update();
  }
}

function toggleResetModal(show) {
  document.getElementById('resetModal')?.classList.toggle('hidden', !show);
}

function executeReset() {
  if (appPlanKey === '2024') {
    userState.plan2024 = { grades: {}, status: {}, courseGroup: {}, groups: [] };
  } else {
    userState.plan1982 = { grades: {}, status: {}, courseGroup: {}, groups: [] };
  }
  saveState();
  toggleResetModal(false);
  renderGroups();
  renderAllTables();
  updateDashboard();
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userState, null, 2));
  const anchor = document.createElement('a');
  anchor.setAttribute("href", dataStr);
  anchor.setAttribute("download", `pensum_unesr_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported && typeof imported === 'object') {
        userState = imported;
        saveState();
        renderGroups();
        renderAllTables();
        updateDashboard();
      }
    } catch (err) {
      alert('Error al leer el archivo JSON.');
    }
  };
  reader.readAsText(file);
}