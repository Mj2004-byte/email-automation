require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dbService = require('./services/dbService');
const searchService = require('./services/searchService');
const scraperService = require('./services/scraperService');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Database (MongoDB or fallback JSON)
dbService.connectDb();

// Routes

// Get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await dbService.getLeads();
    res.json({
      success: true,
      fallbackMode: dbService.isUsingFallback(),
      leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete all leads (Clear database)
app.delete('/api/leads', async (req, res) => {
  try {
    await dbService.clearAllLeads();
    res.json({ success: true, message: 'All leads successfully deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search and discover leads
app.post('/api/search', async (req, res) => {
  const { niche, location } = req.body;
  if (!niche) {
    return res.status(400).json({ success: false, error: 'Niche query parameter is required' });
  }
  
  try {
    // 1. Search leads using searchService (Scrapes or simulates)
    const rawLeads = await searchService.search(niche, location || '');
    
    // 2. Save search results in bulk
    const savedLeads = await dbService.createBulkLeads(rawLeads);
    
    res.json({
      success: true,
      message: `Successfully discovered and saved ${savedLeads.length} leads.`,
      leads: savedLeads
    });
  } catch (error) {
    console.error('Error searching for leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enrich, Scrape, Score, and Write Email for a single lead
app.post('/api/enrich/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch current lead
    const lead = await dbService.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // 2. Update status to 'Processing'
    await dbService.updateLead(id, { status: 'Processing' });

    // 3. Scrape company website for details
    let scrapeData;
    try {
      scrapeData = await scraperService.scrape(lead.companyName, lead.website, lead.niche);
    } catch (err) {
      console.error(`Scraping error for ${lead.companyName}:`, err.message);
      scrapeData = {
        email: `contact@${lead.website.replace(/^https?:\/\/(www\.)?/i, '')}`,
        phone: '+1 (555) 999-9999',
        description: lead.description || `Website for ${lead.companyName}`,
        socialLinks: { linkedin: '', twitter: '', facebook: '', instagram: '' }
      };
    }

    // 4. Score lead using Groq AI Llama 3.3
    const fullLeadData = { ...lead.toObject ? lead.toObject() : lead, ...scrapeData };
    const scoreData = await aiService.scoreLead(fullLeadData);

    // 5. Generate cold email based on score and value prop
    const emailData = await aiService.generateEmail(fullLeadData, scoreData);

    // 6. Save all updates to DB
    const updatedLead = await dbService.updateLead(id, {
      email: scrapeData.email,
      phone: scrapeData.phone,
      socialLinks: scrapeData.socialLinks,
      description: scrapeData.description,
      leadScore: scoreData.score,
      scoringRationale: scoreData.rationale,
      idealValueProp: scoreData.idealValueProp,
      generatedEmailSubject: emailData.subject,
      generatedEmailBody: emailData.body,
      status: 'Enriched'
    });

    res.json({
      success: true,
      message: `Successfully enriched lead: ${lead.companyName}`,
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error enriching lead:', error);
    // Attempt to reset status on failure
    await dbService.updateLead(id, { status: 'Failed' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lead details (e.g. user edits email body or subject directly)
app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const updatedLead = await dbService.updateLead(id, updateData);
    if (!updatedLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, lead: updatedLead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a single lead
app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedLead = await dbService.deleteLead(id);
    if (!deletedLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, message: `Successfully deleted lead: ${deletedLead.companyName}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send email (Mock service)
app.post('/api/leads/:id/send', async (req, res) => {
  const { id } = req.params;
  try {
    const lead = await dbService.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (!lead.email) {
      return res.status(400).json({ success: false, error: 'Cannot send email: Lead is missing an email address' });
    }

    // Simulate sending email (takes 1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`[SMTP SIMULATOR] Sending email to: ${lead.email}`);
    console.log(`[SMTP SIMULATOR] Subject: ${lead.generatedEmailSubject}`);
    console.log(`[SMTP SIMULATOR] Body:\n${lead.generatedEmailBody}\n-------------------`);

    const updatedLead = await dbService.updateLead(id, { status: 'Sent' });

    res.json({
      success: true,
      message: `Email successfully sent to ${lead.email}!`,
      lead: updatedLead
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export Leads to CSV
app.get('/api/export-csv', async (req, res) => {
  try {
    const leads = await dbService.getLeads();
    
    // Create CSV content
    const headers = [
      'Company Name', 'Website', 'Email', 'Phone', 'Niche', 'Location',
      'Lead Score', 'Scoring Rationale', 'Value Proposition', 'Email Subject',
      'Status', 'Date Discovered'
    ];
    
    const rows = leads.map(l => {
      // Helper to escape CSV values
      const escape = (val) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };
      
      return [
        escape(l.companyName),
        escape(l.website),
        escape(l.email || ''),
        escape(l.phone || ''),
        escape(l.niche || ''),
        escape(l.location || ''),
        l.leadScore !== undefined && l.leadScore !== null ? l.leadScore : '',
        escape(l.scoringRationale || ''),
        escape(l.idealValueProp || ''),
        escape(l.generatedEmailSubject || ''),
        escape(l.status || 'Found'),
        escape(l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_report.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).send(`Error exporting CSV: ${error.message}`);
  }
});

// Fallback to serving the HTML index for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server (only if run directly, not imported as a serverless function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 AI Email Automation Server running on http://localhost:${PORT}`);
    console.log(`🌐 Dashboard UI available at: http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless deployment
module.exports = app;
