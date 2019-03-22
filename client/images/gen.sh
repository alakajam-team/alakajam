#!/bin/bash

cd "$(dirname "$0")"

mkdir -p cut

while read line; do
    geom=`cut -d" " -f1 <<< "$line"`
    scale=`cut -d" " -f2 <<< "$line"`
    name=`cut -d" " -f3 <<< "$line"`
    echo "> $name ..."
    convert spritesheet.png -crop "$geom" -interpolate Nearest -filter point -scale "$scale" "cut/${name}.png"
done <<EOM
40x32+64+16 400% trophy1
40x32+64+48 400% trophy2
40x32+64+80 400% trophy3
16x16+32+56 200% medal1
16x16+32+72 200% medal2
16x16+32+88 200% medal3
136x120+0+0 200% spritesheet2
136x120+0+0 400% spritesheet4
EOM

cp cut/spritesheet2.png ../../static/images
cp cut/spritesheet4.png ../../static/images
