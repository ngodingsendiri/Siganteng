(() => {
  'use strict';
  const LOG = (...a) => console.log('[Coolmini]', ...a);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function getSkpOptions() {
    const sel = $('select[name="jenis_skp"]');
    if (!sel) return [];
    return Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
  }
  function getRutinitasOptions() {
    const hidden = $('#rutinitas');
    const choices = $$('.choices__item--choice');
    let opts = [];
    if (choices.length) opts = choices.map(el => ({ value: el.getAttribute('data-value'), text: el.textContent.trim() }));
    else if (hidden) opts = Array.from(hidden.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
    const seen = new Set(); return opts.filter(o => { if (seen.has(o.value)) return false; seen.add(o.value); return true; });
  }
  function getToken() { return $('input[name="_token"]')?.value || ''; }
  function getIdProd() { return $('input[name="id_produktivitas"]')?.value || ''; }

  function parseIdDate(txt) {
    const months = { 'Januari':'01','Februari':'02','Maret':'03','April':'04','Mei':'05','Juni':'06','Juli':'07','Agustus':'08','September':'09','Oktober':'10','November':'11','Desember':'12' };
    const m = txt.match(/(\d+)\s+(\w+)\s+(\d{4})/); if (!m) return null;
    return `${m[3]}-${months[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
  }
  function getMonthInfo() {
    const dp = $('#datepicker');
    let b = dp?.getAttribute('data-bulan'), t = dp?.getAttribute('data-tahun');
    if (b && t) return { bulan: parseInt(b,10), tahun: parseInt(t,10) };
    const h = document.body.innerText.match(/Produktivitas Bulan\s+(\w+)\s+Tahun\s+(\d{4})/);
    if (h) { const map={Januari:1,Februari:2,Maret:3,April:4,Mei:5,Juni:6,Juli:7,Agustus:8,September:9,Oktober:10,November:11,Desember:12}; return {bulan:map[h[1]]||8, tahun:parseInt(h[2],10)}; }
    const n=new Date(); return {bulan:n.getMonth()+1, tahun:n.getFullYear()};
  }
  function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }

  function injectButton(){
    if($('#sikeren-bulk-btn')) return;
    const target=$('button.btn-success.btn-sm'); if(!target) return;
    const b=document.createElement('button'); b.id='sikeren-bulk-btn'; b.className='btn btn-info btn-sm ms-2'; b.type='button';
    b.innerHTML='<span class="fas fa-layer-group me-1"></span> Bulk Kolektif';
    b.addEventListener('click', (e)=>{ e.preventDefault(); openBulkModal(); });
    target.parentNode.appendChild(b);
  }
  let bulkModalEl=null; let selectedDates=new Set(); let allExistingDates=new Set();

  async function loadAllExistingDates() {
    const set = new Set();
    // read current page
    $$('td.tanggal').forEach(td => { const d = parseIdDate(td.textContent.trim()); if (d) set.add(d); });
    // find Next button by text content
    const getNextBtn = () => Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && !b.disabled);
    const getPrevBtn = () => Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Previous' && !b.disabled);
    let nextBtn = getNextBtn();
    let clickCount = 0;
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    while (nextBtn && clickCount < 10) {
      nextBtn.click();
      await Promise.race([sleep(400), timeout]);
      $$('td.tanggal').forEach(td => { const d = parseIdDate(td.textContent.trim()); if (d) set.add(d); });
      clickCount++;
      nextBtn = getNextBtn();
    }
    // go back to first page
    for (let i=0; i<clickCount; i++) {
      const prevBtn = getPrevBtn();
      if (prevBtn) { prevBtn.click(); await sleep(400); }
    }
    return set;
  }

  function openBulkModal(){
    if(bulkModalEl){
      try{ const inst=bootstrap.Modal.getOrCreateInstance(bulkModalEl); inst.show(); }catch(e){ bulkModalEl.style.display='block'; bulkModalEl.classList.add('show'); }
      refreshCalendar();
      try{ const lg=$('#bulk-logo'); if(lg && chrome?.runtime?.getURL){ lg.src=chrome.runtime.getURL('assets/logo.svg'); lg.style.display='inline-block'; }}catch(e){}
      return;
    }
    const html=`
    <div class="modal" id="sikeren-bulk-modal" tabindex="-1" aria-hidden="true" style="display:none">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content position-relative" style="border:1px solid #e3e8ef">
          <div class="modal-header py-2" style="background:#fff;border-bottom:1px solid #e3e8ef">
            <h5 class="modal-title" style="font-size:0.95rem;font-weight:600;color:#232e3c"><img src="${chrome?.runtime?.getURL ? chrome.runtime.getURL('assets/logo.svg') : ''}" style="width:18px;height:18px;vertical-align:-3px;margin-right:8px;display:none" id="bulk-logo">Input Kolektif</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" style="opacity:.6"></button>
          </div>
          <div class="progress" style="height:2px;margin:0;border-radius:0;display:none;background:#edf2f9" id="bulk-top-progress"><div class="progress-bar" id="bulk-top-bar" style="width:0%;background:#2c7be5"></div></div>
          <div class="modal-body p-3" style="background:#fff">
            <div class="row g-3">
              <div class="col-lg-6">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h6 class="mb-0" id="bulk-month-label" style="font-size:0.85rem;font-weight:600;color:#344050"></h6>
                  <span class="badge" id="bulk-selected-count" style="background:#f0f6ff;color:#2c7be5;border:1px solid #d8e2ef;font-weight:500;font-size:0.7rem">0 terpilih</span>
                </div>
                <div class="d-flex gap-2 mb-2">
                  <select class="form-select form-select-sm" id="bulk-quick-hari" style="flex:1;font-size:0.75rem;border-radius:6px;border-color:#e3e8ef;background:#fff">
                    <option value="">Hari ▾</option>
                    <option value="kerja5">Senin–Jumat (5h)</option>
                    <option value="kerja6">Senin–Sabtu (6h)</option>
                    <option value="sen">Senin</option>
                    <option value="sel">Selasa</option>
                    <option value="rab">Rabu</option>
                    <option value="kam">Kamis</option>
                    <option value="jum">Jumat</option>
                    <option value="sab">Sabtu</option>
                  </select>
                  <select class="form-select form-select-sm" id="bulk-quick-blok" style="flex:1;font-size:0.75rem;border-radius:6px;border-color:#e3e8ef;background:#fff">
                    <option value="">Blok ▾</option>
                    <option value="full">Full 1 Bulan</option>
                    <option value="blok1">Blok 1–7</option>
                    <option value="blok2">Blok 8–14</option>
                    <option value="blok3">Blok 15–21</option>
                    <option value="blok4">Blok 22–31</option>
                    <option value="clear">Bersihkan</option>
                  </select>
                </div>
                <div class="calendar-grid" id="bulk-calendar"></div>
              </div>
              <div class="col-lg-6">
                <div style="border:1px solid #e3e8ef;border-radius:8px;background:#fff">
                  <div class="p-3 pb-2">
                    <div class="mb-2">
                      <label class="form-label mb-1" style="font-size:0.72rem;font-weight:600;color:#344050">Jenis SKP</label>
                      <select class="form-select form-select-sm" id="bulk-jenis-skp" style="font-size:0.8rem;border-radius:6px;border-color:#e3e8ef"></select>
                    </div>
                    <div class="mb-2">
                      <label class="form-label mb-1" style="font-size:0.72rem;font-weight:600;color:#344050">Aktivitas Kinerja</label>
                      <select class="form-select form-select-sm" id="bulk-rutinitas" style="font-size:0.8rem;border-radius:6px;border-color:#e3e8ef"></select>
                    </div>
                    <div class="mb-2">
                      <label class="form-label mb-1" style="font-size:0.72rem;font-weight:600;color:#344050">Keterangan</label>
                      <textarea class="form-control form-control-sm" id="bulk-keterangan" rows="2" placeholder="Rekapitulasi engagement Sosmed" style="font-size:0.8rem;border-radius:6px;border-color:#e3e8ef"></textarea>
                    </div>
                    <div class="row g-2">
                      <div class="col-6"><label class="form-label mb-1" style="font-size:0.72rem;font-weight:600;color:#344050">Pengkali</label><input type="number" class="form-control form-control-sm" id="bulk-pengkali" value="1" min="1" max="12" style="font-size:0.8rem;border-radius:6px;border-color:#e3e8ef"></div>
                      <div class="col-6"><label class="form-label mb-1" style="font-size:0.72rem;font-weight:600;color:#344050">Output</label><input type="text" class="form-control form-control-sm" id="bulk-output" placeholder="Laporan" style="font-size:0.8rem;border-radius:6px;border-color:#e3e8ef"></div>
                    </div>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <small style="font-size:0.75rem;font-weight:600;color:#344050">Preview <span id="bulk-preview-count">0</span> tanggal</small>
                    <small class="text-muted" style="font-size:0.7rem" id="bulk-preview-hint">0 terpilih</small>
                  </div>
                  <div id="bulk-chips" class="d-flex flex-wrap gap-1 p-2" style="min-height:48px;border:1px solid #e3e8ef;border-radius:8px;background:#f8f9fb"></div>
                </div>
                <div class="mt-3 p-2" id="bulk-progress-wrap" style="display:none;background:#f8f9fb;border:1px solid #e3e8ef;border-radius:8px">
                  <div class="d-flex justify-content-between mb-1" style="font-size:0.72rem"><span id="bulk-progress-text">0/0</span><span id="bulk-progress-pct">0%</span></div>
                  <div class="progress" style="height:4px;background:#e3e8ef"><div class="progress-bar" id="bulk-progress-bar" style="width:0%;background:#2c7be5"></div></div>
                  <div class="mt-2 small" id="bulk-log" style="max-height:100px;overflow:auto;font-size:0.72rem"></div>
                </div>
              </div>
            </div>
          </div>
          <div id="bulk-confirm" style="display:none;position:absolute;inset:0;background:rgba(255,255,255,0.92);z-index:1055;align-items:center;justify-content:center;padding:16px">
            <div style="background:#fff;border:1px solid #e3e8ef;border-radius:8px;padding:16px;max-width:380px;width:100%">
              <h6 style="font-size:0.85rem;font-weight:600;color:#232e3c;margin:0 0 6px">Konfirmasi Pengiriman</h6>
              <p style="font-size:0.78rem;color:#6c757d;margin:0 0 14px;line-height:1.4" id="bulk-confirm-msg"></p>
              <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-sm" id="bulk-confirm-cancel" style="background:#fff;border:1px solid #e3e8ef;color:#344050;padding:4px 14px;font-size:0.78rem">Batal</button>
                <button class="btn btn-sm" id="bulk-confirm-ok" style="background:#2c7be5;color:#fff;border:1px solid #2c7be5;padding:4px 14px;font-size:0.78rem">Kirim</button>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2 d-flex justify-content-between align-items-center" style="background:#fff;border-top:1px solid #e3e8ef">
            <a href="https://startupmini.com" target="_blank" style="font-size:10px;color:#9da9bb;text-decoration:none">startupmini.com</a>
            <div class="d-flex gap-2">
              <button class="btn btn-sm" id="bulk-cancel" style="background:#fff;border:1px solid #e3e8ef;color:#344050">Batal</button>
              <button class="btn btn-sm" id="bulk-submit" style="background:#2c7be5;color:#fff;border:1px solid #2c7be5">Simpan Kolektif (<span id="bulk-submit-count">0</span>)</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    bulkModalEl=$('#sikeren-bulk-modal');
    populateSelects();
    // show loader
    const loader = document.createElement('span');
    loader.id = 'bulk-loader';
    loader.textContent = ' memuat...';
    loader.style.cssText = 'font-size:0.7rem;color:#6c757d;margin-left:8px;display:none';
    const label = $('#bulk-month-label');
    if(label) label.after(loader);
    loader.style.display = 'inline';
    try{ bootstrap.Modal.getOrCreateInstance(bulkModalEl).show(); }catch(e){ bulkModalEl.style.display='block'; bulkModalEl.classList.add('show'); }
    // load existing dates from all pages
    (async () => {
      allExistingDates = await loadAllExistingDates();
      if(loader) loader.style.display = 'none';
      refreshCalendar();
    })();
    // event listeners
    $('#bulk-quick-hari').addEventListener('change', (e)=>{ const v=e.target.value; if(v) applyFilter(v); e.target.value=''; });
    $('#bulk-quick-blok').addEventListener('change', (e)=>{ const v=e.target.value; if(v) applyFilter(v); e.target.value=''; });
    $('#bulk-cancel')?.addEventListener('click', hideModal);
    bulkModalEl.querySelector('.btn-close')?.addEventListener('click', hideModal);
    $('#bulk-submit').addEventListener('click', submitBulk);
    try{ const lg=$('#bulk-logo'); if(lg && chrome?.runtime?.getURL){ lg.src=chrome.runtime.getURL('assets/logo.svg'); lg.style.display='inline-block'; }}catch(e){}
  }

  function populateSelects(){
    const skp=$('#bulk-jenis-skp'), rut=$('#bulk-rutinitas'); if(!skp||!rut) return;
    const skps=getSkpOptions(); skp.innerHTML='<option value="">-- Pilih Jenis SKP --</option>'+skps.map(o=>`<option value="${o.value.replace(/"/g,'&quot;')}">${o.text}</option>`).join('');
    const ruts=getRutinitasOptions(); rut.innerHTML='<option value="">-- Pilih Aktivitas --</option>'+ruts.map(o=>`<option value="${o.value}">${o.text}</option>`).join('');
  }

  function refreshCalendar(){
    const {bulan,tahun}=getMonthInfo();
    const label=$('#bulk-month-label'); if(label){ const n=['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; label.textContent=`${n[bulan]} ${tahun}`; }
    const cal=$('#bulk-calendar'); if(!cal) return; cal.innerHTML='';
    ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].forEach(h=>{ const hd=document.createElement('div'); hd.className='cal-header'; hd.textContent=h; cal.appendChild(hd); });
    const total=daysInMonth(tahun,bulan); const first=new Date(tahun,bulan-1,1).getDay(); let off=first===0?6:first-1;
    for(let i=0;i<off;i++){ const e=document.createElement('div'); e.className='cal-cell disabled'; e.style.visibility='hidden'; cal.appendChild(e); }
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    // use preloaded existing dates, fallback to current page if not loaded yet
    let existing = allExistingDates;
    if(!existing || existing.size === 0){
      existing = new Set($$('td.tanggal').map(td=>parseIdDate(td.textContent.trim())).filter(Boolean));
    }
    for(let d=1; d<=total; d++){
      const date=new Date(tahun,bulan-1,d); const wd=date.getDay(); const isWeekend=wd===0||wd===6;
      const ymd=`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell=document.createElement('div');
      let cls = 'cal-cell' + (isWeekend ? ' weekend' : '');
      const exists = existing.has(ymd);
      const isFuture = ymd > todayStr;
      if(exists) cls += ' has-existing';
      if(isFuture) cls += ' disabled';
      cell.className = cls;
      cell.dataset.date = ymd;
      if(isFuture) cell.title = 'Belum melewati tanggal';
      else if(exists) cell.title = 'Sudah ada kegiatan — tetap bisa dipilih lagi';
      cell.innerHTML = `<span class="cal-day">${d}</span><span class="cal-weekday">${['Min','Sen','Sel','Rab','Kam','Jum','Sab'][wd]}</span>${exists?'<span style="position:absolute;top:3px;right:3px;width:6px;height:6px;background:#2c7be5;border-radius:50%"></span>':''}`;
      if(!isFuture){
        if(selectedDates.has(ymd)) cell.classList.add('selected');
        cell.addEventListener('click',()=>{ if(cell.classList.contains('disabled'))return; if(selectedDates.has(ymd)){selectedDates.delete(ymd);cell.classList.remove('selected');}else{selectedDates.add(ymd);cell.classList.add('selected');} updateCounts(); });
      }
      cal.appendChild(cell);
    }
    cal.dataset.inited='1'; updateCounts();
  }

  function applyFilter(type){
    const {bulan,tahun}=getMonthInfo(); const total=daysInMonth(tahun,bulan);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const isActive = (ymd) => ymd <= todayStr;
    const add = (ymd) => { if(isActive(ymd)) selectedDates.add(ymd); };
    if(type==='clear') selectedDates.clear();
    else if(type==='full') for(let d=1;d<=total;d++) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    else if(type==='kerja5'){ selectedDates.clear(); for(let d=1;d<=total;d++){ const wd=new Date(tahun,bulan-1,d).getDay(); if(wd>=1&&wd<=5) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }}
    else if(type==='kerja6'){ selectedDates.clear(); for(let d=1;d<=total;d++){ const wd=new Date(tahun,bulan-1,d).getDay(); if(wd>=1&&wd<=6) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }}
    else if(type==='sen'){ selectedDates.clear(); for(let d=1;d<=total;d++) if(new Date(tahun,bulan-1,d).getDay()===1) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    else if(type==='sel'){ selectedDates.clear(); for(let d=1;d<=total;d++) if(new Date(tahun,bulan-1,d).getDay()===2) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    else if(type==='rab'){ selectedDates.clear(); for(let d=1;d<=total;d++) if(new Date(tahun,bulan-1,d).getDay()===3) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    else if(type==='kam'){ selectedDates.clear(); for(let d=1;d<=total;d++) if(new Date(tahun,bulan-1,d).getDay()===4) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    else if(type==='jum'){ selectedDates.clear(); for(let d=1;d<=total;d++) if(new Date(tahun,bulan-1,d).getDay()===5) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    else if(type==='sab'){ selectedDates.clear(); for(let d=1;d<=total;d++) if(new Date(tahun,bulan-1,d).getDay()===6) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    else if(type.startsWith('blok')){ selectedDates.clear(); let s=1,e=7; if(type==='blok2'){s=8;e=14;}else if(type==='blok3'){s=15;e=21;}else if(type==='blok4'){s=22;e=total;} for(let d=s;d<=e;d++) add(`${tahun}-${String(bulan).padStart(2,'0')}-${String(d).padStart(2,'0')}`); }
    refreshCalendarKeepSelection();
  }

  function refreshCalendarKeepSelection(){
    $$('#bulk-calendar .cal-cell').forEach(cell=>{
      const ymd=cell.dataset.date; if(!ymd || cell.classList.contains('disabled')) return;
      if(selectedDates.has(ymd)) cell.classList.add('selected'); else cell.classList.remove('selected');
    }); updateCounts();
  }

  function updateCounts(){
    const cnt=selectedDates.size;
    $('#bulk-selected-count').textContent=`${cnt} terpilih`;
    $('#bulk-submit-count').textContent=cnt;
    const chips=$('#bulk-chips'); const hint=$('#bulk-preview-hint');
    if(hint) hint.textContent=`${cnt} akan dikirim`;
    const previewCnt=$('#bulk-preview-count'); if(previewCnt) previewCnt.textContent=cnt;
    if(chips){
      if(cnt===0) chips.innerHTML='<span style="font-size:0.75rem;color:#6c757d">Belum ada tanggal terpilih</span>';
      else {
        const sorted=Array.from(selectedDates).sort();
        const existing = allExistingDates.size ? allExistingDates : new Set($$('td.tanggal').map(td=>parseIdDate(td.textContent.trim())).filter(Boolean));
        chips.innerHTML=sorted.map(ymd=>{
          const ex=existing.has(ymd);
          return `<span class="badge d-inline-flex align-items-center gap-1" style="font-size:0.7rem;font-weight:500;padding:4px 8px;border-radius:20px;${ex?'background:#fff3cd;color:#856404;border:1px solid #ffeaa7':'background:#e6f4ea;color:#0a7a42;border:1px solid #b6dfc5'}">${ymd} ${ex?'<span style="font-size:0.6rem;opacity:.7">(sudah ada)</span>':''}<span style="cursor:pointer;margin-left:4px" data-remove="${ymd}">×</span></span>`;
        }).join('');
        chips.querySelectorAll('[data-remove]').forEach(el=> el.addEventListener('click',()=>{ selectedDates.delete(el.dataset.remove); refreshCalendarKeepSelection(); }));
      }
    }
    const topBar=$('#bulk-top-bar'); if(topBar) topBar.style.width='0%';
  }

  function hideModal(){
    try{ const inst=bootstrap.Modal.getInstance(bulkModalEl); if(inst) inst.hide(); }catch(e){}
    if(bulkModalEl){ bulkModalEl.style.display='none'; bulkModalEl.classList.remove('show'); }
    document.querySelectorAll('.modal-backdrop').forEach(el=>el.remove());
    document.body.classList.remove('modal-open'); document.body.style.overflow='';
    document.body.style.paddingRight='';
  }

  function showConfirm(dates){
    return new Promise(resolve=>{
      const overlay=$('#bulk-confirm'), msg=$('#bulk-confirm-msg'), ok=$('#bulk-confirm-ok'), cancel=$('#bulk-confirm-cancel');
      if(!overlay||!msg||!ok||!cancel) return resolve(false);
      msg.textContent=`Kirim ${dates.length} tanggal? ${dates.join(', ')}`;
      overlay.style.display='flex';
      const onOk=()=>{ cleanup(); resolve(true); };
      const onCancel=()=>{ cleanup(); resolve(false); };
      function cleanup(){ overlay.style.display='none'; ok.removeEventListener('click', onOk); cancel.removeEventListener('click', onCancel); }
      ok.addEventListener('click', onOk); cancel.addEventListener('click', onCancel);
      // close when clicking outside
      overlay.addEventListener('click', (e) => { if(e.target === overlay) cleanup(); });
    });
  }

  async function submitBulk(){
    const jenis=$('#bulk-jenis-skp').value, rut=$('#bulk-rutinitas').value, ket=$('#bulk-keterangan').value.trim(), kali=$('#bulk-pengkali').value, out=$('#bulk-output').value.trim();
    if(!jenis) return alert('Pilih Jenis SKP'); if(!rut) return alert('Pilih Aktivitas'); if(!ket) return alert('Isi Keterangan'); if(!out) return alert('Isi Output');
    const dates=Array.from(selectedDates).sort();
    if(dates.length===0) return alert('Tidak ada tanggal terpilih');
    const confirmed = await showConfirm(dates);
    if(!confirmed) return;
    let token=getToken(); const idProd=getIdProd(); if(!token||!idProd) return alert('Token tidak ditemukan');
    const wrap=$('#bulk-progress-wrap'), bar=$('#bulk-progress-bar'), topBar=$('#bulk-top-bar'), topWrap=$('#bulk-top-progress'), txt=$('#bulk-progress-text'), pct=$('#bulk-progress-pct'), logEl=$('#bulk-log');
    wrap.style.display='block'; topWrap.style.display='block'; logEl.innerHTML=''; let ok=0,fail=0; const btn=$('#bulk-submit'); btn.disabled=true;
    for(let i=0;i<dates.length;i++){
      const ymd=dates[i]; token=getToken();
      const fd=new FormData(); fd.append('_token',token); fd.append('id_produktivitas',idProd); fd.append('tgl_kinerja',ymd); fd.append('jenis_skp',jenis); fd.append('rutinitas',rut); fd.append('keterangan',ket); fd.append('pengkali_kinerja',kali); fd.append('output_kinerja',out);
      try{
        const res=await fetch('https://sikeren.jemberkab.go.id/kinerja-store',{method:'POST',body:fd,credentials:'include'});
        const text=await res.text(); const success=text.includes('telah ditambahkan')||text.includes('Berhasil');
        if(success){ ok++; logEl.innerHTML+=`<div style="color:#0a7a42">✓ ${ymd} berhasil</div>`; } else { fail++; const is419=text.includes('419')||res.status===419; logEl.innerHTML+=`<div style="color:#d93025">✗ ${ymd} gagal${is419?' (token expired)':''}</div>`; }
      }catch(e){ fail++; logEl.innerHTML+=`<div style="color:#d93025">✗ ${ymd} error ${e.message}</div>`; }
      const cur=i+1, p=Math.round(cur/dates.length*100); bar.style.width=p+'%'; topBar.style.width=p+'%'; txt.textContent=`${cur}/${dates.length}`; pct.textContent=p+'%'; logEl.scrollTop=logEl.scrollHeight; await sleep(600);
    }
    btn.disabled=false; logEl.innerHTML+=`<hr style="margin:8px 0;border:none;border-top:1px solid #e3e8ef"><div><b>Selesai:</b> ${ok} berhasil, ${fail} gagal dari ${dates.length}</div>`;
    if(fail===0) setTimeout(()=>location.reload(),1500);
  }

  function init(){
    if(typeof window.checkDateNew==='undefined') window.checkDateNew=()=>false;
    injectButton();
    const obs=new MutationObserver(()=>{ injectButton(); });
    obs.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();