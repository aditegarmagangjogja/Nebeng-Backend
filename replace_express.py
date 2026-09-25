import re

path = r'd:\MAGANG\Nebeng\nebeng-backend\src\upload.controller.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Response } from 'express';", "import type { Response } from 'express';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
