/**
 * Boomer Counselor - Google Sheets backend (v3.1)
 *
 * v3.1 changes over v3:
 *   - LockService.getScriptLock wraps doPost so concurrent webhook calls
 *     don't race on sheet reads and create duplicate session rows.
 *   - Session logic now uses a 5-minute gap rule: a new tool-use row is
 *     only created when tool_open fires AND the last event for this
 *     (email, tool) was >= 5 min ago (or there is no prior row).
 *     This means rapid successive tool_opens inside the same visit
 *     correctly update the SAME row instead of inflating row count.
 *
 * Writes every event to TWO sheets:
 * 1) RAW sheet (the spreadsheet this script is bound to) - full raw event log
 *    - Users tab:  one row per unique user, running counters
 *    - Events tab: one row per event, 30 columns of detail
 * 2) ANALYTICS sheet (separate, human-friendly) - ID below
 *    - Users Overview:    one row per user, summary info
 *    - Career Discovery:  one row per tool-use session, final traits + matches
 *    - Profile Builder:   one row per tool-use session, categorized selections + clicks
 *    - College Search:    one row per tool-use session, filters + shortlist + reports
 */

const ANALYTICS_SHEET_ID = '1eyuxEbFsiEBgO9EjiCnbBGy1fpIK2uHws6FEW01iZuk';

const SHEET_NAMES = {
  USERS: 'Users',
  EVENTS: 'Events',
};

const ANALYTICS_TABS = {
  USERS: 'Users Overview',
  CAREERS: 'Career Discovery',
  PROFILE: 'Profile Builder',
  COLLEGE: 'College Search',
  TUTOR: 'Tutor & Counselor',
};

// ============================================================================
// RAW sheet schemas (same as v2)
// ============================================================================
const EVENT_HEADERS = [
  'timestamp','event_type','tool','action','target_id','target_label','extra_data',
  'email','name','given_name','google_id','picture_url',
  'location_ip','location_city','location_region','location_country','location_country_code',
  'location_postal','location_tz','location_org','location_lat','location_lng',
  'user_agent','device_type','language','browser_tz','screen','viewport','referrer','page_url',
];

const USER_HEADERS = [
  'first_seen','last_seen','email','name','given_name','family_name','picture','google_id',
  'email_verified','locale','total_events','tools_used','latest_tool','latest_event',
  'shortlist_adds','shortlist_removes','link_clicks','filters_applied','purchases',
  'city','region','country','latest_ip','latest_referrer','latest_user_agent',
];

// ============================================================================
// ANALYTICS sheet schemas (new, human-friendly)
// ============================================================================
const ANALYTICS_USERS_HEADERS = [
  'First seen','Last seen','Name','Email','Picture URL','City','Region','Country',
  'IP','Total events','Tools used','Last active tool',
];

const ANALYTICS_CAREERS_HEADERS = [
  'Timestamp','Session ID','Name','Email','City','Country',
  'Final traits selected','Matched careers',
];

const ANALYTICS_PROFILE_HEADERS = [
  'Timestamp','Session ID','Name','Email','City','Country',
  'I am','I am interested in','I am looking for','Location preference','Programs clicked',
];

const ANALYTICS_COLLEGE_HEADERS = [
  'Timestamp','Session ID','Name','Email','City','Country',
  'Filters used','Colleges shortlisted','Reports viewed','Reports purchased',
];

const ANALYTICS_TUTOR_HEADERS = [
  'Timestamp','Session ID','Name','Email','City','Country',
  'Filters used','Providers clicked',
];

