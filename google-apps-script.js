/**
 * BrickByBrick - Complete Google Apps Script Automation
 * Order Management, Live Sheet Tracking & Automated Customer Email Notifications
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets (create or use sheet named "BrickByBrick Orders").
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code and paste the entire contents of this file.
 * 4. Replace GOOGLE_CLIENT_ID and SHEET_NAME (if different).
 * 5. Run setupSheet() once to initialize sheet headers (Columns A to T),
 *    data validation dropdown on Column Q, column widths, and formatting.
 * 6. Run createStatusChangeTrigger() once from the Apps Script function dropdown.
 *    This sets up the installable onEdit trigger for automated status emails.
 * 7. Click Deploy > New deployment:
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. Copy the Web App URL and paste it into products.js.
 */

// ====================================================================
// CONFIGURATION
// ====================================================================
const GOOGLE_CLIENT_ID = "444186995295-ihrvod29i5im5hvv4v2soivv886nd92a.apps.googleusercontent.com";
const SHEET_NAME = "BrickByBrick Orders";

// All valid order statuses
const ORDER_STATUSES = [
  "Pending",
  "Order Confirmed",
  "Preparing",
  "Ready for Delivery",
  "On the Way",
  "Received",
  "Cancelled"
];

// Server-side authoritative product pricing catalog
// FRONTEND PRICES ARE NEVER TRUSTED BLINDLY
const PRODUCTS = {
  alien: 899,
  cinnamoroll: 899,
  cinnamonroll: 899,
  crab: 899,
  goofy: 899,
  hellokitty: 899,
  kuromi: 899,
  lotso: 899,
  luigi: 899,
  mario: 899,
  melody: 899,
  mickeymouse: 899,
  minniemouse: 899,
  patrick: 899,
  pikachu: 899,
  pluto: 899,
  png: 899,
  pochaco: 899,
  pochacco: 899,
  psyduck: 899,
  spongebob: 899,
  mystery: 899,
  squidward: 899,
  stitch: 899
};

// Sheet Column Headers (Columns A through T)
const SHEET_HEADERS = [
  "Order ID",              // A (Col 1)
  "Date",                  // B (Col 2)
  "Customer Name",         // C (Col 3)
  "Customer Email",        // D (Col 4)
  "Phone",                 // E (Col 5)
  "Product(s)",            // F (Col 6)
  "Quantity",              // G (Col 7)
  "Subtotal",              // H (Col 8)
  "Shipping Fee",          // I (Col 9)
  "Total",                 // J (Col 10)
  "Payment Method",        // K (Col 11)
  "Street",                // L (Col 12)
  "Barangay",              // M (Col 13)
  "City",                  // N (Col 14)
  "Province",              // O (Col 15)
  "Postal Code",           // P (Col 16)
  "Order Status",          // Q (Col 17) - Dropdown
  "Google User ID",        // R (Col 18)
  "Last Email Status",     // S (Col 19) - Duplicate prevention
  "Status Updated At"      // T (Col 20) - Timestamp of last status change
];

// ====================================================================
// SECURITY & SANITIZATION HELPERS
// ====================================================================

/**
 * Prevent spreadsheet formula injection (=, +, -, @, \t, \r)
 * and enforce maximum length limits.
 */
function sanitizeCell(val, maxLength = 250) {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();

  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }

  return str;
}

/**
 * Escape customer-controlled strings before inserting into HTML emails
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Currency formatter for PHP
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return "₱" + num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Verify Google ID Token via Google's OAuth2 tokeninfo endpoint
 */
function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return null;
  }

  try {
    const url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken);
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (response.getResponseCode() !== 200) {
      Logger.log("Token validation failed with code: " + response.getResponseCode());
      return null;
    }

    const payload = JSON.parse(response.getContentText());

    if (GOOGLE_CLIENT_ID && !/YOUR_GOOGLE|PASTE_YOUR|REPLACE_ME/i.test(GOOGLE_CLIENT_ID)) {
      if (payload.aud !== GOOGLE_CLIENT_ID) {
        Logger.log("Audience mismatch: " + payload.aud + " vs " + GOOGLE_CLIENT_ID);
        return null;
      }
    }

    return {
      email: payload.email,
      name: payload.name || payload.given_name || "Customer",
      sub: payload.sub
    };
  } catch (err) {
    Logger.log("Error verifying Google ID token: " + err.toString());
    return null;
  }
}

