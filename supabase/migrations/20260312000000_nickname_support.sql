-- 1) Update get_users_for_admin_page to include nickname and search support
DROP FUNCTION IF EXISTS public.get_users_for_admin_page(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_users_for_admin_page(
    _search_term TEXT,
    _sort_by TEXT,
    _provider_filter TEXT,
    _has_avatar_filter BOOLEAN,
    _limit INTEGER,
    _offset INTEGER
)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    provider TEXT,
    role TEXT,
    is_banned BOOLEAN,
    report_count BIGINT,
    suggestion_count BIGINT,
    flag_count BIGINT,
    total_count BIGINT,
    last_seen_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    activity_status TEXT,
    events_24h BIGINT,
    reports_7d BIGINT,
    reviews_7d BIGINT,
    suggestions_7d BIGINT,
    flags_7d BIGINT,
    favourites_7d BIGINT,
    activity_score_7d BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
WITH filtered_users AS (
    SELECT
        p.id,
        p.full_name,
        p.nickname,
        p.avatar_url,
        p.created_at,
        p.role,
        p.is_banned,
        au.email::text AS email,
        au.phone::text AS phone,
        au.last_sign_in_at,
        COALESCE(
            au.raw_app_meta_data->>'provider',
            CASE
                WHEN au.email IS NOT NULL THEN 'email'
                WHEN au.phone IS NOT NULL THEN 'phone'
                ELSE 'unknown'
            END
        )::text AS provider
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE
        (
            _search_term IS NULL OR _search_term = ''
            OR p.full_name ILIKE '%' || _search_term || '%'
            OR p.nickname ILIKE '%' || _search_term || '%'
            OR au.email ILIKE '%' || _search_term || '%'
            OR au.phone ILIKE '%' || _search_term || '%'
        )
        AND (
            _provider_filter IS NULL OR _provider_filter = 'all'
            OR (_provider_filter = 'email' AND au.email IS NOT NULL)
            OR (_provider_filter = 'phone' AND au.phone IS NOT NULL AND au.email IS NULL)
        )
        AND (
            _has_avatar_filter IS NULL
            OR (_has_avatar_filter = TRUE AND p.avatar_url IS NOT NULL AND length(trim(p.avatar_url)) > 0)
            OR (_has_avatar_filter = FALSE AND (p.avatar_url IS NULL OR length(trim(p.avatar_url)) = 0))
        )
),
total_rows AS (
    SELECT COUNT(*)::bigint AS total_count FROM filtered_users
),
report_counts AS (
    SELECT pr.user_id, COUNT(*)::bigint AS report_count
    FROM public.price_reports pr
    GROUP BY pr.user_id
),
suggestion_counts AS (
    SELECT s.submitted_by AS user_id, COUNT(*)::bigint AS suggestion_count
    FROM public.suggested_fuel_stations s
    GROUP BY s.submitted_by
),
flag_counts AS (
    SELECT fs.user_id, COUNT(*)::bigint AS flag_count
    FROM public.flagged_stations fs
    GROUP BY fs.user_id
),
device_last_seen AS (
    SELECT ud.user_id, MAX(ud.last_seen_at) AS last_seen_at
    FROM public.user_devices ud
    GROUP BY ud.user_id
),
event_24h AS (
    SELECT e.user_id, COUNT(*)::bigint AS events_24h
    FROM public.user_activity_events e
    WHERE e.created_at >= now() - interval '24 hours'
    GROUP BY e.user_id
),
report_7d AS (
    SELECT pr.user_id, COUNT(*)::bigint AS reports_7d
    FROM public.price_reports pr
    WHERE pr.created_at >= now() - interval '7 days'
    GROUP BY pr.user_id
),
review_7d AS (
    SELECT rv.user_id, COUNT(*)::bigint AS reviews_7d
    FROM public.reviews rv
    WHERE rv.created_at >= now() - interval '7 days'
    GROUP BY rv.user_id
),
suggestion_7d AS (
    SELECT s.submitted_by AS user_id, COUNT(*)::bigint AS suggestions_7d
    FROM public.suggested_fuel_stations s
    WHERE s.created_at >= now() - interval '7 days'
    GROUP BY s.submitted_by
),
flag_7d AS (
    SELECT fs.user_id, COUNT(*)::bigint AS flags_7d
    FROM public.flagged_stations fs
    WHERE fs.created_at >= now() - interval '7 days'
    GROUP BY fs.user_id
),
favourite_7d AS (
    SELECT fav.user_id, COUNT(*)::bigint AS favourites_7d
    FROM public.favourite_stations fav
    WHERE fav.created_at >= now() - interval '7 days'
    GROUP BY fav.user_id
),
content_last_activity AS (
    SELECT x.user_id, MAX(x.created_at) AS last_content_at
    FROM (
        SELECT pr.user_id, pr.created_at FROM public.price_reports pr
        UNION ALL
        SELECT rv.user_id, rv.created_at FROM public.reviews rv
        UNION ALL
        SELECT s.submitted_by AS user_id, s.created_at FROM public.suggested_fuel_stations s
        UNION ALL
        SELECT fs.user_id, fs.created_at FROM public.flagged_stations fs
        UNION ALL
        SELECT fav.user_id, fav.created_at FROM public.favourite_stations fav
    ) x
    GROUP BY x.user_id
),
enriched AS (
    SELECT
        fu.id,
        fu.full_name,
        fu.nickname,
        fu.email,
        fu.avatar_url,
        fu.phone,
        fu.created_at,
        fu.last_sign_in_at,
        fu.provider,
        fu.role,
        fu.is_banned,
        COALESCE(rc.report_count, 0) AS report_count,
        COALESCE(sc.suggestion_count, 0) AS suggestion_count,
        COALESCE(fc.flag_count, 0) AS flag_count,
        dls.last_seen_at,
        NULLIF(
            GREATEST(
                COALESCE(fu.last_sign_in_at, '-infinity'::timestamptz),
                COALESCE(uas.last_active_at, '-infinity'::timestamptz),
                COALESCE(dls.last_seen_at, '-infinity'::timestamptz),
                COALESCE(cla.last_content_at, '-infinity'::timestamptz)
            ),
            '-infinity'::timestamptz
        ) AS last_activity_at,
        COALESCE(e24.events_24h, 0) AS events_24h,
        COALESCE(r7.reports_7d, 0) AS reports_7d,
        COALESCE(rv7.reviews_7d, 0) AS reviews_7d,
        COALESCE(s7.suggestions_7d, 0) AS suggestions_7d,
        COALESCE(f7.flags_7d, 0) AS flags_7d,
        COALESCE(fav7.favourites_7d, 0) AS favourites_7d
    FROM filtered_users fu
    LEFT JOIN report_counts rc ON rc.user_id = fu.id
    LEFT JOIN suggestion_counts sc ON sc.user_id = fu.id
    LEFT JOIN flag_counts fc ON fc.user_id = fu.id
    LEFT JOIN device_last_seen dls ON dls.user_id = fu.id
    LEFT JOIN public.user_activity_summary uas ON uas.user_id = fu.id
    LEFT JOIN content_last_activity cla ON cla.user_id = fu.id
    LEFT JOIN event_24h e24 ON e24.user_id = fu.id
    LEFT JOIN report_7d r7 ON r7.user_id = fu.id
    LEFT JOIN review_7d rv7 ON rv7.user_id = fu.id
    LEFT JOIN suggestion_7d s7 ON s7.user_id = fu.id
    LEFT JOIN flag_7d f7 ON f7.user_id = fu.id
    LEFT JOIN favourite_7d fav7 ON fav7.user_id = fu.id
)
SELECT
    e.id,
    e.full_name,
    e.nickname,
    e.email,
    e.avatar_url,
    e.phone,
    e.created_at,
    e.last_sign_in_at,
    e.provider,
    e.role,
    e.is_banned,
    e.report_count,
    e.suggestion_count,
    e.flag_count,
    tr.total_count,
    e.last_seen_at,
    e.last_activity_at,
    CASE
        WHEN e.last_activity_at IS NULL THEN 'inactive'
        WHEN e.last_activity_at >= now() - interval '15 minutes' THEN 'online'
        WHEN e.last_activity_at >= now() - interval '24 hours' THEN 'today'
        WHEN e.last_activity_at >= now() - interval '7 days' THEN 'this_week'
        ELSE 'inactive'
    END AS activity_status,
    e.events_24h,
    e.reports_7d,
    e.reviews_7d,
    e.suggestions_7d,
    e.flags_7d,
    e.favourites_7d,
    (
        COALESCE(e.reports_7d, 0)
        + COALESCE(e.reviews_7d, 0)
        + COALESCE(e.suggestions_7d, 0)
        + COALESCE(e.flags_7d, 0)
        + COALESCE(e.favourites_7d, 0)
        + COALESCE(e.events_24h, 0)
    )::bigint AS activity_score_7d
FROM enriched e
CROSS JOIN total_rows tr
ORDER BY
    CASE WHEN _sort_by = 'newest' THEN e.created_at END DESC,
    CASE WHEN _sort_by = 'oldest' THEN e.created_at END ASC,
    CASE WHEN _sort_by = 'last_signin' THEN e.last_activity_at END DESC NULLS LAST,
    CASE WHEN _sort_by = 'submissions_desc' THEN e.report_count END DESC,
    e.created_at DESC
LIMIT _limit
OFFSET _offset;
$function$;

-- 2) Update get_admin_user_details to include nickname
DROP FUNCTION IF EXISTS public.get_admin_user_details(UUID);
CREATE OR REPLACE FUNCTION public.get_admin_user_details(target_user_id UUID)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    provider TEXT,
    role TEXT,
    is_banned BOOLEAN,
    last_seen_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    activity_status TEXT,
    events_24h BIGINT,
    reports_7d BIGINT,
    reviews_7d BIGINT,
    suggestions_7d BIGINT,
    flags_7d BIGINT,
    favourites_7d BIGINT,
    activity_score_7d BIGINT,
    total_activity_events BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
