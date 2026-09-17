# BrickByBrick — Setup & Deployment Guide

This guide walks you through setting up Google Cloud OAuth 2.0 (Google Identity Services) and Google Sheets automation with Google Apps Script for **BrickByBrick**.

---

## Architecture Overview

```
Customer Browser
      ↓
Google Identity Services (GIS)
      ↓
BrickByBrick JavaScript Frontend (Static on Vercel)
      ↓
HTTPS POST (JSON Payload via text/plain)
      ↓
Google Apps Script Web App (script.google.com)
      ↓
Google Sheets ("BrickByBrick Orders")
```

---

## Section A: Google Cloud Console Setup

### 1. Create or Select a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **New Project**.
3. Name your project (e.g., `BrickByBrick-Store`) and click **Create**.

### 2. Configure the OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in the required fields:
   - **App name**: `BrickByBrick`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue** through Scopes (no sensitive scopes are required; basic profile/email is provided by Google Identity Services by default).
5. Under **Test users**, add your Google email address for testing.
6. Click **Save and Continue** to summary.

### 3. Create OAuth 2.0 Client ID
1. Navigate to **APIs & Services** → **Credentials**.
2. Click **+ CREATE CREDENTIALS** and choose **OAuth client ID**.
3. Select **Application type**: **Web application**.
4. Set **Name**: `BrickByBrick Web Client`.
5. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `http://localhost:5500` (VS Code Live Server)
   - `http://127.0.0.1:5500`
   - `http://localhost:3000` (or your local dev server port)
   - `https://brickbybrick-dun.vercel.app` (Live Vercel domain)
6. Leave **Authorized redirect URIs** blank (Google Identity Services uses popup/token callback, not server redirects).
7. Click **Create**.
8. A modal will display your **Client ID** (format: `XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com`).
   > **Note:** DO NOT copy or use the Client Secret in frontend code. The Client ID is safe for client-side use.

### 4. Insert Client ID into the Codebase
Open `products.js` and replace `"YOUR_GOOGLE_CLIENT_ID"`:
```javascript
window.BRICKBYBRICK_CONFIG = {
  GOOGLE_CLIENT_ID: "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com",
  APPS_SCRIPT_URL: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
};
```

Also open `google-apps-script.js` and replace `"YOUR_GOOGLE_CLIENT_ID"`:
```javascript
const GOOGLE_CLIENT_ID = "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com";
```

---

## Section B: Google Sheets & Google Apps Script Setup

