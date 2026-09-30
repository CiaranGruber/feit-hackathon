-- Seed data for the No Idea backend.
-- Run after tables have been created (see scripts/setup_db.py).
-- Statements are ordered to respect foreign keys; re-running clears existing rows first.
-- On TASK_TAGS, position starts at 0; the highest position for a task is the most specific tag.

DELETE FROM "USER_TASK_COMPLETIONS";
DELETE FROM "USER_TAG_RELATIONSHIPS";
DELETE FROM "TASK_TAG_RELATIONSHIPS";
DELETE FROM "TASK_TAGS";
DELETE FROM "TASKS";
DELETE FROM "TAGS";
DELETE FROM "USERS";

-- Users
INSERT INTO "USERS" ("id", "first_name") VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Alice'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Bob'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Charlie');

-- Tags
INSERT INTO "TAGS" ("id", "name", "icon_name") VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'Outdoor',
        'park'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Creative',
        'palette'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Social',
        'groups'
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'Wellness',
        'self_improvement'
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        'Learning',
        'menu_book'
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        'Solo',
        'person'
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        'Quick',
        'bolt'
    );

-- Tasks
INSERT INTO "TASKS" (
    "id",
    "name",
    "short_description",
    "generation_instructions",
    "image"
) VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Sunset walk',
        'A short golden-hour stroll outdoors.',
        'Suggest a short outdoor walk timed for golden hour near the user. Keep it low-effort and under 45 minutes.',
        'img-sunset-walk'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Park picnic',
        'A simple picnic at a local park.',
        'Propose a simple picnic plan for a local park. Include one food idea and one optional activity.',
        'img-park-picnic'
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Sketch something nearby',
        'A quick observational sketch of something around you.',
        'Encourage a quick observational sketch of an everyday object or view. No artistic experience required.',
        'img-sketch-nearby'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'Playlist for today',
        'Build a short playlist for your current mood.',
        'Ask the user to build a short playlist that matches their current mood. Cap it at 8 songs.',
        'img-playlist'
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'Coffee with a friend',
        'Catch up with a friend over coffee.',
        'Suggest reaching out to one friend for a low-pressure coffee or catch-up this week.',
        'img-coffee-friend'
    ),
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'Board game night',
        'Play a short board or card game with others.',
        'Propose hosting or joining a short board or card game session with one or more people.',
        'img-board-games'
    ),
    (
        'abcabcab-abab-abab-abab-abcabcabcabc',
        'Five-minute stretch',
        'A gentle stretch break with no equipment.',
        'Guide a gentle full-body stretch routine that takes about five minutes and needs no equipment.',
        'img-stretch'
    ),
    (
        'defdefde-fdef-defd-efde-fdefdefdefde',
        'Mindful breathing',
        'A brief breathing exercise to reset.',
        'Offer a short breathing exercise (2-5 minutes) suitable for beginners who feel rushed or tense.',
        'img-breathing'
    ),
    (
        '12121212-1212-1212-1212-121212121212',
        'Learn one new fact',
        'Learn one interesting fact and restate it.',
        'Pick a light topic and have the user learn one interesting fact, then explain it in their own words.',
        'img-new-fact'
    ),
    (
        '34343434-3434-3434-3434-343434343434',
        'Try a language phrase',
        'Learn one useful phrase in another language.',
        'Teach one useful phrase in a language the user is curious about, with pronunciation tips.',
        'img-language'
    );

-- Task tags (position 0 = broadest; highest position = most specific)
INSERT INTO "TASK_TAGS" ("task_id", "tag_id", "position") VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 0),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 2),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 1),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 0),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 1),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 2),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 1),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '44444444-4444-4444-4444-444444444444', 0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '77777777-7777-7777-7777-777777777777', 1),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '44444444-4444-4444-4444-444444444444', 0),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '66666666-6666-6666-6666-666666666666', 1),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '77777777-7777-7777-7777-777777777777', 2),
    ('12121212-1212-1212-1212-121212121212', '55555555-5555-5555-5555-555555555555', 0),
    ('12121212-1212-1212-1212-121212121212', '77777777-7777-7777-7777-777777777777', 1),
    ('34343434-3434-3434-3434-343434343434', '55555555-5555-5555-5555-555555555555', 0),
    ('34343434-3434-3434-3434-343434343434', '66666666-6666-6666-6666-666666666666', 1);

