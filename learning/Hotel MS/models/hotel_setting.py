import json

from . import db
from datetime import datetime

class HotelSetting(db.Model):
    __tablename__ = 'hotel_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(255))
    map_embed_url = db.Column(db.Text)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    
    # Times (stored as strings "HH:MM")
    check_in_time = db.Column(db.String(10), default="14:00")
    check_out_time = db.Column(db.String(10), default="11:00")
    
    # Policies
    policy_smoking = db.Column(db.Text)
    policy_pets = db.Column(db.Text)
    policy_cancellation = db.Column(db.Text)
    policy_id_req = db.Column(db.Text)
    gallery_images = db.Column(db.Text)

    def get_gallery_images(self):
        """Return gallery images as a list of {title, url} dictionaries."""
        raw = (self.gallery_images or "").strip()
        if not raw:
            return []

        try:
            data = json.loads(raw)
            if isinstance(data, list):
                normalized = []
                for item in data:
                    if isinstance(item, dict):
                        url = (item.get('url') or item.get('image') or item.get('path') or '').strip()
                        title = (item.get('title') or item.get('name') or '').strip()
                    else:
                        url = str(item).strip()
                        title = ''
                    if not url:
                        continue
                    normalized.append({
                        'title': title or url.rsplit('/', 1)[-1].rsplit('.', 1)[0].replace('-', ' ').title(),
                        'url': url
                    })
                return normalized
        except Exception:
            pass

        entries = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            if '|' in line:
                title, url = line.split('|', 1)
                title = title.strip()
                url = url.strip()
            else:
                title, url = '', line
            if not url:
                continue
            entries.append({
                'title': title or url.rsplit('/', 1)[-1].rsplit('.', 1)[0].replace('-', ' ').title(),
                'url': url
            })
        return entries
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'address': self.address,
            'map_embed_url': self.map_embed_url,
            'phone': self.phone,
            'email': self.email,
            'check_in_time': self.check_in_time,
            'check_out_time': self.check_out_time,
            'policies': {
                'smoking': self.policy_smoking,
                'pets': self.policy_pets,
                'cancellation': self.policy_cancellation,
                'id_requirement': self.policy_id_req
            },
            'gallery_images': self.get_gallery_images()
        }
