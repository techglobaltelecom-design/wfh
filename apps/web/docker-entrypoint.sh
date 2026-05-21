#!/bin/sh
set -e

npm run prisma:migrate:deploy -w apps/web
npm run prisma:seed -w apps/web
exec npm run start -w apps/web
