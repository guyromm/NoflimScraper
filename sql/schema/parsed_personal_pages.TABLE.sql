-- Name: parsed_personal_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parsed_personal_pages (
    id integer NOT NULL,
    ts timestamp with time zone DEFAULT now(),
    req_id character varying,
    req_ts timestamp with time zone,
    det character varying,
    fun character varying,
    age_years integer,
    title character varying,
    eng character varying,
    loc character varying,
    gender character varying,
    url character varying
);


--