// ============================================================================
// Career data (mirrors apps/careers/src/data/careers.js so we can compute matches server-side)
// ============================================================================
const CAREERS_DATA = [
  { cat:'Commerce',   major:'Business Analytics',   traits:['logic','number'] },
  { cat:'Commerce',   major:'Economics',            traits:['logic','abstract'] },
  { cat:'Commerce',   major:'Entrepreneurship',     traits:['gutFeeling','logic','creativity'] },
  { cat:'Commerce',   major:'Film',                 traits:['creativity','threeD','design','observation','tonal','rhythm'] },
  { cat:'Commerce',   major:'Finance',              traits:['number'] },
  { cat:'Commerce',   major:'Hospitality',          traits:[] },
  { cat:'Commerce',   major:'Law',                  traits:['gutFeeling','logic','creativity','abstract','linguistic'] },
  { cat:'Commerce',   major:'Management',           traits:[] },
  { cat:'Commerce',   major:'Marketing',            traits:['creativity','design'] },
  { cat:'Commerce',   major:'Operations & SCM',     traits:['logic','number'] },
  { cat:'Design',     major:'Architecture',         traits:['logic','creativity','abstract','threeD','design','observation'] },
  { cat:'Design',     major:'Design',               traits:['creativity','design','observation'] },
  { cat:'Humanities', major:'Journalism & Writing', traits:['creativity','linguistic'] },
  { cat:'Humanities', major:'Politics & IR',        traits:['gutFeeling','logic','creativity','abstract'] },
  { cat:'Humanities', major:'Psychology',           traits:[] },
  { cat:'STEM',       major:'Biology',              traits:[] },
  { cat:'STEM',       major:'CS / DS / AI',         traits:['logic'] },
  { cat:'STEM',       major:'Engineering',          traits:['logic','abstract','threeD'] },
  { cat:'STEM',       major:'ESS',                  traits:[] },
  { cat:'STEM',       major:'Medicine',             traits:['gutFeeling','logic','abstract','threeD'] },
  { cat:'STEM',       major:'PCM',                  traits:['logic','abstract'] },
  { cat:'STEM',       major:'PCB',                  traits:[] },
  { cat:'Vocational', major:'Culinary',             traits:['creativity','design','threeD','rhythm','pitch'] },
  { cat:'Vocational', major:'Music',                traits:['creativity','tonal','rhythm','pitch'] },
  { cat:'Vocational', major:'Sports',               traits:[] },
];

// Trait label -> id map so we can accept either shape coming in from the UI
const TRAIT_LABEL_TO_ID = {
  'Gut Feeling':'gutFeeling','Logic':'logic','Creativity':'creativity','Abstract':'abstract',
  '3D':'threeD','Design':'design','Observation':'observation','Linguistic':'linguistic',
  'Tonal':'tonal','Rhythm':'rhythm','Pitch':'pitch','Number':'number',
};

function computeCareerMatches(selectedLabels) {
  if (!selectedLabels || !selectedLabels.length) return '';
  const selectedIds = selectedLabels
    .map(l => TRAIT_LABEL_TO_ID[l] || l.toLowerCase())
    .filter(Boolean);
  if (!selectedIds.length) return '';
  const scored = CAREERS_DATA.map(c => {
    const matched = selectedIds.filter(t => c.traits.indexOf(t) !== -1).length;
    const denom = selectedIds.length;
    const score = denom > 0 ? Math.round((matched / denom) * 100) : 0;
    return { major: c.major, matched, score };
  }).filter(x => x.matched > 0).sort((a, b) => b.score - a.score);
  return scored.map(s => `${s.major} (${s.score}%)`).join(', ');
}

