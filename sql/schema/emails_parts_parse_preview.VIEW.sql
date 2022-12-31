-- Name: emails_parts_parse_preview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.emails_parts_parse_preview AS
 WITH a AS (
         SELECT emails.id,
            jsonb_array_elements(emails.body) AS e
           FROM public.emails
          ORDER BY emails.ts DESC
        )
 SELECT a.id,
    length((a.e ->> 'text'::text)) AS l,
    (a.e ->> 'partId'::text) AS part,
    (a.e ->> 'mimeType'::text) AS mime,
    "substring"((a.e ->> 'text'::text), 1, 200) AS text,
    "substring"((a.e ->> 'body'::text), 1, 200) AS body
   FROM a
  ORDER BY (length((a.e ->> 'text'::text))) DESC NULLS LAST;


--
