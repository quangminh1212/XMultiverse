from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src"
n = 0
for p in ROOT.rglob("*.ts"):
    t = p.read_text(encoding="utf-8")
    o = t
    # from 'from '../../path'  or from 'from './path'
    t = re.sub(r"from 'from '((?:\.\./|\./)[^']+)'", r"from '\1'", t)
    t = re.sub(r'from "from "((?:\.\./|\./)[^"]+)"', r'from "\1"', t)
    t = t.replace("from 'from '", "from '")
    t = t.replace('from "from "', 'from "')
    if t != o:
        p.write_text(t, encoding="utf-8")
        n += 1
        print("fixed", p.relative_to(ROOT))
print("count", n)
still = []
for p in ROOT.rglob("*.ts"):
    t = p.read_text(encoding="utf-8")
    if "from 'from " in t or 'from "from ' in t:
        still.append(p)
        for i, line in enumerate(t.splitlines(), 1):
            if "from 'from" in line or 'from "from' in line:
                print("STILL", p, i, line)
print("still files", len(still))
