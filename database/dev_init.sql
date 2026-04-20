-- use this to fill the database with example data
BEGIN;

-- roles
INSERT INTO roles (role_name, role_description)
VALUES
('admin', 'System administration'),
('dispatcher', 'Coordinates operations and maps'),
('analyst', 'Analyzes operational and map data')
ON CONFLICT (role_name) DO NOTHING;

-- permissions
INSERT INTO permissions (permission_name, permission_description)
VALUES
('operation:create', 'Create operations'),
('operation:read', 'Read operations'),
('operation:update', 'Update operations'),
('map:create', 'Create maps'),
('map:read', 'Read maps'),
('map:update', 'Update maps')
ON CONFLICT (permission_name) DO NOTHING;

-- role to permission mappings
WITH pairs(role_name, permission_name) AS (
	VALUES
	('admin', 'operation:create'),
	('admin', 'operation:read'),
	('admin', 'operation:update'),
	('admin', 'map:create'),
	('admin', 'map:read'),
	('admin', 'map:update'),
	('dispatcher', 'operation:create'),
	('dispatcher', 'operation:read'),
	('dispatcher', 'map:create'),
	('dispatcher', 'map:read'),
	('analyst', 'operation:read'),
	('analyst', 'map:read')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM pairs x
JOIN roles r ON r.role_name = x.role_name
JOIN permissions p ON p.permission_name = x.permission_name
ON CONFLICT DO NOTHING;

-- users
INSERT INTO users (user_name)
VALUES
('iamuser'),
('whoami'),
('mapnerd'),
('opslead')
ON CONFLICT (user_name) DO NOTHING;

-- user to role mappings
WITH pairs(user_name, role_name) AS (
	VALUES
	('iamuser', 'admin'),
	('whoami', 'dispatcher'),
	('mapnerd', 'analyst'),
	('opslead', 'dispatcher')
)
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM pairs x
JOIN users u ON u.user_name = x.user_name
JOIN roles r ON r.role_name = x.role_name
ON CONFLICT DO NOTHING;

-- operations
INSERT INTO operations (operation_name, operation_description, operation_status)
VALUES
('Operation Atlas', 'Flood response drill in city center', 'active'),
('Operation Beacon', 'Wildfire coordination simulation', 'planned')
ON CONFLICT (operation_name) DO NOTHING;

-- user to operation mappings
WITH pairs(user_name, operation_name) AS (
	VALUES
	('iamuser', 'Operation Atlas'),
	('whoami', 'Operation Atlas'),
	('opslead', 'Operation Beacon'),
	('mapnerd', 'Operation Beacon')
)
INSERT INTO user_operations (user_id, operation_id)
SELECT u.user_id, o.operation_id
FROM pairs x
JOIN users u ON u.user_name = x.user_name
JOIN operations o ON o.operation_name = x.operation_name
ON CONFLICT DO NOTHING;

-- maps
WITH seed(map_type, map_geo_data, map_description, map_status, operation_name) AS (
	VALUES
	(
		'city',
		'{"type":"FeatureCollection","features":[]}'::jsonb,
		'Atlas city tactical map',
		'active',
		'Operation Atlas'
	),
	(
		'region',
		'{"type":"FeatureCollection","features":[]}'::jsonb,
		'Beacon regional overview map',
		'draft',
		'Operation Beacon'
	)
)
INSERT INTO maps (map_type, map_geo_data, map_description, map_status, operation_id)
SELECT s.map_type, s.map_geo_data, s.map_description, s.map_status, o.operation_id
FROM seed s
JOIN operations o ON o.operation_name = s.operation_name
WHERE NOT EXISTS (
	SELECT 1
	FROM maps m
	WHERE m.map_description = s.map_description
);

-- tactical signs
INSERT INTO tactical_signs (sign_name, sign_description)
VALUES
('Medical Point', 'Temporary medical station'),
('Road Block', 'Blocked route marker'),
('Assembly Area', 'Evacuation assembly point')
ON CONFLICT (sign_name) DO NOTHING;

-- map to tactical sign mappings
WITH pairs(map_description, sign_name) AS (
	VALUES
	('Atlas city tactical map', 'Medical Point'),
	('Atlas city tactical map', 'Road Block'),
	('Beacon regional overview map', 'Assembly Area')
)
INSERT INTO map_tactical_signs (map_id, sign_id)
SELECT m.map_id, s.sign_id
FROM pairs x
JOIN maps m ON m.map_description = x.map_description
JOIN tactical_signs s ON s.sign_name = x.sign_name
ON CONFLICT DO NOTHING;

-- points of interest
WITH seed(poi_name, poi_description, poi_location, map_description) AS (
	VALUES
	(
		'City Hospital',
		'Primary emergency treatment center',
		'{"type":"Point","coordinates":[13.404954,52.520008]}'::jsonb,
		'Atlas city tactical map'
	),
	(
		'Evacuation Gate North',
		'Main northern evacuation checkpoint',
		'{"type":"Point","coordinates":[13.389,52.53]}'::jsonb,
		'Atlas city tactical map'
	),
	(
		'Regional Command Post',
		'Regional command and logistics node',
		'{"type":"Point","coordinates":[13.2,52.4]}'::jsonb,
		'Beacon regional overview map'
	)
)
INSERT INTO points_of_interest (poi_name, poi_description, poi_location, map_id)
SELECT s.poi_name, s.poi_description, s.poi_location, m.map_id
FROM seed s
JOIN maps m ON m.map_description = s.map_description
WHERE NOT EXISTS (
	SELECT 1
	FROM points_of_interest p
	WHERE p.poi_name = s.poi_name
	  AND p.map_id = m.map_id
);

-- grids
WITH seed(grid_metadata, grid_data_reference, map_description) AS (
	VALUES
	(
		'{"cell_size":10,"origin":[13.35,52.49],"resolution":"high"}'::jsonb,
		's3://spark-dev/grids/atlas-city-v1.json',
		'Atlas city tactical map'
	),
	(
		'{"cell_size":50,"origin":[13.0,52.2],"resolution":"medium"}'::jsonb,
		's3://spark-dev/grids/beacon-region-v1.json',
		'Beacon regional overview map'
	)
)
INSERT INTO grids (grid_metadata, grid_data_reference, map_id)
SELECT s.grid_metadata, s.grid_data_reference, m.map_id
FROM seed s
JOIN maps m ON m.map_description = s.map_description
WHERE NOT EXISTS (
	SELECT 1
	FROM grids g
	WHERE g.grid_data_reference = s.grid_data_reference
	  AND g.map_id = m.map_id
);

COMMIT;