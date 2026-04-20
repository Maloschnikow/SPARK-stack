BEGIN;

DO $$
BEGIN
	IF to_regclass('public.users') IS NULL THEN
		RAISE EXCEPTION 'table users is missing';
	END IF;

	IF to_regclass('public.roles') IS NULL THEN
		RAISE EXCEPTION 'table roles is missing';
	END IF;

	IF to_regclass('public.user_roles') IS NULL THEN
		RAISE EXCEPTION 'table user_roles is missing';
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'user_id'
	) THEN
		RAISE EXCEPTION 'users.user_id is missing';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'user_name'
	) THEN
		RAISE EXCEPTION 'users.user_name is missing';
	END IF;
END
$$;

-- user_name must be unique
INSERT INTO users (user_name) VALUES ('smoke_unique_user');
DO $$
BEGIN
	BEGIN
		INSERT INTO users (user_name) VALUES ('smoke_unique_user');
		RAISE EXCEPTION 'expected UNIQUE violation for users.user_name';
	EXCEPTION
		WHEN unique_violation THEN
			NULL;
	END;
END
$$;

-- user_name must be NOT NULL
DO $$
BEGIN
	BEGIN
		INSERT INTO users (user_name) VALUES (NULL);
		RAISE EXCEPTION 'expected NOT NULL violation for users.user_name';
	EXCEPTION
		WHEN not_null_violation THEN
			NULL;
	END;
END
$$;

-- user_roles user_id FK + cascade should work
INSERT INTO roles (role_name, role_description)
VALUES ('smoke_role', 'temporary smoke role');

WITH inserted_user AS (
	INSERT INTO users (user_name)
	VALUES ('smoke_cascade_user')
	RETURNING user_id
), inserted_role AS (
	SELECT role_id
	FROM roles
	WHERE role_name = 'smoke_role'
)
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM inserted_user u
CROSS JOIN inserted_role r;

DELETE FROM users WHERE user_name = 'smoke_cascade_user';

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM user_roles ur
		JOIN roles r ON r.role_id = ur.role_id
		WHERE r.role_name = 'smoke_role'
	) THEN
		RAISE EXCEPTION 'expected cascade delete for user_roles when deleting user';
	END IF;
END
$$;

-- cleanup smoke-only rows and keep test DB reusable
DELETE FROM roles WHERE role_name = 'smoke_role';
DELETE FROM users WHERE user_name = 'smoke_unique_user';

COMMIT;

