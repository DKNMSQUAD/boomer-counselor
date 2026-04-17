/**
 * Boomer Counselor - Google Sheets backend (v2)
 *
 * Receives sign-in + tool events via POST and logs to two sheets:
 *  - Users:  one row per unique user, updated on each visit (counts, last_seen, etc.)
 *  - Events: one row per event (sign_in, tool_open, tool_filter, link_click,
 *            college_shortlist_add/remove, college_report_view, college_purchase)
 *
 * DEPLOY: Extensions > Apps Script, paste this whole file, Save, then
 *   Deploy > Manage deployments > click pencil on active deployment > New version > Deploy
 * The /exec URL must NOT change. Copy it into index.html as SHEETS_WEBHOOK_URL
 * (only needed if redeploying for the first time).
 */

const SHEET_NAMES = {
  USERS: 'Users',
  EVENTS: 'Events',
};

// 27 columns for Events sheet - matches the richer payload the hub now sends
const EVENT_HEADERS = [
  'timestamp',
  'event_type',      // sign_in | tool_open | tool_filter | link_click | college_shortlist_add | college_shortlist_remove | college_report_view | college_purchase
  'tool',            // careers | profile | college-search (empty for sign_in)
  'action',          // open | apply | add | remove | click | complete etc.
  'target_id',
  'target_label',
  'extra_data',      // JSON string of tool-specific payload
  'email',
  'name',
  'given_name',
  'google_id',
  'picture_url',
  'location_ip',
  'location_city',
  'location_region',
  'location_country',
  'location_country_code',
  'location_postal',
  'location_tz',
  'location_org',
  'location_lat',
  'location_lng',
  'user_agent',
  'device_type',
  'language',
  'browser_tz',
  'screen',
  'viewport',
  'referrer',
  'page_url',
];

const USER_HEADERS = [
  'first_seen',
  'last_seen',
  'email',
  'name',
  'given_name',
  'family_name',
  'picture',
  'google_id',
  'email_verified',
  'locale',
  'total_events',
  'tools_used',
  'latest_tool',
  'latest_event',
  'shortlist_adds',
  'shortlist_removes',
  'link_clicks',
  'filters_applied',
  'purchases',
  'city',
  'region',
  'country',
  'latest_ip',
  'latest_referrer',
  'latest_user_agent',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
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

    // ========== EVENTS sheet (append-only log) ==========
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
      now,
      eventType,
      tool,
      action,
      targetId,
      targetLabel,
      typeof extraData === 'string' ? extraData : JSON.stringify(extraData),
      u.email || '',
      u.name || '',
      u.given_name || '',
      u.sub || '',
      u.picture || '',
      loc.ip || '',
      loc.city || '',
      loc.region || '',
      loc.country_name || '',
      loc.country_code || '',
      loc.postal || '',
      loc.timezone || '',
      loc.org || '',
      loc.latitude || '',
      loc.longitude || '',
      meta.user_agent || '',
      meta.device_type || '',
      meta.language || '',
      meta.timezone || '',
      meta.screen || '',
      meta.viewport || '',
      meta.referrer || '',
      meta.page_url || '',
    ]);

    // ========== USERS sheet (one row per unique user, updated each event) ==========
    let usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
    if (!usersSheet) {
      usersSheet = ss.insertSheet(SHEET_NAMES.USERS);
      usersSheet.appendRow(USER_HEADERS);
      usersSheet.getRange(1, 1, 1, USER_HEADERS.length)
        .setFontWeight('bold').setBackground('#FDB515');
      usersSheet.setFrozenRows(1);
    }

    // Find existing user by google_id (column 8, 0-index 7)
    const userData = usersSheet.getDataRange().getValues();
    let userRow = -1;
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][7] === u.sub) { userRow = i + 1; break; }
    }

    if (userRow === -1) {
      // First time seeing this user
      const row = new Array(USER_HEADERS.length).fill('');
      row[0] = now;                          // first_seen
      row[1] = now;                          // last_seen
      row[2] = u.email || '';
      row[3] = u.name || '';
      row[4] = u.given_name || '';
      row[5] = u.family_name || '';
      row[6] = u.picture || '';
      row[7] = u.sub || '';
      row[8] = u.email_verified || false;
      row[9] = u.locale || '';
      row[10] = 1;                           // total_events
      row[11] = tool || '';                  // tools_used
      row[12] = tool || '';                  // latest_tool
      row[13] = eventType;                   // latest_event
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
        ? (toolsUsed ? toolsUsed + ', ' + tool : tool)
        : toolsUsed;
      const slAdds = (parseInt(existing[14]) || 0) + (eventType === 'college_shortlist_add' ? 1 : 0);
      const slRem  = (parseInt(existing[15]) || 0) + (eventType === 'college_shortlist_remove' ? 1 : 0);
      const clicks = (parseInt(existing[16]) || 0) + (eventType === 'link_click' ? 1 : 0);
      const fApp   = (parseInt(existing[17]) || 0) + (eventType === 'tool_filter' ? 1 : 0);
      const purc   = (parseInt(existing[18]) || 0) + (eventType === 'college_purchase' ? 1 : 0);

      usersSheet.getRange(userRow, 2).setValue(now);            // last_seen
      usersSheet.getRange(userRow, 11).setValue(totalEvents);
      usersSheet.getRange(userRow, 12).setValue(newToolsUsed);
      if (tool) usersSheet.getRange(userRow, 13).setValue(tool); // latest_tool
      usersSheet.getRange(userRow, 14).setValue(eventType);
      usersSheet.getRange(userRow, 15).setValue(slAdds);
      usersSheet.getRange(userRow, 16).setValue(slRem);
      usersSheet.getRange(userRow, 17).setValue(clicks);
      usersSheet.getRange(userRow, 18).setValue(fApp);
      usersSheet.getRange(userRow, 19).setValue(purc);
      if (loc.city)    usersSheet.getRange(userRow, 20).setValue(loc.city);
      if (loc.region)  usersSheet.getRange(userRow, 21).setValue(loc.region);
      if (loc.country_name) usersSheet.getRange(userRow, 22).setValue(loc.country_name);
      if (loc.ip)      usersSheet.getRange(userRow, 23).setValue(loc.ip);
      if (meta.referrer)   usersSheet.getRange(userRow, 24).setValue(meta.referrer);
      if (meta.user_agent) usersSheet.getRange(userRow, 25).setValue(meta.user_agent);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', eventType }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Boomer Counselor backend v2 alive' }))
    .setMimeType(ContentService.MimeType.JSON);
}