// ============================================================================
// Main entry point
// ============================================================================
function doPost(e) {
  // Serialize writes with a document-wide lock so concurrent webhook calls don't
  // race on session-row lookups and create duplicate rows in the Analytics tabs.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // wait up to 20s
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Lock timeout: ' + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const data = JSON.parse(e.postData.contents);

    // --- LISTING REQUEST: write to separate tab and return early ---
    if (data.eventType === 'listing_request') {
      const rawSS = SpreadsheetApp.openById('1oCj_MVwTsYkS1HXNKwMZcsSaRCWXdCOQO3qW-yaqLq0');
      let listingSheet = rawSS.getSheetByName('Listing Requests');
      if (!listingSheet) {
        listingSheet = rawSS.insertSheet('Listing Requests');
        listingSheet.appendRow([
          'Timestamp', 'Name', 'Email', 'Phone', 'Organization',
          'Category', 'Website', 'City', 'Country', 'Description', 'Notes', 'Status'
        ]);
        listingSheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#f5c518');
        listingSheet.setFrozenRows(1);
      }
      listingSheet.appendRow([
        data.timestamp || new Date().toISOString(),
        data.name || '', data.email || '', data.phone || '',
        data.organization || '', data.category || '', data.website || '',
        data.city || '', data.country || '', data.description || '',
        data.notes || '', 'Pending'
      ]);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', eventType: 'listing_request' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- 1) RAW sheet write (same behavior as v2) ---
    writeRawEvent(data);
    updateRawUser(data);

    // --- 2) ANALYTICS sheet write (new) ---
    try {
      writeAnalytics(data);
    } catch (err) {
      // Don't let analytics failure break the raw pipeline
      console.error('Analytics write failed: ' + err.toString());
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', eventType: data.eventType }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Boomer Counselor backend v3.1 alive (lock + session gap)' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// RAW sheet writers (unchanged from v2)
// ============================================================================
function writeRawEvent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const u = data.user || {};
  const loc = data.location || {};
  const meta = data.meta || {};
  const now = data.timestamp || new Date().toISOString();
  const eventType = data.eventType || 'unknown';
  const tool = data.tool || '';
  const action = data.action || '';
  const targetId = data.targetId || '';
  const targetLabel = data.targetLabel || '';
  const extraData = data.extraData || '';

  let eventsSheet = ss.getSheetByName(SHEET_NAMES.EVENTS);
  if (!eventsSheet) {
    eventsSheet = ss.insertSheet(SHEET_NAMES.EVENTS);
    eventsSheet.appendRow(EVENT_HEADERS);
    eventsSheet.getRange(1, 1, 1, EVENT_HEADERS.length)
      .setFontWeight('bold').setBackground('#FDB515').setHorizontalAlignment('left');
    eventsSheet.setFrozenRows(1);
    eventsSheet.setColumnWidths(1, EVENT_HEADERS.length, 130);
  }

  eventsSheet.appendRow([
    now, eventType, tool, action, targetId, targetLabel,
    typeof extraData === 'string' ? extraData : JSON.stringify(extraData),
    u.email || '', u.name || '', u.given_name || '', u.sub || '', u.picture || '',
    loc.ip || '', loc.city || '', loc.region || '', loc.country_name || '', loc.country_code || '',
    loc.postal || '', loc.timezone || '', loc.org || '', loc.latitude || '', loc.longitude || '',
    meta.user_agent || '', meta.device_type || '', meta.language || '', meta.timezone || '',
    meta.screen || '', meta.viewport || '', meta.referrer || '', meta.page_url || '',
  ]);
}

function updateRawUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const u = data.user || {};
  const loc = data.location || {};
  const meta = data.meta || {};
  const now = data.timestamp || new Date().toISOString();
  const eventType = data.eventType || '';
  const tool = data.tool || '';

  let usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_NAMES.USERS);
    usersSheet.appendRow(USER_HEADERS);
    usersSheet.getRange(1, 1, 1, USER_HEADERS.length)
      .setFontWeight('bold').setBackground('#FDB515');
    usersSheet.setFrozenRows(1);
  }

  const userData = usersSheet.getDataRange().getValues();
  let userRow = -1;
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][7] === u.sub) { userRow = i + 1; break; }
  }

  if (userRow === -1) {
    const row = new Array(USER_HEADERS.length).fill('');
    row[0] = now;
    row[1] = now;
    row[2] = u.email || '';
    row[3] = u.name || '';
    row[4] = u.given_name || '';
    row[5] = u.family_name || '';
    row[6] = u.picture || '';
    row[7] = u.sub || '';
    row[8] = u.email_verified || false;
    row[9] = u.locale || '';
    row[10] = 1;
    row[11] = tool || '';
    row[12] = tool || '';
    row[13] = eventType;
    row[14] = eventType === 'college_shortlist_add' ? 1 : 0;
    row[15] = eventType === 'college_shortlist_remove' ? 1 : 0;
    row[16] = eventType === 'link_click' ? 1 : 0;
    row[17] = eventType === 'tool_filter' ? 1 : 0;
    row[18] = eventType === 'college_purchase' ? 1 : 0;
    row[19] = loc.city || '';
    row[20] = loc.region || '';
    row[21] = loc.country_name || '';
    row[22] = loc.ip || '';
    row[23] = meta.referrer || '';
    row[24] = meta.user_agent || '';
    usersSheet.appendRow(row);
  } else {
    const existing = userData[userRow - 1];
    const totalEvents = (parseInt(existing[10]) || 0) + 1;
    const toolsUsed = existing[11] || '';
    const newToolsUsed = tool && toolsUsed.split(', ').indexOf(tool) === -1
      ? (toolsUsed ? toolsUsed + ', ' + tool : tool) : toolsUsed;
    const slAdds = (parseInt(existing[14]) || 0) + (eventType === 'college_shortlist_add' ? 1 : 0);
    const slRem  = (parseInt(existing[15]) || 0) + (eventType === 'college_shortlist_remove' ? 1 : 0);
    const clicks = (parseInt(existing[16]) || 0) + (eventType === 'link_click' ? 1 : 0);
    const fApp   = (parseInt(existing[17]) || 0) + (eventType === 'tool_filter' ? 1 : 0);
    const purc   = (parseInt(existing[18]) || 0) + (eventType === 'college_purchase' ? 1 : 0);

    usersSheet.getRange(userRow, 2).setValue(now);
    usersSheet.getRange(userRow, 11).setValue(totalEvents);
    usersSheet.getRange(userRow, 12).setValue(newToolsUsed);
    if (tool) usersSheet.getRange(userRow, 13).setValue(tool);
    usersSheet.getRange(userRow, 14).setValue(eventType);
    usersSheet.getRange(userRow, 15).setValue(slAdds);
    usersSheet.getRange(userRow, 16).setValue(slRem);
    usersSheet.getRange(userRow, 17).setValue(clicks);
    usersSheet.getRange(userRow, 18).setValue(fApp);
    usersSheet.getRange(userRow, 19).setValue(purc);
    if (loc.city) usersSheet.getRange(userRow, 20).setValue(loc.city);
    if (loc.region) usersSheet.getRange(userRow, 21).setValue(loc.region);
    if (loc.country_name) usersSheet.getRange(userRow, 22).setValue(loc.country_name);
    if (loc.ip) usersSheet.getRange(userRow, 23).setValue(loc.ip);
    if (meta.referrer) usersSheet.getRange(userRow, 24).setValue(meta.referrer);
    if (meta.user_agent) usersSheet.getRange(userRow, 25).setValue(meta.user_agent);
  }
}

