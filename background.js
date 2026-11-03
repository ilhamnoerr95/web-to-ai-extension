// =============================================
// background.js — Service worker
// =============================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('Web to AI extension installed.');
});

// Handle pesan antar komponen jika diperlukan
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'ping') {
    sendResponse({ status: 'ok' });
  }
  return true;
});
