#!/bin/bash

docker build \
  -t ghcr.io/chatnationwork/tax-app:prod \
  -t ghcr.io/chatnationwork/tax-app:prod_0.1.1 .
