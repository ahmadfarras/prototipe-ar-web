-- Up Migration

CREATE TABLE products (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text NOT NULL UNIQUE
              CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 64),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  summary     text NOT NULL CHECK (length(summary) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 2000)
);

CREATE TABLE ar_targets (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id   bigint NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  target_index integer NOT NULL UNIQUE CHECK (target_index >= 0),
  image_file   text NOT NULL UNIQUE
);

CREATE INDEX ar_targets_product_id_idx ON ar_targets (product_id);

CREATE TABLE coupon_campaigns (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id     bigint NOT NULL UNIQUE REFERENCES products (id),
  title          text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  terms          text NOT NULL CHECK (length(terms) <= 500),
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  claimed_count  integer NOT NULL DEFAULT 0,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  CHECK (ends_at > starts_at),
  CHECK (claimed_count BETWEEN 0 AND total_quantity)
);

CREATE TABLE coupon_claims (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES coupon_campaigns (id),
  visitor_id  uuid NOT NULL,
  code        text NOT NULL UNIQUE,
  claimed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, visitor_id)
);

-- Down Migration

DROP TABLE coupon_claims;
DROP TABLE coupon_campaigns;
DROP TABLE ar_targets;
DROP TABLE products;
