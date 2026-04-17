/**
 * Boomer Counselor - Google Sheets backend
 *
 * This script receives user sign-in events from the website
 * and logs them to the bound Google Sheet.
 *
 * DEPLOY: Extensions > Apps Script, paste this, then Deploy > New Deployment
 * Type: Web App. Execute as: Me. Access: Anyone.
 * Copy the /exec URL and paste it into index.html as SHEETS_WEBHOOK_URL.
 */

const SHEET_NAMES = {
  USERS: 'Users',
  EVENTS: 'Events'
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // === USERS sheet (one row per unique user, updates last_seen) ===
    let usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
    if (!usersSheet) {
      usersSheet = ss.insertSheet(SHEET_NAMES.USERS);
      usersSheet.appendRow([
        'first_seen', 'last_seen', 'email', 'name', 'given_name',
        'family_name', 'picture', 'google_id', 'email_verified',
        'locale', 'sessions', 'tools_used', 'latest_tool', 'latest_referrer'
      ]);
      usersSheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#FDB515');
      usersSheet.setFrozenRows(1);
    }

    const u = data.user || {};
    const sel = data.selection || {};
    const meta = data.meta || {};
    const now = data.timestamp || new Date().toISOString();

    // Find existing user row by google_id
    const userIdCol = 8; // 1-indexed google_id
    const userData = usersSheet.getDataRange().getValues();
    let userRow = -1;
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][userIdCol - 1] === u.sub) {
        userRow = i + 1;
        break;
      }
    }

    if (userRow === -1) {
      // New user
      usersSheet.appendRow([
        now, now, u.email || '', u.name || '', u.given_name || '',
        u.family_name || '', u.picture || '', u.sub || '',
        u.email_verified || false, u.locale || '',
        1, sel.label || '', sel.label || '', meta.referrer || ''
      ]);
    } else {
      // Update last_seen, increment sessions, append tool
      const existing = userData[userRow - 1];
      const sessions = (parseInt(existing[10]) || 1) + 1;
      const toolsUsed = existing[11] || '';
      const newToolsUsed = toolsUsed
        ? (toolsUsed.split(', ').indexOf(sel.label) === -1 ? toolsUsed + ', ' + sel.label : toolsUsed)
        : sel.label;
      usersSheet.getRange(userRow, 2).setValue(now); // last_seen
      usersSheet.getRange(userRow, 11).setValue(sessions);
      usersSheet.getRange(userRow, 12).setValue(newToolsUsed);
      usersSheet.getRange(userRow, 13).setValue(sel.label || '');
      usersSheet.getRange(userRow, 14).setValue(meta.referrer || '');
    }

    // === EVENTS sheet (one row per click, full log) ===
    let eventsSheet = ss.getSheetByName(SHEET_NAMES.EVENTS);
    if (!eventsSheet) {
      eventsSheet = ss.insertSheet(SHEET_NAMES.EVENTS);
      eventsSheet.appendRow([
        'timestamp', 'email', 'name', 'google_id', 'tool_id',
        'tool_label', 'tool_url', 'tool_status', 'referrer',
        'user_agent', 'language', 'screen', 'page_url'
      ]);
      eventsSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#FDB515');
      eventsSheet.setFrozenRows(1);
    }
    eventsSheet.appendRow([
      now, u.email || '', u.name || '', u.sub || '',
      sel.id || '', sel.label || '', sel.url || '', sel.status || '',
      meta.referrer || '', meta.user_agent || '', meta.language || '',
      meta.screen || '', meta.page_url || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Boomer Counselor backend alive' }))
    .setMimeType(ContentService.MimeType.JSON);
}
