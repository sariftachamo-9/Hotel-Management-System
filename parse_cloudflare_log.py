import re

with open('cloudflare.log', 'rb') as f:
    data = f.read()

# Remove all whitespace, \r, \n, \x08 from the data or decode it
# Actually, let's just decode it, remove \r and \n, and search:
text = data.decode('utf-8', errors='ignore')

# Just find 'trycloudflare.com' and print 50 chars before and after
matches = [m.start() for m in re.finditer(r'trycloudflare\.com', text)]
for idx in matches:
    start = max(0, idx - 60)
    end = min(len(text), idx + 20)
    print("Match:", repr(text[start:end]))

# Also try to extract with regex ignoring spaces/newlines in the middle maybe?
text_clean = text.replace('\r', '').replace('\n', '').replace('\x08', '')
match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', text_clean)
if match:
    print("Clean Match:", match.group(0))
