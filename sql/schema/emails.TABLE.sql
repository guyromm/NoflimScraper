-- Name: emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emails (
    id character varying NOT NULL,
    subject character varying,
    sender character varying,
    date timestamp with time zone,
    ts timestamp with time zone DEFAULT now(),
    body jsonb,
    raw jsonb
);


--
