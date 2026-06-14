-- Run once at DB initialization
-- Extensions required by DreamCloud

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- NLP read-only user (used by FastAPI NLP service)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dreamcloud_nlp_ro') THEN
    CREATE ROLE dreamcloud_nlp_ro WITH LOGIN PASSWORD 'CHANGE_IN_DOCKER_ENV';
    GRANT CONNECT ON DATABASE dreamcloud_dev TO dreamcloud_nlp_ro;
    GRANT USAGE ON SCHEMA public TO dreamcloud_nlp_ro;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dreamcloud_nlp_ro;
  END IF;
END
$$;
