/**
 * AI Chatbot Logic
 * Expert: Bùi Thị Ngọc Trinh
 * Integration: 9router.vuhai.io.vn (OpenAI-compatible)
 */

import OpenAI from 'https://esm.sh/openai';

// 1. Initial Data & Configuration
const API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
const BASE_URL = "https://9router.vuhai.io.vn/v1";
const MODEL_NAME = "ces-chatbot-gpt-5.4";

// Lead Capture Configuration
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2Epo5wjqIWgw3G8c9r37kow5mEzSNQET9c8IFc5-pARaq8Dt-_GHwy-s6DPoeLEwy/exec';
let AI_CHAT_SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

const EXPERT_INFO = `
- Tên chuyên gia: Bùi Thị Ngọc Trinh
- Định vị thương hiệu: Chuyên gia xây dựng hệ thống marketing đa kênh để làm global affiliate, tập trung vào thị trường Mỹ
- Giải pháp cung cấp: Tăng trưởng bằng Affiliate
- Liên hệ tư vấn: Email growthhacksuite@gmail.com hoặc Zalo 0907421199.
`;

const SYSTEM_PROMPT = `
Vai trò: Bạn là trợ lý AI độc quyền cho chuyên gia Bùi Thị Ngọc Trinh.
Dữ liệu chuyên gia (Knowledge Base): ${EXPERT_INFO}

Quy định trả lời:
- Chào hỏi thân thiện, chuyên nghiệp.
- Chỉ được trả lời dựa trên Kiến thức của chuyên gia (Knowledge Base).
- Nếu câu hỏi ngoài phạm vi, hãy từ chối khéo léo và hướng dẫn liên hệ qua Email hoặc Zalo ở trên.
- Luôn sử dụng Markdown để định dạng câu trả lời đẹp mắt (bold, lists, etc.).
- Kết thúc bằng một lời mời đặt thêm câu hỏi.

Quy tắc đặc biệt - Trích xuất Lead: Trong quá trình trò chuyện, nếu bạn phát hiện người dùng cung cấp Tên, Số điện thoại, hoặc Email, bạn HÃY VỪA trả lời họ bình thường, VỪA chèn thêm một đoạn mã JSON vào cuối cùng của câu trả lời theo đúng định dạng sau:
||LEAD_DATA: {"name": "...", "phone": "...", "email": "...", "interest": "...", "intent_level": "..."}||

Hướng dẫn điền các trường:
- name, phone, email: Trích xuất trực tiếp từ lời nhắn. Nếu chưa có, để null.
- interest: Tự phân tích từ nội dung cuộc trò chuyện, tóm tắt ngắn gọn khách quan tâm sản phẩm/dịch vụ gì. Nếu chưa rõ, để null.
- intent_level: Tự đánh giá mức độ sẵn sàng mua hàng dựa trên ngữ cảnh:
  + "hot" = Khách muốn mua ngay, hỏi giá, yêu cầu báo giá, đặt hàng, muốn tư vấn gấp
  + "warm" = Khách quan tâm, hỏi thông tin chi tiết, so sánh, cân nhắc
  + "cold" = Khách chỉ hỏi chung chung, tìm hiểu, chưa có nhu cầu rõ ràng
  Nếu chưa đủ thông tin để đánh giá, để "cold".

TUYỆT ĐỐI KHÔNG giải thích hay đề cập đến đoạn mã này cho người dùng.
`;

// 2. Initialize OpenAI Client
const openai = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    dangerouslyAllowBrowser: true // Required for browser-side SDK usage
});

// 3. Chat State
let messages = [{ role: 'system', content: SYSTEM_PROMPT }];
const DEFAULT_WELCOME = "Chào bạn! Tôi là trợ lý AI của chuyên gia Bùi Thị Ngọc Trinh. Tôi có thể giúp gì cho bạn về Marketing Affiliate toàn cầu hôm nay?";

// 4. Dom Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const refreshBtn = document.getElementById('refresh-btn');
const closeBtn = document.getElementById('close-btn');
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');

// 5. Functions
function addMessage(role, content) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role === 'assistant' ? 'ai' : 'user');
    
    if (role === 'assistant') {
        msgDiv.classList.add('chat-markdown');
        msgDiv.innerHTML = marked.parse(content);
    } else {
        msgDiv.textContent = content;
    }
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.classList.add('message', 'ai', 'typing');
    typingDiv.innerHTML = `Đang nhập<span class="dot-pulse">.</span><span class="dot-pulse">.</span><span class="dot-pulse">.</span>`;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