WITH user_base AS (
    SELECT
        p.id,
        p.full_name,
        p.nickname,
        p.avatar_url,
        p.created_at,
        p.role,
        p.is_banned,
        au.email::text AS email,
        au.phone::text AS phone,
        au.last_sign_in_at,
        COALESCE(
            au.raw_app_meta_data->>'provider',
            CASE
                WHEN au.email IS NOT NULL THEN 'email'
                WHEN au.phone IS NOT NULL THEN 'phone'
                ELSE 'unknown'
            END
        )::text AS provider
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = target_user_id
),
last_seen AS (
    SELECT COALESCE(MAX(last_seen_at), NULL) AS last_seen_at
    FROM public.user_devices
    WHERE user_id = target_user_id
),
event_24h AS (
    SELECT COUNT(*)::bigint AS events_24h
    FROM public.user_activity_events
    WHERE user_id = target_user_id
      AND created_at >= now() - interval '24 hours'
),
total_events AS (
    SELECT COALESCE(MAX(total_events), 0)::bigint AS total_activity_events
    FROM public.user_activity_summary
    WHERE user_id = target_user_id
),
reports_7d AS (
    SELECT COUNT(*)::bigint AS reports_7d
    FROM public.price_reports
    WHERE user_id = target_user_id
      AND created_at >= now() - interval '7 days'
),
reviews_7d AS (
    SELECT COUNT(*)::bigint AS reviews_7d
    FROM public.reviews
    WHERE user_id = target_user_id
      AND created_at >= now() - interval '7 days'
),
suggestions_7d AS (
    SELECT COUNT(*)::bigint AS suggestions_7d
    FROM public.suggested_fuel_stations
    WHERE submitted_by = target_user_id
      AND created_at >= now() - interval '7 days'
),
flags_7d AS (
    SELECT COUNT(*)::bigint AS flags_7d
    FROM public.flagged_stations
    WHERE user_id = target_user_id
      AND created_at >= now() - interval '7 days'
),
favourites_7d AS (
    SELECT COUNT(*)::bigint AS favourites_7d
    FROM public.favourite_stations
    WHERE user_id = target_user_id
      AND created_at >= now() - interval '7 days'
),
last_content AS (
    SELECT MAX(created_at) AS last_content_at
    FROM (
        SELECT pr.created_at FROM public.price_reports pr WHERE pr.user_id = target_user_id
        UNION ALL
        SELECT rv.created_at FROM public.reviews rv WHERE rv.user_id = target_user_id
        UNION ALL
        SELECT s.created_at FROM public.suggested_fuel_stations s WHERE s.submitted_by = target_user_id
        UNION ALL
        SELECT fs.created_at FROM public.flagged_stations fs WHERE fs.user_id = target_user_id
        UNION ALL
        SELECT fav.created_at FROM public.favourite_stations fav WHERE fav.user_id = target_user_id
    ) x
),
stats AS (
    SELECT
        ub.*,
        ls.last_seen_at,
        e24.events_24h,
        r7.reports_7d,
        rv7.reviews_7d,
        s7.suggestions_7d,
        f7.flags_7d,
        fav7.favourites_7d,
        lc.last_content_at,
        te.total_activity_events
    FROM user_base ub
    CROSS JOIN last_seen ls
    CROSS JOIN event_24h e24
    CROSS JOIN total_events te
    CROSS JOIN reports_7d r7
    CROSS JOIN reviews_7d rv7
    CROSS JOIN suggestions_7d s7
    CROSS JOIN flags_7d f7
    CROSS JOIN favourites_7d fav7
    CROSS JOIN last_content lc
),
final_enriched AS (
    SELECT
        s.*,
        NULLIF(
            GREATEST(
                COALESCE(s.last_sign_in_at, '-infinity'::timestamptz),
                COALESCE(uas.last_active_at, '-infinity'::timestamptz),
                COALESCE(s.last_seen_at, '-infinity'::timestamptz),
                COALESCE(s.last_content_at, '-infinity'::timestamptz)
            ),
            '-infinity'::timestamptz
        ) AS last_activity_at
    FROM stats s
    LEFT JOIN public.user_activity_summary uas ON uas.user_id = s.id
)
SELECT
    f.id,
    f.full_name,
    f.nickname,
    f.email,
    f.avatar_url,
    f.phone,
    f.created_at,
    f.last_sign_in_at,
    f.provider,
    f.role,
    f.is_banned,
    f.last_seen_at,
    f.last_activity_at,
    CASE
        WHEN f.last_activity_at IS NULL THEN 'inactive'
        WHEN f.last_activity_at >= now() - interval '15 minutes' THEN 'online'
        WHEN f.last_activity_at >= now() - interval '24 hours' THEN 'today'
        WHEN f.last_activity_at >= now() - interval '7 days' THEN 'this_week'
        ELSE 'inactive'
    END AS activity_status,
    f.events_24h,
    f.reports_7d,
    f.reviews_7d,
    f.suggestions_7d,
    f.flags_7d,
    f.favourites_7d,
    (
        COALESCE(f.reports_7d, 0)
        + COALESCE(f.reviews_7d, 0)
        + COALESCE(f.suggestions_7d, 0)
        + COALESCE(f.flags_7d, 0)
        + COALESCE(f.favourites_7d, 0)
        + COALESCE(f.events_24h, 0)
    )::bigint AS activity_score_7d,
    f.total_activity_events
FROM final_enriched f;
$function$;

GRANT EXECUTE ON FUNCTION public.get_users_for_admin_page(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_details(UUID) TO authenticated;
