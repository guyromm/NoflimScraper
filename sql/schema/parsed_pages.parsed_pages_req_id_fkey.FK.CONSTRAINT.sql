-- Name: parsed_pages parsed_pages_req_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parsed_pages
    ADD CONSTRAINT parsed_pages_req_id_fkey FOREIGN KEY (req_id) REFERENCES public.r(id);


--
