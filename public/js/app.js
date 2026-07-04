// State Management
let allLeads = [];
let activeTab = 'dashboard-tab';
let statusChartInstance = null;
let scoreChartInstance = null;
let currentEditingLeadId = null;

// DOM Elements
const bodyEl = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const tabButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const storageModeEl = document.getElementById('storage-mode');

// Search Tab Elements
const finderForm = document.getElementById('finder-form');
const searchNicheInput = document.getElementById('search-niche');
const searchLocationInput = document.getElementById('search-location');
const searchTracker = document.getElementById('search-tracker');
const trackerStatusTitle = document.getElementById('tracker-status-title');
const trackerStatusDesc = document.getElementById('tracker-status-desc');
const trackerProgress = document.getElementById('tracker-progress');
const searchSubmitBtn = document.getElementById('search-submit-btn');

// Leads Tab Elements
const leadsSearchInput = document.getElementById('leads-search-input');
const filterScoreSelect = document.getElementById('filter-score-select');
const filterStatusSelect = document.getElementById('filter-status-select');
const leadsListContainer = document.getElementById('leads-list-container');
const recentLeadsContainer = document.getElementById('recent-leads-container');
const viewAllLeadsLink = document.getElementById('view-all-leads-link');
const clearDbBtn = document.getElementById('clear-db-btn');

// Modal Elements
const emailModal = document.getElementById('email-modal');
const modalLeadName = document.getElementById('modal-lead-name');
const modalLeadRationale = document.getElementById('modal-lead-rationale');
const modalLeadValueprop = document.getElementById('modal-lead-valueprop');
const emailSubjectInput = document.getElementById('email-subject-input');
const emailBodyTextarea = document.getElementById('email-body-textarea');
const modalCloseX = document.getElementById('modal-close-x');
const modalCloseBtn = document.getElementById('modal-close-btn');
const saveDraftBtn = document.getElementById('save-draft-btn');
const sendOutreachBtn = document.getElementById('send-outreach-btn');

/* ==========================================================================
   Initialisation
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  fetchLeads();
  
  // Initialise Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Initialise Theme from LocalStorage
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  bodyEl.setAttribute('data-theme', savedTheme);
}

// Event Listeners Configuration
function setupEventListeners() {
  // Theme Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Navigation Tabs switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Redirect link on dashboard to leads list
  if (viewAllLeadsLink) {
    viewAllLeadsLink.addEventListener('click', () => switchTab('leads-tab'));
  }

  // Clear Database
  clearDbBtn.addEventListener('click', clearDatabase);

  // Lead Finder form
  finderForm.addEventListener('submit', handleSearchSubmit);

  // Filters change
  leadsSearchInput.addEventListener('input', renderLeadsList);
  filterScoreSelect.addEventListener('change', renderLeadsList);
  filterStatusSelect.addEventListener('change', renderLeadsList);

  // Modal actions
  modalCloseX.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  saveDraftBtn.addEventListener('click', handleSaveDraft);
  sendOutreachBtn.addEventListener('click', handleSendEmail);

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === emailModal) closeModal();
  });
}

/* ==========================================================================
   Theme & Navigation Tabs
   ========================================================================== */

