"""Scrapbox「映像表現辞典(未整理)」から data/techs.json を作り直す。

使い方:  python tools/update_data.py
標準ライブラリだけで動く。YouTubeで見られない作例（削除済みなど）は除外する。
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

PROJECT = "movieclub"
PAGE = "映像表現辞典(未整理)"
OUT = Path(__file__).resolve().parent.parent / "data" / "techs.json"

YT_RE = re.compile(r"(?:youtu\.be/|yotu\.be/|[?&]v=|shorts/|embed/)([\w-]{11})")
URL_RE = re.compile(r"https?://[^\s\]]+")


def fetch_lines():
    url = "https://scrapbox.io/api/pages/%s/%s" % (PROJECT, urllib.parse.quote(PAGE, safe=""))
    with urllib.request.urlopen(url, timeout=30) as r:
        data = json.load(r)
    return [l["text"] for l in data["lines"]]


def clean(s):
    s = re.sub(r"\[\*+ ?", "", s)
    s = s.replace("[", "").replace("]", "")
    return s.strip()


def parse(lines):
    techs, sec, sub, tech, item = [], "", "", None, None
    for raw in lines[1:]:
        s = raw.strip()
        if not s or "[映像表現辞典(未整理)#" in s:  # 目次の行
            continue
        if s.startswith("・"):
            if tech is None:
                continue
            body = s[1:]
            m = YT_RE.search(body)
            title = URL_RE.sub("", body).strip().strip("[]").strip()
            item = {"id": m.group(1) if m else None, "title": title, "n": ""}
            tech["v"].append(item)
        elif s.startswith(">"):
            txt = URL_RE.sub("", s[1:]).strip()
            if tech is None:
                continue
            if raw.startswith((" ", "\t", "　")) and item is not None:
                item["n"] += txt
            else:
                tech["d"] += txt
        elif s.startswith("▼"):
            tech = {"s": sec, "b": sub, "t": clean(s[1:]), "d": "", "v": []}
            techs.append(tech)
            item = None
        elif s.startswith("▽"):
            sub, tech, item = clean(s[1:]), None, None
        elif "□" in s and (s.startswith("[") or s.startswith("□")):
            sec, sub, tech, item = clean(s).replace("□", "").strip(), "", None, None
    return techs


def alive(vid):
    try:
        req = urllib.request.Request("https://i.ytimg.com/vi/%s/mqdefault.jpg" % vid, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    techs = parse(fetch_lines())
    ids = sorted({v["id"] for t in techs for v in t["v"] if v["id"]})
    with ThreadPoolExecutor(16) as ex:
        ok = dict(zip(ids, ex.map(alive, ids)))
    seen = {}
    out = []
    for t in techs:
        t["v"] = [v for v in t["v"] if v["id"] and ok.get(v["id"])]
        if not t["t"] or not t["v"]:
            continue
        if t["t"] in seen:  # 別の分類に同名の手法がある
            t["t"] = "%s(%s)" % (t["t"], t["s"])
        seen[t["t"]] = True
        out.append(t)
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    n_old = len({v["id"] for t in old for v in t["v"]})
    n_new = len({v["id"] for t in out for v in t["v"]})
    print("手法 %d → %d / 作例 %d → %d（除外した動画 %d本）" % (
        len(old), len(out), n_old, n_new, sum(1 for v in ok.values() if not v)))
    jiten_path = OUT.parent / "jiten.json"
    jiten = json.loads(jiten_path.read_text(encoding="utf-8")) if jiten_path.exists() else {}
    missing = sorted({t["t"] for t in out} - set(jiten))
    if missing:
        print("jiten.json に項目がない手法（読み・説明を書き足す）:", " / ".join(missing))


if __name__ == "__main__":
    sys.exit(main())
