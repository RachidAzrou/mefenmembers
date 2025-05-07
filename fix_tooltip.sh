#!/bin/bash
sed -i 's/<Tooltip/<RechartsTooltip/g' client/src/pages/rapportage.tsx
chmod +x ./fix_tooltip.sh
./fix_tooltip.sh
