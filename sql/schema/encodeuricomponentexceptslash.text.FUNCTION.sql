-- Name: encodeuricomponentexceptslash(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encodeuricomponentexceptslash(original text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
  result text := '';
  b bytea;
  i int;
BEGIN
  -- Convert the text to bytea for UTF8 encoding
  b := convert_to(original, 'UTF8');

  -- Loop through each byte
  FOR i IN 0..octet_length(b)-1 LOOP
    -- Get the individual byte
    result := result || (
      CASE
        WHEN get_byte(b, i) BETWEEN 48 AND 57 OR -- 0-9
             get_byte(b, i) BETWEEN 65 AND 90 OR -- A-Z
             get_byte(b, i) BETWEEN 97 AND 122 OR -- a-z
             get_byte(b, i) IN (45, 46, 95, 126) -- -, ., _, ~
        THEN
          -- If it's an unreserved character, convert the byte back to text
          chr(get_byte(b, i))::text
        WHEN get_byte(b, i) = 47 -- /
        THEN
          -- If it's a forward slash, keep it as it is
          '/'
        ELSE
          -- Otherwise, percent encode the byte and convert to uppercase
          '%' || upper(lpad(to_hex(get_byte(b, i)), 2, '0'))
      END
    );
  END LOOP;

  RETURN result;
END;
$$;


--
