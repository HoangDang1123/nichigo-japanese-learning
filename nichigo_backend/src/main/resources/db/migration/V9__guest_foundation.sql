CREATE TABLE guest_identities (
    id UUID PRIMARY KEY,
    credential_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ
);
CREATE INDEX ix_guest_identities_retention ON guest_identities (COALESCE(last_active_at, created_at));

CREATE TABLE guest_lesson_unlocks (
    guest_id UUID NOT NULL REFERENCES guest_identities(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    unlocked_on DATE NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (guest_id, lesson_id)
);
CREATE INDEX ix_guest_lesson_unlocks_daily ON guest_lesson_unlocks (guest_id, unlocked_on);

CREATE TABLE skill_bookmarks (
    guest_id UUID REFERENCES guest_identities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL,
    CHECK ((guest_id IS NOT NULL) <> (user_id IS NOT NULL))
);
CREATE UNIQUE INDEX ux_skill_bookmarks_guest_item ON skill_bookmarks (guest_id, item_id) WHERE guest_id IS NOT NULL;
CREATE UNIQUE INDEX ux_skill_bookmarks_user_item ON skill_bookmarks (user_id, item_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_skill_bookmarks_guest_page ON skill_bookmarks (guest_id, item_id) WHERE guest_id IS NOT NULL;
CREATE INDEX ix_skill_bookmarks_user_page ON skill_bookmarks (user_id, item_id) WHERE user_id IS NOT NULL;
