-- Name: personal_pages_to_collect; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.personal_pages_to_collect AS
 SELECT pp.id,
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
    pp.ddate_parsed
   FROM (public.parsed_pages_lst pp
     LEFT JOIN public.r ON ((((r.url)::text = ('https://www.idf.il'::text || public.encodeuricomponentexceptslash((pp.url)::text))) AND (length((r.v ->> 0)) >= 1000))))
  WHERE (r.url IS NULL)
  ORDER BY pp.url;


--
