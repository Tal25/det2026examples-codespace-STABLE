#!/usr/bin/env bash
set -e
PORT=${1:-8080}
echo "Serving at http://localhost:$PORT"
echo "Press ctrl+c to stop"
python3 -m http.server "$PORT" --directory src
