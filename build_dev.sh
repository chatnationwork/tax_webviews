#!/bin/bash

docker build \
  -t ghcr.io/chatnationwork/tax-app:dev_0.1.1 \
  -t ghcr.io/chatnationwork/tax-app:staging_0.1.1 \
  -t ghcr.io/chatnationwork/tax-app:prod_0.1.1 \
  -t ghcr.io/chatnationwork/tax-app:0.1.1 .
