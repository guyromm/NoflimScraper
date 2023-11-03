-- Name: parsed_personal_pages_lst; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.parsed_personal_pages_lst AS
 SELECT DISTINCT ON (parsed_personal_pages.url) parsed_personal_pages.id,
    parsed_personal_pages.ts,
    parsed_personal_pages.req_id,
    parsed_personal_pages.req_ts,
    parsed_personal_pages.det,
    parsed_personal_pages.fun,
    parsed_personal_pages.age_years,
    parsed_personal_pages.title,
    parsed_personal_pages.eng,
    parsed_personal_pages.loc,
    parsed_personal_pages.gender,
    parsed_personal_pages.url
   FROM public.parsed_personal_pages
  ORDER BY parsed_personal_pages.url, parsed_personal_pages.ts DESC;


--
