{pkgs}: let
  mkScript = name: text: (pkgs.writeShellScriptBin name text);

  shellScripts = [
    (mkScript "db-reset" ''
      db-stop
      rm -rf $PG_DIR
      db-start
    '')

    (mkScript "db-start" ''
      # Initialize a PostgreSQL database, in case none exists
      if [ ! -d "$PG_DATA_DIR" ]; then
          echo "Initializing PostgreSQL data directory..."
          initdb --locale en_US.UTF-8 -D "$PG_DATA_DIR"
      fi

      # Create a Socket directory, in case none exists
      if [ ! -d "$PG_SOCKET_DIR" ]; then
          echo "Initializing PostgreSQL socket directory..."
          mkdir -p "$PG_SOCKET_DIR"
      fi

      # Check if a postgres is server already running
      if pg_ctl -D "$PG_DATA_DIR" status > /dev/null 2>&1; then
          echo "PostgreSQL is already running. Skipping start."
      else
          # Start PostgreSQL, in case no server runs already
          echo "Starting PostgreSQL..."
          # -h \"\" will prevent postgres from trying to listen on localhost, which creates issues with act,
          # when multiple containers try to start a database server
          pg_ctl -D "$PG_DATA_DIR" -o "-k $PG_SOCKET_DIR -h \"\"" -l $PG_DIR/psql.log start

          # wait for postgres to start
          sleep 2
      fi

      # Check and create user
      if ! psql -h $PG_SOCKET_DIR -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$CUSTOM_PGUSER'" | grep -q 1; then
          psql -h $PG_SOCKET_DIR -d postgres -c "CREATE USER $CUSTOM_PGUSER WITH PASSWORD '$PGPASSWORD' CREATEDB;"
      fi

      # Check and create database
      if ! psql -h $PG_SOCKET_DIR -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$PGDATABASE'" | grep -q 1; then
          psql -h $PG_SOCKET_DIR -d postgres -c "CREATE DATABASE \"$PGDATABASE\" OWNER $CUSTOM_PGUSER;"
          echo Created $PGDATABASE database.
      fi

      # Check and create test database
      if ! psql -h $PG_SOCKET_DIR -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$PGDATABASE-test'" | grep -q 1; then
          psql -h $PG_SOCKET_DIR -d postgres -c "CREATE DATABASE \"$PGDATABASE-test\" OWNER $CUSTOM_PGUSER;"
          echo Created $PGDATABASE-test database.
      fi

      echo "PostgreSQL environment setup complete."
      echo "DATABASE_URL=\"$DATABASE_URL\" (in case you need it)"
      echo "DATABASE_TEST_URL=\"$DATABASE_TEST_URL\" (in case you need it)"
    '')

    (mkScript "db-stop" ''
      echo "Cleaning up PostgreSQL..."
      pg_ctl -D "$PG_DATA_DIR" -l $REPO_ROOT/psql.log stop
      echo "Cleanup complete."
    '')

    (mkScript "db-downgrade" ''
      echo "Migrate down by 1..."
      sqlx migrate revert --source "$REPO_ROOT/database/migrations"
    '')

    (mkScript "db-upgrade" ''
      echo "Migrate up everything..."
      sqlx migrate run --source "$REPO_ROOT/database/migrations"
    '')

    (mkScript "db-visualize" ''
      set -e
      mkdir -p $REPO_ROOT/database/visual/
      pg_dump -d $DATABASE_URL --schema-only > $REPO_ROOT/database/visual/db_dump.sql
      npx @liam-hq/cli erd build --input $REPO_ROOT/database/visual/db_dump.sql --format postgres --output-dir $REPO_ROOT/database/visual/dist
      npx http-server $REPO_ROOT/database/visual/dist
    '')

    (mkScript "acts" ''
      act --rm --action-cache-path $REPO_ROOT/.cache/act --cache-server-path $REPO_ROOT/.cache/actcache
    '')
  ];
in
  shellScripts