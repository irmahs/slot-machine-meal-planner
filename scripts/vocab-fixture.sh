#!/usr/bin/env bash
# Regenerates src/test/vocab.json from the migration, so the tests read the
# same vocabulary the database holds instead of a hand-kept copy of it.
#
#   scripts/vocab-fixture.sh              # writes src/test/vocab.json
#   OUT=/elsewhere.json scripts/vocab-fixture.sh
#
# Needs a local Postgres (initdb/pg_ctl/psql on PATH). Starts a throwaway
# cluster, applies every migration, dumps each reference table as JSON, stops.
set -euo pipefail
cd "$(dirname "$0")/.."
out=${OUT:-src/test/vocab.json}

dir=$(mktemp -d)
trap 'pg_ctl -D "$dir/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$dir"' EXIT

initdb -D "$dir/data" -A trust -U postgres >/dev/null
pg_ctl -D "$dir/data" -o "-k $dir -p 5439 -c listen_addresses=" -l "$dir/log" start >/dev/null
q() { psql -h "$dir" -p 5439 -U postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

# Just enough of Supabase for the migration to apply.
q -c "create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as 'select null::uuid';
      create role authenticated; create role anon;"
for f in supabase/migrations/*.sql; do q -f "$f" >/dev/null; done

tables=(categories protein_kinds vegetable_kinds starch_kinds dish_styles units cooking_methods diet_rules)
{
  echo "{"
  for i in "${!tables[@]}"; do
    t="meal_planner_${tables[$i]}"
    order=$([ "$t" = meal_planner_categories ] && echo position || echo id)
    sep=$([ "$i" -lt $((${#tables[@]} - 1)) ] && echo "," || echo "")
    printf '  "%s": %s%s\n' "$t" "$(q -c "select coalesce(json_agg(t order by $order), '[]') from public.$t t")" "$sep"
  done
  echo "}"
} > "$out"
echo "wrote $out"
