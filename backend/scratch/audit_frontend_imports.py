import os, re

def check_js_files():
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'src'))
    print(f"Scanning JS/JSX files in {frontend_dir} for missing useAuth / undefined user references...")
    
    issues_found = []
    for root, dirs, files in os.walk(frontend_dir):
        for f in files:
            if f.endswith('.jsx') or f.endswith('.js'):
                filepath = os.path.join(root, f)
                with open(filepath, 'r', encoding='utf-8') as file:
                    content = file.read()
                    
                has_user_ref = bool(re.search(r'\buser\?\.|\buser\.', content))
                has_use_auth_import = 'useAuth' in content
                has_use_auth_call = bool(re.search(r'const\s+\{.*user.*\}\s*=\s*useAuth\(\)', content))
                
                if has_user_ref and not (has_use_auth_import and has_use_auth_call):
                    issues_found.append((os.path.relpath(filepath, frontend_dir), has_use_auth_import, has_use_auth_call))
                    
    print("\nScan Results:")
    if not issues_found:
        print("  [OK] No missing useAuth calls found.")
    else:
        for item, imp, call in issues_found:
            print(f"  [ERROR] File: {item} | useAuth imported: {imp} | useAuth called: {call}")

if __name__ == '__main__':
    check_js_files()
