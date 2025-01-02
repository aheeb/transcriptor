#!/bin/bash

# Navigate to project directory
cd /root/transcriptor

# Pull latest changes
git pull

# Install dependencies
npm install

# Generate Prisma client and build
npm run build

# Restart PM2 process
pm2 restart transcriptor 