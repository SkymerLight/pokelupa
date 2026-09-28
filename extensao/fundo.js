const chaveNovidade = "pokelupa:novidade";
const intervaloMinutos = 30;

function versaoMaior(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function checarVersao() {
  const manifesto = chrome.runtime.getManifest();
  const site = (manifesto.homepage_url || "").replace(/\/?$/, "/");
  try {
    const info = await fetch(`${site}download/versao.json?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
    await chrome.storage.local.set({ [chaveNovidade]: { versao: info.versao, resumo: info.resumo || "", checadoEm: Date.now() } });
    const tem = versaoMaior(info.versao, manifesto.version);
    await chrome.action.setBadgeText({ text: tem ? "NEW" : "" });
    if (tem) await chrome.action.setBadgeBackgroundColor({ color: "#dca63c" });
  } catch (erro) {}
}

function agendar() {
  chrome.alarms.create("checarVersao", { delayInMinutes: 1, periodInMinutes: intervaloMinutos });
}

chrome.runtime.onInstalled.addListener(async detalhes => {
  agendar();
  checarVersao();
  if (detalhes.reason !== "update") return;
  const abas = await chrome.tabs.query({ url: "https://*.idleworld.online/*" });
  for (const aba of abas) chrome.tabs.reload(aba.id);
});

chrome.runtime.onStartup.addListener(() => {
  agendar();
  checarVersao();
});

chrome.alarms.onAlarm.addListener(alarme => {
  if (alarme.name === "checarVersao") checarVersao();
});

chrome.runtime.onMessage.addListener(mensagem => {
  if (mensagem && mensagem.tipo === "abrirAtualizador") {
    chrome.tabs.create({ url: chrome.runtime.getURL("atualizador/atualizar.html?auto=1") });
  } else if (mensagem && mensagem.tipo === "checarVersao") {
    checarVersao();
  }
});
