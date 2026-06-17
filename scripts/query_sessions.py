import sqlite3
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

db_path = r'C:\Users\zxyma\AppData\Roaming\Trae CN\User\workspaceStorage\6ad9643dbaba43614e94a3931651a743\state_copy.vscdb'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

output_file = r'e:\mycareer\scripts\trae_session_map.txt'
with open(output_file, 'w', encoding='utf-8') as f:
    # 查询 icube_session_agent_map
    f.write("=== icube_session_agent_map ===\n")
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
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

    # 查询所有 sessionRelation 键
    f.write("=== All sessionRelation keys ===\n")
    cursor.execute("SELECT key, value FROM ItemTable WHERE key LIKE '%sessionRelation%'")
    for row in cursor.fetchall():
        value = row[1]
        if isinstance(value, bytes):
            text = value.decode('utf-8', errors='replace')
        else:
            text = str(value)
        f.write(f"Key: {row[0]}\n")
        f.write(f"Value: {text}\n\n")

    # 查询 ChatStore 中的所有 session ID
    f.write("=== ChatStore session IDs ===\n")
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
    row = cursor.fetchone()
    if row:
        value = row[0]
        if isinstance(value, bytes):
            text = value.decode('utf-8', errors='replace')
        else:
            text = str(value)
        try:
            data = json.loads(text)
            f.write(f"State keys: {list(data.get('state', {}).keys())}\n")
            turns_height = data.get('state', {}).get('turnsHeight', {})
            f.write(f"Number of turns: {len(turns_height)}\n")
            # 提取所有 session ID (格式: sessionId-turnId)
            session_ids = set()
            for key in turns_height.keys():
                session_id = key.split('-')[0]
                session_ids.add(session_id)
            f.write(f"Unique session IDs:\n")
            for sid in sorted(session_ids):
                f.write(f"  - {sid}\n")
        except json.JSONDecodeError as e:
            f.write(f"JSON parse error: {e}\n")

conn.close()
print(f"Output written to {output_file}")
