#!/usr/bin/env node
/* Build index.json from MDN BCD */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BCD_ROOT = path.join(ROOT, 'browser-compat-data');
const JS_DIR = path.join(BCD_ROOT, 'javascript');
const BROWSERS_DIR = path.join(BCD_ROOT, 'browsers');
const OUT = path.join(ROOT, 'public', 'data');
const OUT_FILE = path.join(OUT, 'index.json');

const TARGET_BROWSERS = ['chrome', 'firefox', 'safari', 'edge'];

function readJSON(p) { 
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')); 
  } catch (e) {
    console.warn(`Failed to read ${p}:`, e.message);
    return null;
  }
}

function stripHtml(s = '') { 
  return s.replace(/<[^>]*>/g, '').trim(); 
}

function loadReleases(browser) {
  const p = path.join(BROWSERS_DIR, `${browser}.json`);
  const json = readJSON(p);
  if (!json) return {};
  
  // Handle different BCD structure variations
  if (json[browser]?.releases) {
    return json[browser].releases;
  } else if (json.releases) {
    return json.releases;
  } else if (json.browsers?.[browser]?.releases) {
    return json.browsers[browser].releases;
  }
  return {};
}

function normalizeSupport(s) { 
  if (!s) return [];
  return Array.isArray(s) ? s : [s]; 
}

function isStable(entry) {
  if (!entry) return false;
  if (entry.flags) return false;
  if (entry.partial_implementation) return false;
  if (entry.prefix || entry.alternative_name) return false;
  if (entry.version_added === null || entry.version_added === true) return false;
  return typeof entry.version_added === 'string';
}

function isUnstable(entry) {
  if (!entry) return false;
  if (entry.version_added === null || entry.version_added === true) return false;
  if (typeof entry.version_added !== 'string') return false;
  
  // Check for unstable indicators
  return !!(entry.flags || entry.prefix || entry.alternative_name || entry.partial_implementation);
}

function compareVersions(a, b) {
  if (!a || !b) return 0;
  
  // Handle version ranges like "≤37" or "37-38"
  const cleanA = a.replace(/[≤≥<>=]/g, '').split('-')[0];
  const cleanB = b.replace(/[≤≥<>=]/g, '').split('-')[0];
  
  const na = cleanA.split('.').map(x => parseInt(x, 10)).filter(n => !Number.isNaN(n));
  const nb = cleanB.split('.').map(x => parseInt(x, 10)).filter(n => !Number.isNaN(n));
  const len = Math.max(na.length, nb.length);
  
  for (let i = 0; i < len; i++) {
    const va = na[i] || 0;
    const vb = nb[i] || 0;
    if (va !== vb) return va - vb;
  }
  return cleanA.localeCompare(cleanB); // fallback
}

function walk(obj, trail = [], out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__compat' && typeof v === 'object') {
      out.push({ path: trail.join('.'), compat: v });
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      walk(v, trail.concat(k), out);
    }
  }
  return out;
}

