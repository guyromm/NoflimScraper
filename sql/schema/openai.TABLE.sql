-- Name: openai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.openai (
    id character varying NOT NULL,
    ts timestamp with time zone DEFAULT now(),
    url character varying NOT NULL,
    params jsonb,
    response jsonb,
    err jsonb,
    email_id character varying
);


--
