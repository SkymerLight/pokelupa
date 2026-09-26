chrome.runtime.onInstalled.addListener(async detalhes => {
  if (detalhes.reason !== "update") return;
  const abas = await chrome.tabs.query({ url: "https://*.idleworld.online/*" });
  for (const aba of abas) chrome.tabs.reload(aba.id);
});

chrome.runtime.onMessage.addListener(mensagem => {
  if (mensagem && mensagem.tipo === "abrirAtualizador") {
    chrome.tabs.create({ url: chrome.runtime.getURL("atualizador/atualizar.html?auto=1") });
  }
});
