#!/bin/bash
# ============================================
# NEXUS - DigitalOcean Droplet Setup Script
# Run this on your fresh Ubuntu droplet
# ============================================

set -e

echo "🚀 NEXUS Deployment Script"
echo "=========================="

# ===== 1. System Updates =====
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# ===== 2. Install Python 3.11+ =====
echo "🐍 Installing Python..."
apt install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx ufw

# ===== 3. Firewall Setup =====
echo "🔒 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8000
ufw --force enable

# ===== 4. Clone the Repository =====
echo "📂 Setting up NEXUS..."
cd /opt
if [ -d "qwen-agent" ]; then
    cd qwen-agent
    git pull
else
    echo ""
    echo "⚠️  Clone your repo manually:"
    echo "   git clone https://github.com/YOUR_USERNAME/qwen-agent.git"
    echo "   Then re-run this script."
    echo ""
    exit 1
fi

# ===== 5. Python Virtual Environment =====
echo "🔧 Setting up Python environment..."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# ===== 6. Create .env file =====
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  Creating .env file..."
    echo "   You need to fill in your GROQ_API_KEY!"
    echo ""
    cp .env.example .env
    echo ""
    echo "📝 Edit your .env file:"
    echo "   nano /opt/qwen-agent/.env"
    echo ""
fi

# ===== 7. Create Systemd Service =====
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/nexus.service << 'EOF'
[Unit]
Description=NEXUS AI Agent Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/qwen-agent
EnvironmentFile=/opt/qwen-agent/.env
ExecStart=/opt/qwen-agent/.venv/bin/uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexus
systemctl start nexus

# ===== 8. Configure Nginx Reverse Proxy =====
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/nexus << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_buffering off;

        # SSE support
        proxy_cache off;
        proxy_set_header Cache-Control no-cache;
    }
}
EOF

ln -sf /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "✅ NEXUS Backend is deployed!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit your .env file:  nano /opt/qwen-agent/.env"
echo "      - Set your GROQ_API_KEY"
echo "      - Set FRONTEND_URL to your Vercel URL"
echo "      - Set PRODUCTION=true"
echo ""
echo "   2. Restart the service:  systemctl restart nexus"
echo ""
echo "   3. Check status:         systemctl status nexus"
echo ""
echo "   4. View logs:            journalctl -u nexus -f"
echo ""
echo "   5. Test:  curl http://YOUR_DROPLET_IP/api/health"
echo ""
echo "   6. (Optional) Add SSL with: certbot --nginx -d yourdomain.me"
echo ""