// ============================================================================
// ANALYTICS sheet writers (new)
// ============================================================================
function writeAnalytics(data) {
  const ass = SpreadsheetApp.openById(ANALYTICS_SHEET_ID);
  const u = data.user || {};
  const loc = data.location || {};
  const now = data.timestamp || new Date().toISOString();
  const tool = data.tool || '';
  const eventType = data.eventType || '';

  // Always keep the Users Overview tab fresh
  upsertAnalyticsUser(ass, u, loc, now, tool);

  // Tool-specific writes — each uses a sessionId based on the last tool_open
  if (tool === 'careers')        updateCareerSession(ass, data, u, loc, now);
  else if (tool === 'profile')   updateProfileSession(ass, data, u, loc, now);
  else if (tool === 'college-search') updateCollegeSession(ass, data, u, loc, now);
  else if (tool === 'tutor-counselor') updateTutorSession(ass, data, u, loc, now);
}

function upsertAnalyticsUser(ass, u, loc, now, tool) {
  let sheet = ass.getSheetByName(ANALYTICS_TABS.USERS);
  if (!sheet) {
    sheet = ass.insertSheet(ANALYTICS_TABS.USERS);
    sheet.appendRow(ANALYTICS_USERS_HEADERS);
    sheet.getRange(1, 1, 1, ANALYTICS_USERS_HEADERS.length)
      .setFontWeight('bold').setBackground('#FDB515').setFontColor('#1a1a1a');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, ANALYTICS_USERS_HEADERS.length, 140);
  }
  const data = sheet.getDataRange().getValues();
  let row = -1;
  // Match on email (column 4, 0-index 3) since we don't store google_id in this tab
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === (u.email || '')) { row = i + 1; break; }
  }
  if (row === -1) {
    sheet.appendRow([
      now, now, u.name || '', u.email || '', u.picture || '',
      loc.city || '', loc.region || '', loc.country_name || '',
      loc.ip || '', 1, tool || '', tool || '',
    ]);
  } else {
    const existing = data[row - 1];
    const totalEvents = (parseInt(existing[9]) || 0) + 1;
    const toolsUsed = existing[10] || '';
    const newToolsUsed = tool && toolsUsed.split(', ').indexOf(tool) === -1
      ? (toolsUsed ? toolsUsed + ', ' + tool : tool) : toolsUsed;
    sheet.getRange(row, 2).setValue(now);               // Last seen
    if (loc.city) sheet.getRange(row, 6).setValue(loc.city);
    if (loc.region) sheet.getRange(row, 7).setValue(loc.region);
    if (loc.country_name) sheet.getRange(row, 8).setValue(loc.country_name);
    if (loc.ip) sheet.getRange(row, 9).setValue(loc.ip);
    sheet.getRange(row, 10).setValue(totalEvents);
    sheet.getRange(row, 11).setValue(newToolsUsed);
    if (tool) sheet.getRange(row, 12).setValue(tool);   // Last active tool
  }
}

