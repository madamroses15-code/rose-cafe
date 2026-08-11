// เก็บค่าเชื่อมต่อไว้ใน Script Properties เพื่อไม่ให้รหัสระบบอยู่ใน GitHub สาธารณะ
const ROSE_PROPERTIES = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = ROSE_PROPERTIES.getProperty("SPREADSHEET_ID");
const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : null;
const menuSheet = ss ? ss.getSheetByName("MenuItems") : null;
const orderSheet = ss ? ss.getSheetByName("Orders") : null;
const navSheet = ss ? ss.getSheetByName("NavbarButtons") : null;
const tableSheet = ss ? ss.getSheetByName("Tables") : null;
const kitchenSheet = ss ? ss.getSheetByName("KitchenDisplay") : null;

// ROSE Café Delivery Only v2.1
const TAKEAWAY_LABEL = "Delivery (จัดส่ง)";

// ใช้รวมยอดขายจากชื่อเดิมเข้ากับชื่อใหม่ เพื่อไม่ให้สถิติออเดอร์เก่าหาย
const MENU_RENAME_MAP = {
  "เอสเพรสโซ่ (Espresso)": "โรส เอสเพรสโซ่ (Rose Espresso)",
  "อเมริกาโน่ (Americano)": "โรส อเมริกาโน่ (Rose Americano)",
  "คาปูชิโน่ (Cappuccino)": "คลาวด์ คาปูชิโน่ (Cloud Cappuccino)",
  "ลาเต้ (Latte)": "เวลเวท ลาเต้ (Velvet Latte)",
  "มอคค่า (Mocha)": "ช็อกโก โรส มอคค่า (Choco Rose Mocha)",
  "คาราเมลมัคคิอาโต้ (Caramel Macchiato)": "โกลเด้น คาราเมล มัคคิอาโต้ (Golden Caramel Macchiato)",
  "ชาไทยนมสด (Thai Milk Tea)": "ชาไทยโรสซี่ (Rosy Thai Milk Tea)",
  "มัทฉะลาเต้ (Matcha Latte)": "มัทฉะ คลาวด์ ลาเต้ (Matcha Cloud Latte)",
  "โกโก้พรีเมียม (Premium Cocoa)": "ดาร์กโกโก้ โรส (Rose Dark Cocoa)",
  "สตรอว์เบอร์รี่โซดา (Strawberry Soda)": "สตรอว์เบอร์รี่ โรส โซดา (Strawberry Rose Soda)",
  "บลูฮาวายโซดา (Blue Hawaii Soda)": "บลูสกาย โซดา (Blue Sky Soda)",
  "ครัวซองต์เนยสด (Butter Croissant)": "โรส บัตเตอร์ ครัวซองต์ (Rose Butter Croissant)",
  "นิวยอร์กชีสเค้ก (New York Cheesecake)": "เบอร์รี่ ชีสเค้ก (Berry Cheesecake)",
  "ช็อกโกแลตบราวนี่ (Chocolate Brownie)": "ช็อกโก ฟัดจ์ บราวนี่ (Choco Fudge Brownie)",
  "ฮันนี่โทสต์ (Honey Toast)": "โรส ฮันนี่โทสต์ (Rose Honey Toast)",
  "แซนด์วิชแฮมชีส (Ham & Cheese Sandwich)": "แฮมชีส เมลต์ (Ham Cheese Melt)",
  "สปาเก็ตตี้คาโบนาร่า (Spaghetti Carbonara)": "ครีมมี่ คาโบนาร่า (Creamy Carbonara)",
  "ข้าวไข่ข้นกุ้ง (Creamy Omelet with Shrimp)": "ข้าวไข่ข้นกุ้ง โรสคิทเช่น (Rose Shrimp Omelet Rice)",
  "ซีซาร์สลัด (Caesar Salad)": "โรส ซีซาร์สลัด (Rose Caesar Salad)",
  "แพนเค้กผลไม้รวม (Mixed Fruit Pancake)": "ฟรุตตี้ แพนเค้ก (Fruity Pancake)",
  "ลิซันเดย์ (Lychee Sunday)": "ลิ้นจี่ โรส ซันเดย์ (Lychee Rose Sundae)",
  "กาแฟส้ม (Orange Coffee)": "ซันเซ็ต ออเรนจ์ คอฟฟี่ (Sunset Orange Coffee)",
  "ชามะนาว (Lemon Tea)": "โรส เลมอน ที (Rose Lemon Tea)",
  "เฟรนช์ฟรายส์เกลือ (Salted French Fries)": "โรส ครั้นชี่ ฟรายส์ (Rose Crunchy Fries)",
  "คลับแซนด์วิช (Club Sandwich)": "โรส คลับ แซนด์วิช (Rose Club Sandwich)",
  "กาแฟทดสอบ": "โรส ซิกเนเจอร์ คอฟฟี่ (Rose Signature Coffee)",
  "กาแฟ-ชาไทย": "โรส ไทยที คอฟฟี่ ฟิวชั่น (Rose Thai Tea Coffee Fusion)"
};

