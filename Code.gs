// ============================================================
// FILE: Code.gs — Google Apps Script Nhận Dữ Liệu Chatbot Lead v2
// ============================================================
// CẬP NHẬT: Thêm trường interest, intentLevel + Email cảnh báo khách "hot"
// CỘT: Thời gian | Tên | SĐT | Email | Nguồn | Session ID | Lịch sử Chat | Quan tâm | Mức độ
// ============================================================

function doPost(e) {
  try {
    // ⚠️ THAY SPREADSHEET_ID_CỦA_BẠN BẰNG ID THẬT
    var sheet = SpreadsheetApp.openById('SPREADSHEET_ID_CỦA_BẠN').getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var newTime = data.timestamp || new Date().toLocaleString('vi-VN');
    var newName = data.name || '';
    var newPhone = data.phone || '';
    var newEmail = data.email || '';
    var newSource = data.source || '';
    var newSessionId = data.sessionId || '';
    var newHistory = data.chatHistory || '';
    var newInterest = data.interest || '';
    var newIntentLevel = data.intentLevel || '';

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rowIndexToUpdate = -1;

    // Tìm kiếm xem Session ID (Cột F - index 5) đã tồn tại chưa
    if (newSessionId) {
      for (var i = values.length - 1; i > 0; i--) { 
        var rowSessionId = values[i][5] ? values[i][5].toString().trim() : '';
        if (rowSessionId === newSessionId) {
          rowIndexToUpdate = i + 1;
          break;
        }
      }
    }

    if (rowIndexToUpdate > -1) {
      // ═══ CẬP NHẬT GỘP (Chỉ ghi đè nếu thông tin cũ đang trống) ═══
      var currentRow = values[rowIndexToUpdate - 1];
      
      if (!currentRow[1] && newName) sheet.getRange(rowIndexToUpdate, 2).setValue(newName);
      if (!currentRow[2] && newPhone) sheet.getRange(rowIndexToUpdate, 3).setValue(newPhone);
      if (!currentRow[3] && newEmail) sheet.getRange(rowIndexToUpdate, 4).setValue(newEmail);
      
      // Luôn cập nhật interest & intent_level (lấy bản mới nhất)
      if (newInterest) sheet.getRange(rowIndexToUpdate, 8).setValue(newInterest);
      if (newIntentLevel) sheet.getRange(rowIndexToUpdate, 9).setValue(newIntentLevel);
      
      // Luôn ghi đè lịch sử chat bằng bản cập nhật mới nhất
      if (newHistory) sheet.getRange(rowIndexToUpdate, 7).setValue(newHistory);
      
      // Update lại thời gian tương tác mới nhất
      sheet.getRange(rowIndexToUpdate, 1).setValue(newTime);
      
    } else {
      // ═══ TẠO DÒNG MỚI NẾU CHƯA TỒN TẠI SESSION ═══
      sheet.appendRow([newTime, newName, newPhone, newEmail, newSource, newSessionId, newHistory, newInterest, newIntentLevel]);
    }

    // 🔥 GỬI EMAIL CẢNH BÁO NẾU KHÁCH "HOT"
    if (newIntentLevel.toLowerCase() === 'hot' && (newName || newPhone || newEmail)) {
      sendHotLeadAlert(newName, newPhone, newEmail, newInterest, newTime);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Gửi email cảnh báo khi có khách hàng "hot"
 */
function sendHotLeadAlert(name, phone, email, interest, time) {
  var salesEmail = 'growthhacksuite@gmail.com'; // ← Email nhận cảnh báo
  var subject = '🔥 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!';
  var body = '📢 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!\n\n'
    + 'Tên: ' + (name || 'Chưa rõ') + '\n'
    + 'SĐT: ' + (phone || 'Chưa rõ') + '\n'
    + 'Email: ' + (email || 'Chưa rõ') + '\n'
    + 'Quan tâm: ' + (interest || 'Chưa rõ') + '\n'
    + 'Thời gian: ' + time + '\n\n'
    + 'Vui lòng liên hệ khách hàng này trong vòng 30 phút!';
  
  MailApp.sendEmail(salesEmail, subject, body);
}

// Hàm GET để test API có hoạt động không
function doGet() {
  return ContentService.createTextOutput("✅ API Chatbot Leads v2 đang hoạt động!");
}
