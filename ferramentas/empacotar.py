import json
import sys
import zipfile
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
pastaExtensao = raiz / "extensao"
destino = raiz / "download" / "pokelupa.zip"
versao = json.loads((pastaExtensao / "manifest.json").read_text(encoding="utf-8"))["version"]

destino.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as pacote:
    for arquivo in sorted(pastaExtensao.rglob("*")):
        if arquivo.is_file() and arquivo.name != "icone256.png":
            pacote.write(arquivo, Path("pokelupa") / arquivo.relative_to(pastaExtensao))

resumo = " ".join(sys.argv[1:]).strip()
(raiz / "download" / "versao.json").write_text(json.dumps({"versao": versao, "resumo": resumo}, ensure_ascii=False), encoding="utf-8")
print(f"pokelupa.zip v{versao} gerado ({destino.stat().st_size // 1024} KB)")
