import sqlite3
import json
import sys
import io

# 强制 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

db_path = r'C:\Users\zxyma\AppData\Roaming\Trae CN\User\workspaceStorage\6ad9643dbaba43614e94a3931651a743\state_copy.vscdb'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

output_file = r'e:\mycareer\scripts\trae_history_output.txt'
with open(output_file, 'w', encoding='utf-8') as f:
    # 查询输入历史
    f.write("=== icube-ai-agent-storage-input-history ===\n")
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
    row = cursor.fetchone()
    if row:
        value = row[0]
        if isinstance(value, bytes):
            text = value.decode('utf-8', errors='replace')
        else:
            text = str(value)
        f.write(f"Length: {len(text)} chars\n")
        f.write("Content:\n")
        f.write(text)
        f.write("\n\n")

    # 查询 currentAgentData
    f.write("=== currentAgentData_3436399573600554 ===\n")
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'currentAgentData_3436399573600554'")
    row = cursor.fetchone()
    if row:
        value = row[0]
        if isinstance(value, bytes):
            text = value.decode('utf-8', errors='replace')
        else:
            text = str(value)
        f.write(f"Length: {len(text)} chars\n")
        f.write("Content:\n")
        f.write(text)
        f.write("\n\n")

    # 查询 history.entries
    f.write("=== history.entries ===\n")
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'history.entries'")
    row = cursor.fetchone()
    if row:
        value = row[0]
        if isinstance(value, bytes):
            text = value.decode('utf-8', errors='replace')
        else:
            text = str(value)
        f.write(f"Length: {len(text)} chars\n")
        f.write("Content:\n")
        f.write(text)
        f.write("\n\n")

    # 查询 memento/icube-ai-agent-storage
    f.write("=== memento/icube-ai-agent-storage ===\n")
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
    row = cursor.fetchone()
    if row:
        value = row[0]
        if isinstance(value, bytes):
            text = value.decode('utf-8', errors='replace')
        else:
            text = str(value)
        f.write(f"Length: {len(text)} chars\n")
        f.write("Content:\n")
        f.write(text)
        f.write("\n\n")

    # 查询所有包含 session 的键
    f.write("=== All keys containing 'session' ===\n")
    cursor.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%session%'")
    for row in cursor.fetchall():
        f.write(f"{row[1]:>8} chars | {row[0]}\n")

conn.close()
print(f"Output written to {output_file}")
