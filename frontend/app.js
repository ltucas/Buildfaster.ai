/* ═══════════════════════════════════════════════
   BuildFaster.ai — Dashboard Interactivity
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Keep results reset on load
  resetResults();

  // ── DOM REFS ──
  const sidebar      = document.getElementById('sidebar');
  const menuBtn      = document.getElementById('menuBtn');
  const uploadZone   = document.getElementById('uploadZone');
  const uploadBrowse = document.getElementById('uploadBrowse');
  const fileInput    = document.getElementById('fileInput');
  const uploadedFile = document.getElementById('uploadedFile');
  const fileName     = document.getElementById('fileName');
  const fileSize     = document.getElementById('fileSize');
  const fileRemove   = document.getElementById('fileRemove');
  const agentBadge   = document.getElementById('agentBadge');

  // Upload progress elements
  const uploadProgressArea = document.getElementById('uploadProgressArea');
  const progressFileName   = document.getElementById('progressFileName');
  const progressFileSize   = document.getElementById('progressFileSize');
  const uploadPct          = document.getElementById('uploadPct');
  const uploadProgressFill = document.getElementById('uploadProgressFill');
  const uploadStatusText   = document.getElementById('uploadStatusText');
  const uploadBadge        = document.getElementById('uploadBadge');
  const uploadStatusBadge  = document.getElementById('uploadStatusBadge');

  // Analyzing overlay
  const analyzingOverlay = document.getElementById('analyzingOverlay');
  const analyzingSub     = document.getElementById('analyzingSub');

  // Score elements
  const scoreRing   = document.getElementById('scoreRingProgress');
  const scoreNum    = document.getElementById('scoreNum');
  const zoneFill    = document.getElementById('zoneFill');
  const codeFill    = document.getElementById('codeFill');
  const fireFill    = document.getElementById('fireFill');
  const zoneVal     = document.getElementById('zoneVal');
  const codeVal     = document.getElementById('codeVal');
  const fireVal     = document.getElementById('fireVal');

  const violationsList = document.getElementById('violationsList');
  const violationsEmpty = document.getElementById('violationsEmpty');
  const suggestionsList = document.getElementById('suggestionsList');
  const suggestionsEmpty = document.getElementById('suggestionsEmpty');
  const suggestionCount = document.getElementById('suggestionCount');

  const CIRCUMFERENCE = 2 * Math.PI * 70; // ring radius = 70
  const API_BASE_URL = 'http://localhost:8000';

  let currentFile = null;
  let isUploading = false;
  let currentBlueprintId = null;

  // ── SIDEBAR TOGGLE ──
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 960 && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  // ── NAV ACTIVE STATE ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // ── TAB SWITCHING ──
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  console.log(`Tabs found: ${tabBtns.length} buttons, ${tabPanes.length} panes`);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      console.log(`Tab clicked: ${target}`);
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');

      // If switching to visualizer, ensure model is centered
      if (target === 'visualizer') {
        const viewer = document.getElementById('blueprintViewer');
        setTimeout(() => {
          viewer.updateHotspots();
        }, 100);
      }
    });
  });

  // ── 3D VISUALIZER CONTROLS ──
  const viewer = document.getElementById('blueprintViewer');
  const resetCamBtn = document.getElementById('resetCamera');
  const totalPinsSpan = document.getElementById('totalPins');
  const selectedPinSpan = document.getElementById('selectedPinName');

  resetCamBtn?.addEventListener('click', () => {
    viewer.cameraOrbit = '0deg 75deg 10m';
    viewer.cameraTarget = 'auto auto auto';
    viewer.fieldOfView = 'auto';
  });

  // ── FILE UPLOAD ──
  uploadBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length && !isUploading) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length && !isUploading) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    currentFile = file;
    isUploading = true;

    // Show progress area, hide drop zone
    uploadZone.classList.add('hidden');
    uploadedFile.classList.add('hidden');
    uploadProgressArea.classList.remove('hidden');
    progressFileName.textContent = file.name;
    progressFileSize.textContent = formatSize(file.size);
    uploadPct.textContent = '0%';
    uploadProgressFill.style.width = '0%';
    uploadStatusText.textContent = 'Uploading…';
    uploadBadge.textContent = 'Uploading';
    uploadBadge.className = 'badge badge-info';

    // Upload to backend
    uploadToBackend(file);
  }

  function uploadToBackend(file) {
    const formData = new FormData();
    formData.append('blueprint', file);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        uploadPct.textContent = pct + '%';
        uploadProgressFill.style.width = pct + '%';
        if (pct < 100) {
          uploadStatusText.textContent = 'Uploading… ' + formatSize(e.loaded) + ' / ' + formatSize(e.total);
        } else {
          uploadStatusText.textContent = 'Processing…';
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          currentBlueprintId = resp.blueprint_id;
          onUploadComplete(true);
        } catch (e) {
          onUploadComplete(false);
        }
      } else {
        onUploadComplete(false);
      }
    });

    xhr.addEventListener('error', () => {
      // Backend unreachable — still complete for demo purposes
      onUploadComplete(false);
    });

    xhr.addEventListener('abort', () => {
      resetUploadUI();
    });

    xhr.open('POST', `${API_BASE_URL}/upload`);
    xhr.send(formData);

    // Fallback: if no backend, simulate progress
    simulateProgressFallback(xhr);
  }

  function simulateProgressFallback(xhr) {
    // If the XHR hasn't fired a progress event within 500ms,
    // assume backend is unreachable and simulate progress
    let hasFiredProgress = false;

    const checkTimer = setTimeout(() => {
      if (!hasFiredProgress) {
        // Abort the stuck XHR and simulate
        try { xhr.abort(); } catch (e) {}

        let simProgress = 0;
        const simInterval = setInterval(() => {
          simProgress += 4 + Math.random() * 8;
          if (simProgress >= 100) {
            simProgress = 100;
            clearInterval(simInterval);
            uploadPct.textContent = '100%';
            uploadProgressFill.style.width = '100%';
            uploadStatusText.textContent = 'Processing…';
            setTimeout(() => onUploadComplete(false), 400);
          } else {
            const rounded = Math.round(simProgress);
            uploadPct.textContent = rounded + '%';
            uploadProgressFill.style.width = rounded + '%';
            uploadStatusText.textContent = 'Uploading…';
          }
        }, 120);
      }
    }, 800);

    // Detect real progress
    xhr.upload.addEventListener('progress', () => {
      hasFiredProgress = true;
      clearTimeout(checkTimer);
    }, { once: true });
  }

  function onUploadComplete(hadBackend) {
    isUploading = false;

    // Transition from progress to uploaded state
    uploadProgressArea.classList.add('hidden');
    uploadedFile.classList.remove('hidden');
    fileName.textContent = currentFile ? currentFile.name : '—';
    fileSize.textContent = currentFile ? formatSize(currentFile.size) : '—';
    uploadBadge.textContent = 'Uploaded';
    uploadBadge.className = 'badge badge-glow done';
    uploadStatusBadge.textContent = hadBackend ? 'Uploaded' : 'Uploaded (Demo)';

    // Auto-trigger analysis after short delay
    setTimeout(() => triggerAnalysis(currentBlueprintId), 600);
  }

  function resetUploadUI() {
    isUploading = false;
    currentBlueprintId = null;
    uploadProgressArea.classList.add('hidden');
    uploadedFile.classList.add('hidden');
    analyzingOverlay.classList.add('hidden');
    uploadZone.classList.remove('hidden');
    uploadBadge.textContent = 'Step 1';
    uploadBadge.className = 'badge badge-info';
    fileInput.value = '';
    currentFile = null;
  }

  fileRemove.addEventListener('click', () => {
    resetUploadUI();
    // Reset results too
    resetResults();
    agentBadge.textContent = 'Idle';
    agentBadge.className = 'badge badge-glow';
  });

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ── FILTER BUTTONS ──
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.violation-item').forEach(item => {
        if (filter === 'all' || item.dataset.severity === filter) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // ── ANALYSIS PIPELINE (auto-triggered after upload) ──
  const AGENT_LABELS = {
    zoning: 'Zoning Librarian analyzing plans…',
    compliance: 'Compliance Officer checking codes…',
    diplomat: 'Diplomat generating summaries…'
  };

  async function triggerAnalysis(blueprintId) {
    // Show analyzing overlay
    analyzingOverlay.classList.remove('hidden');
    analyzingSub.textContent = 'Initializing analysis pipeline';

    // Clear previous results
    resetResults();
    agentBadge.textContent = 'Running';
    agentBadge.className = 'badge badge-glow running';

    // Start backend analysis process if we have a blueprintId
    if (blueprintId) {
      try {
        await fetch(`${API_BASE_URL}/analyze/${blueprintId}`, { method: 'POST' });
      } catch (e) {
        console.warn('Real analysis failed, falling back to simulation logic', e);
      }
    }

    // Simulate sequential agent execution for visual flow
    const agents = ['zoning', 'compliance', 'diplomat'];
    let delay = 400;

    for (const [idx, agent] of agents.entries()) {
      // Start agent card
      await new Promise(r => setTimeout(r, delay));
      startAgent(agent);
      analyzingSub.textContent = AGENT_LABELS[agent];
      
      // Progress ticks
      for (let p = 20; p <= 100; p += 20) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 200));
        setProgress(agent, p);
      }

      // Complete agent card
      await new Promise(r => setTimeout(r, 200));
      completeAgent(agent, idx);
      delay = 300;
    }

    // Fetch final compliance results from backend if we have an ID
    let finalResults = null;
    if (blueprintId) {
      try {
        const resp = await fetch(`${API_BASE_URL}/compliance/${blueprintId}`);
        if (resp.ok) finalResults = await resp.json();
      } catch (e) {
        console.warn('Could not fetch real compliance issues', e);
      }
    }

    // Hide overlay & show final results
    setTimeout(() => {
      analyzingOverlay.classList.add('hidden');
      showResults(finalResults);
    }, 400);
  }

  function resetResults() {
    scoreNum.textContent = '—';
    scoreRing.style.strokeDashoffset = CIRCUMFERENCE;
    zoneFill.style.width = '0%';
    codeFill.style.width = '0%';
    fireFill.style.width = '0%';
    zoneVal.textContent = '—';
    codeVal.textContent = '—';
    fireVal.textContent = '—';

    // Clear violations & suggestions
    violationsList.querySelectorAll('.violation-item').forEach(el => el.remove());
    suggestionsList.querySelectorAll('.suggestion-item').forEach(el => el.remove());
    violationsEmpty.classList.remove('hidden');
    suggestionsEmpty.classList.remove('hidden');
    suggestionCount.textContent = '0';

    // Reset agent cards
    ['zoning', 'compliance', 'diplomat'].forEach(a => {
      const card = document.getElementById(`agent-${a}`);
      const status = document.getElementById(`status-${a}`);
      const progress = document.getElementById(`progress-${a}`);
      const liveStatus = document.getElementById(`live-${a}`);
      card.classList.remove('running', 'done');
      status.className = 'agent-status';
      status.querySelector('.status-indicator + *')?.remove();
      const span = document.createElement('span');
      span.textContent = 'Idle';
      status.appendChild(span);
      progress.style.width = '0%';
      liveStatus.classList.add('hidden');
      if (agentTimers[a]) { clearInterval(agentTimers[a]); agentTimers[a] = null; }
      document.getElementById(`stat-${a}-checks`).textContent = '—';
      document.getElementById(`stat-${a}-issues`).textContent = '—';
      document.getElementById(`stat-${a}-time`).textContent = '—';
    });

    // Reset 3D Visualizer
    if (viewer) {
      const hotspots = viewer.querySelectorAll('.hotspot');
      hotspots.forEach(h => h.remove());
      totalPinsSpan.textContent = '0';
      selectedPinSpan.textContent = '—';
    }
  }

  // ── AGENT STATUS MESSAGES ──
  const AGENT_MESSAGES = {
    zoning: [
      'Scanning zoning bylaws…',
      'Checking setback requirements…',
      'Reviewing land-use restrictions…',
      'Cross-referencing lot dimensions…',
      'Validating parking ratios…',
      'Analyzing density allowances…'
    ],
    compliance: [
      'Analyzing blueprint geometry…',
      'Checking handrail specifications…',
      'Validating window-to-wall ratios…',
      'Reviewing ADA compliance…',
      'Inspecting fire egress paths…',
      'Verifying electrical clearances…'
    ],
    diplomat: [
      'Generating compliance memo…',
      'Summarizing violations for review…',
      'Drafting stakeholder briefing…',
      'Preparing revision checklist…',
      'Compiling actionable suggestions…',
      'Finalizing report language…'
    ]
  };

  const agentTimers = { zoning: null, compliance: null, diplomat: null };

  function startAgent(agent) {
    const card   = document.getElementById(`agent-${agent}`);
    const status = document.getElementById(`status-${agent}`);
    const liveStatus = document.getElementById(`live-${agent}`);
    const liveText = document.getElementById(`live-text-${agent}`);

    card.classList.add('running');
    card.classList.remove('done');
    status.className = 'agent-status running';

    // Update status badge text
    while (status.childNodes.length > 1) status.removeChild(status.lastChild);
    const span = document.createElement('span');
    span.textContent = 'Running';
    status.appendChild(span);

    // Show live status area and start cycling messages
    liveStatus.classList.remove('hidden');
    const messages = AGENT_MESSAGES[agent];
    let msgIdx = 0;
    liveText.textContent = messages[0];

    agentTimers[agent] = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      liveText.style.opacity = '0';
      setTimeout(() => {
        liveText.textContent = messages[msgIdx];
        liveText.style.opacity = '1';
      }, 150);
    }, 800);
  }

  function setProgress(agent, pct) {
    document.getElementById(`progress-${agent}`).style.width = pct + '%';
  }

  const AGENT_DATA = {
    zoning: { checks: 24, issues: 3, time: '1.8s' },
    compliance: { checks: 56, issues: 5, time: '3.2s' },
    diplomat: { checks: 12, issues: 0, time: '0.9s' }
  };

  function completeAgent(agent, idx) {
    const card   = document.getElementById(`agent-${agent}`);
    const status = document.getElementById(`status-${agent}`);
    const liveStatus = document.getElementById(`live-${agent}`);
    const liveText = document.getElementById(`live-text-${agent}`);

    card.classList.remove('running');
    card.classList.add('done');
    status.className = 'agent-status done';
    while (status.childNodes.length > 1) status.removeChild(status.lastChild);
    const span = document.createElement('span');
    span.textContent = 'Complete';
    status.appendChild(span);

    // Stop cycling and show completion
    if (agentTimers[agent]) { clearInterval(agentTimers[agent]); agentTimers[agent] = null; }
    liveText.textContent = 'Analysis complete ✔';
    liveText.style.color = 'var(--emerald)';

    // Hide live status after a beat
    setTimeout(() => {
      liveStatus.classList.add('hidden');
      liveText.style.color = '';
    }, 600);

    // Fill stats
    const data = AGENT_DATA[agent];
    document.getElementById(`stat-${agent}-checks`).textContent = data.checks;
    document.getElementById(`stat-${agent}-issues`).textContent = data.issues;
    document.getElementById(`stat-${agent}-time`).textContent = data.time;
  }

  // ── VIOLATIONS & SUGGESTIONS DATA (OLD, now handled by backendData) ──
  const VIOLATIONS = [
    {
      severity: 'critical',
      title: 'Handrail Height Too Low',
      detail: 'Handrail height measured at 790 mm. IBC §1014.2 requires a minimum height of 860 mm (34 in.) for commercial stairways.',
      source: 'Compliance Officer',
      agent: 'compliance'
    },
    {
      severity: 'critical',
      title: 'Window-to-Wall Ratio Exceeds Energy Code',
      detail: 'East façade window-to-wall ratio is 48%, exceeding the IECC §C402.4.1 maximum of 40% for Climate Zone 4.',
      source: 'Compliance Officer',
      agent: 'compliance'
    },
    {
      severity: 'warning',
      title: 'Setback Encroachment — Side Yard',
      detail: 'Structure is 3.1 ft from the eastern property line. Zone R-2 requires a minimum 5 ft side yard setback per §12.4.2.',
      source: 'Zoning Librarian',
      agent: 'zoning'
    },
    {
      severity: 'warning',
      title: 'ADA Ramp Gradient Non-Compliant',
      detail: 'Front entrance ramp slope measured at 1:10. ADA Standards §405.2 requires a maximum slope of 1:12.',
      source: 'Compliance Officer',
      agent: 'compliance'
    },
    {
      severity: 'info',
      title: 'Landscaping Buffer Advisory',
      detail: 'Consider adding a 6 ft landscaping buffer along the eastern property line for Zone R-2 adjacency compliance.',
      source: 'Zoning Librarian',
      agent: 'zoning'
    }
  ];

  const SUGGESTIONS = [
    {
      type: 'tip',
      icon: '⚠',
      title: 'Raise handrail by 50 mm',
      text: 'Increase handrail height from 790 mm to 860 mm to meet IBC §1014.2 minimum. Quick retrofit — no structural changes needed.'
    },
    {
      type: 'tip',
      icon: '⚠',
      title: 'Reduce window width by 10%',
      text: 'Decrease east façade glazing from 48% to 40% WWR by reducing window unit widths. This brings the design into IECC compliance.'
    },
    {
      type: 'review',
      icon: '⚠',
      title: 'Shift east wall inward by 1.9 ft',
      text: 'Moving the eastern façade inward resolves the side yard setback violation and provides buffer for future inspections.'
    },
    {
      type: 'tip',
      icon: '⚠',
      title: 'Extend ramp to achieve 1:12 slope',
      text: 'Lengthen the front ramp by 3 ft to bring the gradient within ADA §405.2 compliance range.'
    }
  ];

  function showResults(backendData) {
    agentBadge.textContent = 'Complete';
    agentBadge.className = 'badge badge-glow done';

    let score = 78; // Default fallback
    let violations = [];
    let suggestions = [];

    if (backendData) {
      score = backendData.compliance_score;
      violations = backendData.violations.map(v => {
        // Map string to severity/agent based on keywords
        let agent = 'compliance';
        let severity = 'critical';
        let title = v;
        let source = 'OBC 2024';

        if (v.toLowerCase().includes('height') || v.toLowerCase().includes('zoning')) {
          agent = 'zoning';
          source = 'Municipal Bylaw v4';
        } else if (v.toLowerCase().includes('fire')) {
          source = 'Fire Code Part 3';
        }

        return { severity, agent, title, source, detail: 'Automated check detected deviation from mandated standard.' };
      });
      suggestions = backendData.suggestions.map(s => {
        let type = 'recommendation';
        if (s.toLowerCase().includes('violation')) type = 'fix';
        return { type, icon: '💡', title: 'AI Recommendation', text: s };
      });
    }

    // Number animation
    const targetScore = score;
    let current = 0;
    const duration = 1500;
    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(ease * targetScore);
      scoreNum.textContent = current;

      // Ring animation
      const offset = CIRCUMFERENCE - (ease * targetScore / 100) * CIRCUMFERENCE;
      scoreRing.style.strokeDashoffset = offset;

      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // Breakdown bars (simulated variation based on score)
    const zBase = Math.min(score + 5, 100);
    const cBase = Math.min(score - 4, 100);
    const fBase = Math.min(score + 8, 100);

    animateBar(zoneFill, zoneVal, zBase);
    animateBar(codeFill, codeVal, cBase);
    animateBar(fireFill, fireVal, fBase);

    // Populate Violations
    violationsList.querySelectorAll('.violation-item').forEach(el => el.remove());
    if (violations.length === 0) {
      violationsEmpty.classList.remove('hidden');
    } else {
      violationsEmpty.classList.add('hidden');
      violations.forEach(v => {
        const div = document.createElement('div');
        div.className = `violation-item ${v.severity}`;
        div.dataset.severity = v.severity;
        div.innerHTML = `
          <div class="violation-header">
            <span class="violation-badge">${v.severity.toUpperCase()}</span>
            <span class="violation-source">${v.source}</span>
          </div>
          <h4 class="violation-title">${v.title}</h4>
          <p class="violation-detail">${v.detail}</p>
          <div class="violation-footer">
            <span class="agent-tag">Detected by ${v.agent === 'zoning' ? 'Zoning Librarian' : 'Compliance Officer'}</span>
          </div>
        `;
        violationsList.appendChild(div);
      });
    }

    // Populate Suggestions
    suggestionsList.querySelectorAll('.suggestion-item').forEach(el => el.remove());
    suggestionCount.textContent = suggestions.length;
    if (suggestions.length === 0) {
      suggestionsEmpty.classList.remove('hidden');
    } else {
      suggestionsEmpty.classList.add('hidden');
      suggestions.forEach(s => {
        const div = document.createElement('div');
        div.className = `suggestion-item ${s.type}`;
        div.innerHTML = `
          <div class="suggestion-icon">${s.icon}</div>
          <div class="suggestion-content">
            <h4 class="suggestion-title">${s.title}</h4>
            <p class="suggestion-text">${s.text}</p>
          </div>
        `;
        suggestionsList.appendChild(div);
      });
    }

    // Populate 3D Pins
    if (viewer) {
      // Clear old
      viewer.querySelectorAll('.hotspot').forEach(h => h.remove());
      
      const pinCount = violations.length;
      totalPinsSpan.textContent = pinCount;

      violations.forEach((v, i) => {
        // Generate pseudo-random position on building (surface points)
        // In a real app, these coords would come from the agent's spatial analysis
        const positions = [
          '0.5m 1.2m 0.2m',   // Handrail area
          '-1.2m 4.5m 0.5m',  // East wall / window
          '0.8m 0.1m -2m',    // Side yard
          '-0.5m 0.5m 1.5m',  // Front ramp
          '2m 5.2m 0.1m'      // High-level window
        ];
        const pos = positions[i % positions.length];

        const hotspot = document.createElement('button');
        hotspot.slot = `hotspot-${i}`;
        hotspot.className = `hotspot ${v.severity}`;
        hotspot.dataset.position = pos;
        hotspot.dataset.normal = '0m 1m 0m';
        
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        annotation.innerHTML = `<span class="annotation-title">${v.title}</span>${v.detail}`;
        
        hotspot.appendChild(annotation);
        
        hotspot.addEventListener('click', () => {
          selectedPinSpan.textContent = v.title;
          viewer.cameraTarget = pos;
          viewer.cameraOrbit = '45deg 55deg 2m';
        });

        viewer.appendChild(hotspot);
      });
    }
  }

  function animateBar(fillEl, valEl, targetValue) {
    setTimeout(() => {
      fillEl.style.width = `${targetValue}%`;
      animateNumber(valEl, 0, targetValue, 800);
    }, 200);
  }

  function animateNumber(el, start, end, duration) {
    const startTime = performance.now();
    function update(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ── ADD SPINNER STYLE ──
  const style = document.createElement('style');
  style.textContent = `
    .spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // ── REMOVED AUTO-LOAD ──
});
