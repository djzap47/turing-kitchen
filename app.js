/* Browser controller. Computation stays in engine.js; the UI only renders it. */
(() => {
  'use strict';
  const { BLANK, machines, Machine } = window.Turing;
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const direction = { L: 'left', R: 'right', S: 'stay' };
  const item = s => definition.symbols[s] || {icon:s,label:s};
  const itemName = s => item(s).label;
  let definition = machines[0], machine, running = false, timer = null, follow = true, viewCenter = 0;
  let toastTimer, predictionKey = '', answered = false, capReached = false;
  const MAX_STEPS = 10000;

  function notify(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
  }
  function stop() { running = false; clearTimeout(timer); timer = null; }
  function select(id, input) {
    stop();
    definition = machines.find(m => m.id === id) || machines[0];
    $('machine-name').textContent = definition.name;
    $('machine-description').textContent = definition.description;
    $('alphabet').textContent = definition.alphabet;
    $('tape-input').value = input ?? definition.input;
    $('examples').innerHTML = definition.examples.map((e, i) => `<button class="example" type="button" data-example="${i}">${esc(e.label)}</button>`).join('');
    $('machine-list').innerHTML = machines.map((m, i) => `<button class="machine-card ${m.id === id ? 'selected' : ''}" aria-pressed="${m.id === id}" data-machine="${m.id}"><span class="card-top"><span class="machine-symbol" aria-hidden="true">${m.icon}</span><span class="card-num">0${i + 1}</span></span><strong>${m.name}</strong><span class="card-desc">${m.subtitle}</span><code>${m.goal}</code></button>`).join('');
    $('ingredient-palette').innerHTML = definition.palette.map(s=>`<button class="ingredient-button" data-ingredient="${s}" title="Add ${itemName(s)}"><span aria-hidden="true">${item(s).icon}</span> ${itemName(s)} <small>${s}</small></button>`).join('')+'<button class="ingredient-button" id="clear-order">Clear order</button>';
    $('symbol-key').innerHTML = Object.entries(definition.symbols).filter(([s])=>s!==BLANK).map(([s,v])=>`<span><b aria-hidden="true">${v.icon}</b> ${v.label} <code>${s}</code></span>`).join('');
    $('rule-count').textContent = `${definition.rules.length} rules`;
    $('rules').innerHTML = definition.rules.map((r, i) => `<tr data-rule="${i}"><td title="${esc(definition.labels[r.state])}">${esc(r.state)}</td><td title="${esc(itemName(r.read))}"><span aria-hidden="true">${item(r.read).icon}</span> ${esc(r.read)}</td><td title="${esc(itemName(r.write))}"><span aria-hidden="true">${item(r.write).icon}</span> ${esc(r.write)}</td><td><span aria-label="${direction[r.move]}">${r.move==='L'?'← L':'R →'}</span></td><td title="${esc(definition.labels[r.next])}">${esc(r.next)}</td></tr>`).join('');
    $('graph-caption').textContent = definition.insight;
    load($('tape-input').value);
  }
  function load(value) {
    stop();
    try {
      const fresh = new Machine(definition, value);
      machine = fresh;
      $('input-error').textContent = '';
      $('tape-input').removeAttribute('aria-invalid');
      $('tape-input').value = value;
      follow = true; viewCenter = 0; predictionKey = ''; capReached = false;
      render();
      return true;
    } catch (e) {
      $('input-error').textContent = e.message;
      $('tape-input').setAttribute('aria-invalid', 'true');
      if (machine) render();
      return false;
    }
  }
  function advance() {
    if (machine.halted) return;
    if (machine.steps >= MAX_STEPS) { stop(); capReached = true; render(); return; }
    machine.step();
    if (machine.halted) stop();
    if (!machine.halted && machine.steps >= MAX_STEPS) { stop(); capReached = true; }
    render();
  }
  function tick() { advance(); if (running) timer = setTimeout(tick, Number($('speed').value)); }
  function toggleRun() {
    if (running) { stop(); render(); return; }
    if (machine.halted || capReached) return;
    running = true; tick();
  }
  function formatRule(r) { return r ? `${definition.labels[r.state]} + ${itemName(r.read)} → leave ${itemName(r.write)}, move ${direction[r.move]}, then ${definition.labels[r.next].toLowerCase()}.` : 'No next transition'; }

  function renderTape() {
    const center = follow ? machine.head : viewCenter;
    // Keep a stable cell layout between moves. The finite window has padding for smooth travel.
    const low = Math.min(-9, center - 9, machine.head - 9);
    const high = Math.max(machine.input.length + 9, center + 9, machine.head + 9);
    const last = machine.history.at(-1);
    let html = '';
    for (let i = low; i <= high; i++) {
      const s = machine.read(i);
      html += `<div class="tape-cell ${s === BLANK ? 'blank' : ''} ${i === machine.head ? 'active' : ''} ${last?.head === i && last.rule?.write !== last.read ? 'changed' : ''}" title="${esc(itemName(s))} (${esc(s)})" aria-label="Cell ${i}: ${esc(itemName(s))}${i === machine.head ? ', head is here' : ''}"><span aria-hidden="true">${item(s).icon}</span><small class="cell-symbol">${esc(s)}</small><span class="cell-index">${i}</span></div>`;
    }
    $('tape-rail').innerHTML = html;
    $('tape-rail').style.transform = `translateX(${-((center - low) * 52 + 23)}px)`;
    $('head-position').textContent = `HEAD @ ${machine.head}`;
    $('head-caption').textContent = Math.abs(center - machine.head) > 3 ? 'HEAD IS OUTSIDE THIS VIEW' : 'READ / WRITE HEAD';
    $('follow-head').textContent = follow ? 'Following head' : 'Follow head';
  }

  function graph() {
    const n = definition.states.length, width = 480, height = n > 4 ? 226 : 120;
    const pos = {};
    if (n <= 4) definition.states.forEach((s, i) => { pos[s] = [55 + i * (370 / (n - 1)), 61]; });
    else {
      const coordinates = [[48,70],[174,70],[300,70],[426,70],[300,187],[112,187]];
      definition.states.forEach((s,i) => { pos[s] = coordinates[i]; });
    }
    const next = machine.nextRule(), last = machine.history.at(-1)?.rule;
    const pairs = [...new Set(definition.rules.map(r => `${r.state}|${r.next}`))];
    const edges = pairs.map(pair => {
      const [from,to] = pair.split('|'), [x1,y1] = pos[from], [x2,y2] = pos[to];
      const active = next?.state === from && next?.next === to;
      const used = last?.state === from && last?.next === to;
      const cls = active ? 'active' : used ? 'last' : '';
      let path;
      if (from === to) path = `M ${x1-13} ${y1-24} C ${x1-45} ${y1-63}, ${x1+45} ${y1-63}, ${x1+13} ${y1-24}`;
      else {
        const dx=x2-x1, dy=y2-y1, distance=Math.hypot(dx,dy), ux=dx/distance, uy=dy/distance;
        const sx=x1+ux*29, sy=y1+uy*29, ex=x2-ux*32, ey=y2-uy*32;
        if (pairs.includes(`${to}|${from}`)) path = `M ${sx} ${sy} Q ${(sx+ex)/2-uy*22} ${(sy+ey)/2+ux*22} ${ex} ${ey}`;
        else path = `M ${sx} ${sy} L ${ex} ${ey}`;
      }
      return `<path d="${path}" class="graph-edge ${cls}" marker-end="url(#arrow-${active?'active':'normal'})"><title>${esc(from)} → ${esc(to)}</title></path>`;
    }).join('');
    const nodes = definition.states.map(s => {
      const [x,y] = pos[s], terminal = definition.accept.includes(s) || definition.reject.includes(s);
      return `<g class="graph-node ${s === machine.state ? 'current' : ''} ${terminal ? 'terminal' : ''}" transform="translate(${x} ${y})"><title>${s}: ${esc(definition.labels[s])}${s === machine.state ? ' (current)' : ''}</title><circle r="27"/>${terminal ? '<circle r="23" style="fill:none"/>' : ''}<text>${s}</text></g>`;
    }).join('');
    $('state-graph').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="State diagram. Current state: ${machine.state}. ${next ? 'Next transition: '+ next.state + ' to ' + next.next : 'Machine halted.'}"><defs><marker id="arrow-normal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#c6bbd4" stroke-width="1.6"/></marker><marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#6750c8" stroke-width="1.6"/></marker></defs>${edges}${nodes}</svg>`;
  }

  function render() {
    renderTape();
    const completed = machine.history.filter(e=>e.rule && e.rule.write!==e.read).length;
    $('kitchen-scene').innerHTML = `<div class="scene-icon" aria-hidden="true">${definition.scene[machine.state]}</div><div><span class="section-label">${machine.halted ? 'THE RECIPE HAS STOPPED' : 'IN THE KITCHEN RIGHT NOW'}</span><h3>${esc(definition.labels[machine.state])}</h3><p>${machine.halted ? machine.outcome==='accept' ? esc(definition.success) : 'Check the explanation below, adjust your order, and try again.' : `${completed} ingredient updates · follow the highlighted cell below`}</p></div>`;
    const r = machine.nextRule(), last = machine.history.at(-1);
    $('state-value').textContent = machine.state;
    $('state-label').textContent = definition.labels[machine.state];
    $('step-count').textContent = machine.steps.toLocaleString();
    $('cell-count').textContent = machine.maxVisited - machine.minVisited + 1;
    $('next-rule').textContent = machine.halted ? `Halted · ${machine.outcome}` : formatRule(r);
    const status = machine.halted ? (machine.outcome === 'accept' ? 'Halted · accepted' : machine.outcome === 'reject' ? 'Halted · rejected' : 'Halted · no rule') : capReached ? 'Paused · limit' : running ? 'Running' : machine.steps ? 'Paused' : 'Ready';
    $('status').textContent = status;
    $('status').className = `badge ${machine.outcome || (running ? 'running' : '')}`;
    $('run').innerHTML = running ? '<span aria-hidden="true">Ⅱ</span> Pause' : '<span aria-hidden="true">▶</span> Run';
    $('run').disabled = machine.halted || capReached;
    $('step').disabled = machine.halted || capReached;
    $('back').disabled = !machine.history.length;
    $('narration-label').textContent = capReached ? 'PLAYBACK LIMIT — NOT A HALT' : machine.halted ? 'WHY THE MACHINE STOPPED' : 'WHAT HAPPENS NEXT';
    $('narration-text').textContent = capReached ? 'Paused after 10,000 transitions to keep the browser responsive. This is not a mathematical halt or proof of a loop. Reset or rewind to explore again.' : machine.halted ? last?.rule?.note || 'There is no rule for this state and symbol. The machine is stuck.' : r?.note || 'No transition matches this state and symbol. The next Step will report a stuck halt.';
    $('halt-result').hidden = !machine.halted;
    $('halt-result').className = `halt-result ${machine.outcome || ''}`;
    if (machine.halted) {
      const accepted = machine.outcome === 'accept';
      const heading = accepted ? `✓ Accepted — ${definition.success}` : machine.outcome === 'reject' ? `× Rejected — ${definition.failure}` : 'No matching rule — halted.';
      const explanation = accepted ? definition.result(machine.input, machine.output()) : machine.outcome === 'reject' ? last.rule.note : `No rule is defined for (${machine.state}, ${machine.read()}).`;
      $('halt-result').innerHTML = `<strong>${esc(heading)}</strong>${esc(explanation)}<code>Final tape: ${esc(machine.output() || '□ (empty)')} · ${machine.steps} transitions</code>`;
    }
    const activeIndex = definition.rules.indexOf(r), lastIndex = definition.rules.indexOf(last?.rule);
    [...$('rules').children].forEach((row, i) => {
      row.classList.toggle('active', i === activeIndex);
      row.classList.toggle('last', i === lastIndex);
      if (i === activeIndex) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
    });
    const row = $('rules').children[activeIndex];
    if (row) {
      const container = row.closest('.rule-table-scroll'), offset = row.offsetTop - $('rules').offsetTop;
      if (offset < container.scrollTop || offset + row.offsetHeight > container.scrollTop + container.clientHeight - 34) container.scrollTop = Math.max(0, offset - 80);
    }
    $('history').innerHTML = machine.history.length ? machine.history.slice(-30).reverse().map(e => `<li><span class="log-num">${String(e.step).padStart(2,'0')}</span><span>${e.rule ? `${esc(e.state)} · ${esc(e.read)}→${esc(e.rule.write)} · ${e.rule.move}<br>↳ ${esc(e.rule.next)} <span class="muted">@ ${e.head}</span>` : `No rule for ${esc(e.state)}, ${esc(e.read)}`}</span></li>`).join('') : '<li class="log-empty">Your story starts with a single step.<br>Run the machine to record its journey.</li>';
    graph();
    const key = `${definition.id}:${machine.steps}:${machine.state}:${machine.head}`;
    if (key !== predictionKey) { answered = false; predictionKey = key; $('prediction-feedback').textContent = ''; }
    $('prediction-question').textContent = r ? `The job is “${definition.labels[machine.state]}” and the chef sees ${itemName(machine.read()).toLowerCase()}. Which way will the head move?` : 'This recipe has halted. Rewind or reset to try another prediction.';
    document.querySelectorAll('[data-predict]').forEach(b => { b.disabled = !r || running || answered; });
  }

  $('machine-list').addEventListener('click', e => { const b = e.target.closest('[data-machine]'); if (b) select(b.dataset.machine); });
  $('ingredient-palette').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='clear-order')$('tape-input').value='';
    else if($('tape-input').value.length<64)$('tape-input').value+=b.dataset.ingredient;
    else notify('The order can contain at most 64 ingredients.');
    $('input-error').textContent='';$('tape-input').removeAttribute('aria-invalid');
  });
  $('examples').addEventListener('click', e => { const b=e.target.closest('[data-example]'); if (b) load(definition.examples[Number(b.dataset.example)].input); });
  $('input-form').addEventListener('submit', e => { e.preventDefault(); load($('tape-input').value); });
  $('tape-input').addEventListener('input', () => { $('input-error').textContent = ''; $('tape-input').removeAttribute('aria-invalid'); });
  $('step').addEventListener('click', () => { stop(); advance(); });
  $('run').addEventListener('click', toggleRun);
  $('back').addEventListener('click', () => { stop(); machine.back(); capReached = false; render(); });
  $('reset').addEventListener('click', () => load(machine.input));
  $('speed').addEventListener('change', () => { if (running) { clearTimeout(timer); timer = setTimeout(tick, Number($('speed').value)); } });
  $('tape-left').addEventListener('click', () => { viewCenter=(follow ? machine.head : viewCenter)-3; follow=false; renderTape(); });
  $('tape-right').addEventListener('click', () => { viewCenter=(follow ? machine.head : viewCenter)+3; follow=false; renderTape(); });
  $('follow-head').addEventListener('click', () => { follow=true; renderTape(); });
  document.querySelectorAll('[data-predict]').forEach(b => b.addEventListener('click', () => {
    stop();
    const r=machine.nextRule(); if (!r) return;
    answered = true;
    $('prediction-feedback').textContent = b.dataset.predict === r.move ? `Exactly! Write ${r.write}, ${r.move === 'S' ? 'stay here' : 'move '+direction[r.move]}, then enter ${r.next}.` : `The rule says ${direction[r.move]}. Write ${r.write}, then enter ${r.next}. Try the next transition!`;
    document.querySelectorAll('[data-predict]').forEach(button => { button.disabled = true; });
  }));
  $('export').addEventListener('click', () => {
    const data = { machine:definition.id, input:machine.input, steps:machine.steps, state:machine.state, head:machine.head, outcome:machine.outcome, output:machine.output(), transitions:machine.history.map(e => ({ step:e.step, state:e.state, position:e.head, read:e.read, write:e.rule?.write ?? null, move:e.rule?.move ?? null, next:e.rule?.next ?? null })) };
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`turing-${definition.id}-trace.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Execution trace downloaded.');
  });
  $('share').addEventListener('click', async () => {
    const url=new URL(location.href);url.search='';url.searchParams.set('machine',definition.id);url.searchParams.set('input',machine.input);url.hash='workspace';
    try { await navigator.clipboard.writeText(url.href); notify('Setup link copied. It opens this machine with your loaded input.'); }
    catch { window.prompt('Copy this setup link:',url.href); }
  });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey || e.target.closest('input,textarea,select,button,summary,a,[contenteditable]')) return;
    if (e.key==='ArrowRight') { e.preventDefault(); $('step').click(); }
    if (e.key==='ArrowLeft') { e.preventDefault(); $('back').click(); }
    if (e.code==='Space') { e.preventDefault(); $('run').click(); }
    if (e.key.toLowerCase()==='r') { e.preventDefault(); $('reset').click(); }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden && running){stop();render();}});
  const params=new URLSearchParams(location.search), requested=machines.find(m=>m.id===params.get('machine')) || machines[0];
  const input=params.get('input');
  if(input !== null && (input.length>64 || requested.validate(input))) {select(requested.id);notify('Shared input was invalid; loaded the example instead.');}
  else select(requested.id,input ?? requested.input);
})();
