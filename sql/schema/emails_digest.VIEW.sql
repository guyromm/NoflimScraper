-- Name: emails_digest; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.emails_digest AS
 SELECT emails_parts_parse_preview.id,
    emails_parts_parse_preview.date,
    array_agg(DISTINCT emails_parts_parse_preview.mime) AS mimes,
    sum(emails_parts_parse_preview.l) AS l,
    count(*) AS count,
    array_remove(array_agg(emails_parts_parse_preview.digest), NULL::text) AS digests,
    max(emails_parts_parse_preview.ts) AS lst_ts
   FROM public.emails_parts_parse_preview
  GROUP BY emails_parts_parse_preview.id, emails_parts_parse_preview.date
  ORDER BY emails_parts_parse_preview.date DESC;


--
