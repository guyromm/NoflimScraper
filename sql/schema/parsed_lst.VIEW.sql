-- Name: parsed_lst; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.parsed_lst AS
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
    pp.ddate_parsed,
    ppp.id AS ppp_id,
    ppp.ts AS ppp_ts,
    ppp.req_id AS ppp_req_id,
    ppp.req_ts AS ppp_req_ts,
    ppp.det,
    ppp.fun,
    ppp.age_years,
    ppp.title,
    ppp.eng,
    ppp.loc,
    ppp.gender
   FROM (public.parsed_pages_lst pp
     LEFT JOIN public.parsed_personal_pages_lst ppp ON (((pp.url)::text = (ppp.url)::text)));


--
