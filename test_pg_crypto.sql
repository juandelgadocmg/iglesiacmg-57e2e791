CREATE OR REPLACE FUNCTION test_zadarma_sig() RETURNS TEXT AS $$
DECLARE
    v_method TEXT := '/v1/request/callback/';
    v_query_str TEXT := 'from=301311&to=3134567481';
    v_md5 TEXT;
    v_data_to_sign TEXT;
    v_signature TEXT;
    v_secret TEXT := '20d18884fda09f1f8587';
BEGIN
    v_md5 := md5(v_query_str);
    v_data_to_sign := v_method || v_query_str || v_md5;
    v_signature := encode(hmac(v_data_to_sign, v_secret, 'sha1'), 'base64');
    RETURN v_signature;
END;
$$ LANGUAGE plpgsql;