/**
 * For per-session rows, we use a deterministic "session ID" that increments
 * based on TIME GAPS between events for a given (email, tool) pair.
 *
 * A new session is created when:
 *  - eventType === 'tool_open' AND the last event for this (email, tool)
 *    was more than 5 minutes ago (or there is no prior event)
 *  - OR there's simply no prior row at all
 *
 * For all other events (tool_filter, link_click, shortlist, etc.), we always
 * update the MOST RECENT session row for that (email, tool). We never create
 * new rows from non-open events.
 *
 * IMPORTANT: This function assumes the caller has already acquired a script
 * lock (see doPost LockService wrapper). Without that, concurrent invocations
 * could still race on the sheet read -> write cycle.
 *
 * The sheet schema assumes:
 *   - col 4 (0-index 3) = email
 *   - col 1 (0-index 0) = timestamp of last update (ISO string)
 *   - col 2 (0-index 1) = session ID
 */
const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes

function getOrCreateSession(sheet, email, tool, eventType, now, baseRowBuilder) {
  const data = sheet.getDataRange().getValues();
  // Scan from bottom up to find the most recent session row for this email
  let lastRow = -1;
  let lastTimestamp = null;
  let lastSessionId = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][3] === email) {
      lastRow = i + 1;
      lastTimestamp = data[i][0];
      lastSessionId = parseInt(data[i][1]) || 0;
      break;
    }
  }

  // If there is no prior row for this email on this tab, create one
  if (lastRow === -1) {
    const base = baseRowBuilder(1);
    sheet.appendRow(base);
    return sheet.getLastRow();
  }

  // If this is a tool_open event AND there's been a 5+ minute gap, start a new session
  if (eventType === 'tool_open' && lastTimestamp) {
    const lastMs = new Date(lastTimestamp).getTime();
    const nowMs = new Date(now).getTime();
    if (!isNaN(lastMs) && !isNaN(nowMs) && (nowMs - lastMs) >= SESSION_GAP_MS) {
      const base = baseRowBuilder(lastSessionId + 1);
      sheet.appendRow(base);
      return sheet.getLastRow();
    }
  }

  // Otherwise update the most recent session row in place
  return lastRow;
}

function updateCareerSession(ass, data, u, loc, now) {
  let sheet = ass.getSheetByName(ANALYTICS_TABS.CAREERS);
  if (!sheet) {
    sheet = ass.insertSheet(ANALYTICS_TABS.CAREERS);
    sheet.appendRow(ANALYTICS_CAREERS_HEADERS);
    sheet.getRange(1, 1, 1, ANALYTICS_CAREERS_HEADERS.length)
      .setFontWeight('bold').setBackground('#FDB515');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, ANALYTICS_CAREERS_HEADERS.length, 180);
    sheet.setColumnWidth(7, 300);
    sheet.setColumnWidth(8, 400);
  }
  const email = u.email || '';
  const row = getOrCreateSession(sheet, email, 'careers', data.eventType, now,
    (sessionId) => [now, sessionId, u.name || '', email, loc.city || '', loc.country_name || '', '', '']);

  // tool_filter → update Final traits + Matched careers
  if (data.eventType === 'tool_filter') {
    const extra = parseExtra(data.extraData);
    let traitLabels = [];
    if (extra && Array.isArray(extra.selected_traits)) traitLabels = extra.selected_traits;
    else if (data.targetLabel) traitLabels = data.targetLabel.split(',').map(s => s.trim()).filter(Boolean);

    if (traitLabels.length) {
      sheet.getRange(row, 7).setValue(traitLabels.join(', '));
      sheet.getRange(row, 8).setValue(computeCareerMatches(traitLabels));
      sheet.getRange(row, 1).setValue(now); // keep Timestamp fresh
    }
  }
}

