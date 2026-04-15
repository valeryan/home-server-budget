#!/bin/sh

set -eu

MODEL="${OLLAMA_MODEL:-gemma4:e2b}"

ollama serve &
OLLAMA_PID=$!

cleanup() {
  kill "$OLLAMA_PID" 2>/dev/null || true
}

trap cleanup INT TERM

sleep 8

if ! ollama list | grep -q "$MODEL"; then
  ollama pull "$MODEL"
fi

wait "$OLLAMA_PID"