### 1. Create the Google Sheet
1. Open [Google Sheets](https://sheets.new).
2. Name the spreadsheet: **`BrickByBrick Orders`**.
3. Keep the first tab name as `BrickByBrick Orders` (or rename `Sheet1` to `BrickByBrick Orders`).

### 2. Add Google Apps Script
1. Inside your Google Sheet, click **Extensions** → **Apps Script**.
2. Delete any boilerplate code inside `Code.gs`.
3. Open [`google-apps-script.js`](file:///c:/Users/John%20Ray/Desktop/Lego-Shop-/google-apps-script.js) from this repository, copy its entire contents, and paste it into the Apps Script editor.
4. Ensure `GOOGLE_CLIENT_ID` matches your Google Cloud Client ID.

### 3. Run Sheet Setup
1. In the Apps Script toolbar, locate the function dropdown (default is usually `doPost` or `myFunction`).
2. Select **`setupSheet`** from the dropdown.
3. Click **Run**.
4. When prompted for authorization:
   - Click **Review permissions**.
   - Select your Google account.
   - Click **Advanced** → **Go to Untitled project (unsafe)**.
   - Click **Allow**.
5. Switch back to your Google Sheet tab. You will see Rows formatted with bold navy headers (Columns A to T), frozen rows, customized column widths, currency/date formatting, and a **Data Validation Dropdown** on Column Q (`Pending`, `Order Confirmed`, `Preparing`, `Ready for Delivery`, `On the Way`, `Received`, `Cancelled`)!

### 4. Install the Status Change Trigger
1. In the Apps Script toolbar function dropdown, select **`createStatusChangeTrigger`**.
2. Click **Run**.
3. This creates an **installable onEdit trigger** that monitors Column Q. Whenever the store administrator changes an order's status, the customer automatically receives the corresponding branded notification email!
   *(Note: The function checks `ScriptApp.getProjectTriggers()` so running it multiple times will never create duplicate triggers).*

### 5. Deploy as a Web App
1. In the Apps Script editor, click **Deploy** (top right) → **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the deployment:
   - **Description**: `BrickByBrick Orders API v2 (Email Automation)`
   - **Execute as**: **Me (your-email@gmail.com)**
   - **Who has access**: **Anyone** *(Crucial: Allows the Vercel frontend to submit orders without requiring Google workspace organization login)*.
4. Click **Deploy**.
5. Copy the **Web app URL** (format: `https://script.google.com/macros/s/AKfycb.../exec`).

### 6. Insert Web App URL into Frontend Config
Open `products.js` and replace `"YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"`:
```javascript
window.BRICKBYBRICK_CONFIG = {
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec"
};
```

---

## Section C: Google Sheet Headers & Data Schema

The script automatically generates and writes to Columns A through T:

| Column | Header | Description | Example |
| :---: | :--- | :--- | :--- |
| **A** | **Order ID** | Unique order code | `BBB-20260918-A4X29Q` |
| **B** | **Date** | Submission timestamp | `2026-09-18T01:08:03+08:00` |
| **C** | **Customer Name** | Verified name | `Juan dela Cruz` |
| **D** | **Customer Email** | Verified Google email | `juan@gmail.com` |
| **E** | **Phone** | Mobile contact | `0917 123 4567` |
| **F** | **Product(s)** | Character and quantity | `Kuromi × 2, Stitch × 1` |
| **G** | **Quantity** | Total items count | `3` |
| **H** | **Subtotal** | Authoritative subtotal | `₱2,697.00` |
| **I** | **Shipping Fee** | Fixed nationwide policy | `₱0.00` |
| **J** | **Total** | Recalculated total | `₱2,697.00` |
| **K** | **Payment Method** | Selected payment mode | `Cash on Delivery` |
| **L** | **Street** | Delivery street address | `Unit 4B, 123 Brick St.` |
| **M** | **Barangay** | Barangay | `Brgy. San Antonio` |
| **N** | **City** | City / Municipality | `Pasig City` |
| **O** | **Province** | Province | `Metro Manila` |
| **P** | **Postal Code** | ZIP code | `1600` |
| **Q** | **Order Status** | Dropdown: `Pending`, `Order Confirmed`, `Preparing`, `Ready for Delivery`, `On the Way`, `Received`, `Cancelled` | `Pending` |
| **R** | **Google User ID** | Google subject ID | `108392817491028471928` |
| **S** | **Last Email Status** | Prevents duplicate status emails | `Pending` |
| **T** | **Status Updated At** | Timestamp of last status change | `2026-09-18 01:30:00` |

### Automated Customer Email Lifecycle:
1. **New Order Created**:
   - Apps Script inserts row with `Q = Pending`, `T = timestamp`.
   - Sends customer the **"WE RECEIVED YOUR ORDER!"** email immediately.
   - Sets `S = Pending` once the email sends successfully.
2. **Admin Changes Status in Column Q**:
   - `handleOrderStatusChange` triggers automatically.
   - If `New Status === Last Email Status (Column S)`, it ignores the edit (Duplicate Protection).
   - Otherwise, sends the corresponding status notification email to the customer.
   - Updates `Column S = New Status` and `Column T = current timestamp` only after sending succeeds!

---

## Section D: How to Test Locally

You can serve the static files with any local HTTP server (required by Google Identity Services for security):

### Option 1: VS Code Live Server
1. Right-click `landing.html` or `index.html`.
2. Click **Open with Live Server** (runs at `http://127.0.0.1:5500` or `http://localhost:5500`).

### Option 2: Node npx serve
```bash
npx serve . -p 5500
```
Open `http://localhost:5500/landing.html` in your browser.

### Option 3: Python Built-in Server
```bash
python -m http.server 5500
```
Open `http://localhost:5500/landing.html`.

---

## Section E: How to Deploy to Vercel

Since BrickByBrick is built with pure HTML, CSS, and Vanilla JavaScript, deployment to Vercel is instantaneous and requires no build configuration.

### Deploy via Git
1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Upgrade BrickByBrick ecommerce ordering system"
   git push origin main
   ```
2. Vercel automatically rebuilds and deploys in seconds.

### Deploy via Vercel CLI
```bash
npx vercel --prod
```

---

## Section F: 16-Step Verification Checklist

- [ ] **TEST 1: Landing page loads** (`landing.html` renders hero, Spark collection teaser, and features).
- [ ] **TEST 2: Product gallery works** (`index.html` displays main figure; clicking any of the 20 character thumbnails switches the image, title, and variant tag).
- [ ] **TEST 3: Quantity changes** (Clicking `+` and `−` increments and decrements quantity between 1 and 12).
- [ ] **TEST 4: Add to Cart works** (Clicking "Add to cart" adds the selected character and quantity, increments navbar cart badge, and displays a toast).
- [ ] **TEST 5: Cart persists after refresh** (Refreshing the browser retains cart items and quantity count).
- [ ] **TEST 6: Google login works** (Signing in via navbar or modal populates avatar, name, and account dropdown).
- [ ] **TEST 7: Checkout requires authentication** (Clicking "Checkout" or "Buy Now" while unauthenticated opens the "Sign in to continue" modal).
- [ ] **TEST 8: Shipping validation works** (`checkout.html` validates full name, email, phone, street, barangay, city, province, and postal code with inline errors).
- [ ] **TEST 9: Place Order sends request** (Clicking "Place Order" displays "PLACING ORDER..." and spinner while preventing double submission).
- [ ] **TEST 10: Order appears in Google Sheets** (Row is appended in "BrickByBrick Orders" across columns A–R).
- [ ] **TEST 11: Order total matches cart** (Server-side price catalog validates and computes authoritative subtotal).
- [ ] **TEST 12: Cart clears after success** (Navbar badge resets to 0 and drawer shows empty state).
- [ ] **TEST 13: Order confirmation shows correct order ID** (`order-success.html` displays `BBB-YYYYMMDD-XXXXXX`, items list, and COD total).
- [ ] **TEST 14: My Orders displays logged-in customer's orders** (`orders.html` displays customer's order history with status badge).
- [ ] **TEST 15: Mobile layout works** (Navbar hamburger menu toggles, drawer fits mobile screens, and checkout stacks cleanly without horizontal scroll at 390px/430px).
- [ ] **TEST 16: Vercel deployment works** (Live domain `https://brickbybrick-dun.vercel.app` routes correctly).

---

## Section G: Complete Email Notification Test Procedure

Follow these steps to verify that every status transition triggers the exact expected email with duplicate prevention:

1. **TEST 1 — New Order (Pending)**:
   - Place an order through checkout with a real Google account email.
   - **Expected**: Row is created in Google Sheets with `Q = Pending`, `S = Pending`, and `T = timestamp`.
   - Customer immediately receives email: `BrickByBrick Order Received - [ORDER ID]` with headline **WE RECEIVED YOUR ORDER!**.

2. **TEST 2 — Status: Order Confirmed**:
   - In Google Sheets, change Column Q from `Pending` → `Order Confirmed`.
   - **Expected**: Customer receives `BrickByBrick Order Confirmed - [ORDER ID]` with headline **YOUR ORDER IS CONFIRMED!**. Column S updates to `Order Confirmed`, Column T updates with current timestamp.

3. **TEST 3 — Status: Preparing**:
   - Change Column Q from `Order Confirmed` → `Preparing`.
   - **Expected**: Customer receives `We're Preparing Your BrickByBrick Order - [ORDER ID]` with headline **WE'RE PREPARING YOUR ORDER!**. Column S updates to `Preparing`.

4. **TEST 4 — Status: Ready for Delivery**:
   - Change Column Q from `Preparing` → `Ready for Delivery`.
   - **Expected**: Customer receives `Your BrickByBrick Order Is Ready for Delivery - [ORDER ID]` with headline **READY FOR DELIVERY!**. Column S updates to `Ready for Delivery`.

5. **TEST 5 — Status: On the Way**:
   - Change Column Q from `Ready for Delivery` → `On the Way`.
   - **Expected**: Customer receives `Your BrickByBrick Order Is On the Way! - [ORDER ID]` with headline **YOUR ORDER IS ON THE WAY!**. Column S updates to `On the Way`.

6. **TEST 6 — Status: Received**:
   - Change Column Q from `On the Way` → `Received`.
   - **Expected**: Customer receives `BrickByBrick Order Received - [ORDER ID]` with headline **ORDER RECEIVED!**. Column S updates to `Received`.

7. **TEST 7 — Duplicate Protection**:
   - In Column Q, select `Received` again on the same row.
   - **Expected**: **NO duplicate email sent** (Script detects `New Status === Last Email Status` and exits).

8. **TEST 8 — Non-Status Column Edit**:
   - Edit any other column (e.g., change customer address in Column L or phone in Column E).
   - **Expected**: **NO email sent** (Trigger only responds to Column Q edits).

9. **TEST 9 — Order Cancelled**:
   - Select `Cancelled` in Column Q.
   - **Expected**: Customer receives `BrickByBrick Order Cancelled - [ORDER ID]` with headline **ORDER CANCELLED**. Column S updates to `Cancelled`.
