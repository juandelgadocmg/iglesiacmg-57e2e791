CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION get_zadarma_signature(p_query_str TEXT) 
RETURNS TEXT 
SECURITY DEFINER
AS $$
DECLARE
    v_method TEXT := '/v1/request/callback/';
    v_md5 TEXT;
    v_data_to_sign TEXT;
    v_secret TEXT := '3351412a4e36798a200f';
BEGIN
    v_md5 := md5(p_query_str);
    v_data_to_sign := v_method || p_query_str || v_md5;
    RETURN encode(hmac(v_data_to_sign, v_secret, 'sha1'), 'base64');
END;
$$ LANGUAGE plpgsql;
