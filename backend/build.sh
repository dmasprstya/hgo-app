#!/usr/bin/env bash
set -o errexit

# Try to install libmagic (available on Render/Linux, skipped elsewhere)
if command -v apt-get &> /dev/null; then
    apt-get install -y libmagic1 || true
fi

pip install -r requirements.txt
alembic upgrade head