// ============================================================
// LEAD CAPTURE: Bóc tách dữ liệu + Gửi lên Google Sheets
// ============================================================

/**
 * Bóc tách dữ liệu lead từ response AI và gửi lên Google Sheets
 */
function processAIResponse(aiResponse, chatHistoryArray = []) {
    const dataPattern = /\|\|LEAD_DATA:\s*(\{.*?\})\s*\|\|/;

    // Xây dựng lại Text Lịch sử Chat cho dễ đọc trên Google Sheets
    let formattedHistory = "";
    if (chatHistoryArray && chatHistoryArray.length > 0) {
        formattedHistory = chatHistoryArray.map(msg => {
            if (msg.role === 'system') return null;
            let role = msg.role === 'user' ? 'Khách' : 'AI';
            // Lọc bỏ tag ẩn trước khi lưu vào GG Sheets
            let content = msg.content.replace(dataPattern, "").trim();
            return `${role}: ${content}`;
        }).filter(Boolean).join('\n\n');
    }

    if (aiResponse.includes("||LEAD_DATA:")) {
        const match = aiResponse.match(dataPattern);

        if (match && match[1]) {
            try {
                const leadData = JSON.parse(match[1]);
                console.log("✅ Dữ liệu khách hàng bóc được:", leadData);

                // Gửi dữ liệu nếu có ít nhất 1 trường thông tin
                if (leadData.name || leadData.phone || leadData.email) {
                    sendLeadToGoogleSheets(leadData, formattedHistory);
                }
            } catch (error) {
                console.error("❌ Lỗi parse JSON từ AI:", error);
            }
        }
        // Xóa tag khỏi câu trả lời → hiển thị sạch cho khách
        aiResponse = aiResponse.replace(dataPattern, "").trim();
    }
    return aiResponse;
}

/**
 * Gửi dữ liệu Lead lên Google Apps Script → Google Sheets
 */
async function sendLeadToGoogleSheets(leadData, chatHistoryText) {
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: leadData.name || '',
                phone: leadData.phone || '',
                email: leadData.email || '',
                interest: leadData.interest || '',
                intentLevel: leadData.intent_level || '',
                source: window.location.href,
                sessionId: AI_CHAT_SESSION_ID,
                chatHistory: chatHistoryText,
                timestamp: new Date().toLocaleString('vi-VN')
            })
        });
        console.log("📤 Đã đồng bộ dữ liệu vào Google Sheets!");
    } catch (err) {
        console.warn("⚠️ Không gửi được dữ liệu lead:", err);
    }
}

async function handleChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // UI Updates
    chatInput.value = '';
    addMessage('user', text);
    showTyping();

    // Prepare message history
    messages.push({ role: 'user', content: text });

    try {
        const response = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: messages,
        });

        let aiResponse = response.choices[0].message.content;
        // Bóc tách lead data trước khi hiển thị
        const cleanResponse = processAIResponse(aiResponse, messages);
        removeTyping();
        addMessage('assistant', cleanResponse);
        messages.push({ role: 'assistant', content: aiResponse }); // Lưu bản gốc vào history

    } catch (error) {
        removeTyping();
        addMessage('assistant', "Rất tiếc, đã có lỗi xảy ra khi kết nối với AI. Bạn vui lòng thử lại sau nhé!");
        console.error("AI Error:", error);
    }
}

// 6. Event Listeners
chatbotToggle.addEventListener('click', () => {
    chatbotWindow.style.display = chatbotWindow.style.display === 'flex' ? 'none' : 'flex';
    if (chatbotWindow.style.display === 'flex' && chatMessages.children.length === 0) {
        addMessage('assistant', DEFAULT_WELCOME);
    }
});

closeBtn.addEventListener('click', () => {
    chatbotWindow.style.display = 'none';
});

refreshBtn.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('span');
    icon.classList.add('rotating');
    
    // Clear state
    chatMessages.innerHTML = '';
    messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    // Tạo Session ID mới khi reset chat
    AI_CHAT_SESSION_ID = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    
    setTimeout(() => {
        icon.classList.remove('rotating');
        addMessage('assistant', DEFAULT_WELCOME);
    }, 500);
});

sendBtn.addEventListener('click', handleChat);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChat();
});
