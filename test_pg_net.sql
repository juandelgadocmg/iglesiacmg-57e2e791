SELECT net.http_get(
    url := 'https://api.zadarma.com/v1/request/callback/?from=301311&to=3134567481',
    headers := '{"Authorization": "fb94530cb765f6d212e2:XYZ"}'::jsonb
);
