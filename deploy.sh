#!/bin/bash
npm run build
scp -P 38307 dist/*  v2404@uuu.ee:/home/v2404/public_html/tarmojohannes/drupal7/sites/default/files/h5p/development/H5P.MusicalDictations/dist/
scp -P 38307 library.json  v2404@uuu.ee:/home/v2404/public_html/tarmojohannes/drupal7/sites/default/files/h5p/development/H5P.MusicalDictations/
scp -P 38307 semantics.json  v2404@uuu.ee:/home/v2404/public_html/tarmojohannes/drupal7/sites/default/files/h5p/development/H5P.MusicalDictations/
