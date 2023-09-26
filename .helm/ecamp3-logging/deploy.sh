#!/bin/bash

set -e

SCRIPT_DIR=$(realpath "$(dirname "$0")")

helm upgrade --install --dry-run ecamp3-logging $SCRIPT_DIR