function build() {
  console.log('Loading browser release data...');
  const releases = Object.fromEntries(TARGET_BROWSERS.map(b => [b, loadReleases(b)]));
  
  // Log release data stats
  for (const [browser, data] of Object.entries(releases)) {
    console.log(`${browser}: ${Object.keys(data).length} releases loaded`);
  }
  
  const result = Object.fromEntries(TARGET_BROWSERS.map(b => [b, []]));
  let totalFeatures = 0;
  let processedFiles = 0;

  // Traverse all JS files
  function collectFiles(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        collectFiles(p);
      } else if (f.endsWith('.json')) {
        processFile(p);
        processedFiles++;
      }
    }
  }

  function processFile(p) {
    const json = readJSON(p);
    if (!json) return;
    
    const nodes = walk(json, ['javascript']);
    for (const node of nodes) {
      const compat = node.compat || {};
      const support = compat.support || {};
      const description = stripHtml(compat.description || '');
      const spec = Array.isArray(compat.spec_url) ? compat.spec_url[0] : compat.spec_url;
      const mdn_url = compat.mdn_url || null;

      for (const browser of TARGET_BROWSERS) {
        const stmt = support[browser];
        if (!stmt) continue;
        
        const normalized = normalizeSupport(stmt);
        const stableEntries = normalized.filter(isStable);
        const unstableEntries = normalized.filter(isUnstable);
        
        // Process stable entries
        if (stableEntries.length > 0) {
          stableEntries.sort((a, b) => compareVersions(a.version_added, b.version_added));
          const version = stableEntries[0].version_added;
          const date = releases[browser]?.[version]?.release_date || null;
          const versionRemoved = stableEntries[0].version_removed || null;
          const dateRemoved = versionRemoved ? (releases[browser]?.[versionRemoved]?.release_date || null) : null;

          const pathParts = node.path.split('.');
          const methodName = pathParts[pathParts.length - 1];
          const typeName = pathParts[pathParts.length - 2] || '';
          const displayName = typeName ? `${typeName}.${methodName}` : methodName;

          result[browser].push({
            feature_id: node.path,
            name: displayName,
            method_name: methodName,
            type_name: typeName,
            description,
            spec_url: spec || null,
            mdn_url: mdn_url,
            version,
            version_removed: versionRemoved,
            date,
            date_removed: dateRemoved,
            stable: true,
            flags: stableEntries[0].flags || null,
            prefix: stableEntries[0].prefix || null,
            alternative_name: stableEntries[0].alternative_name || null,
            partial_implementation: stableEntries[0].partial_implementation || false,
            notes: stableEntries[0].notes || null
          });
          totalFeatures++;
        }
        
        // Process unstable entries
        if (unstableEntries.length > 0) {
          unstableEntries.sort((a, b) => compareVersions(a.version_added, b.version_added));
          const version = unstableEntries[0].version_added;
          const date = releases[browser]?.[version]?.release_date || null;
          const versionRemoved = unstableEntries[0].version_removed || null;
          const dateRemoved = versionRemoved ? (releases[browser]?.[versionRemoved]?.release_date || null) : null;

          const pathParts = node.path.split('.');
          const methodName = pathParts[pathParts.length - 1];
          const typeName = pathParts[pathParts.length - 2] || '';
          const displayName = typeName ? `${typeName}.${methodName}` : methodName;

          result[browser].push({
            feature_id: node.path,
            name: displayName,
            method_name: methodName,
            type_name: typeName,
            description,
            spec_url: spec || null,
            mdn_url: mdn_url,
            version,
            version_removed: versionRemoved,
            date,
            date_removed: dateRemoved,
            stable: false,
            flags: unstableEntries[0].flags || null,
            prefix: unstableEntries[0].prefix || null,
            alternative_name: unstableEntries[0].alternative_name || null,
            partial_implementation: unstableEntries[0].partial_implementation || false,
            notes: unstableEntries[0].notes || null
          });
          totalFeatures++;
        }
      }
    }
  }

  console.log('Processing JavaScript features...');
  collectFiles(JS_DIR);

  // Sort per browser newest first
  for (const browser of TARGET_BROWSERS) {
    result[browser].sort((a, b) => {
      // Primary sort: by date (newest first)
      if (a.date && b.date && a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      
      // Secondary sort: by version (newest first)
      return compareVersions(b.version || '0', a.version || '0');
    });
  }

  // Ensure output directory exists
  fs.mkdirSync(OUT, { recursive: true });
  
  // Collect browser releases for timeline
  const browserReleases = {};
  for (const browser of TARGET_BROWSERS) {
    const browserReleaseData = Object.entries(releases[browser] || {})
      .filter(([version, data]) => data.release_date)
      .map(([version, data]) => ({
        version,
        date: data.release_date,
        status: data.status || 'unknown'
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    browserReleases[browser] = browserReleaseData;
  }

  const output = {
    generated_at: new Date().toISOString(),
    browsers: result,
    releases: browserReleases
  };
  
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  
  console.log(`\nBuild complete!`);
  console.log(`- Processed ${processedFiles} JSON files`);
  console.log(`- Found ${totalFeatures} total feature implementations`);
  for (const browser of TARGET_BROWSERS) {
    console.log(`- ${browser}: ${result[browser].length} features`);
  }
  console.log(`- Output: ${OUT_FILE}`);
}

build();
