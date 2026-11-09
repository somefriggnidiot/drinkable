CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE app_user (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 email_verified boolean NOT NULL DEFAULT false, image text,
 role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','staff','admin')),
 disabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_user_email_lower ON app_user(lower(email));
CREATE TABLE auth_session (
 id text PRIMARY KEY, token text NOT NULL UNIQUE, user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, ip_address text, user_agent text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_session_user ON auth_session(user_id);
CREATE TABLE auth_account (
 id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
 user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 access_token text, refresh_token text, id_token text, access_token_expires_at timestamptz,
 refresh_token_expires_at timestamptz, scope text, password text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_id,account_id)
);
CREATE INDEX auth_account_user ON auth_account(user_id);
CREATE TABLE auth_verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_verification_identifier ON auth_verification(identifier);

CREATE TABLE brewery (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
 profile jsonb NOT NULL, location geometry(Point,4326) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','archived')),
 submitted_by text REFERENCES app_user(id), version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX brewery_geo ON brewery USING gist(location);
CREATE INDEX brewery_geo_distance ON brewery USING gist((location::geography));
CREATE INDEX brewery_search ON brewery USING gin(name gin_trgm_ops);
CREATE INDEX brewery_facets ON brewery USING gin((profile->'facets'));
CREATE INDEX brewery_public ON brewery(status,updated_at DESC);
CREATE TABLE ownership (
 brewery_id uuid NOT NULL REFERENCES brewery(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 PRIMARY KEY(brewery_id,user_id)
);
CREATE TABLE taxonomy (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category text NOT NULL,
 slug text NOT NULL, label text NOT NULL, description text NOT NULL DEFAULT '',
 UNIQUE(category,slug)
);
CREATE TABLE bookmark (
 user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 brewery_id uuid NOT NULL REFERENCES brewery(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,brewery_id)
);
CREATE TABLE media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES app_user(id),
 status text NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','ready','failed')),
 filename text NOT NULL, alt text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE review (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brewery_id uuid NOT NULL REFERENCES brewery(id),
 user_id text NOT NULL REFERENCES app_user(id), ratings jsonb NOT NULL,
 message text NOT NULL, photos text[] NOT NULL DEFAULT '{}',
 hidden boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(brewery_id,user_id)
);
CREATE INDEX review_brewery ON review(brewery_id,hidden);
CREATE TABLE review_report (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES review(id),
 user_id text NOT NULL REFERENCES app_user(id), reason text NOT NULL,
 resolved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(review_id,user_id)
);
CREATE TABLE claim (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brewery_id uuid NOT NULL REFERENCES brewery(id),
 user_id text NOT NULL REFERENCES app_user(id), evidence text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), resolved_by text REFERENCES app_user(id)
);
CREATE UNIQUE INDEX claim_pending ON claim(brewery_id,user_id) WHERE status='pending';
CREATE TABLE suggestion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brewery_id uuid NOT NULL REFERENCES brewery(id),
 email text NOT NULL, message text NOT NULL, evidence text NOT NULL,
 resolved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE contact_message (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL,
 subject text NOT NULL, message text NOT NULL, resolved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE revision (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brewery_id uuid NOT NULL REFERENCES brewery(id),
 actor_id text NOT NULL REFERENCES app_user(id), version integer NOT NULL, snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(brewery_id,version)
);
CREATE TABLE audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text REFERENCES app_user(id),
 action text NOT NULL, target text NOT NULL, detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content_page (
 slug text PRIMARY KEY, title text NOT NULL, body text NOT NULL, version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sponsorship (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brewery_id uuid NOT NULL REFERENCES brewery(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 enabled boolean NOT NULL DEFAULT true, impressions bigint NOT NULL DEFAULT 0, clicks bigint NOT NULL DEFAULT 0,
 CHECK(ends_at>starts_at)
);
CREATE TABLE rate_limit (
 key text PRIMARY KEY, hits integer NOT NULL, reset_at timestamptz NOT NULL
);
CREATE TABLE worker_heartbeat (id integer PRIMARY KEY CHECK(id=1), touched_at timestamptz NOT NULL);
