import re

def find_url(filename):
    try:
        with open(filename, 'rb') as f:
            data = f.read()
            
        encodings = ['utf-16le', 'utf-8', 'latin-1']
        for enc in encodings:
            try:
                content = data.decode(enc, errors='ignore')
                # Find the full link
                matches = re.findall(r'https?://[a-zA-Z0-9-]+\.trycloudflare\.com', content)
                if matches:
                    return matches
            except:
                continue
        return "URL not found"
    except Exception as e:
        return [str(e)]

urls = find_url('cloudflare_link.txt')
for url in urls:
    print(url)
