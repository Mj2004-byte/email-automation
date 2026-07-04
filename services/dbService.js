const fs = require('fs');
const path = require('path');

const isOnVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const DB_DIR = isOnVercel ? '/tmp' : path.join(__dirname, '../data');
const JSON_DB_PATH = path.join(DB_DIR, 'leads.json');

// Ensure data directory exists (only if not on Vercel, since /tmp always exists)
if (!isOnVercel && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize JSON database if it doesn't exist
if (!fs.existsSync(JSON_DB_PATH)) {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify([], null, 2));
}


// Helper: Read JSON database
function readJsonDb() {
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON database:', error);
    return [];
  }
}

// Helper: Write JSON database
function writeJsonDb(data) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to JSON database:', error);
  }
}

// Service Interface (Pure File System Storage - Zero DB Connections Required)
const dbService = {
  connectDb: async () => {
    console.log('\n📁 Database Mode: Local File System (data/leads.json)');
    console.log('✅ Ready! No external database connection required.\n');
    return true;
  },
  
  isUsingFallback: () => true, // Always true since we are running file-based

  getLeads: async (filter = {}) => {
    let leads = readJsonDb();
    if (filter.niche) {
      leads = leads.filter(l => l.niche && l.niche.toLowerCase() === filter.niche.toLowerCase());
    }
    if (filter.location) {
      leads = leads.filter(l => l.location && l.location.toLowerCase() === filter.location.toLowerCase());
    }
    return leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getLeadById: async (id) => {
    const leads = readJsonDb();
    return leads.find(l => l._id === id) || null;
  },

  saveLead: async (leadData) => {
    const leads = readJsonDb();
    const newLead = {
      _id: new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 5),
      status: 'Found',
      createdAt: new Date().toISOString(),
      socialLinks: { linkedin: '', twitter: '', facebook: '', instagram: '', ...leadData.socialLinks },
      ...leadData
    };
    leads.push(newLead);
    writeJsonDb(leads);
    return newLead;
  },

  createBulkLeads: async (leadsArray) => {
    const leads = readJsonDb();
    const createdLeads = leadsArray.map(l => ({
      _id: new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 5),
      status: 'Found',
      createdAt: new Date().toISOString(),
      socialLinks: { linkedin: '', twitter: '', facebook: '', instagram: '', ...l.socialLinks },
      ...l
    }));
    leads.push(...createdLeads);
    writeJsonDb(leads);
    return createdLeads;
  },

  updateLead: async (id, updateData) => {
    const leads = readJsonDb();
    const index = leads.findIndex(l => l._id === id);
    if (index !== -1) {
      if (updateData.socialLinks) {
        leads[index].socialLinks = {
          ...leads[index].socialLinks,
          ...updateData.socialLinks
        };
      }
      leads[index] = {
        ...leads[index],
        ...updateData,
        socialLinks: updateData.socialLinks ? leads[index].socialLinks : (leads[index].socialLinks || {})
      };
      writeJsonDb(leads);
      return leads[index];
    }
    return null;
  },

  deleteLead: async (id) => {
    const leads = readJsonDb();
    const index = leads.findIndex(l => l._id === id);
    if (index !== -1) {
      const deleted = leads.splice(index, 1)[0];
      writeJsonDb(leads);
      return deleted;
    }
    return null;
  },

  clearAllLeads: async () => {
    writeJsonDb([]);
    return true;
  }
};

module.exports = dbService;
