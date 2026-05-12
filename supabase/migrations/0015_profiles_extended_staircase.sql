-- 0015 — Persist the H8–H14 "extended staircase" toggle on the profile row.
--
-- Background: the flag was previously kept client-local on each platform
-- (iOS UserDefaults `h7_extended_staircase`, Android SharedPreferences,
-- web localStorage). That meant the choice was lost on app reinstall and
-- didn't follow the user to a second device. Moving it to the profile
-- row makes it durable across reinstalls and cross-device.
--
-- The client-side caches stay in place as a synchronous read path
-- (`Level.maxAllowed` is called from non-async hot paths on every
-- platform). They're written every time the profile is loaded and
-- every time the toggle is flipped, so the DB row is the source of
-- truth and the cache trails it by at most one round-trip.
--
-- `default false` for back-compat: existing rows that pre-date this
-- column simply get the H1–H7 staircase, which matches the prior
-- behaviour when the UserDefaults key was unset.

alter table profiles
    add column if not exists extended_staircase boolean not null default false;
