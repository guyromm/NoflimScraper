-- Name: emails_parts_parse_preview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.emails_parts_parse_preview AS
 WITH a AS (
         SELECT emails.sender,
            emails.id,
            emails.subject,
            jsonb_array_elements(emails.body) AS e,
            emails.ts,
            emails.date
           FROM public.emails
          ORDER BY emails.ts DESC
        )
 SELECT a.id,
    length((a.e ->> 'text'::text)) AS l,
        CASE
            WHEN ((a.e ->> 'partId'::text) <> ''::text) THEN ((a.e ->> 'partId'::text))::integer
            ELSE '-1'::integer
        END AS part,
    (a.e ->> 'mimeType'::text) AS mime,
    "substring"((a.e ->> 'text'::text), 1, 99999) AS text,
    "substring"((a.e ->> 'body'::text), 1, 800) AS body,
    (a.e ->> 'digest'::text) AS digest,
    a.subject,
    a.sender,
    a.ts,
    a.date
   FROM a
  ORDER BY (length((a.e ->> 'text'::text))) DESC NULLS LAST;


--
