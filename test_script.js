require('dotenv').config();
const axios = require('axios');

const PORT = process.env.PORT || 3005;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('--- STARTING END-TO-END PIPELINE VERIFICATION ---');
  console.log(`Targeting Server URL: ${BASE_URL}`);
  
  try {
    // 1. Clear database
    console.log('\nStep 1: Clearing any existing database entries...');
    const clearRes = await axios.delete(`${BASE_URL}/api/leads`);
    console.log('Result:', clearRes.data);

    // 2. Query empty leads list
    console.log('\nStep 2: Checking initial leads state...');
    const initRes = await axios.get(`${BASE_URL}/api/leads`);
    console.log(`Leads count: ${initRes.data.leads.length} (Storage mode: ${initRes.data.fallbackMode ? 'JSON File' : 'MongoDB'})`);

    // 3. Perform a Lead Search
    const niche = 'Dentist';
    const location = 'Miami';
    console.log(`\nStep 3: Triggering Search for "${niche}" in "${location}"...`);
    const searchRes = await axios.post(`${BASE_URL}/api/search`, { niche, location });
    console.log('Result:', searchRes.data.message);
    const leads = searchRes.data.leads;
    console.log(`Found ${leads.length} leads. First lead details:`, {
      id: leads[0]._id,
      name: leads[0].companyName,
      website: leads[0].website,
      status: leads[0].status
    });

    // 4. Enrich the first lead (Scrape contact details, run Groq Llama 3.3 scoring, and generate outreach email)
    const targetLeadId = leads[0]._id;
    console.log(`\nStep 4: Enriching Lead ID: ${targetLeadId} with Web Crawling & Groq Llama AI...`);
    const enrichRes = await axios.post(`${BASE_URL}/api/enrich/${targetLeadId}`);
    const enrichedLead = enrichRes.data.lead;
    console.log('Result: Success!');
    console.log('Enriched Details:', {
      name: enrichedLead.companyName,
      email: enrichedLead.email,
      phone: enrichedLead.phone,
      socials: enrichedLead.socialLinks,
      leadScore: enrichedLead.leadScore,
      rationale: enrichedLead.scoringRationale,
      valueProp: enrichedLead.idealValueProp
    });
    console.log('\nGenerated Outreach Email:');
    console.log(`Subject: ${enrichedLead.generatedEmailSubject}`);
    console.log('--- Body ---');
    console.log(enrichedLead.generatedEmailBody);
    console.log('------------');

    // 5. Send mock email
    console.log('\nStep 5: Testing mock email transmitter...');
    const sendRes = await axios.post(`${BASE_URL}/api/leads/${targetLeadId}/send`);
    console.log('Result:', sendRes.data.message);
    console.log('Lead final status:', sendRes.data.lead.status);

    // 6. Test CSV Export API
    console.log('\nStep 6: Verifying CSV Export endpoint...');
    const csvRes = await axios.get(`${BASE_URL}/api/export-csv`);
    console.log(`CSV Headers preview: ${csvRes.data.split('\n')[0]}`);
    console.log(`CSV Data row preview: ${csvRes.data.split('\n')[1]}`);

    console.log('\n🎉 ALL PIPELINE TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ PIPELINE VERIFICATION FAILED!');
    console.error('Error Details:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    process.exit(1);
  }
}

// Allow server 4 seconds to boot before running tests
setTimeout(runTests, 4000);
