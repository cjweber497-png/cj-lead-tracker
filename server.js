const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const DB_FILE = path.join(__dirname, 'data', 'leads.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { leads: [], meta: {} };
  }
}

function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Seed endpoint — run once after deploy to load existing leads
app.post('/api/seed', (req, res) => {
  const db = readDB();
  if (db.leads && db.leads.length > 0) {
    return res.json({ ok: true, message: 'Already seeded', count: db.leads.length });
  }
  require('./seed.js');
  const seeded = readDB();
  res.json({ ok: true, message: 'Seeded!', count: seeded.leads.length });
});

// Get all leads
app.get('/api/leads', (req, res) => {
  res.json(readDB());
});

// Update a lead (status, notes)
app.post('/api/leads/:id/update', (req, res) => {
  const db = readDB();
  const lead = db.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Not found' });
  if (req.body.status !== undefined) lead.status = req.body.status;
  if (req.body.notes !== undefined) lead.notes = req.body.notes;
  writeDB(db);
  res.json({ ok: true });
});

// Typeform webhook
app.post('/webhook', (req, res) => {
  try {
    const payload = req.body;
    const answers = payload?.form_response?.answers || [];
    const definition = payload?.form_response?.definition?.fields || [];
    const submitted = payload?.form_response?.submitted_at || new Date().toISOString();

    function getAnswer(keyword) {
      const field = definition.find(f =>
        f.title && f.title.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!field) return '';
      const ans = answers.find(a => a.field?.id === field.id);
      if (!ans) return '';
      return ans.text || ans.email || ans.phone_number || ans.choice?.label || ans.number?.toString() || '';
    }

    const firstName = getAnswer('first name') || getAnswer('first');
    const lastName = getAnswer('last name') || getAnswer('last');
    const phone = getAnswer('phone');
    const email = getAnswer('email');
    const tiktok = getAnswer('tiktok');
    const job = getAnswer('work') || getAnswer('job') || getAnswer('do for');
    const income = getAnswer('replace your current income') || getAnswer('need to make');
    const confidence = getAnswer('confident') || getAnswer('confidence');
    const commitment = getAnswer('willing to commit') || getAnswer('invest');
    const installments = getAnswer('installment') || getAnswer('monthly');
    const financing = getAnswer('financing') || getAnswer('credit') || getAnswer('1K set aside');
    const creditLimit = getAnswer('credit limit');

    // Score confidence
    let confScore = 1, confLabel = '❓ Unclear';
    if (confidence.includes('100%')) { confScore = 3; confLabel = '🔥 100%'; }
    else if (confidence.includes('80%')) { confScore = 2; confLabel = '✅ 80%'; }
    else if (confidence.includes('40%') || confidence.includes('0%')) { confScore = 0; confLabel = '❌ Not Ready'; }

    // Score money
    const commitLower = commitment.toLowerCase();
    const installLower = installments.toLowerCase();
    const finLower = financing.toLowerCase();
    const hasCredit = creditLimit && creditLimit !== '0';
    const openFinance = finLower.includes('18+') || finLower.includes('1k set aside') || finLower.includes('i am 18');
    const openInstall = installLower.includes('1') || installLower.includes('monthly') || installLower.includes('yes');
    const noMoney = commitLower.includes('$0') && !openFinance && !openInstall && !hasCredit;

    let moneyScore = 1, moneyLabel = '❓ Unclear';
    if (noMoney) { moneyScore = 0; moneyLabel = '💸 No Money'; }
    else if (hasCredit || openFinance) {
      const num = parseInt((creditLimit || '').replace(/\D/g, '')) || 0;
      moneyScore = num >= 3000 ? 3 : 2;
      moneyLabel = `💰 Ready ($${creditLimit || 'varies'})`;
    } else if (openInstall) { moneyScore = 1; moneyLabel = '📅 Installments OK'; }

    // Priority
    let priority = 'warm';
    if (confScore === 0 || moneyScore === 0) priority = 'skip';
    else if (confScore === 3 && moneyScore >= 2) priority = 'hot';

    const newLead = {
      id: `tf_${Date.now()}`,
      name: `${firstName} ${lastName}`.trim() || 'Unknown',
      phone,
      email,
      tiktok,
      job,
      income,
      conf: confLabel,
      confScore,
      money: moneyLabel,
      moneyScore,
      credit: creditLimit,
      priority,
      date: submitted.split('T')[0],
      status: 'new',
      notes: '',
      source: 'typeform'
    };

    const db = readDB();
    // Deduplicate by email
    if (email && db.leads.find(l => l.email === email)) {
      return res.json({ ok: true, duplicate: true });
    }
    db.leads.unshift(newLead);
    writeDB(db);

    res.json({ ok: true, lead: newLead });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CJ Lead Tracker running on port ${PORT}`);
});
