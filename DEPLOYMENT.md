# Deploying to the university EC2 instance (manual)

> Use only the EC2 instance provided by the university. Do not deploy to a personal AWS account.
> Commands below assume Ubuntu; for Amazon Linux use `dnf`/`yum` instead of `apt`.

## 1. Network / security hygiene

In the instance's **security group**, allow inbound:
- **22 (SSH)** from your own IP only (not `0.0.0.0/0`)
- **80 (HTTP)** from anywhere (or from the range your markers use)

Do **not** open the MongoDB port (27017) or the Node port (5000) to the internet. Keep the instance profile / subnet exactly as provided.

## 2. Install prerequisites

```bash
sudo apt update
sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

**MongoDB:** either install MongoDB Community on the instance (bound to `127.0.0.1` only) or use a MongoDB Atlas cluster and put its connection string in `MONGODB_URI`.

## 3. Get the code and configure secrets

```bash
git clone <your-github-repo-url> cafe-orders
cd cafe-orders/server
cp .env.example .env
nano .env
```

Set in `.env` (this file is never committed):

```
NODE_ENV=production
PORT=5000
MONGODB_URI=<your connection string>
JWT_SECRET=<output of: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
ADMIN_EMAIL=<your admin email>
ADMIN_PASSWORD=<a strong password>
```

## 4. Build and start

```bash
cd ~/cafe-orders/client && npm install && npm run build
cd ../server && npm install --omit=dev
npm run seed                         # creates admin + sample menu (safe to re-run)
pm2 start server.js --name cafe-orders
pm2 save && pm2 startup              # restart on reboot (run the command it prints)
```

## 5. Reverse proxy on port 80

Create `/etc/nginx/sites-available/cafe-orders`:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cafe-orders /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Verify

```bash
curl http://localhost:5000/api/health      # {"ok":true}
```

Then open `http://<EC2 public DNS>` in a browser, log in as admin, register a customer in another browser, and place an order.

## Updating

```bash
cd ~/cafe-orders && git pull
cd client && npm install && npm run build
cd ../server && npm install --omit=dev && pm2 restart cafe-orders
```

## Troubleshooting

- `pm2 logs cafe-orders` shows server errors.
- "JWT_SECRET is missing" on start means `.env` isn't being read from the `server/` folder.
- 502 from nginx means the Node process isn't running (`pm2 status`).