-- Task-tag relationship strengths (every task x every tag; 0-1).
-- Assigned TASK_TAGS get strength from position (highest = most specific);
-- unassigned tags are 0.0.
INSERT INTO "TASK_TAG_RELATIONSHIPS" ("task_id", "tag_id", "value") VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 0.33),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0.0),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0.0),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 0.0),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 0.0),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 0.67),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 1.0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 0.5),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 0.0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 1.0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 0.0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 0.0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 0.0),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', 0.0),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 0.0),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 0.33),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 0.0),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 0.0),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 0.0),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 0.67),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 1.0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 0.0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 0.5),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 0.0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 0.0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 0.0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 1.0),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777', 0.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 0.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 0.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 1.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 0.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 0.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 0.0),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777', 0.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 0.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 0.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 1.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '44444444-4444-4444-4444-444444444444', 0.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555', 0.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '66666666-6666-6666-6666-666666666666', 0.0),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '77777777-7777-7777-7777-777777777777', 0.0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '11111111-1111-1111-1111-111111111111', 0.0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '22222222-2222-2222-2222-222222222222', 0.0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '33333333-3333-3333-3333-333333333333', 0.0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '44444444-4444-4444-4444-444444444444', 0.5),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '55555555-5555-5555-5555-555555555555', 0.0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '66666666-6666-6666-6666-666666666666', 0.0),
    ('abcabcab-abab-abab-abab-abcabcabcabc', '77777777-7777-7777-7777-777777777777', 1.0),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '11111111-1111-1111-1111-111111111111', 0.0),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '22222222-2222-2222-2222-222222222222', 0.0),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '33333333-3333-3333-3333-333333333333', 0.0),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '44444444-4444-4444-4444-444444444444', 0.33),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '55555555-5555-5555-5555-555555555555', 0.0),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '66666666-6666-6666-6666-666666666666', 0.67),
    ('defdefde-fdef-defd-efde-fdefdefdefde', '77777777-7777-7777-7777-777777777777', 1.0),
    ('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 0.0),
    ('12121212-1212-1212-1212-121212121212', '22222222-2222-2222-2222-222222222222', 0.0),
    ('12121212-1212-1212-1212-121212121212', '33333333-3333-3333-3333-333333333333', 0.0),
    ('12121212-1212-1212-1212-121212121212', '44444444-4444-4444-4444-444444444444', 0.0),
    ('12121212-1212-1212-1212-121212121212', '55555555-5555-5555-5555-555555555555', 0.5),
    ('12121212-1212-1212-1212-121212121212', '66666666-6666-6666-6666-666666666666', 0.0),
    ('12121212-1212-1212-1212-121212121212', '77777777-7777-7777-7777-777777777777', 1.0),
    ('34343434-3434-3434-3434-343434343434', '11111111-1111-1111-1111-111111111111', 0.0),
    ('34343434-3434-3434-3434-343434343434', '22222222-2222-2222-2222-222222222222', 0.0),
    ('34343434-3434-3434-3434-343434343434', '33333333-3333-3333-3333-333333333333', 0.0),
    ('34343434-3434-3434-3434-343434343434', '44444444-4444-4444-4444-444444444444', 0.0),
    ('34343434-3434-3434-3434-343434343434', '55555555-5555-5555-5555-555555555555', 0.5),
    ('34343434-3434-3434-3434-343434343434', '66666666-6666-6666-6666-666666666666', 1.0),
    ('34343434-3434-3434-3434-343434343434', '77777777-7777-7777-7777-777777777777', 0.0);

-- User-tag relationship strengths (every user x every tag; 0-1).
INSERT INTO "USER_TAG_RELATIONSHIPS" ("user_id", "tag_id", "value") VALUES
    -- Alice: outdoor / solo / quick lean
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111', 0.9),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '22222222-2222-2222-2222-222222222222', 0.2),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '33333333-3333-3333-3333-333333333333', 0.3),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444', 0.5),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '55555555-5555-5555-5555-555555555555', 0.1),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '66666666-6666-6666-6666-666666666666', 0.8),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '77777777-7777-7777-7777-777777777777', 0.7),
    -- Bob: creative / learning / solo lean
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '11111111-1111-1111-1111-111111111111', 0.2),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '22222222-2222-2222-2222-222222222222', 0.95),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '33333333-3333-3333-3333-333333333333', 0.4),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '44444444-4444-4444-4444-444444444444', 0.3),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '55555555-5555-5555-5555-555555555555', 0.7),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '66666666-6666-6666-6666-666666666666', 0.85),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '77777777-7777-7777-7777-777777777777', 0.6),
    -- Charlie: wellness / social / quick lean
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '11111111-1111-1111-1111-111111111111', 0.4),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '22222222-2222-2222-2222-222222222222', 0.15),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '33333333-3333-3333-3333-333333333333', 0.75),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '44444444-4444-4444-4444-444444444444', 0.9),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '55555555-5555-5555-5555-555555555555', 0.25),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '66666666-6666-6666-6666-666666666666', 0.35),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', '77777777-7777-7777-7777-777777777777', 0.8);

-- Sample completions
INSERT INTO "USER_TASK_COMPLETIONS" (
    "user_id",
    "task_id",
    "completion_time",
    "comment",
    "tips",
    "activity_rating",
    "recommendation_rating"
) VALUES
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '2026-09-28 18:30:00',
        'Lovely evening walk along the river.',
        'Bring a light jumper; it cools down quickly after sunset.',
        5,
        5
    ),
    (
        'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '2026-09-29 11:15:00',
        'Sketched my coffee mug. Surprisingly calming.',
        'Start with outlines only so it does not feel intimidating.',
        4,
        4
    ),
    (
        'c3d4e5f6-a7b8-9012-cdef-123456789012',
        'abcabcab-abab-abab-abab-abcabcabcabc',
        '2026-09-29 07:45:00',
        'Quick stretch before work helped a lot.',
        NULL,
        5,
        NULL
    );
