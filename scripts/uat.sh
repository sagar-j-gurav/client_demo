#!/bin/bash

# Create and activate virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start the application with PM2
pm2 start "python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000" --name "rag-fastapi-uat"
