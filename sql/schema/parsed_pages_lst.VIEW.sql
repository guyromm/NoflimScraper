-- Name: parsed_pages_lst; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.parsed_pages_lst AS
 SELECT DISTINCT ON (parsed_pages.url) parsed_pages.id,
    parsed_pages.ts,
    parsed_pages.req_id,
    parsed_pages.req_ts,
    parsed_pages.section,
    parsed_pages.page,
    parsed_pages.page_idx,
    parsed_pages.img,
    parsed_pages.rank,
    parsed_pages.corps,
    parsed_pages.ddate,
    parsed_pages.url,
    parsed_pages.ddate_parsed
   FROM public.parsed_pages
  ORDER BY parsed_pages.url, parsed_pages.req_ts DESC;


--
