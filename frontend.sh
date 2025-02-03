#!/bin/bash

# Change directory to mv02
cd mv02 || { echo "Directory mv02 not found"; exit 1; }

# Run npm run dev
npm run dev