#!/bin/bash

# Change directory to mv02
cd backfastapi || { echo "Directory backfastapi not found"; exit 1; }

uvicorn app:app --host 0.0.0.0 --port 8000