#!/bin/bash

docker build \
  -t ghcr.io/chatnationwork/tax-app:latest \
  -t ghcr.io/chatnationwork/tax-app:0.1.8 .
