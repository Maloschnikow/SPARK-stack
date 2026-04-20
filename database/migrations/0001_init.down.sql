-- DOWN
BEGIN;

drop table grids;
drop table points_of_interest;
drop table map_tactical_signs;
drop table tactical_signs;
drop table maps;
drop table user_operations;
drop table operations;
drop table role_permissions;
drop table permissions;
drop table user_roles;
drop table roles;
drop table users;

COMMIT;