function updateProfileSession(ass, data, u, loc, now) {
  let sheet = ass.getSheetByName(ANALYTICS_TABS.PROFILE);
  if (!sheet) {
    sheet = ass.insertSheet(ANALYTICS_TABS.PROFILE);
    sheet.appendRow(ANALYTICS_PROFILE_HEADERS);
    sheet.getRange(1, 1, 1, ANALYTICS_PROFILE_HEADERS.length)
      .setFontWeight('bold').setBackground('#FDB515');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, ANALYTICS_PROFILE_HEADERS.length, 160);
    sheet.setColumnWidth(11, 400);
  }
  const email = u.email || '';
  const row = getOrCreateSession(sheet, email, 'profile', data.eventType, now,
    (sessionId) => [now, sessionId, u.name || '', email, loc.city || '', loc.country_name || '', '', '', '', '', '']);

  if (data.eventType === 'tool_filter') {
    const extra = parseExtra(data.extraData);
    let criteria = [];
    if (extra && Array.isArray(extra.selected_criteria)) criteria = extra.selected_criteria;
    else if (data.targetLabel) criteria = data.targetLabel.split(',').map(s => s.trim()).filter(Boolean);
    // Bucket by category
    const buckets = categorizeProfileCriteria(criteria);
    if (buckets.iAm.length || buckets.interested.length || buckets.looking.length || buckets.location.length) {
      sheet.getRange(row, 7).setValue(buckets.iAm.join(', '));
      sheet.getRange(row, 8).setValue(buckets.interested.join(', '));
      sheet.getRange(row, 9).setValue(buckets.looking.join(', '));
      sheet.getRange(row, 10).setValue(buckets.location.join(', '));
      sheet.getRange(row, 1).setValue(now);
    }
  }

  if (data.eventType === 'link_click') {
    const existing = sheet.getRange(row, 11).getValue() || '';
    const label = data.targetLabel || '';
    if (label) {
      const existingList = existing ? existing.toString().split(', ').filter(Boolean) : [];
      if (existingList.indexOf(label) === -1) existingList.push(label);
      sheet.getRange(row, 11).setValue(existingList.join(', '));
      sheet.getRange(row, 1).setValue(now);
    }
  }
}

// Profile filter groups (mirrors apps/profile/src/hooks/useSheetData.js GROUPS constant)
const PROFILE_GROUPS = {
  iAm:        ['Middle School','High School','Gap Year'],
  interested: ['STEM','Humanities','Business','Design','Law','Medicine'],
  looking:    ['Skill Building','Structured Program','Competition','Research/Project','Summer School'],
  location:   ['Online','India','Global'],
};

function categorizeProfileCriteria(labels) {
  const out = { iAm: [], interested: [], looking: [], location: [] };
  const otherInInterested = labels.filter(l => l === 'Other').length >= 1;
  labels.forEach(label => {
    if (PROFILE_GROUPS.iAm.indexOf(label) !== -1) out.iAm.push(label);
    else if (PROFILE_GROUPS.interested.indexOf(label) !== -1) out.interested.push(label);
    else if (PROFILE_GROUPS.looking.indexOf(label) !== -1) out.looking.push(label);
    else if (PROFILE_GROUPS.location.indexOf(label) !== -1) out.location.push(label);
    else if (label === 'Other') {
      // Ambiguous "Other" - without position we can't tell which group, put in interested by default
      out.interested.push(label);
    }
  });
  return out;
}

