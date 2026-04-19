// ============================================================
// FILE: Code.gs — Google Apps Script Nhận Dữ Liệu Chatbot Lead
// ============================================================
// HƯỚNG DẪN:
// 1. Tạo Google Sheets mới, tạo 7 cột: Thời gian | Tên | SĐT | Email | Nguồn | Session ID | Lịch sử Chat
// 2. Copy Spreadsheet ID từ URL
// 3. Thay YOUR_SPREADSHEET_ID bên dưới bằng ID thật
// 4. Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
// 5. Copy URL deploy → dán vào GOOGLE_SCRIPT_URL trong chatbot.js
// ============================================================

function doPost(e) {
  try {
    // ⚠️ THAY YOUR_SPREADSHEET_ID BẰNG ID THẬT CỦA BẠN
    var sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var newTime = data.timestamp || new Date().toLocaleString('vi-VN');
    var newName = data.name || '';
    var newPhone = data.phone || '';
    var newEmail = data.email || '';
    var newSource = data.source || '';
    var newSessionId = data.sessionId || '';
    var newHistory = data.chatHistory || '';

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rowIndexToUpdate = -1;

    // Tìm kiếm xem Session ID (Cột F - index 5) đã tồn tại chưa
    if (newSessionId) {
      for (var i = values.length - 1; i > 0; i--) { 
        var rowSessionId = values[i][5] ? values[i][5].toString().trim() : '';
        if (rowSessionId === newSessionId) {
          rowIndexToUpdate = i + 1; // Chuyển từ 0-index sang 1-index
          break;
        }
      }
    }

    if (rowIndexToUpdate > -1) {
      // ═══ CẬP NHẬT GỘP LẠI (Chỉ ghi đè nếu thông tin cũ đang trống) ═══
      var currentRow = values[rowIndexToUpdate - 1];
      
      // Chỉ cập nhật nếu ô hiện tại đang trống VÀ có dữ liệu mới
      if (!currentRow[1] && newName) sheet.getRange(rowIndexToUpdate, 2).setValue(newName);
      if (!currentRow[2] && newPhone) sheet.getRange(rowIndexToUpdate, 3).setValue(newPhone);
      if (!currentRow[3] && newEmail) sheet.getRange(rowIndexToUpdate, 4).setValue(newEmail);
      
      // Luôn ghi đè lịch sử chat bằng bản cập nhật mới nhất (đầy đủ hơn)
      if (newHistory) sheet.getRange(rowIndexToUpdate, 7).setValue(newHistory);
      
      // Update lại thời gian tương tác mới nhất
      sheet.getRange(rowIndexToUpdate, 1).setValue(newTime);
      
    } else {
      // ═══ TẠO DÒNG MỚI NẾU CHƯA TỒN TẠI SESSION NÀY ═══
      sheet.appendRow([newTime, newName, newPhone, newEmail, newSource, newSessionId, newHistory]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm GET để test API có hoạt động không
function doGet() {
  return ContentService.createTextOutput("✅ API Chatbot Leads đang hoạt động ngon lành!");
}
