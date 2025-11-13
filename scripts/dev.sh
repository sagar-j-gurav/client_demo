#!/bin/bash

# Create and activate virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run the application
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
