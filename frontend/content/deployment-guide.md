# Deployment Guide for Real User Testing

To get this Next.js + FastAPI + SQLite application online for real users, you have two primary paths based on your comfort level: **Zone.ee (Shared/VPS)** or **AWS (EC2 / AppRunner)**.

Since you mentioned you enjoy setting up Linux environments, the simplest and most robust approach for catching bugs in a real-world scenario is a **single Virtual Private Server (VPS)**. Both AWS (via EC2) and Zone.ee (via Cloud/VPS) offer this.

Here is the step-by-step strategy for deploying on a single Linux machine.

---

## The Strategy: Single-Server Linux Deployment
We will run both the Python backend and the React frontend on the same server, ensuring the SQLite database file persists locally.

1. **Backend**: Run FastAPI using `uvicorn` and manage it with a process manager like `systemd` or `pm2`.
2. **Frontend**: Build the Next.js app and run its production Node server.
3. **Reverse Proxy (Nginx)**: Use Nginx to route traffic. Port 80/443 goes to Nginx. Nginx routes `/api/...` to the Python backend (port 8000) and everything else to the Next.js frontend (port 3000).

---

## Step 1: Server Provisioning
Choose your provider and spin up an Ubuntu Server (24.04 or 22.04 LTS).

*   **AWS:** Go to EC2 -> Launch Instance. Choose Ubuntu. A `t3.micro` or `t3.small` is perfect for testing. Make sure your Security Group allows HTTP (80), HTTPS (443), and SSH (22).
*   **Zone.ee:** If using their Cloud VPS service, spin up an Ubuntu instance and ensure the firewall allows ports 80 and 443. *(Note: Shared web hosting via cPanel is often difficult for modern Next.js/FastAPI apps. A VPS is highly recommended).*

## Step 2: Preparing the Environment
SSH into your new server and install the necessary dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nginx git curl

# Install Node.js (for Next.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager to keep apps running forever)
sudo npm install -g pm2
```

## Step 3: Getting Your Code on the Server
Clone your repository (you'll need to push your local code to GitHub or GitLab first).

```bash
git clone https://github.com/yourusername/matchmaking-app.git
cd matchmaking-app
```

## Step 4: Setting up the Backend (FastAPI)
Navigate to the backend folder, create a virtual environment, and install requirements.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Start the backend daemon using PM2 so it restarts automatically if it crashes:
```bash
pm2 start "venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000" --name "matchmaking-backend"
```

## Step 5: Setting up the Frontend (Next.js)
Before building the frontend, we need to make sure it knows where to talk to the API. 
Edit `.env` (or set the environment variable) in the frontend folder so it points to the Nginx `/api` route we will create.

```bash
cd ../frontend
# Update the API URL inside your code to point to /api/ instead of localhost:8000
# (You will need to do a quick codebase search/replace to change hardcoded `http://localhost:8000` to `/api`)

npm install
npm run build
```

Start the frontend daemon:
```bash
pm2 start "npm start" --name "matchmaking-frontend"
pm2 save # Saves the PM2 process list so they start on server reboot
```

## Step 6: Configuring Nginx (The Traffic Cop)
Nginx will listen on port 80 and forward requests.

Create a new configuration file:
```bash
sudo nano /etc/nginx/sites-available/matchmaking
```

Paste this configuration (replace `yourdomain.com` with your actual domain or server IP):
```nginx
server {
    listen 80;
    server_name yourdomain.com; # Or your server's public IP address

    # Route /api/ requests to the Python Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/; # Notice the trailing slash! It strips /api/ before hitting FastAPI
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Route everything else to the Next.js Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/matchmaking /etc/nginx/sites-enabled/
sudo nginx -t # Test for syntax errors
sudo systemctl restart nginx
```

## Final Step: SSL/HTTPS (Crucial for Magic Links)
Browsers heavily restrict what cookies and local storage features work on plain HTTP. You *must* have HTTPS.

If you have a domain name pointed at your server's IP, use Certbot to get a free SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Code Changes Required Before Deploying
Before you push this to your server, you need to make one critical change to your codebase: **Remove Hardcoded Localhost URLs**.

Right now, your frontend files (like `app/host/create/page.tsx`) have hardcoded URLs:
`fetch('http://localhost:8000/events...')`

You need to change all of these to relative paths so Nginx can proxy them:
`fetch('/api/events...')`

Would you like me to run a batch find-and-replace right now to strip out `http://localhost:8000` and replace it with `/api` across your React components so they are ready for production deployment?
