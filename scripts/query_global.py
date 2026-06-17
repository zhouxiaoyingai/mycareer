import sqlite3
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

db_path = r'C:\Users\zxyma\AppData\Roaming\Trae CN\User\globalStorage\state_copy.vscdb'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

output_file = r'e:\mycareer\scripts\trae_global_storage.txt'
with open(output_file, 'w', encoding='utf-8') as f:
    # 列出所有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    f.write(f"Tables: {tables}\n\n")

    # 列出所有键和值长度
    f.write("=== All keys and value lengths ===\n")
    cursor.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC")
    for row in cursor.fetchall():
        f.write(f"{row[1]:>10} chars | {row[0]}\n")

    f.write("\n\n=== Keys containing 'chat', 'session', 'conversation', 'message', 'history' ===\n")
    cursor.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%chat%' OR key LIKE '%session%' OR key LIKE '%conversation%' OR key LIKE '%message%' OR key LIKE '%history%' OR key LIKE '%ai%' ORDER BY length(value) DESC")
    for row in cursor.fetchall():
        f.write(f"{row[1]:>10} chars | {row[0]}\n")

conn.close()
print(f"Output written to {output_file}")
