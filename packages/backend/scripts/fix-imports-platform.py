#!/usr/bin/env python3
"""Rewrite imports after services/middleware/types → platform/."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src"

def transform(text: str, file: Path) -> str:
    t = text
    # ../../services/X → ../../platform/X
    t = re.sub(r"from '(\.\./)+services/([^']+)'", lambda m: f"from '{m.group(0)[: m.group(0).find('services/')]}platform/{m.group(2)}'", t)
    t = re.sub(r'from "(\.\./)+services/([^"]+)"', lambda m: f'from "{m.group(0)[: m.group(0).find("services/")]}platform/{m.group(2)}"', t)

    # simpler replacements
    for a, b in [
        ("from '../../services/", "from '../../platform/"),
        ('from "../../services/', 'from "../../platform/'),
        ("from '../services/", "from '../platform/"),
        ("from './services/", "from './platform/"),
        ("from '../../middleware/", "from '../../platform/middleware/"),
        ("from '../middleware/", "from '../platform/middleware/"),
        ("from './middleware/", "from './platform/middleware/"),
        ("from '../../types'", "from '../../platform/types'"),
        ("from '../../types/", "from '../../platform/types/"),
        ("from '../types'", "from '../platform/types'"),
        ("from '../types/", "from '../platform/types/"),
        ("from './types'", "from './platform/types'"),
        ("from './types/", "from './platform/types/"),
        # platform internal files: ../types was for services->types
    ]:
        t = t.replace(a, b)

    # Inside platform/*.ts: types should be ./types, config is ../config
    if "platform" in file.parts and file.parent.name == "platform":
        t = t.replace("from '../platform/types'", "from './types'")
        t = t.replace("from '../platform/types/", "from './types/")
        t = t.replace("from '../../platform/types'", "from './types'")
        # logger, dice etc same folder
        t = t.replace("from '../platform/", "from './")
        # modules from platform: ../modules
        # ai-client: from '../modules/runtime/rte' stay if was that
        t = t.replace("from './modules/", "from '../modules/")
        # config from platform
        t = t.replace("from '../config/", "from '../config/")  # already correct
        # player-state imports findLocation from worldgen same folder
        t = t.replace("from './worldgen'", "from './worldgen'")
        # middleware from platform/*.ts
        t = t.replace("from '../middleware/", "from './middleware/")
        t = t.replace("from './platform/middleware/", "from './middleware/")

    if "platform" in file.parts and file.parent.name == "middleware":
        t = t.replace("from '../platform/types'", "from '../types'")
        t = t.replace("from '../../platform/types'", "from '../types'")
        t = t.replace("from '../logger'", "from '../logger'")
        t = t.replace("from '../../services/logger'", "from '../logger'")
        t = t.replace("from '../services/logger'", "from '../logger'")
        t = t.replace("from '../../platform/logger'", "from '../logger'")
        t = t.replace("from '../modules/", "from '../../modules/")
        t = t.replace("from '../../modules/runtime/rte'", "from '../../modules/runtime/rte'")

    if "platform" in file.parts and file.parent.name == "types":
        pass

    # modules/*/routes that still use platform path - good
    # Fix double platform
    t = t.replace("platform/platform/", "platform/")
    t = t.replace("from '../../platform/types'", "from '../../platform/types'")
    return t

def main():
    n = 0
    for p in ROOT.rglob("*.ts"):
        if "node_modules" in str(p) or "dist" in str(p):
            continue
        orig = p.read_text(encoding="utf-8")
        new = transform(orig, p)
        if new != orig:
            p.write_text(new, encoding="utf-8")
            n += 1
            print("updated", p.relative_to(ROOT))
    print("files", n)

if __name__ == "__main__":
    main()
