-- Name: personal_pages_to_parse; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.personal_pages_to_parse AS
 SELECT DISTINCT ON (pp.url) pp.id,
    pp.ts,
    pp.req_id,
    pp.req_ts,
    pp.section,
    pp.page,
    pp.page_idx,
    pp.img,
    pp.rank,
    pp.corps,
    pp.ddate,
    pp.url,
    pp.ddate_parsed,
    r.v,
    r.id AS to_parse_req_id,
    r.ts AS to_parse_ts
   FROM ((public.parsed_pages_lst pp
     LEFT JOIN public.r ON ((((r.url)::text = ('https://www.idf.il'::text || public.encodeuricomponentexceptslash((pp.url)::text))) AND (length((r.v ->> 0)) >= 1000))))
     LEFT JOIN public.parsed_personal_pages ppp ON (((ppp.req_id)::text = (r.id)::text)))
  WHERE ((r.url IS NOT NULL) AND (ppp.id IS NULL) AND (length((r.v ->> 0)) > 1500))
  ORDER BY pp.url, r.ts DESC;


--