function updateCollegeSession(ass, data, u, loc, now) {
  let sheet = ass.getSheetByName(ANALYTICS_TABS.COLLEGE);
  if (!sheet) {
    sheet = ass.insertSheet(ANALYTICS_TABS.COLLEGE);
    sheet.appendRow(ANALYTICS_COLLEGE_HEADERS);
    sheet.getRange(1, 1, 1, ANALYTICS_COLLEGE_HEADERS.length)
      .setFontWeight('bold').setBackground('#FDB515');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, ANALYTICS_COLLEGE_HEADERS.length, 160);
    sheet.setColumnWidth(7, 300);
    sheet.setColumnWidth(8, 300);
  }
  const email = u.email || '';
  const row = getOrCreateSession(sheet, email, 'college-search', data.eventType, now,
    (sessionId) => [now, sessionId, u.name || '', email, loc.city || '', loc.country_name || '', '', '', '', '']);

  if (data.eventType === 'tool_filter') {
    const extra = parseExtra(data.extraData);
    if (extra && extra.filters_by_category) {
      const readable = Object.entries(extra.filters_by_category)
        .map(([k, v]) => `${capitalize(k)}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(' · ');
      sheet.getRange(row, 7).setValue(readable);
      sheet.getRange(row, 1).setValue(now);
    }
  }

  if (data.eventType === 'college_shortlist_add' || data.eventType === 'college_shortlist_remove') {
    const label = data.targetLabel || '';
    if (label) {
      const existing = sheet.getRange(row, 8).getValue() || '';
      let list = existing ? existing.toString().split(', ').filter(Boolean) : [];
      if (data.eventType === 'college_shortlist_add') {
        if (list.indexOf(label) === -1) list.push(label);
      } else {
        list = list.filter(x => x !== label);
      }
      sheet.getRange(row, 8).setValue(list.join(', '));
      sheet.getRange(row, 1).setValue(now);
    }
  }

  if (data.eventType === 'college_report_view') {
    const label = data.targetLabel || '';
    if (label) {
      const existing = sheet.getRange(row, 9).getValue() || '';
      const list = existing ? existing.toString().split(', ').filter(Boolean) : [];
      if (list.indexOf(label) === -1) list.push(label);
      sheet.getRange(row, 9).setValue(list.join(', '));
      sheet.getRange(row, 1).setValue(now);
    }
  }

  if (data.eventType === 'college_purchase') {
    const label = data.targetLabel || '';
    if (label) {
      const existing = sheet.getRange(row, 10).getValue() || '';
      const list = existing ? existing.toString().split(', ').filter(Boolean) : [];
      if (list.indexOf(label) === -1) list.push(label);
      sheet.getRange(row, 10).setValue(list.join(', '));
      sheet.getRange(row, 1).setValue(now);
    }
  }
}

function parseExtra(extraData) {
  if (!extraData) return null;
  if (typeof extraData === 'object') return extraData;
  try { return JSON.parse(extraData); } catch (e) { return null; }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// ============================================================================
// Tutor & Counselor session handler (same pattern as Profile Builder)
// ============================================================================
function updateTutorSession(ass, data, u, loc, now) {
  let sheet = ass.getSheetByName(ANALYTICS_TABS.TUTOR);
  if (!sheet) {
    sheet = ass.insertSheet(ANALYTICS_TABS.TUTOR);
    sheet.appendRow(ANALYTICS_TUTOR_HEADERS);
    sheet.getRange(1, 1, 1, ANALYTICS_TUTOR_HEADERS.length).setFontWeight('bold').setBackground('#f5c518');
    sheet.setFrozenRows(1);
  }

  const email = u.email || '';
  const eventType = data.eventType || '';
  const extra = parseExtra(data.extraData);
  const rows = sheet.getDataRange().getValues();

  // Find existing row for this user (most recent, within 5-min gap)
  let existingRow = -1;
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][3] === email) {
      const rowTime = new Date(rows[i][0]);
      if ((now - rowTime) < 5 * 60 * 1000 || eventType !== 'tool_open') {
        existingRow = i + 1;
      }
      break;
    }
  }

  if (eventType === 'tool_open' && existingRow === -1) {
    const sessionId = rows.filter(r => r[3] === email).length + 1;
    sheet.appendRow([
      now.toISOString(), sessionId, u.name || '', email,
      loc.city || '', loc.country_name || '',
      '', '',
    ]);
    return;
  }

  if (existingRow === -1) return;

  // Update filters
  if (eventType === 'tool_filter' && extra) {
    const criteria = extra.selected_criteria || [];
    if (criteria.length > 0) {
      sheet.getRange(existingRow, 7).setValue(criteria.join(', '));
    }
  }

  // Track provider clicks
  if (eventType === 'link_click') {
    const label = data.targetLabel || '';
    if (label) {
      const current = (sheet.getRange(existingRow, 8).getValue() || '').toString();
      const list = current ? current.split(', ') : [];
      if (!list.includes(label)) {
        list.push(label);
        sheet.getRange(existingRow, 8).setValue(list.join(', '));
      }
    }
  }
}
