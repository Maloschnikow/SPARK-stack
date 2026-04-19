{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
  };

  outputs = {
    nixpkgs,
    rust-overlay,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachSystem [flake-utils.lib.system.x86_64-linux] (
      system: let
        overlays = [(import rust-overlay)];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        shellScripts = import ./nix/scripts.nix { inherit pkgs; };

      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs;
            [
              # for backend
              rust-bin.stable.latest.default
              cargo-audit
              cargo-edit

              postgresql_18
              sqlx-cli # For migrations
              clorinde

              # for frontend
              nodejs_24

              act # To run github workflows locally
            ]
            ++ shellScripts;

          RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
          shellHook = ''
            export REPO_ROOT=$(git rev-parse --show-toplevel)
            export PG_DIR=$REPO_ROOT/postgres
            export PG_DATA_DIR=$PG_DIR/.pgdata
            export PG_SOCKET_DIR=$PG_DIR/.pgsock
            export PG_HOST=$PG_SOCKET_DIR

            # Customizable
            export CUSTOM_PGUSER=pguser
            export PGDATABASE=db
            export PGPASSWORD=password

            # Used by sqlx
            export DATABASE_URL="postgres:///$PGDATABASE?user=$CUSTOM_PGUSER&password=$PGPASSWORD&host=$PG_SOCKET_DIR"
            export DATABASE_TEST_URL="postgres:///$PGDATABASE-test?user=$CUSTOM_PGUSER&password=$PGPASSWORD&host=$PG_SOCKET_DIR"
          '';
        };
      }
    );
}