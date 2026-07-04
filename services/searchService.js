const axios = require('axios');
const cheerio = require('cheerio');

// Realistic niches templates for simulation fallback
const nicheTemplates = {
  dentist: {
    description: "State-of-the-art family and cosmetic dentistry offering dental implants, crowns, cleanings, and whitening in a friendly, comfortable atmosphere.",
    companies: [
      { name: "Apex Dental Care", sub: "apexdental" },
      { name: "Bright Smiles Clinic", sub: "brightsmiles" },
      { name: "Coastal Dental Arts", sub: "coastaldental" },
      { name: "Metropolitan Dental Group", sub: "metrodental" },
      { name: "Elite Cosmetic Dentistry", sub: "elitedentistry" }
    ]
  },
  plumbing: {
    description: "Emergency residential and commercial plumbing repair, drain cleaning, pipe repairs, water heater installation, and leak detection services.",
    companies: [
      { name: "Rapid Flow Plumbing", sub: "rapidflowplumbing" },
      { name: "Mr. Pipes Maintenance", sub: "mrpipesplumbing" },
      { name: "ProDrain Sewer Solutions", sub: "prodrainsolutions" },
      { name: "AquaForce Plumbing Experts", sub: "aquaforceplumbers" },
      { name: "Titan Utility & Plumbing", sub: "titanplumbing" }
    ]
  },
  marketing: {
    description: "Full-service digital marketing agency specializing in SEO, PPC, paid ads, social media management, brand strategy, and high-performance lead generation.",
    companies: [
      { name: "Vanguard Brand Partners", sub: "vanguardbrands" },
      { name: "Pixel Perfect Digital", sub: "pixelperfectagency" },
      { name: "Ascend Media Group", sub: "ascendmediagroup" },
      { name: "Apex Lead Gen Systems", sub: "apexleadgen" },
      { name: "Nova Social Strategy", sub: "novasocials" }
    ]
  },
  software: {
    description: "Custom software engineering company delivering cloud solutions, mobile applications, web portals, SaaS products, and generative AI integrations.",
    companies: [
      { name: "NextGen Software Systems", sub: "nextgensoft" },
      { name: "CloudScale Tech Labs", sub: "cloudscalelabs" },
      { name: "Synthetix AI Solutions", sub: "synthetixai" },
      { name: "Velocity App Development", sub: "velocityapps" },
      { name: "DevForce Web Consult", sub: "devforceconsulting" }
    ]
  },
  salon: {
    description: "Luxury hair salon and day spa offering highlights, haircuts, balayage, nail services, skin therapy, and facial treatments.",
    companies: [
      { name: "Studio Silhouette Hair", sub: "studiosilhouette" },
      { name: "Aura Luxury Spa & Salon", sub: "aurasalonspa" },
      { name: "Bella Hair Boutique", sub: "bellahair" },
      { name: "The Velvet Chair", sub: "velvetchairsalon" },
      { name: "Radiant Skin & Lash Bar", sub: "radiantlounge" }
    ]
  },
  restaurant: {
    description: "Artisanal farm-to-table dining experience presenting fresh, organic, seasonal ingredients alongside curated wines and handcrafted cocktails.",
    companies: [
      { name: "The Golden Fork Bistro", sub: "goldenforkbistro" },
      { name: "Urban Hearth Grill & Bar", sub: "urbanhearthgrill" },
      { name: "Green Leaf Organic Vegan", sub: "greenleafkitchen" },
      { name: "La Trattoria Artisan Pasta", sub: "latrattoria" },
      { name: "The Blue Salt Steakhouse", sub: "bluesaltsteak" }
    ]
  }
};

const genericTemplates = {
  description: "Premier local business dedicated to delivering top-quality services, high customer satisfaction, and innovative solutions for our community.",
  companies: [
    { name: "Apex Global Solutions", sub: "apexglobalsolutions" },
    { name: "Vanguard Local Partners", sub: "vanguardlocal" },
    { name: "Summit Services Group", sub: "summitservices" },
    { name: "Pinnacle Enterprise Co", sub: "pinnacleenterprise" },
    { name: "Horizon Agency", sub: "horizonagency" }
  ]
};

// Scrape DuckDuckGo results
async function scrapeDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 8000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    $('.result__body').each((i, element) => {
      if (results.length >= 10) return; // limit to top 10 results
      
      const titleLink = $(element).find('.result__title a');
      const title = titleLink.text().trim();
      let rawUrl = titleLink.attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();
      
      if (title && rawUrl) {
        // Clean redirected URLs
        if (rawUrl.includes('uddg=')) {
          const parts = rawUrl.split('uddg=');
          rawUrl = decodeURIComponent(parts[1].split('&')[0]);
        }
        
        try {
          const domain = new URL(rawUrl).hostname;
          const isDirectory = /yelp\.|wikipedia\.|yellowpages\.|facebook\.|linkedin\.|tripadvisor\.|instagram\.|youtube\.|twitter\.|pinterest\.|reddit\.|mapquest\./i.test(domain);
          
          if (!isDirectory && !rawUrl.startsWith('http://localhost') && !rawUrl.startsWith('https://localhost')) {
            results.push({
              companyName: title,
              website: rawUrl,
              description: snippet
            });
          }
        } catch (e) {
          // ignore bad URLs
        }
      }
    });
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.warn(`DuckDuckGo scraper warning: ${error.message}. Using simulated fallback.`);
    return null;
  }
}

// Simulated search results generator (fallback)
function getSimulatedResults(niche, location) {
  niche = niche.toLowerCase();
  
  // Find closest template match
  let matchedKey = 'generic';
  for (const key of Object.keys(nicheTemplates)) {
    if (niche.includes(key)) {
      matchedKey = key;
      break;
    }
  }

  const template = matchedKey === 'generic' ? genericTemplates : nicheTemplates[matchedKey];
  const locSuffix = location ? `, ${location.split(',')[0].trim()}` : '';
  const domainLoc = location ? location.toLowerCase().replace(/[^a-z0-9]/g, '') : 'local';

  return template.companies.map(c => {
    const domain = `${c.sub}-${domainLoc}.com`;
    return {
      companyName: `${c.name}${locSuffix}`,
      website: `https://www.${domain}`,
      description: template.description.replace('local business', `${niche} business in ${location || 'your area'}`),
      niche: niche,
      location: location || 'Remote'
    };
  });
}

const searchService = {
  search: async (niche, location) => {
    const query = `${niche} in ${location}`;
    console.log(`Searching for leads with query: "${query}"`);
    
    // Try to scrape real results
    let results = await scrapeDuckDuckGo(query);
    
    if (results && results.length > 0) {
      console.log(`Successfully scraped ${results.length} real leads from search engine.`);
      // Enrich scraped results with metadata
      return results.map(r => ({
        ...r,
        niche,
        location,
        status: 'Found'
      }));
    } else {
      console.log('Using simulated lead generator as fallback.');
      return getSimulatedResults(niche, location);
    }
  }
};

module.exports = searchService;