function toggleTheme() {
  const currentTheme = bodyEl.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  bodyEl.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

function switchTab(tabId) {
  activeTab = tabId;

  // Toggle buttons active class
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle content active class
  tabContents.forEach(content => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Update Page Header Titles
  if (tabId === 'dashboard-tab') {
    pageTitle.textContent = 'Dashboard Overview';
    pageSubtitle.textContent = 'Track metrics, check scores, and export your email campaigns.';
  } else if (tabId === 'finder-tab') {
    pageTitle.textContent = 'Lead Finder';
    pageSubtitle.textContent = 'Scrape targeted leads and automate your outreach pipeline.';
  } else if (tabId === 'leads-tab') {
    pageTitle.textContent = 'Campaign Leads Manager';
    pageSubtitle.textContent = 'View scraped contacts, trigger AI scoring, and customize cold emails.';
  }
}

/* ==========================================================================
   Data Fetching & Stats Drawing
   ========================================================================== */

async function fetchLeads() {
  try {
    const res = await fetch('/api/leads');
    const data = await res.json();
    
    if (data.success) {
      allLeads = data.leads;
      
      // Update DB storage badge
      if (data.fallbackMode) {
        storageModeEl.textContent = 'Fallback: JSON Database';
        storageModeEl.previousElementSibling.className = 'status-dot yellow';
      } else {
        storageModeEl.textContent = 'MongoDB Atlas Connected';
        storageModeEl.previousElementSibling.className = 'status-dot green';
      }
      
      updateStats();
      renderLeadsList();
      renderRecentLeads();
      drawCharts();
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
  }
}

function updateStats() {
  const total = allLeads.length;
  const enriched = allLeads.filter(l => l.status === 'Enriched' || l.status === 'Sent').length;
  const sent = allLeads.filter(l => l.status === 'Sent').length;
  
  // Calculate average score of enriched leads
  const scoredLeads = allLeads.filter(l => l.leadScore !== undefined && l.leadScore !== null);
  const avgScore = scoredLeads.length > 0 
    ? Math.round(scoredLeads.reduce((acc, l) => acc + l.leadScore, 0) / scoredLeads.length)
    : 0;

  document.getElementById('stat-total-leads').textContent = total;
  document.getElementById('stat-enriched-leads').textContent = enriched;
  document.getElementById('stat-avg-score').textContent = `${avgScore}%`;
  document.getElementById('stat-sent-emails').textContent = sent;
}

/* ==========================================================================
   Charts Drawing
   ========================================================================== */

function drawCharts() {
  const ctxStatus = document.getElementById('statusChart');
  const ctxScore = document.getElementById('scoreChart');

  if (!ctxStatus || !ctxScore) return;

  // 1. Calculate Status Distribution
  const statuses = { Found: 0, Processing: 0, Enriched: 0, Sent: 0, Failed: 0 };
  allLeads.forEach(l => {
    const s = l.status || 'Found';
    if (statuses[s] !== undefined) statuses[s]++;
  });

  // Destroy previous instances to avoid canvas-in-use errors
  if (statusChartInstance) statusChartInstance.destroy();
  if (scoreChartInstance) scoreChartInstance.destroy();

  const isDark = bodyEl.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#ffffff' : '#1e1e2f';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  statusChartInstance = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Discovered', 'Processing', 'Enriched', 'Outreach Sent', 'Failed'],
      datasets: [{
        data: [statuses.Found, statuses.Processing, statuses.Enriched, statuses.Sent, statuses.Failed],
        backgroundColor: [
          'rgba(255, 255, 255, 0.25)', // Discovered
          'rgba(249, 115, 22, 0.6)',  // Processing
          'rgba(6, 182, 212, 0.6)',   // Enriched
          'rgba(16, 185, 129, 0.6)',  // Sent
          'rgba(239, 68, 68, 0.6)'    // Failed
        ],
        borderColor: isDark ? '#111322' : '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      }
    }
  });

  // 2. Calculate Lead Scores Distribution
  const scoredLeads = allLeads.filter(l => l.leadScore !== undefined && l.leadScore !== null);
  const scoreBrackets = { low: 0, mid: 0, high: 0 };
  
  scoredLeads.forEach(l => {
    if (l.leadScore >= 80) scoreBrackets.high++;
    else if (l.leadScore >= 50) scoreBrackets.mid++;
    else scoreBrackets.low++;
  });

  scoreChartInstance = new Chart(ctxScore, {
    type: 'bar',
    data: {
      labels: ['Low Match (<50)', 'Mid Match (50-79)', 'High Match (80+)'],
      datasets: [{
        label: 'Leads Count',
        data: [scoreBrackets.low, scoreBrackets.mid, scoreBrackets.high],
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',   // Low
          'rgba(249, 115, 22, 0.5)',  // Mid
          'rgba(16, 185, 129, 0.5)'   // High
        ],
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, stepSize: 1, font: { family: 'Plus Jakarta Sans' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/* ==========================================================================
   Lead Discovery & Scraping
   ========================================================================== */

async function handleSearchSubmit(e) {
  e.preventDefault();

  const niche = searchNicheInput.value.trim();
  const location = searchLocationInput.value.trim();

  if (!niche) return;

  // Show Tracker Status Loader, Hide search button
  searchSubmitBtn.disabled = true;
  searchTracker.classList.remove('hidden');

  let steps = [
    { title: 'Connecting to Search Engine...', desc: 'Crawling web indexes for local business targets.' },
    { title: 'Parsing Search Results...', desc: 'Identifying company names and homepage URLs.' },
    { title: 'Filtering Directory Trash...', desc: 'Excluding Facebook pages, Yelp entries, and directories.' },
    { title: 'Bulk Saving Leads...', desc: 'Inserting new matches into the database system.' }
  ];

  // Simulating loading progressive steps visual bar
  let stepIdx = 0;
  const progressTimer = setInterval(() => {
    if (stepIdx < steps.length) {
      trackerStatusTitle.textContent = steps[stepIdx].title;
      trackerStatusDesc.textContent = steps[stepIdx].desc;
      trackerProgress.style.width = `${((stepIdx + 1) / steps.length) * 80}%`;
      stepIdx++;
    }
  }, 2200);

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, location })
    });
    
    const data = await response.json();
    
    clearInterval(progressTimer);

    if (data.success) {
      trackerStatusTitle.textContent = 'Discovery Complete!';
      trackerStatusDesc.textContent = `${data.message}`;
      trackerProgress.style.width = '100%';

      // Wait 1.5 seconds, reload leads, reset form and jump tab
      setTimeout(() => {
        searchSubmitBtn.disabled = false;
        searchTracker.classList.add('hidden');
        trackerProgress.style.width = '0%';
        
        searchNicheInput.value = '';
        searchLocationInput.value = '';

        fetchLeads();
        switchTab('leads-tab');
      }, 1500);
    } else {
      throw new Error(data.error);
    }

  } catch (error) {
    clearInterval(progressTimer);
    trackerStatusTitle.textContent = 'Process Failed';
    trackerStatusDesc.textContent = `Error: ${error.message}`;
    trackerProgress.style.backgroundColor = 'var(--red)';
    setTimeout(() => {
      searchSubmitBtn.disabled = false;
      searchTracker.classList.add('hidden');
      trackerProgress.style.backgroundColor = '';
    }, 4000);
  }
}

// Single lead enrichment (scraping, scoring, custom copywriting)
async function enrichLead(id, cardEl) {
  // Toggle card state to processing
  cardEl.classList.add('processing');
  const enrichBtn = cardEl.querySelector('.enrich-btn');
  const statusBadge = cardEl.querySelector('.status-badge');
  
  if (enrichBtn) {
    enrichBtn.disabled = true;
    enrichBtn.innerHTML = `<span class="tracker-spinner" style="width: 14px; height: 14px; margin-bottom:0; display:inline-block; border-width:2px; vertical-align:middle; margin-right:6px"></span> AI Processing...`;
  }
  
  if (statusBadge) {
    statusBadge.textContent = 'Processing';
    statusBadge.className = 'status-badge processing';
  }

  try {
    const res = await fetch(`/api/enrich/${id}`, { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      // Reload database
      await fetchLeads();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Failed to enrich lead:', error);
    alert(`Enrichment failed: ${error.message}`);
    fetchLeads(); // refresh leads to fix UI state
  }
}

/* ==========================================================================
   Render Leads Lists
   ========================================================================== */

// Draw Recent leads on the Dashboard
function renderRecentLeads() {
  recentLeadsContainer.innerHTML = '';
  
  // Filter leads that have scores, sort by score descending
  const scoredLeads = allLeads
    .filter(l => l.leadScore !== undefined && l.leadScore !== null)
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 3);

  if (scoredLeads.length === 0) {
    recentLeadsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <i data-lucide="sparkles"></i>
        <p>No enriched prospects available yet. Go to the <strong>Campaign Leads Manager</strong> to score leads with AI.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  scoredLeads.forEach(lead => {
    const card = document.createElement('div');
    card.className = 'lead-card';
    
    let scoreClass = 'low';
    if (lead.leadScore >= 80) scoreClass = 'high';
    else if (lead.leadScore >= 50) scoreClass = 'mid';

    card.innerHTML = `
      <div class="lead-header">
        <div class="lead-title-box">
          <h4>${lead.companyName}</h4>
          <span class="lead-niche-loc">
            <i data-lucide="map-pin"></i> ${lead.location || 'Unknown Location'}
          </span>
        </div>
        <div class="lead-score-gauge ${scoreClass}">
          ${lead.leadScore}
        </div>
      </div>
      <p class="lead-desc">${lead.description || 'No description available.'}</p>
      
      <div class="lead-details-list">
        <div class="lead-detail-item">
          <i data-lucide="mail"></i>
          <span>${lead.email || 'No email found'}</span>
        </div>
        <div class="lead-detail-item">
          <i data-lucide="phone"></i>
          <span>${lead.phone || 'No phone found'}</span>
        </div>
      </div>

      <div class="lead-actions-row">
        <button class="btn btn-primary" onclick="openEmailModal('${lead._id}')">
          <i data-lucide="mail"></i> View Email
        </button>
      </div>
    `;
    recentLeadsContainer.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Render the main table list of all leads
function renderLeadsList() {
  leadsListContainer.innerHTML = '';

  const searchQuery = leadsSearchInput.value.toLowerCase();
  const scoreFilter = filterScoreSelect.value;
  const statusFilter = filterStatusSelect.value;

  // Apply search filtering
  let filtered = allLeads.filter(l => {
    const matchesSearch = l.companyName.toLowerCase().includes(searchQuery) ||
                          (l.website && l.website.toLowerCase().includes(searchQuery)) ||
                          (l.location && l.location.toLowerCase().includes(searchQuery)) ||
                          (l.niche && l.niche.toLowerCase().includes(searchQuery));
    
    let matchesScore = true;
    if (scoreFilter === 'high') matchesScore = l.leadScore >= 80;
    else if (scoreFilter === 'mid') matchesScore = l.leadScore >= 50 && l.leadScore < 80;
    else if (scoreFilter === 'low') matchesScore = l.leadScore < 50 && l.leadScore !== undefined && l.leadScore !== null;

    let matchesStatus = true;
    if (statusFilter !== 'all') matchesStatus = l.status === statusFilter;

    return matchesSearch && matchesScore && matchesStatus;
  });

  if (filtered.length === 0) {
    leadsListContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="filter"></i>
        <p>No leads match your filter parameters.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  filtered.forEach(lead => {
    const card = document.createElement('div');
    card.className = `lead-card ${lead.status === 'Processing' ? 'processing' : ''}`;
    
    // Status Badge text & class mapping
    let statusClass = 'found';
    let statusText = lead.status || 'Discovered';
    if (lead.status === 'Enriched') statusClass = 'enriched';
    if (lead.status === 'Sent') statusClass = 'sent';
    if (lead.status === 'Processing') statusClass = 'processing';
    if (lead.status === 'Failed') statusClass = 'failed';

    // Gauge calculation
    let scoreGaugeHtml = '';
    if (lead.leadScore !== undefined && lead.leadScore !== null) {
      let scoreClass = 'low';
      if (lead.leadScore >= 80) scoreClass = 'high';
      else if (lead.leadScore >= 50) scoreClass = 'mid';
      scoreGaugeHtml = `<div class="lead-score-gauge ${scoreClass}">${lead.leadScore}</div>`;
    }

    // Social Links Icons row
    let socialRow = '';
    if (lead.socialLinks) {
      const { linkedin, twitter, facebook, instagram } = lead.socialLinks;
      if (linkedin || twitter || facebook || instagram) {
        socialRow = `<div class="social-icons-row">`;
        if (linkedin) socialRow += `<a href="${linkedin}" target="_blank" class="social-icon-link" title="LinkedIn"><i data-lucide="linkedin"></i></a>`;
        if (twitter) socialRow += `<a href="${twitter}" target="_blank" class="social-icon-link" title="Twitter/X"><i data-lucide="twitter"></i></a>`;
        if (facebook) socialRow += `<a href="${facebook}" target="_blank" class="social-icon-link" title="Facebook"><i data-lucide="facebook"></i></a>`;
        if (instagram) socialRow += `<a href="${instagram}" target="_blank" class="social-icon-link" title="Instagram"><i data-lucide="instagram"></i></a>`;
        socialRow += `</div>`;
      }
    }

    card.innerHTML = `
      <div class="lead-header">
        <div class="lead-title-box">
          <span class="status-badge ${statusClass}">${statusText}</span>
          <h4 style="margin-top:0.4rem">${lead.companyName}</h4>
          <span class="lead-niche-loc">
            <i data-lucide="map-pin"></i> ${lead.location || 'Remote'}
          </span>
        </div>
        ${scoreGaugeHtml}
      </div>
      <p class="lead-desc">${lead.description || 'No description extracted. Scrape to fetch details.'}</p>
      
      <div class="lead-details-list">
        <div class="lead-detail-item">
          <i data-lucide="globe"></i>
          <a href="${lead.website}" target="_blank" style="color:var(--primary); text-decoration:none">${lead.website ? lead.website.replace(/^https?:\/\/(www\.)?/i, '') : 'No website'}</a>
        </div>
        <div class="lead-detail-item">
          <i data-lucide="mail"></i>
          <span>${lead.email || 'Unscraped email'}</span>
        </div>
        <div class="lead-detail-item">
          <i data-lucide="phone"></i>
          <span>${lead.phone || 'Unscraped phone'}</span>
        </div>
        ${socialRow}
      </div>

      <div class="lead-actions-row">
        ${lead.status === 'Enriched' || lead.status === 'Sent' ? 
          `<button class="btn btn-secondary" onclick="openEmailModal('${lead._id}')"><i data-lucide="mail"></i> View Email</button>` : 
          `<button class="btn btn-primary enrich-btn" ${lead.status === 'Processing' ? 'disabled' : ''} onclick="triggerEnrich('${lead._id}', this)"><i data-lucide="sparkles"></i> Enrich & Write Email</button>`
        }
        <button class="btn btn-secondary border-red btn-icon-only" title="Delete Lead" onclick="deleteLead('${lead._id}')">
          <i data-lucide="trash"></i>
        </button>
      </div>
    `;
    leadsListContainer.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Global triggering wrappers for inline onclicks
window.triggerEnrich = (id, btnEl) => {
  const cardEl = btnEl.closest('.lead-card');
  enrichLead(id, cardEl);
};

window.deleteLead = async (id) => {
  if (confirm('Are you sure you want to delete this lead?')) {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  }
};

async function clearDatabase() {
  if (confirm('Are you sure you want to clear ALL leads from the pipeline? This cannot be undone.')) {
    try {
      const res = await fetch('/api/leads', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

/* ==========================================================================
   Outreach Email Modal Actions
   ========================================================================== */

window.openEmailModal = (id) => {
  const lead = allLeads.find(l => l._id === id);
  if (!lead) return;

  currentEditingLeadId = id;
  
  modalLeadName.textContent = lead.companyName;
  modalLeadRationale.textContent = lead.scoringRationale || 'No scoring rational available.';
  modalLeadValueprop.textContent = lead.idealValueProp || 'N/A';
  
  emailSubjectInput.value = lead.generatedEmailSubject || '';
  emailBodyTextarea.value = lead.generatedEmailBody || '';

  // Configure modal send button label
  if (lead.status === 'Sent') {
    sendOutreachBtn.innerHTML = `<i data-lucide="check"></i> <span>Sent!</span>`;
    sendOutreachBtn.disabled = true;
    sendOutreachBtn.className = 'btn btn-secondary';
  } else {
    sendOutreachBtn.innerHTML = `<i data-lucide="send"></i> <span>Send Email</span>`;
    sendOutreachBtn.disabled = false;
    sendOutreachBtn.className = 'btn btn-glow-indigo';
  }

  emailModal.classList.remove('hidden');
  
  if (window.lucide) window.lucide.createIcons();
};

function closeModal() {
  emailModal.classList.add('hidden');
  currentEditingLeadId = null;
}

// Save draft edits
async function handleSaveDraft() {
  if (!currentEditingLeadId) return;

  const subject = emailSubjectInput.value.trim();
  const body = emailBodyTextarea.value.trim();

  saveDraftBtn.disabled = true;
  saveDraftBtn.textContent = 'Saving...';

  try {
    const res = await fetch(`/api/leads/${currentEditingLeadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generatedEmailSubject: subject,
        generatedEmailBody: body
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('Draft saved successfully!');
      fetchLeads(); // refresh local model
      closeModal();
    }
  } catch (error) {
    console.error(error);
    alert('Failed to save draft.');
  } finally {
    saveDraftBtn.disabled = false;
    saveDraftBtn.innerHTML = `<i data-lucide="save"></i> <span>Save Draft</span>`;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Send cold email
async function handleSendEmail() {
  if (!currentEditingLeadId) return;
  
  const lead = allLeads.find(l => l._id === currentEditingLeadId);
  if (!lead.email) {
    alert('Cannot send: This lead does not have a verified contact email address.');
    return;
  }

  sendOutreachBtn.disabled = true;
  sendOutreachBtn.innerHTML = `<span class="tracker-spinner" style="width: 14px; height: 14px; margin-bottom:0; display:inline-block; border-width:2px; vertical-align:middle; margin-right:6px"></span> Transmitting...`;

  try {
    const res = await fetch(`/api/leads/${currentEditingLeadId}/send`, {
      method: 'POST'
    });
    
    const data = await res.json();
    if (data.success) {
      sendOutreachBtn.innerHTML = `<i data-lucide="check"></i> <span>Sent Successfully!</span>`;
      sendOutreachBtn.className = 'btn btn-secondary';
      
      // Wait a moment and close
      setTimeout(() => {
        fetchLeads();
        closeModal();
      }, 1000);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error(error);
    alert(`Transmission failed: ${error.message}`);
    sendOutreachBtn.disabled = false;
    sendOutreachBtn.className = 'btn btn-glow-indigo';
    sendOutreachBtn.innerHTML = `<i data-lucide="send"></i> <span>Send Email</span>`;
    if (window.lucide) window.lucide.createIcons();
  }
}