function normalizeMenuItemName(itemName) {
  const rawName = (itemName || "").toString().trim();
  const oldNames = Object.keys(MENU_RENAME_MAP);

  for (let i = 0; i < oldNames.length; i++) {
    const oldName = oldNames[i];
    const newName = MENU_RENAME_MAP[oldName];
    if (rawName === oldName || rawName.indexOf(oldName + " (") === 0) return newName;
    if (rawName === newName || rawName.indexOf(newName + " (") === 0) return newName;
  }

  return rawName;
}

// --- 1. API ROUTING FOR GITHUB PAGES ---
// หน้าเว็บอยู่ที่ GitHub Pages ส่วน Apps Script ทำหน้าที่อ่าน/เขียน Google Sheets เท่านั้น
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "health";
  let result;

  try {
    if (action === "health") {
      result = healthCheck();
    } else if (action === "menu") {
      result = { success: true, items: apiGetMenuItems_() };
    } else if (action === "discounts") {
      result = { success: true, discounts: getDiscounts() };
    } else if (action === "result") {
      result = apiGetResult_(params.requestId);
    } else {
      throw new Error("ไม่รู้จัก API action: " + action);
    }
  } catch (error) {
    result = { success: false, message: error.message };
  }

  return apiOutput_(result, params.callback);
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const requestId = (params.requestId || "").toString();
  let result;

  try {
    if (!apiValidRequestId_(requestId)) throw new Error("requestId ไม่ถูกต้อง");
    const payload = params.payload ? JSON.parse(params.payload) : {};
    result = apiDispatchPost_(params.action, payload);
  } catch (error) {
    result = { success: false, message: error.message };
  }

  if (requestId) apiStoreResult_(requestId, result);
  return ContentService.createTextOutput(JSON.stringify({ received: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiDispatchPost_(action, payload) {
  if (action === "order") return processOrder(payload);
  if (action === "payment") return processPayment(payload);
  if (action === "adminLogin") return apiAdminLogin_(payload.password);

  apiRequireAdmin_(payload.token);

  if (action === "adminHistory") {
    return { success: true, orders: getOrderHistory(payload.date) };
  }
  if (action === "adminMenu") {
    return { success: true, items: apiGetMenuItems_() };
  }
  if (action === "adminDashboard") {
    return { success: true, data: getDashboardData(payload.reportType || "last_days", payload.value || 7) };
  }
  if (action === "updateOrderStatus") {
    const allowedStatuses = ["Waiting", "Served", "Paid", "Cancelled"];
    if (!allowedStatuses.includes(payload.status)) throw new Error("สถานะออเดอร์ไม่ถูกต้อง");
    return updateOrderStatus(payload.orderNumber, payload.status);
  }
  if (action === "updateMenuStatus") {
    if (!["Available", "Sold Out"].includes(payload.status)) throw new Error("สถานะเมนูไม่ถูกต้อง");
    return updateMenuItemStatus(payload.itemName, payload.status);
  }
  if (action === "saveMenu") return saveMenuItem(payload.item || {});
  if (action === "deleteMenu") return deleteMenuItem((payload.itemName || "").toString());
  throw new Error("ไม่รู้จัก API action: " + action);
}

function apiOutput_(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    const safeCallback = callback.toString();
    if (!/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(safeCallback)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "callback ไม่ถูกต้อง" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(safeCallback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function apiGetMenuItems_() {
  return getMenuItems().map(item => {
    const copy = Object.assign({}, item);
    // data URI ขนาดใหญ่ไม่เหมาะกับ JSONP; หน้า GitHub ใช้ asset ของร้านแทน
    if ((copy.imageUrl || "").toString().indexOf("data:image/") === 0) copy.imageUrl = "";
    return copy;
  });
}

function apiStoreResult_(requestId, result) {
  CacheService.getScriptCache().put("rose:result:" + requestId, JSON.stringify(result), 180);
}

function apiGetResult_(requestId) {
  if (!apiValidRequestId_(requestId)) return { success: false, message: "requestId ไม่ถูกต้อง" };
  const stored = CacheService.getScriptCache().get("rose:result:" + requestId);
  return stored ? JSON.parse(stored) : { pending: true };
}

function apiValidRequestId_(requestId) {
  return /^[A-Za-z0-9_-]{12,100}$/.test((requestId || "").toString());
}

function apiAdminLogin_(password) {
  const configuredPassword = ROSE_PROPERTIES.getProperty("ADMIN_PASSWORD");
  if (!configuredPassword) {
    return { success: false, message: "ยังไม่ได้ตั้ง Script Property: ADMIN_PASSWORD" };
  }
  if ((password || "").toString() !== configuredPassword) {
    return { success: false, message: "รหัสผ่านไม่ถูกต้อง" };
  }
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  CacheService.getScriptCache().put("rose:admin:" + token, "1", 21600);
  return { success: true, token: token };
}

function apiRequireAdmin_(token) {
  const safeToken = (token || "").toString();
  if (!safeToken || CacheService.getScriptCache().get("rose:admin:" + safeToken) !== "1") {
    throw new Error("เซสชัน Admin หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
}

// ใช้ทดสอบการเชื่อมต่อก่อน Deploy โดยกด Run ที่ฟังก์ชันนี้หนึ่งครั้ง
function healthCheck() {
  if (!SPREADSHEET_ID || !ss) throw new Error("ยังไม่ได้ตั้ง Script Property: SPREADSHEET_ID");
  const requiredSheets = ["MenuItems", "Orders", "Discounts", "NavbarButtons", "KitchenDisplay"];
  const missingSheets = requiredSheets.filter(name => !ss.getSheetByName(name));
  if (missingSheets.length) {
    throw new Error("ไม่พบชีต: " + missingSheets.join(", "));
  }
  return {
    success: true,
    spreadsheetName: ss.getName(),
    menuCount: Math.max(menuSheet.getLastRow() - 1, 0),
    message: "ROSE Café เชื่อมต่อ Google Sheets สำเร็จ"
  };
}

// รันฟังก์ชันนี้ก่อน Deploy เพื่อยืนยันทั้งการเชื่อมต่อและเมนูสำคัญ
function preDeployCheck() {
  const health = healthCheck();
  const menuItems = getMenuItems();
  const requiredMenu = ["น้ำพริกปลาทูฟู", "โรส อัญชัญเลมอน"];
  const missingMenu = requiredMenu.filter(name =>
    !menuItems.some(item => (item.name || "").toString().indexOf(name) !== -1)
  );

  if (missingMenu.length) {
    throw new Error("ไม่พบเมนูที่ต้องใช้: " + missingMenu.join(", "));
  }

  const fishChiliPaste = menuItems.find(item => item.name === "น้ำพริกปลาทูฟู");
  if (Number(fishChiliPaste.price) !== 55) {
    throw new Error("ราคาน้ำพริกปลาทูฟูต้องเป็น 55 บาท");
  }
  if (!fishChiliPaste.imageUrl || fishChiliPaste.imageUrl.indexOf("data:image/") !== 0) {
    throw new Error("น้ำพริกปลาทูฟูยังไม่มีรูปภาพ");
  }

  return {
    success: true,
    spreadsheetName: health.spreadsheetName,
    menuCount: menuItems.length,
    takeawayMode: TAKEAWAY_LABEL,
    checkedMenu: requiredMenu,
    message: "ROSE Café พร้อมสร้าง Deployment ใหม่"
  };
}

// --- 2. MENU & UI DATA ---
function getNavbarButtons() {
  try {
    const data = navSheet.getDataRange().getValues();
    data.shift();
    return data.map(row => ({ name: row[0], icon: row[1] }));
  } catch(e) { return [{name: "Order", icon: "restaurant_menu"}]; }
}

function getMenuItems() {
  try {
    if (!menuSheet) throw new Error("ไม่พบชีต 'MenuItems'");
    const data = menuSheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    data.shift();
    return data.map((row, index) => {
      let price = parseFloat(row[2]);
      if (isNaN(price)) price = 0;
      let extraPrice = (row[3] !== "" && !isNaN(row[3])) ? parseFloat(row[3]) : null;

      return {
        name: row[0] ? row[0].toString().trim() : "ไม่มีชื่อ (แถว " + (index+2) + ")",
        description: row[1] ? row[1].toString() : "",
        price: price,
        extraPrice: extraPrice,
        category: row[4] ? row[4].toString().trim() : "Uncategorized",
        imageUrl: row[5] ? row[5].toString() : "",
        status: row[6] ? row[6].toString().trim() : 'Available',
        trackSales: row[7] ? row[7].toString().trim().toLowerCase() === 'yes' : false
      };
    }).filter(item => item.name !== "");
  } catch (e) {
    Logger.log("Error in getMenuItems: " + e.toString());
    throw new Error(e.message);
  }
}

// --- 3. TABLE MANAGEMENT ---
function updateTableStatus(tableName, newStatus) {
  try {
    if (!tableSheet) return;
    const tableData = tableSheet.getDataRange().getValues();
    for (let i = 1; i < tableData.length; i++) {
      if (tableData[i][0] !== "" && tableData[i][0].toString().trim() === tableName.toString().trim()) {
        tableSheet.getRange(i + 1, 2).setValue(newStatus);
        break; 
      }
    }
  } catch (e) {
    Logger.log("Error in updateTableStatus: " + e.message);
  }
}

function getAvailableTables() {
  return [TAKEAWAY_LABEL];
}

// --- 3.1 TAKEAWAY KITCHEN DISPLAY ---
function getKitchenStatusLabel(status) {
  const labels = {
    Waiting: "รอจัดเตรียม",
    Served: "พร้อมจัดส่ง",
    Paid: "ชำระเงินแล้ว",
    Cancelled: "ยกเลิก"
  };
  return labels[status] || status;
}

function syncKitchenDisplay() {
  try {
    if (!kitchenSheet) throw new Error("ไม่พบชีต 'KitchenDisplay'");

    const kitchenHeaders = [
      "เวลาสั่ง",
      "เลขออเดอร์",
      "ประเภทรับสินค้า",
      "รายการ",
      "จำนวน",
      "หมายเหตุ",
      "สถานะ",
      "อัปเดตล่าสุด"
    ];
    kitchenSheet.getRange(1, 1, 1, kitchenHeaders.length).setValues([kitchenHeaders]);

    const lastKitchenRow = kitchenSheet.getLastRow();
    if (lastKitchenRow > 1) {
      kitchenSheet.getRange(2, 1, lastKitchenRow - 1, kitchenHeaders.length).clearContent();
    }

    const values = orderSheet.getDataRange().getValues();
    if (values.length <= 1) return { success: true, count: 0 };

    const headers = values[0];
    const getIdx = (name) => {
      const idx = headers.indexOf(name);
      if (idx === -1) throw new Error("ไม่พบหัวคอลัมน์ Orders: " + name);
      return idx;
    };

    const tz = Session.getScriptTimeZone();
    const today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    const activeStatuses = new Set(["Waiting", "Served"]);
    const updatedAt = Utilities.formatDate(new Date(), tz, "HH:mm:ss");

    const kitchenRows = values.slice(1).filter(row => {
      const timestamp = row[getIdx("Timestamp")];
      const status = row[getIdx("Status")];
      if (!(timestamp instanceof Date) || !activeStatuses.has(status)) return false;
      return Utilities.formatDate(timestamp, tz, "yyyy-MM-dd") === today;
    }).map(row => [
      Utilities.formatDate(row[getIdx("Timestamp")], tz, "HH:mm"),
      row[getIdx("OrderNumber")],
      "จัดส่ง",
      row[getIdx("ItemName")],
      row[getIdx("Quantity")],
      row[getIdx("ItemNote")] || "-",
      getKitchenStatusLabel(row[getIdx("Status")]),
      updatedAt
    ]);

    if (kitchenRows.length > 0) {
      kitchenSheet.getRange(2, 1, kitchenRows.length, kitchenHeaders.length).setValues(kitchenRows);
    }

    kitchenSheet.setFrozenRows(1);
    return { success: true, count: kitchenRows.length };
  } catch (error) {
    Logger.log("syncKitchenDisplay Error: " + error.message);
    return { success: false, message: error.message };
  }
}

// --- 4. ORDER PROCESSING ---
function processOrder(orderDetails) {
  const orderLock = LockService.getScriptLock();
  let orderLockAcquired = false;
  try {
    orderLock.waitLock(10000);
    orderLockAcquired = true;
    const { items, discount } = orderDetails;
    const tableNumber = TAKEAWAY_LABEL;
    const customerCount = 1;
    const timestamp = new Date();
    const status = "Waiting";
    const scriptTimeZone = Session.getScriptTimeZone();
    const formattedDate = Utilities.formatDate(timestamp, scriptTimeZone, "yyMMddHHmmssSSS");
    const orderNumber = "ORD-" + formattedDate;

    const headers = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
    
    // ป้องกัน Error กรณีหา Index ไม่เจอ
    const getIdx = (name) => {
      const idx = headers.indexOf(name);
      if (idx === -1) throw new Error("ไม่พบหัวคอลัมน์: " + name);
      return idx;
    };

    let orderGrandTotal = 0;
    items.forEach(item => {
      const sub = item.price * item.quantity;
      orderGrandTotal += (discount && discount.value > 0) ? sub * (1 - discount.value) : sub;
    });

    const newRows = items.map(item => {
      const itemSubtotal = item.price * item.quantity;
      const finalPrice = (discount && discount.value > 0) ? itemSubtotal * (1 - discount.value) : itemSubtotal;
      
      const newRow = new Array(headers.length).fill("");
      newRow[getIdx("Timestamp")] = timestamp;
      newRow[getIdx("OrderNumber")] = orderNumber;
      newRow[getIdx("CustomerCount")] = customerCount;
      newRow[getIdx("TableNumber")] = tableNumber;
      newRow[getIdx("ItemName")] = item.name;
      newRow[getIdx("ItemNote")] = item.note || "";
      newRow[getIdx("Quantity")] = item.quantity;
      newRow[getIdx("PricePerItem")] = item.price;
      newRow[getIdx("DiscountName")] = discount ? discount.name : "";
      newRow[getIdx("DiscountValue")] = discount ? discount.value : "";
      newRow[getIdx("ItemSubtotal")] = itemSubtotal;
      newRow[getIdx("TotalPrice")] = finalPrice;
      newRow[getIdx("Status")] = status;
      newRow[getIdx("OrderGrandTotal")] = orderGrandTotal;
      return newRow;
    });

    if (newRows.length > 0) {
      orderSheet.getRange(orderSheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
      syncKitchenDisplay();
    }

    return { success: true, orderNumber: orderNumber, tableNumber: tableNumber };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    if (orderLockAcquired) orderLock.releaseLock();
  }
}

// --- 5. PAYMENT & STATUS ---
function processPayment(paymentDetails) {
  try {
    const { orderNumber, paymentMethod, cashReceived, changeGiven, imageData } = paymentDetails;
    const allowedPaymentMethods = ['Cash', 'QR PromptPay', 'Transfer'];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      throw new Error('ช่องทางการชำระเงินไม่ถูกต้อง');
    }
    const newStatus = "Paid";
    let imageURL = "";
    
    // จัดการอัปโหลดสลิป
    if (['QR PromptPay', 'Transfer'].includes(paymentMethod) && imageData) {
      const folderId = ROSE_PROPERTIES.getProperty("PAYMENT_FOLDER_ID");
      if (!folderId) throw new Error("ยังไม่ได้ตั้ง Script Property: PAYMENT_FOLDER_ID");
      try {
        const driveFolder = DriveApp.getFolderById(folderId);
        const imageMatch = imageData.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
        if (!imageMatch) throw new Error('รูปแบบไฟล์สลิปไม่รองรับ');
        const mimeType = imageMatch[1];
        const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
        const decodedImage = Utilities.base64Decode(imageMatch[2]);
        const blob = Utilities.newBlob(decodedImage, mimeType, `${orderNumber}-proof.${extension}`);
        const file = driveFolder.createFile(blob);
        // เก็บสลิปเป็นไฟล์ส่วนตัวของเจ้าของระบบ ไม่เปิดสาธารณะอัตโนมัติ
        imageURL = file.getUrl();
      } catch(err) {
        throw new Error("อัปโหลดสลิปไม่สำเร็จ: " + err.message);
      }
    }

    const ordersData = orderSheet.getDataRange().getValues();
    const headers = ordersData[0];
    const getIdx = (name) => headers.indexOf(name);

    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][getIdx("OrderNumber")] === orderNumber) {
        const row = i + 1;
        orderSheet.getRange(row, getIdx("Status") + 1).setValue(newStatus);
        orderSheet.getRange(row, getIdx("PaymentMethod") + 1).setValue(paymentMethod);
        orderSheet.getRange(row, getIdx("CashReceived") + 1).setValue(cashReceived || 0);
        orderSheet.getRange(row, getIdx("ChangeGiven") + 1).setValue(changeGiven || 0);
        orderSheet.getRange(row, getIdx("ProofImageURL") + 1).setValue(imageURL);
      }
    }

    syncKitchenDisplay();

    return { success: true, orderNumber: orderNumber };
  } catch (e) { return { success: false, message: e.message }; }
}

// --- 6. DASHBOARD & HISTORY ---
function getDashboardData(reportType = 'last_days', value = 7) {
  try {
    const menuItemsData = getMenuItems();
    const trackableItemNames = new Set(menuItemsData.filter(item => item.trackSales).map(item => item.name));
    const orderData = orderSheet.getDataRange().getValues();
    const headers = orderData.shift();
    
    if (orderData.length === 0) return { success: true, dailySales: 0, monthlySales: 0, topSellingItems: [] };

    const tz = Session.getScriptTimeZone();
    const now = new Date();
    const todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    const currentMonthStr = Utilities.formatDate(now, tz, "yyyy-MM");

    const getIdx = (name) => headers.indexOf(name);
    let dailySales = 0, monthlySales = 0;
    const itemSales = {}, salesByDay = {};
    const processedOrders = new Set();
    
    orderData.forEach(row => {
      if (row[getIdx("Status")] === 'Cancelled') return;

      const orderNum = row[getIdx("OrderNumber")];
      const grandTotal = parseFloat(row[getIdx("OrderGrandTotal")] || 0);
      const dateObj = new Date(row[getIdx("Timestamp")]);
      
      if (isNaN(dateObj.getTime())) return;
      
      const rowDateStr = Utilities.formatDate(dateObj, tz, "yyyy-MM-dd");
      const rowMonthStr = Utilities.formatDate(dateObj, tz, "yyyy-MM");

      if (!processedOrders.has(orderNum)) {
        if (rowDateStr === todayStr) dailySales += grandTotal;
        if (rowMonthStr === currentMonthStr) monthlySales += grandTotal;
        salesByDay[rowDateStr] = (salesByDay[rowDateStr] || 0) + grandTotal;
        processedOrders.add(orderNum);
      }

      const itemName = normalizeMenuItemName(row[getIdx("ItemName")]);
      if (trackableItemNames.has(itemName)) {
        const qty = parseInt(row[getIdx("Quantity")] || 0);
        itemSales[itemName] = (itemSales[itemName] || 0) + qty;
      }
    });

    return { 
      success: true, 
      dailySales, 
      monthlySales, 
      topSellingItems: Object.entries(itemSales).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, quantity]) => ({ name, quantity })),
      salesByDay
    };
  } catch (e) { return { success: false, message: e.toString() }; }
}

// --- ฟังก์ชันอื่นๆ คงเดิมตาม Logic ของคุณ ---
function updateOrderStatus(orderNumber, newStatus) {
  try {
    const ordersData = orderSheet.getDataRange().getValues();
    const headers = ordersData[0];
    const orderNumberIndex = headers.indexOf("OrderNumber");
    const statusIndex = headers.indexOf("Status");
    for (let i = 1; i < ordersData.length; i++) {
      if (ordersData[i][orderNumberIndex] === orderNumber) {
        orderSheet.getRange(i + 1, statusIndex + 1).setValue(newStatus);
      }
    }
    syncKitchenDisplay();
    return { success: true, orderNumber: orderNumber, newStatus: newStatus };
  } catch (e) { return { success: false, message: e.message }; }
}

function cancelOrder(orderNumber) {
  return updateOrderStatus(orderNumber, "Cancelled");
}

function onEdit(e) {
  try {
    const range = e && e.range;
    if (range && range.getSheet().getName() === "Orders" && range.getRow() > 1) {
      syncKitchenDisplay();
    }
  } catch (error) {
    Logger.log("onEdit KitchenDisplay Error: " + error.message);
  }
}

function getDiscounts() {
  try {
    const discountSheet = ss.getSheetByName("Discounts");
    if (!discountSheet) return [];
    const data = discountSheet.getDataRange().getValues();
    data.shift();
    return data.map(row => {
      let val = parseFloat(row[1]);
      if (val > 1) val = val / 100; 
      return { name: row[0] ? row[0].toString().trim() : "", value: isNaN(val) ? 0 : val };
    }).filter(d => d.name !== "");
  } catch (e) { return []; }
}

// --- 7. ORDER HISTORY & POLLING (เพิ่มส่วนนี้เพื่อให้ JavaScript ทำงานได้) ---

function getOrderHistory(dateString) {
  try {
    const data = orderSheet.getDataRange().getValues();
    const headers = data.shift();
    const getIdx = (name) => headers.indexOf(name);
    
    const tz = Session.getScriptTimeZone();
    const targetDate = dateString; // รูปแบบ YYYY-MM-DD จาก DatePicker
    
    const groupedOrders = {};

    data.forEach(row => {
      const timestamp = row[getIdx("Timestamp")];
      if (!(timestamp instanceof Date)) return;
      
      const rowDateStr = Utilities.formatDate(timestamp, tz, "yyyy-MM-dd");
      if (rowDateStr !== targetDate) return;

      const orderNum = row[getIdx("OrderNumber")];
      if (!groupedOrders[orderNum]) {
        groupedOrders[orderNum] = {
          orderNumber: orderNum,
          tableNumber: row[getIdx("TableNumber")],
          status: row[getIdx("Status")],
          timestampForDisplay: Utilities.formatDate(timestamp, tz, "HH:mm"),
          isoTimestamp: timestamp.toISOString(),
          items: [],
          total: parseFloat(row[getIdx("OrderGrandTotal")] || 0)
        };
      }

      groupedOrders[orderNum].items.push({
        name: row[getIdx("ItemName")],
        quantity: row[getIdx("Quantity")]
      });
    });

    return groupedOrders;
  } catch (e) {
    Logger.log("Error in getOrderHistory: " + e.toString());
    throw new Error("ไม่สามารถดึงข้อมูลออเดอร์ได้: " + e.message);
  }
}

function getNewOrders(latestTimestamp) {
  try {
    const data = orderSheet.getDataRange().getValues();
    const headers = data.shift();
    const getIdx = (name) => headers.indexOf(name);
    
    const lastTime = new Date(latestTimestamp);
    const newOrders = {};

    data.forEach(row => {
      const timestamp = row[getIdx("Timestamp")];
      if (!(timestamp instanceof Date) || timestamp <= lastTime) return;

      const orderNum = row[getIdx("OrderNumber")];
      if (!newOrders[orderNum]) {
        newOrders[orderNum] = {
          orderNumber: orderNum,
          tableNumber: row[getIdx("TableNumber")],
          status: row[getIdx("Status")],
          timestampForDisplay: Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "HH:mm"),
          isoTimestamp: timestamp.toISOString(),
          items: []
        };
      }
      newOrders[orderNum].items.push({
        name: row[getIdx("ItemName")],
        quantity: row[getIdx("Quantity")]
      });
    });

    return newOrders;
  } catch (e) { return {}; }
}

function getOrderDetails(orderNumber) {
  try {
    const data = orderSheet.getDataRange().getValues();
    const headers = data.shift();
    const getIdx = (name) => headers.indexOf(name);
    
    const items = [];
    let details = {};

    data.forEach(row => {
      if (row[getIdx("OrderNumber")] === orderNumber) {
        if (!details.orderNumber) {
          details = {
            orderNumber: orderNumber, // แก้จาก orderNum เป็น orderNumber [ตาม Parameter ที่รับมา]
            tableNumber: row[getIdx("TableNumber")],
            subtotal: 0,
            discountAmount: 0,
            total: parseFloat(row[getIdx("OrderGrandTotal")] || 0)
          };
        }
        
        const itemSubtotal = parseFloat(row[getIdx("ItemSubtotal")] || 0);
        details.subtotal += itemSubtotal;
        
        const discVal = parseFloat(row[getIdx("DiscountValue")] || 0);
        if (discVal > 0) {
           details.discountAmount += (itemSubtotal * discVal);
        }

        items.push({
          name: row[getIdx("ItemName")],
          quantity: row[getIdx("Quantity")],
          price: parseFloat(row[getIdx("PricePerItem")] || 0),
          note: row[getIdx("ItemNote")]
        });
      }
    });
    
    details.items = items;
    return details;
  } catch (e) { 
    throw new Error(e.message); 
  }
}

// ฟังก์ชันสำหรับอัปเดตสถานะเมนู (Available / Out of Stock)
function updateMenuItemStatus(itemName, newStatus) {
  try {
    const data = menuSheet.getDataRange().getValues();
    const headers = data[0];
    const nameIdx = headers.indexOf("Name"); // หรือหัวคอลัมน์ชื่อเมนูของคุณ
    const statusIdx = headers.indexOf("Status"); // หัวคอลัมน์สถานะ (คอลัมน์ G ในโค้ดเดิมคุณ)

    for (let i = 1; i < data.length; i++) {
      if (data[i][nameIdx].toString().trim() === itemName.toString().trim()) {
        menuSheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
        return { success: true, itemName: itemName, newStatus: newStatus };
      }
    }
    throw new Error("ไม่พบชื่อเมนูนี้ในระบบ");
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ฟังก์ชันสำหรับเพิ่มหรืออัปเดตสินค้า
function saveMenuItem(itemData) {
  try {
    const data = menuSheet.getDataRange().getValues();
    const headers = data[0];
    const nameIdx = headers.indexOf("Name");
    const originalName = (itemData.originalName || itemData.name || "").toString().trim();
    const newName = (itemData.name || "").toString().trim();

    if (!newName) throw new Error("กรุณาระบุชื่อเมนู");

    // ป้องกันชื่อซ้ำกับเมนูอื่น
    for (let i = 1; i < data.length; i++) {
      const existingName = data[i][nameIdx].toString().trim();
      if (existingName === newName && existingName !== originalName) {
        throw new Error("มีชื่อเมนูนี้อยู่แล้ว กรุณาใช้ชื่ออื่น");
      }
    }
    
    // ค้นหาด้วยชื่อเดิมเพื่อให้แก้ชื่อเมนูได้โดยไม่สร้างแถวซ้ำ
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][nameIdx].toString().trim() === originalName) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowValues = [
      newName,
      itemData.description,
      itemData.price,
      itemData.extraPrice,
      itemData.category,
      itemData.imageUrl,
      itemData.status || 'Available',
      itemData.trackSales ? 'Yes' : 'No'
    ];

    if (rowIndex > 0) {
      // แก้ไขบรรทัดเดิม
      menuSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      // เพิ่มบรรทัดใหม่
      menuSheet.appendRow(rowValues);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ฟังก์ชันสำหรับลบสินค้า
function deleteMenuItem(itemName) {
  try {
    const data = menuSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === itemName.trim()) {
        menuSheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    throw new Error("ไม่พบเมนูที่ต้องการลบ");
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
