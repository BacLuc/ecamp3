#!/bin/sh

set -e

SCRIPT_DIR=$(dirname $(realpath $0))
SQUASHED_VERSION="11squashed"

FIRST_PHP_FILE=$(ls ${SCRIPT_DIR}/Version*.php | head -1)
NEW_PHP_FILE=${SCRIPT_DIR}/Version${SQUASHED_VERSION}.php

#cp ${FIRST_PHP_FILE} ${NEW_PHP_FILE}
#sed -i "s/Version[0-9]*/Version${SQUASHED_VERSION}/" ${NEW_PHP_FILE}
## remove the lines between //START PHP CODE and //END PHP Code in ${LAST_PHP_FILE}
#sed -i '/\/\/ START PHP CODE/,/\/\/ END PHP CODE/{/\/\/ START PHP CODE/!{/\/\/ END PHP CODE/!d}}' ${LAST_PHP_FILE}

docker compose exec database pg_dump \
                                -U ecamp3 \
                                -d ecamp3dev \
                                --schema-only \
  | grep -v -e "pg_dump" \
  | grep -v "^--" \
  | grep -v "pg_dump" \
  | grep -v "^SET" \
  | grep -v "^SELECT pg_catalog" \
  | grep -v "\restrict" \
  | $(which dos2unix || which cat) \
  > ${SCRIPT_DIR}/initial_schema.sql
