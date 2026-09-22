cat << 'EOF' > /etc/nginx/sites-available/nextjs
server {
    listen 80;
    server_name helloprobashsheba.com www.helloprobashsheba.com helloomansheba.com www.helloomansheba.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Reload nginx to pick up the basic port 80 config
systemctl reload nginx

# Run certbot to obtain and configure SSL for all 4 domains
certbot --nginx -d helloprobashsheba.com -d www.helloprobashsheba.com -d helloomansheba.com -d www.helloomansheba.com --non-interactive --agree-tos --email admin@helloprobashsheba.com --redirect --expand
