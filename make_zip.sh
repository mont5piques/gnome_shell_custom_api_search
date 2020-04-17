#!/bin/bash

extname="custom-api-search-provider@nytrio.com"

[ -f "${extname}.zip" ] && rm -f "${extname}.zip"

pushd "${extname}"
  zip -r ../"${extname}.zip" *
popd
