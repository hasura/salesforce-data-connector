#!/bin/bash

set -euo pipefail

function setup() {
  DEPLOY_DIR="$HOME/promptql-apps/salesforce-data-connector"

  mkdir -p "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"

  if [ ! -d "$DEPLOY_DIR/.git" ]; then
      git clone git@github.com:hasura/salesforce-data-connector.git .
  fi

  git checkout hasura/prodapp
}

function dc() {
    docker compose -f compose.prod.yaml -p salesforce "$@"
}

git fetch
git reset --hard origin/hasura/prodapp

cd app/connector/myduckduckapi

dc down --remove-orphans

dc up --build -d
