# OutreachFlow // AI-Powered Lead Generator & Email Outreach Automation

OutreachFlow is a comprehensive automated pipeline that finds targeted local business leads, scrapes their website contact information (emails, phones, and social networks), leverages the Groq API (Llama 3.3 70B) to score lead suitability, drafts a highly-personalized cold outreach email template, and manages the campaign workflow through a premium glassmorphic dashboard.

---

## ⚡ Key Features

- **Lead Search Engine**: Searches the web for businesses based on a niche (e.g., "Dentists", "SaaS startups") and city location.
- **Contact Web Scraper**: Crawls the lead's homepage and primary sub-pages (e.g., `/contact`, `/about`) to extract emails, phone numbers, and social links (LinkedIn, Twitter, Facebook, Instagram) using custom regular expressions and Cheerio.
- **AI-Powered Lead Scoring**: Uses the Groq API with Llama 3.3 to score leads (0-100) based on their digital footprint, outlining their ideal sales value proposition and scoring rationale.
- **Personalized Email Writing**: Automatically draft a custom cold email copy tailored directly to the lead's niche, size, and scored value proposition.
- **Premium Glassmorphic UI Dashboard**: A state-of-the-art Single Page App (SPA) dashboard containing responsive charts (Chart.js), custom search inputs, card listings, email template editor modal, and CSV exports.
- **Resilient Fallback Mode**: If MongoDB is not running locally, the backend seamlessly falls back to a local JSON file database (`data/leads.json`). If Groq API keys are not provided, it falls back to a heuristic scoring and templates engine, ensuring the pipeline remains fully functional out of the box.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ORM) with local JSON file fallback (`fs`)
- **Scraper**: Cheerio & Axios
- **AI Engine**: Groq SDK (`groq-sdk` with Llama-3.3-70b-specdec)
- **Frontend**: Vanilla CSS, Semantic HTML5, Vanilla JavaScript, Chart.js, Lucide Icons

---

## 🚀 Setup Instructions

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Configure Environment Variables
Inside the project root directory, create a `.env` file from the example:
```bash
cp .env.example .env
```
Open `.env` and fill in the values:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/email_automation
GROQ_API_KEY=gsk_your_api_key_here
```
*Note: The user has already provided a configured Groq API Key, which is prefilled in the default `.env` configuration.*

### 3. Install Dependencies
Run the installation command in your terminal:
```bash
npm install
```

### 4. Start the Application
Boot the server locally:
```bash
npm start
```
You should see:
```text
Attempting to connect to MongoDB...
⚠️ MongoDB connection failed. Falling back to local JSON file database at data/leads.json.

🚀 AI Email Automation Server running on http://localhost:3000
🌐 Dashboard UI available at: http://localhost:3000
```

### 5. Access the Dashboard
Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📂 Project Architecture

```text
E:\emailautomation
├── .env                  # Configuration file (contains API keys)
├── .env.example          # Template configuration file
├── package.json          # Dependencies and scripts
├── server.js             # Express application and API routes
├── data/                 # Local JSON database fallback folder
│   └── leads.json
├── services/
│   ├── dbService.js      # DB wrapper (abstracting Mongoose & JSON fallback)
│   ├── searchService.js  # Performs business discovery search scraping
│   ├── scraperService.js # Crawls company websites to extract contact data
│   └── aiService.js      # Groq AI SDK client for Llama scoring & copywriting
└── public/               # Frontend Assets
    ├── index.html        # Dashboard markup
    ├── css/
    │   └── style.css     # Dark/light theme, custom glassmorphism styles
    └── js/
        └── app.js        # API fetches, animations, visual tracker logger, charts
```

---

## 📊 API Reference

- `GET /api/leads` - Retreives all leads in the database.
- `POST /api/search` - Triggers lead search discovery. Expects JSON: `{ "niche": "Dentist", "location": "Miami" }`.
- `POST /api/enrich/:id` - Scrapes, scores, and writes outreach copy for the specified lead ID.
- `PUT /api/leads/:id` - Updates lead properties (like customized email drafts).
- `DELETE /api/leads/:id` - Deletes a specific lead.
- `DELETE /api/leads` - Clears the database.
- `POST /api/leads/:id/send` - Mock outreach email sender.
- `GET /api/export-csv` - Streams all leads as a standard `.csv` download.
