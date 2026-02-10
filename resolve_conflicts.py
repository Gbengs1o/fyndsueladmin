import sys
import os

def resolve_conflict(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    in_conflict = False
    in_ours = False
    in_theirs = False

    for line in lines:
        if line.startswith('<<<<<<<'):
            in_conflict = True
            in_ours = True
            continue
        elif line.startswith('======='):
            in_ours = False
            in_theirs = True
            continue
        elif line.startswith('>>>>>>>'):
            in_conflict = False
            in_theirs = False
            continue
        
        if not in_conflict:
            new_lines.append(line)
        elif in_ours:
            new_lines.append(line)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        if os.path.exists(arg):
            print(f"Resolving: {arg}")
            resolve_conflict(arg)
