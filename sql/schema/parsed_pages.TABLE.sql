-- Name: parsed_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parsed_pages (
    id integer NOT NULL,
    ts timestamp with time zone DEFAULT now(),
    req_id character varying,
    req_ts timestamp with time zone,
    purl character varying,
    page integer,
    page_idx integer,
    img character varying,
    rank character varying,
    corps character varying,
    ddate character varying,
    url character varying,
    ddate_parsed date
);


--