/**
 * Helper to get or create the orders sheet
 */
function getOrdersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupSheet();
  }
  return sheet;
}

// ====================================================================
// SHEET INITIALIZATION & FORMATTING (setupSheet)
// ====================================================================

/**
 * Run this function once from Apps Script editor to style the sheet,
 * set headers A:T, and configure the Status dropdown on Q2:Q.
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Set headers in Row 1 (Columns A to T)
  const headerRange = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
  headerRange.setValues([SHEET_HEADERS]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#182233");
  headerRange.setFontColor("#FFF8ED");
  headerRange.setFontFamily("Arial");
  headerRange.setHorizontalAlignment("center");

  // Freeze header row
  sheet.setFrozenRows(1);

  // Set column widths
  sheet.setColumnWidth(1, 190); // A: Order ID
  sheet.setColumnWidth(2, 170); // B: Date
  sheet.setColumnWidth(3, 160); // C: Customer Name
  sheet.setColumnWidth(4, 210); // D: Customer Email
  sheet.setColumnWidth(5, 140); // E: Phone
  sheet.setColumnWidth(6, 230); // F: Product(s)
  sheet.setColumnWidth(7, 80);  // G: Quantity
  sheet.setColumnWidth(8, 110); // H: Subtotal
  sheet.setColumnWidth(9, 110); // I: Shipping Fee
  sheet.setColumnWidth(10, 110);// J: Total
  sheet.setColumnWidth(11, 150);// K: Payment Method
  sheet.setColumnWidth(12, 180);// L: Street
  sheet.setColumnWidth(13, 130);// M: Barangay
  sheet.setColumnWidth(14, 130);// N: City
  sheet.setColumnWidth(15, 130);// O: Province
  sheet.setColumnWidth(16, 100);// P: Postal Code
  sheet.setColumnWidth(17, 160);// Q: Order Status (Dropdown)
  sheet.setColumnWidth(18, 190);// R: Google User ID
  sheet.setColumnWidth(19, 160);// S: Last Email Status
  sheet.setColumnWidth(20, 180);// T: Status Updated At

  // Format currency columns (H, I, J)
  sheet.getRange("H2:J").setNumberFormat("₱#,##0.00");

  // Format date columns (B, T)
  sheet.getRange("B2:B").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange("T2:T").setNumberFormat("yyyy-mm-dd hh:mm:ss");

  // Apply Google Sheets Data Validation Dropdown to Q2:Q
  // Reject invalid entries
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ORDER_STATUSES, true)
    .setAllowInvalid(false)
    .setHelpText("Please choose a valid BrickByBrick order status from the dropdown.")
    .build();

  sheet.getRange("Q2:Q").setDataValidation(rule);

  Logger.log("Sheet '" + SHEET_NAME + "' setup completed with columns A:T and Column Q dropdown!");
}

// ====================================================================
// TRIGGER SETUP (createStatusChangeTrigger)
// ====================================================================

/**
 * Run this function once to install the onEdit trigger for handleOrderStatusChange.
 * Inspects ScriptApp.getProjectTriggers() to avoid duplicate triggers.
 */
function createStatusChangeTrigger() {
  const triggerHandler = "handleOrderStatusChange";
  const triggers = ScriptApp.getProjectTriggers();

  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === triggerHandler) {
      Logger.log("Trigger for '" + triggerHandler + "' already exists. No duplicate created.");
      return;
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger(triggerHandler)
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  Logger.log("Successfully created installable onEdit trigger for '" + triggerHandler + "'!");
}

// ====================================================================
// STATUS CHANGE TRIGGER HANDLER (handleOrderStatusChange)
// ====================================================================

/**
 * Installable onEdit trigger function.
 * Runs whenever the administrator edits the sheet.
 * Only processes edits to Column Q (column 17) for non-header rows.
 */
