const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("======================================================================");
console.log("COMPREHENSIVE SECURITY & SECRET SCANNER");
console.log("======================================================================");

// Patterns to flag
const SECRET_PATTERNS = [
  { name: 'Private Key (PEM)', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: '64-hex Private Key assignment', regex: /(?:PRIVATE_KEY|privateKey|SECRET_KEY|secretKey)\s*[:=]\s*["']?(?:0x)?[0-9a-fA-F]{64}["']?/gi },
  { name: 'BIP-39 Mnemonic Seed Phrase', regex: /(?:mnemonic|seed_phrase|seedPhrase)\s*[:=]\s*["'][a-z]+(\s+[a-z]+){11,23}["']/gi },
  { name: 'GitHub Personal Access Token', regex: /(?:ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})/g },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'Generic API Key / Secret Token', regex: /(?:api_key|apiKey|secret_token|secretToken)\s*[:=]\s*["'][0-9a-zA-Z_-]{20,}["']/gi },
  { name: 'Hardcoded Password in Code', regex: /(?:password|adminPassword|ADMIN_PASSWORD)\s*[:=]\s*["'][^"'\s]{8,}["']/gi },
  { name: 'Database URL with Credentials', regex: /(?:postgres|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@[^\s/]+/gi }
];

// Whitelisted files or strings (e.g. placeholders in .env.example)
const WHITELIST_STRINGS = [
  'your_secure_password',
  'Admin@123', // if in dev .env.local, but .env.local is ignored
  'INITIAL_ADMIN_PASSWORD=',
  'ADMIN_PASSWORD=',
  'DEPLOYER_PRIVATE_KEY=',
  'MAINNET_DEPLOYER_PRIVATE_KEY='
];

function isWhitelisted(content) {
  for (const w of WHITELIST_STRINGS) {
    if (content.includes(w)) return true;
  }
  return false;
}

let violations = [];

// 1. Scan Git Commit History
console.log("\n[1] Scanning full Git commit history (all commits & patches)...");
try {
  const gitLog = execSync('git log -p -U1', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });
  for (const rule of SECRET_PATTERNS) {
    let match;
    while ((match = rule.regex.exec(gitLog)) !== null) {
      const matchedText = match[0];
      if (isWhitelisted(matchedText)) continue;
      // Find line context
      const idx = match.index;
      const context = gitLog.substring(Math.max(0, idx - 100), Math.min(gitLog.length, idx + 100));
      violations.push({
        source: 'Git History Commit Log',
        rule: rule.name,
        match: matchedText.substring(0, 30) + '...',
        context: context.replace(/\r?\n/g, ' ')
      });
    }
  }
} catch (err) {
  console.error("Error reading git log:", err.message);
}

// 2. Scan currently tracked files in HEAD
console.log("\n[2] Scanning all files tracked in HEAD...");
try {
  const trackedFiles = execSync('git ls-tree -r --name-only HEAD', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  for (const f of trackedFiles) {
    if (!fs.existsSync(f)) continue;
    // Skip binary files
    if (/\.(png|ico|jpg|jpeg|svg|pdf|lock)$/i.test(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    for (const rule of SECRET_PATTERNS) {
      let match;
      rule.regex.lastIndex = 0; // reset regex state
      while ((match = rule.regex.exec(content)) !== null) {
        const matchedText = match[0];
        if (isWhitelisted(matchedText)) continue;
        violations.push({
          source: `Tracked File: ${f}`,
          rule: rule.name,
          match: matchedText.substring(0, 30) + '...'
        });
      }
    }
  }
} catch (err) {
  console.error("Error scanning tracked files:", err.message);
}

// 3. Scan modified files (unstaged diff)
console.log("\n[3] Scanning unstaged modifications (git diff)...");
try {
  const gitDiff = execSync('git diff', { encoding: 'utf8' });
  for (const rule of SECRET_PATTERNS) {
    let match;
    rule.regex.lastIndex = 0;
    while ((match = rule.regex.exec(gitDiff)) !== null) {
      const matchedText = match[0];
      if (isWhitelisted(matchedText)) continue;
      violations.push({
        source: 'Unstaged git diff',
        rule: rule.name,
        match: matchedText.substring(0, 30) + '...'
      });
    }
  }
} catch (err) {
  console.error("Error reading git diff:", err.message);
}

// 4. Scan all untracked files that are eligible for staging (not ignored)
console.log("\n[4] Scanning all untracked files (git ls-files --others --exclude-standard)...");
try {
  const untrackedFiles = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  for (const f of untrackedFiles) {
    if (!fs.existsSync(f)) continue;
    if (/\.(png|ico|jpg|jpeg|svg|pdf|lock)$/i.test(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    for (const rule of SECRET_PATTERNS) {
      let match;
      rule.regex.lastIndex = 0;
      while ((match = rule.regex.exec(content)) !== null) {
        const matchedText = match[0];
        if (isWhitelisted(matchedText)) continue;
        violations.push({
          source: `Untracked File: ${f}`,
          rule: rule.name,
          match: matchedText.substring(0, 30) + '...'
        });
      }
    }
  }
} catch (err) {
  console.error("Error reading untracked files:", err.message);
}
console.log("======================================================================");
if (violations.length === 0) {
  console.log("✓ SUCCESS: Zero secrets detected across Git history and modified files!");
} else {
  console.error(`🚨 ALERT: ${violations.length} potential secrets detected!`);
  for (const v of violations) {
    console.error(`- Source: ${v.source} | Rule: ${v.rule} | Sample: ${v.match}`);
  }
}
