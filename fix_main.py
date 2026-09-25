import sys

with open('src/main.ts', 'r') as f:
    content = f.read()

old_str = "app.useStaticAssets(path.join(process.cwd(), 'uploads', 'avatars'), {\n    prefix: '/uploads/avatars',\n  });"
new_str = "app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });"

content = content.replace(old_str, new_str)
content = content.replace("const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');", "const uploadDir = path.join(process.cwd(), 'uploads');")

with open('src/main.ts', 'w') as f:
    f.write(content)