function handleOrderStatusChange(e) {
  try {
    if (!e || !e.range) return;

    const range = e.range;
    const sheet = range.getSheet();

    // 1. Only act on the BrickByBrick Orders sheet
    if (sheet.getName() !== SHEET_NAME) return;

    const editedCol = range.getColumn();
    const editedRow = range.getRow();

    // 2. Only run when edited column is Q (17) and row > 1 (ignore header)
    if (editedCol !== 17 || editedRow <= 1) return;

    // Read full row data across columns A to T (cols 1 to 20)
    const rowValues = sheet.getRange(editedRow, 1, 1, 20).getValues()[0];

    const orderId = String(rowValues[0] || "").trim();         // Col A (1)
    const customerName = String(rowValues[2] || "").trim();    // Col C (3)
    const customerEmail = String(rowValues[3] || "").trim();   // Col D (4)
    const phone = String(rowValues[4] || "").trim();           // Col E (5)
    const products = String(rowValues[5] || "").trim();        // Col F (6)
    const quantity = Number(rowValues[6]) || 1;                // Col G (7)
    const subtotal = Number(rowValues[7]) || 0;                // Col H (8)
    const total = Number(rowValues[9]) || 0;                   // Col J (10)
    const paymentMethod = String(rowValues[10] || "Cash on Delivery").trim(); // Col K (11)
    const street = String(rowValues[11] || "").trim();         // Col L (12)
    const barangay = String(rowValues[12] || "").trim();       // Col M (13)
    const city = String(rowValues[13] || "").trim();           // Col N (14)
    const province = String(rowValues[14] || "").trim();       // Col O (15)
    const postalCode = String(rowValues[15] || "").trim();     // Col P (16)
    const newStatus = String(rowValues[16] || "").trim();      // Col Q (17)
    const lastEmailStatus = String(rowValues[18] || "").trim();// Col S (19)

    // Ignore if orderId or new status is blank
    if (!orderId || !newStatus) return;

    // 3. DUPLICATE PROTECTION:
    // If New Status === Last Email Status, DO NOT send another email!
    if (newStatus === lastEmailStatus) {
      Logger.log("Duplicate status edit detected for " + orderId + " (" + newStatus + "). Email skipped.");
      return;
    }

    // Check if newStatus is valid
    if (ORDER_STATUSES.indexOf(newStatus) === -1) {
      Logger.log("Unknown status '" + newStatus + "' for " + orderId + ". Email skipped.");
      return;
    }

    // Validate recipient email
    if (!customerEmail || customerEmail.indexOf("@") === -1) {
      Logger.log("Invalid email address for order " + orderId + ". Cannot send status email.");
      return;
    }

    const orderObj = {
      orderId: orderId,
      name: customerName,
      email: customerEmail,
      phone: phone,
      products: products,
      quantity: quantity,
      subtotal: subtotal,
      total: total,
      paymentMethod: paymentMethod,
      street: street,
      barangay: barangay,
      city: city,
      province: province,
      postalCode: postalCode,
      status: newStatus
    };

    // 4. Send the status-specific notification email
    sendOrderStatusEmail(orderObj);

    // 5. UPDATE COLUMNS S & T ONLY AFTER EMAIL SUCCEEDS:
    // Column S (19): Last Email Status
    // Column T (20): Status Updated At
    const nowTimestamp = new Date();
    sheet.getRange(editedRow, 19).setValue(newStatus);
    sheet.getRange(editedRow, 20).setValue(nowTimestamp);

    Logger.log("Successfully sent status email (" + newStatus + ") for order " + orderId + ". S and T updated.");

  } catch (err) {
    Logger.log("Error in handleOrderStatusChange: " + err.toString());
  }
}

// ====================================================================
// WEB APP POST HANDLER - NEW ORDER CREATION (doPost)
// ====================================================================

