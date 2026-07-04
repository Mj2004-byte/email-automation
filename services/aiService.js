const Groq = require('groq-sdk');

let groqClient = null;

// Helper: Initialize Groq Client lazily to prevent crash if key is missing during startup
function getGroqClient() {
  if (groqClient) return groqClient;
  
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_groq_api_key_here')) {
    console.warn('⚠️ Groq API key is missing or placeholder. Running AI services in fallback mode.');
    return null;
  }
  
  try {
    groqClient = new Groq({ apiKey });
    return groqClient;
  } catch (error) {
    console.error('Error initializing Groq client:', error.message);
    return null;
  }
}

// Heuristic fallback for lead scoring
function getHeuristicScore(lead) {
  let score = 55; // Base score
  const reasons = [];

  if (lead.email && !lead.email.includes('example.com')) {
    score += 15;
    reasons.push('Valid business email address extracted');
  } else {
    reasons.push('Using generic or missing contact email');
  }

  let socialCount = 0;
  if (lead.socialLinks) {
    if (lead.socialLinks.linkedin) { score += 8; socialCount++; }
    if (lead.socialLinks.twitter) { score += 5; socialCount++; }
    if (lead.socialLinks.facebook) { score += 5; socialCount++; }
    if (lead.socialLinks.instagram) { score += 5; socialCount++; }
  }

  if (socialCount > 0) {
    reasons.push(`Active digital presence with ${socialCount} social media channels`);
  } else {
    reasons.push('No social media channels linked');
  }

  if (lead.description && lead.description.length > 80) {
    score += 7;
    reasons.push('Informative website description available');
  }

  // Ensure score capped between 0 and 100
  score = Math.min(100, Math.max(0, score));

  // Determine custom value prop angle based on niche
  let valueProp = `Help ${lead.companyName} scale their client acquisition through automated systems.`;
  const niche = (lead.niche || '').toLowerCase();
  if (niche.includes('dentist') || niche.includes('dental')) {
    valueProp = `Introduce an automated SMS and web-chat scheduler to capture after-hours appointment requests.`;
  } else if (niche.includes('plumb') || niche.includes('contractor')) {
    valueProp = `Implement an emergency-call dispatch dashboard to book plumbing inquiries 2.4x faster.`;
  } else if (niche.includes('software') || niche.includes('tech')) {
    valueProp = `Augment development velocity by matching specialized remote engineers for short-term project sprints.`;
  } else if (niche.includes('marketing') || niche.includes('agency')) {
    valueProp = `Provide a white-label dashboard tool to report SEO and paid campaign ROI dynamically.`;
  } else if (niche.includes('restaurant')) {
    valueProp = `Deploy a direct-ordering page on the website to eliminate the 30% commission taken by delivery apps.`;
  }

  return {
    score,
    rationale: `Lead scored at ${score}/100. ${reasons.join(', and ')}.`,
    idealValueProp: valueProp
  };
}

// Heuristic fallback for email generation
function getHeuristicEmail(lead, scoreInfo) {
  const name = lead.companyName || 'there';
  const niche = lead.niche || 'business';
  const valueProp = scoreInfo.idealValueProp || 'improve your lead generation and outreach systems';
  
  const subjects = [
    `Quick feedback on the website for ${name}`,
    `Partnership proposal for ${name}`,
    `New growth opportunities for ${name} (${niche})`
  ];
  
  // Pick subject based on score hash
  const subIdx = name.length % subjects.length;
  const subject = subjects[subIdx];

  const body = `Hi Team,

I was browsing ${name} and really liked your digital presence in ${lead.location || 'your area'}. 

I noticed a key area where you can capture more business. We can help you ${valueProp.toLowerCase().replace(/\.$/, '')}.

Given your lead score of ${scoreInfo.score}/100, you are a prime fit for this strategy. We've done similar implementations for other ${niche} providers with great success.

Are you open to a brief, 10-minute call next Tuesday at 2 PM to see if this makes sense for you?

Best regards,

[Your Name]
[Your Company]`;

  return { subject, body };
}

