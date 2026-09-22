#!/bin/bash
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' -e "ssh -o StrictHostKeyChecking=no -i ~/.ssh/sheba_hetzner" . root@188.245.212.240:/var/www/sheba-website-admin-dashboard/
ssh -o StrictHostKeyChecking=no -i ~/.ssh/sheba_hetzner root@188.245.212.240 "cd /var/www/sheba-website-admin-dashboard && docker compose -f docker-compose.prod.yml up -d --build"
