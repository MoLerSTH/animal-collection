-- Schema definition for Animal Collection database (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    scientific_name VARCHAR(150),
    category VARCHAR(50) NOT NULL DEFAULT 'Wild',
    default_image_url VARCHAR(1024),
    default_story TEXT,
    default_fav_food VARCHAR(100),
    default_temperament VARCHAR(100),
    catalog_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_animals_code ON animals(code);
CREATE INDEX IF NOT EXISTS idx_animals_catalog_order ON animals(catalog_order);

CREATE TABLE IF NOT EXISTS user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
    custom_name VARCHAR(100) NOT NULL,
    photo_url VARCHAR(1024) NOT NULL,
    story TEXT DEFAULT '',
    fav_food VARCHAR(100) DEFAULT '',
    temperament VARCHAR(100) DEFAULT '',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    caught_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_animal_id ON user_collections(animal_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_fav ON user_collections(user_id, is_favorite);