const aiService = {
  scoreLead: async (lead) => {
    console.log(`AI Scoring lead: "${lead.companyName}" (${lead.niche})`);
    const client = getGroqClient();

    if (!client) {
      console.log('Running heuristic lead scoring fallback.');
      return getHeuristicScore(lead);
    }

    const systemPrompt = `You are a professional B2B Sales Operations Lead Scorer. 
Analyze the company profile provided and score their fit as a B2B cold outreach lead on a scale of 0 to 100.
Evaluate their digital footprint, presence of email/socials, and website description.
Provide the final score, a concise 1-sentence rationale, and a 1-sentence customized ideal value proposition angle.

You MUST respond ONLY with a raw JSON object matching this structure. No markdown formatting, no \`\`\`json block wrappers, no text before or after:
{
  "score": 85,
  "rationale": "Clear rationale statement",
  "idealValueProp": "Tailored value proposition angle statement"
}`;

    const userPrompt = `Company Profile:
- Name: ${lead.companyName}
- Website: ${lead.website}
- Niche/Industry: ${lead.niche}
- Location: ${lead.location}
- Extracted Email: ${lead.email || 'None'}
- Extracted Phone: ${lead.phone || 'None'}
- Social Profiles: ${JSON.stringify(lead.socialLinks || {})}
- Description: ${lead.description || 'None'}`;

    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Groq's Llama 3.3 70B model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' } // Enforce JSON
      });

      const responseText = response.choices[0].message.content.trim();
      const parsedData = JSON.parse(responseText);
      
      return {
        score: parseInt(parsedData.score) || 50,
        rationale: parsedData.rationale || 'Lead parsed successfully.',
        idealValueProp: parsedData.idealValueProp || 'Improve business systems.'
      };
    } catch (error) {
      console.error('Error with Groq Lead Scoring:', error.message);
      console.log('Falling back to heuristic lead scoring.');
      return getHeuristicScore(lead);
    }
  },

  generateEmail: async (lead, scoreInfo) => {
    console.log(`AI Email Generating for: "${lead.companyName}"`);
    const client = getGroqClient();

    if (!client) {
      console.log('Running heuristic email generation fallback.');
      return getHeuristicEmail(lead, scoreInfo);
    }

    const systemPrompt = `You are a seasoned B2B Cold Outreach copywriter.
Write a brief, highly personalized, and compelling cold outreach email from the perspective of a digital consultant.
Keep the email under 150 words. Do not sound spammy. Use a friendly, professional tone. 
Include the custom value proposition angle: "${scoreInfo.idealValueProp}".
Use placeholders like [Your Name], [Your Company], and [First Name] (if referring to contact person) which can be filled in later.

You MUST respond ONLY with a raw JSON object matching this structure. No markdown formatting, no \`\`\`json block wrappers, no text before or after:
{
  "subject": "Compelling subject line",
  "body": "Hi [Name],\\n\\nEmail body text..."
}`;

    const userPrompt = `Lead Profile:
- Company Name: ${lead.companyName}
- Niche: ${lead.niche}
- Location: ${lead.location}
- Scrape Description: ${lead.description}
- Lead Score: ${scoreInfo.score}/100`;

    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' } // Enforce JSON
      });

      const responseText = response.choices[0].message.content.trim();
      const parsedData = JSON.parse(responseText);
      
      return {
        subject: parsedData.subject || `Partnership with ${lead.companyName}`,
        body: parsedData.body || `Hi Team,\n\nI noticed your website for ${lead.companyName}...`
      };
    } catch (error) {
      console.error('Error with Groq Email Generation:', error.message);
      console.log('Falling back to heuristic email generation.');
      return getHeuristicEmail(lead, scoreInfo);
    }
  }
};

module.exports = aiService;