function doPost(e) {
  const result = { success: false, message: "" };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No order payload received.");
    }

    const order = JSON.parse(e.postData.contents);

    // 1. Verify Order ID format (BBB-YYYYMMDD-XXXXXX)
    if (!order.orderId || !/^BBB-\d{8}-[A-Za-z0-9]{4,10}$/.test(order.orderId)) {
      throw new Error("Invalid or missing Order ID.");
    }

    // 2. Validate Cart Items
    if (!Array.isArray(order.items) || order.items.length === 0) {
      throw new Error("Cart cannot be empty.");
    }

    // 3. Verify Google Identity
    let verifiedUser = null;
    if (order.idToken) {
      verifiedUser = verifyGoogleToken(order.idToken);
    }

    const customerEmail = verifiedUser ? verifiedUser.email : sanitizeCell(order.customer?.email, 120);
    const customerName = verifiedUser ? verifiedUser.name : sanitizeCell(order.customer?.name, 100);
    const googleSub = verifiedUser ? verifiedUser.sub : sanitizeCell(order.customer?.googleSub, 100);

    if (!customerEmail || customerEmail.indexOf("@") === -1) {
      throw new Error("Valid customer email is required.");
    }

    // 4. Validate Shipping Information
    const shipping = order.shipping || {};
    const phone = sanitizeCell(shipping.phone, 30);
    const street = sanitizeCell(shipping.street, 250);
    const barangay = sanitizeCell(shipping.barangay, 100);
    const city = sanitizeCell(shipping.city, 100);
    const province = sanitizeCell(shipping.province, 100);
    const postalCode = sanitizeCell(shipping.postalCode, 20);

    if (!phone || !street || !barangay || !city || !province || !postalCode) {
      throw new Error("All shipping address fields are required.");
    }

    // 5. SERVER-SIDE PRICE RECALCULATION
    let authoritativeSubtotal = 0;
    let totalItemsCount = 0;
    const itemDescriptions = [];

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const rawKey = String(item.character || item.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

      const unitPrice = PRODUCTS[rawKey] !== undefined ? PRODUCTS[rawKey] : 899;
      const itemSubtotal = unitPrice * qty;

      authoritativeSubtotal += itemSubtotal;
      totalItemsCount += qty;

      const charName = sanitizeCell(item.character || rawKey, 50);
      itemDescriptions.push(charName + " × " + qty);
    }

    const shippingFee = 0;
    const authoritativeTotal = authoritativeSubtotal + shippingFee;
    const paymentMethod = sanitizeCell(order.paymentMethod || "Cash on Delivery", 50);
    const orderStatus = "Pending";
    const dateStr = order.timestamp || new Date().toISOString();
    const nowTimestamp = new Date();

    // 6. Append Row to Google Sheet (Columns A through T)
    // S (Last Email Status) initially blank until email succeeds!
    // T (Status Updated At) set to current timestamp
    const sheet = getOrdersSheet();
    const newRow = [
      order.orderId,                            // A: Order ID
      dateStr,                                  // B: Date
      customerName,                             // C: Customer Name
      customerEmail,                            // D: Customer Email
      phone,                                    // E: Phone
      itemDescriptions.join(", "),              // F: Product(s)
      totalItemsCount,                          // G: Quantity
      authoritativeSubtotal,                    // H: Subtotal
      shippingFee,                              // I: Shipping Fee
      authoritativeTotal,                       // J: Total
      paymentMethod,                            // K: Payment Method
      street,                                   // L: Street
      barangay,                                 // M: Barangay
      city,                                     // N: City
      province,                                 // O: Province
      postalCode,                               // P: Postal Code
      orderStatus,                              // Q: Order Status ("Pending")
      googleSub,                                // R: Google User ID
      "",                                       // S: Last Email Status (Pending after send)
      nowTimestamp                              // T: Status Updated At
    ];

    sheet.appendRow(newRow);
    const newRowIndex = sheet.getLastRow();

    // 7. Send Initial Pending Order Confirmation Email
    // The order remains created if the email fails!
    try {
      sendOrderConfirmationEmail({
        orderId: order.orderId,
        name: customerName,
        email: customerEmail,
        phone: phone,
        products: itemDescriptions.join(", "),
        quantity: totalItemsCount,
        subtotal: authoritativeSubtotal,
        total: authoritativeTotal,
        paymentMethod: paymentMethod,
        street: street,
        barangay: barangay,
        city: city,
        province: province,
        postalCode: postalCode,
        status: "Pending"
      });

      // 8. Set Column S = "Pending" ONLY AFTER attempting initial email successfully
      sheet.getRange(newRowIndex, 19).setValue("Pending");
      Logger.log("Pending confirmation email sent successfully for order " + order.orderId);

    } catch (mailErr) {
      Logger.log("Warning: Initial Pending email failed: " + mailErr.toString());
      // Do NOT roll back or delete the order! Row remains created.
    }

    result.success = true;
    result.orderId = order.orderId;
    result.total = authoritativeTotal;
    result.status = orderStatus;
    result.message = "Order successfully created.";

  } catch (error) {
    Logger.log("Order processing error: " + error.toString());
    result.success = false;
    result.message = error.message || "Failed to process order.";
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
// WEB APP GET HANDLER - ORDER RETRIEVAL (doGet)
// ====================================================================

function doGet(e) {
  const result = { success: false, orders: [] };

  try {
    const action = e?.parameter?.action;

    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "BrickByBrick Orders API is running!",
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getOrders") {
      const emailParam = e?.parameter?.email;
      const idTokenParam = e?.parameter?.idToken;

      let verifiedEmail = null;
      if (idTokenParam) {
        const verified = verifyGoogleToken(idTokenParam);
        if (verified) verifiedEmail = verified.email;
      }

      const targetEmail = (verifiedEmail || emailParam || "").toLowerCase().trim();
      if (!targetEmail) {
        throw new Error("Customer email or valid authentication token required.");
      }

      const sheet = getOrdersSheet();
      const rows = sheet.getDataRange().getValues();

      if (rows.length > 1) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowEmail = String(row[3] || "").toLowerCase().trim();

          if (rowEmail === targetEmail) {
            result.orders.push({
              orderId: String(row[0] || ""),
              date: String(row[1] || ""),
              customerName: String(row[2] || ""),
              customerEmail: String(row[3] || ""),
              phone: String(row[4] || ""),
              products: String(row[5] || ""),
              quantity: Number(row[6]) || 1,
              subtotal: Number(row[7]) || 0,
              shippingFee: Number(row[8]) || 0,
              total: Number(row[9]) || 0,
              paymentMethod: String(row[10] || "Cash on Delivery"),
              street: String(row[11] || ""),
              barangay: String(row[12] || ""),
              city: String(row[13] || ""),
              province: String(row[14] || ""),
              postalCode: String(row[15] || ""),
              status: String(row[16] || "Pending"),
              lastEmailStatus: String(row[18] || ""),
              statusUpdatedAt: String(row[19] || "")
            });
          }
        }
      }

      result.orders.reverse();
      result.success = true;
    } else {
      result.message = "Unknown action requested.";
    }

  } catch (err) {
    Logger.log("doGet error: " + err.toString());
    result.success = false;
    result.message = err.message || "Failed to retrieve orders.";
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
// REUSABLE HTML EMAIL TEMPLATE & NOTIFICATION ENGINE
// ====================================================================

/**
 * Generates the unified, branded BrickByBrick HTML email.
 * Reusable for all statuses with zero duplicated templates.
 */
function buildOrderEmailHtml(order, headline, messageParagraphs, statusBadge) {
  const firstName = escapeHtml((order.name || "").split(" ")[0] || "Builder");
  const orderId = escapeHtml(order.orderId);
  const products = escapeHtml(order.products);
  const quantity = escapeHtml(order.quantity);
  const subtotalFormatted = formatCurrency(order.subtotal);
  const totalFormatted = formatCurrency(order.total);
  const paymentMethod = escapeHtml(order.paymentMethod || "Cash on Delivery");
  const status = escapeHtml(statusBadge || order.status || "Pending");

  const addressLines = [
    order.street,
    order.barangay,
    order.city,
    order.province,
    order.postalCode
  ].filter(Boolean).map(escapeHtml).join("<br>");

  // Color mappings for pixel status badge
  let badgeBg = "#FFF3CD";
  let badgeColor = "#856404";
  if (status === "Order Confirmed") { badgeBg = "#D1ECF1"; badgeColor = "#0C5460"; }
  else if (status === "Preparing") { badgeBg = "#E2E3E5"; badgeColor = "#383D41"; }
  else if (status === "Ready for Delivery") { badgeBg = "#D4EDDA"; badgeColor = "#155724"; }
  else if (status === "On the Way") { badgeBg = "#CCE5FF"; badgeColor = "#004085"; }
  else if (status === "Received") { badgeBg = "#D4EDDA"; badgeColor = "#155724"; }
  else if (status === "Cancelled") { badgeBg = "#F8D7DA"; badgeColor = "#721C24"; }

  let paragraphsHtml = "";
  if (Array.isArray(messageParagraphs)) {
    paragraphsHtml = messageParagraphs.map(p => `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #182233;">${p}</p>`).join("");
  } else {
    paragraphsHtml = `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #182233;">${messageParagraphs}</p>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8ED; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #182233;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF8ED; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border: 3px solid #182233; box-shadow: 6px 6px 0 #D85A12; border-radius: 8px; overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #182233; padding: 24px 28px; text-align: center; border-bottom: 3px solid #D85A12;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #D85A12; color: #FFF8ED; font-weight: 900; font-size: 16px; padding: 6px 12px; border: 2px solid #FFF8ED; border-radius: 4px; letter-spacing: 1px;">
                    B
                  </td>
                  <td style="padding-left: 12px; font-family: 'Courier New', monospace, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #FFF8ED;">
                    BRICK<span style="color: #F4BC2A;">BY</span>BRICK
                  </td>
                </tr>
              </table>
              <div style="font-family: 'Courier New', monospace, sans-serif; font-size: 9px; letter-spacing: 1.5px; color: #F4BC2A; margin-top: 8px; text-transform: uppercase;">
                Build your world, brick by brick.
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              
              <!-- Headline & Status Badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 8px 0; font-family: 'Courier New', monospace, sans-serif; font-size: 18px; color: #D85A12; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${headline}
                    </h1>
                    <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid #182233;">
                      ● Current Status: ${status}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Greeting & Paragraphs -->
              <div style="margin-bottom: 24px;">
                ${paragraphsHtml}
              </div>

              <!-- Order Details Summary Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFF8ED; border: 2px solid #E7D9C6; border-radius: 6px; padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td colspan="2" style="font-family: 'Courier New', monospace, sans-serif; font-size: 12px; font-weight: bold; color: #182233; padding-bottom: 12px; border-bottom: 1px dashed #E7D9C6;">
                    ORDER DETAILS
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; font-size: 13px; color: #667080;">Order Number:</td>
                  <td style="padding-top: 12px; font-size: 13px; font-weight: bold; color: #D85A12; text-align: right; font-family: 'Courier New', monospace;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 13px; color: #667080;">Items:</td>
                  <td style="padding-top: 8px; font-size: 13px; font-weight: bold; color: #182233; text-align: right;">${products}</td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 13px; color: #667080;">Quantity:</td>
                  <td style="padding-top: 8px; font-size: 13px; font-weight: bold; color: #182233; text-align: right;">${quantity}</td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 13px; color: #667080;">Subtotal:</td>
                  <td style="padding-top: 8px; font-size: 13px; font-weight: bold; color: #182233; text-align: right;">${subtotalFormatted}</td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 13px; color: #667080;">Shipping:</td>
                  <td style="padding-top: 8px; font-size: 13px; font-weight: bold; color: #2E9E5B; text-align: right;">FREE</td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; font-size: 13px; color: #667080;">Payment Method:</td>
                  <td style="padding-top: 8px; font-size: 13px; font-weight: bold; color: #182233; text-align: right;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 12px; border-top: 1px dashed #E7D9C6;"></td>
                </tr>
                <tr>
                  <td style="font-size: 14px; font-weight: bold; color: #182233;">Total Amount:</td>
                  <td style="font-size: 16px; font-weight: 900; color: #D85A12; text-align: right; font-family: 'Courier New', monospace;">${totalFormatted}</td>
                </tr>
              </table>

              <!-- Delivery Address Box -->
              ${addressLines ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E7D9C6; border-radius: 6px; padding: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 11px; font-weight: bold; color: #667080; text-transform: uppercase; padding-bottom: 6px;">
                    Delivery Address
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #182233;">
                    ${addressLines}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Notification Guarantee Note -->
              <p style="margin: 0; font-size: 12px; color: #667080; text-align: center;">
                We'll send you another email whenever your order status changes.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFF8ED; border-top: 2px solid #E7D9C6; padding: 20px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-family: 'Courier New', monospace; font-size: 11px; font-weight: bold; color: #182233;">
                BRICKBYBRICK COLLECTIBLES
              </p>
              <p style="margin: 0; font-size: 11px; color: #667080;">
                Build your world, brick by brick. • <a href="https://brickbybrick-dun.vercel.app/orders.html" style="color: #D85A12; text-decoration: underline;">View My Orders</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Returns subject, headline, and message paragraphs for any order status.
 */
function getOrderStatusEmailContent(status, order) {
  const firstName = (order.name || "").split(" ")[0] || "Builder";
  const orderId = order.orderId;

  switch (status) {
    case "Order Confirmed":
      return {
        subject: "BrickByBrick Order Confirmed - " + orderId,
        headline: "YOUR ORDER IS CONFIRMED!",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Great news!",
          "Your BrickByBrick order has been confirmed.",
          "We're getting everything ready for you.",
          "We'll notify you again when your order moves to the next stage."
        ]
      };

    case "Preparing":
      return {
        subject: "We're Preparing Your BrickByBrick Order - " + orderId,
        headline: "WE'RE PREPARING YOUR ORDER!",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Your BrickByBrick order is now being prepared.",
          "Our sorting workshop is packing your numbered brick bags with precision.",
          "We'll notify you again when it's ready for delivery."
        ]
      };

    case "Ready for Delivery":
      return {
        subject: "Your BrickByBrick Order Is Ready for Delivery - " + orderId,
        headline: "READY FOR DELIVERY!",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Your BrickByBrick order has been packed and is ready for delivery.",
          "Your parcel has been handed over to our delivery courier hub.",
          "We'll notify you again once your order is on the way."
        ]
      };

    case "On the Way":
      return {
        subject: "Your BrickByBrick Order Is On the Way! - " + orderId,
        headline: "YOUR ORDER IS ON THE WAY!",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Your BrickByBrick order is now on the way to you!",
          "Please make sure someone is available to receive the package.",
          "If Cash on Delivery applies, please prepare the exact payment amount.",
          "The courier rider will contact you upon arrival."
        ]
      };

    case "Received":
      return {
        subject: "BrickByBrick Order Received - " + orderId,
        headline: "ORDER RECEIVED!",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Your BrickByBrick order has been marked as received.",
          "Thank you for shopping with BrickByBrick.",
          "We hope you enjoy your build!",
          "Build your world, brick by brick."
        ]
      };

    case "Cancelled":
      return {
        subject: "BrickByBrick Order Cancelled - " + orderId,
        headline: "ORDER CANCELLED",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Your BrickByBrick order has been marked as cancelled.",
          "If you believe this was a mistake, please contact BrickByBrick right away at hello@brickbybrick.ph."
        ]
      };

    case "Pending":
    default:
      return {
        subject: "BrickByBrick Order Received - " + orderId,
        headline: "WE RECEIVED YOUR ORDER!",
        paragraphs: [
          `Hi ${escapeHtml(firstName)},`,
          "Thanks for ordering from BrickByBrick!",
          "We've received your order and it is currently waiting for confirmation.",
          "Our team will review and begin sorting your set soon.",
          "We'll send you another email whenever your order status changes."
        ]
      };
  }
}

/**
 * Sends initial Pending confirmation email immediately upon order creation.
 */
function sendOrderConfirmationEmail(order) {
  const content = getOrderStatusEmailContent("Pending", order);
  const htmlBody = buildOrderEmailHtml(order, content.headline, content.paragraphs, "Pending");

  const plainText = 
    `Hi ${order.name},\n\n` +
    `Thanks for ordering from BrickByBrick!\n` +
    `We've received your order and it is currently waiting for confirmation.\n\n` +
    `Order Number: ${order.orderId}\n` +
    `Items: ${order.products}\n` +
    `Quantity: ${order.quantity}\n` +
    `Subtotal: ${formatCurrency(order.subtotal)}\n` +
    `Shipping: FREE\n` +
    `Total: ${formatCurrency(order.total)}\n` +
    `Payment Method: ${order.paymentMethod}\n` +
    `Current Status: Pending\n\n` +
    `Delivery Address:\n${order.street}, ${order.barangay}, ${order.city}, ${order.province} ${order.postalCode}\n\n` +
    `We'll send you another email whenever your order status changes.\n\n` +
    `Build your world, brick by brick.`;

  MailApp.sendEmail({
    to: order.email,
    subject: content.subject,
    body: plainText,
    htmlBody: htmlBody
  });
}

/**
 * Sends notification email when order status changes in Column Q.
 */
function sendOrderStatusEmail(order) {
  const content = getOrderStatusEmailContent(order.status, order);
  const htmlBody = buildOrderEmailHtml(order, content.headline, content.paragraphs, order.status);

  const plainText = 
    `${content.headline}\n\n` +
    content.paragraphs.join("\n\n") + "\n\n" +
    `Order Number: ${order.orderId}\n` +
    `Items: ${order.products}\n` +
    `Total: ${formatCurrency(order.total)}\n` +
    `Current Status: ${order.status}\n\n` +
    `Build your world, brick by brick.`;

  MailApp.sendEmail({
    to: order.email,
    subject: content.subject,
    body: plainText,
    htmlBody: htmlBody
  });
}
