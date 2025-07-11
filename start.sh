#!/bin/bash
set -a # automatically export all variables
source .env
set +a
node server.js > crash.log 2>&1