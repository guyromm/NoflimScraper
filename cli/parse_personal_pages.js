#!/usr/bin/env node                                                                                                                                                          
import dotenv from 'dotenv';
dotenv.config();
import {promises as fs} from 'fs';
import path from 'path';
import process from 'process';
import {authenticate} from '@google-cloud/local-auth';
import {google}  from 'googleapis';
import jsdom from 'jsdom'
import pg from 'pg';
import {completion} from './openai-test.js';
import hash from 'object-hash';

const l = console.log

const BASE='https://www.idf.il/'
const nofUrl = BASE+'%D7%A0%D7%95%D7%A4%D7%9C%D7%99%D7%9D/'
async function parse_personal_page({pool,r})
{
    l('parsing personal page',r.to_parse_req_id)
    l(r.url)
    const purl = r.url.replace(nofUrl,'')
    let section = decodeURIComponent(purl.split('/')[0])    
    const v = r.v
    const { JSDOM } = jsdom;
    let dom;
    try{
	dom = new JSDOM(v)
    } catch (err)
    {
	l('cannot instantiate dom from',v.length)
	return
    }
    const document = dom.window.document
    const hel = document.querySelector('h1')
    let h=null,hrank=null,hname=null,hsuf=null;
    if (hel)
    {
	h = hel.textContent.trim().split('\n').filter(s=>s).map(s=>s.trim())
	l('splitting!',h)
	hrank=h[0]
	hname=h[1]
	hsuf=h[2]
	//[hrank,hname,hsuf] = h;
    }
    const tt = document.querySelector('div.tag-text')
    let det;
    let pars = document.querySelectorAll('.media-body p')
    l(pars.length,'pars')
    det = pars[1].textContent.trim()
    //l('det=',det)
    // if (tt)
    // 	det = tt.nextSibling.nextSibling.nextSibling.nextSibling.textContent.trim()
    const h4d = document.querySelector('h4.details')
    let fun
    if (h4d)
	fun = h4d.nextSibling.nextSibling.textContent.trim()
    let dage = new RegExp('(בן|בת) ([0-9]+) בנופל').exec(det)
    let dage_years=null;
    let gender=null;
    if (dage)
    {
	dage_years = parseInt(dage[2])
	gender=dage[1];
    }

    let detp = det.split(', ')

    let loc = detp[1].slice(1);
    let title = detp[2]
    let dets = det.split('.')
    let eng = dets[dets.length-1]
    l({hrank,hname,hsuf,det,fun,dage_years,loc,title,eng,gender}) ;
    await pool.query(`insert into parsed_personal_pages (
req_id,
req_ts,
det,
fun,
age_years,
title,
eng,
loc,
gender,url) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[
    r.to_parse_req_id,
    r.to_parse_ts,
    det,
    fun,
    dage_years,
    title,
    eng,
    loc,
    gender,
    r.url])
    return 1;
}
async function main() {
    l(process.env.DBNAME)

    const socketPaths = [
        '/var/run/postgresql', // common on Linux
        '/tmp',                // common on macOS
    ];

    let socketPath;
    for (let sp of socketPaths)
    {
        try {
            const st =  await fs.stat(sp);
            socketPath=sp;
            break;
        }
        catch (err)
        {
        }
    }


    if (!socketPath) {
        throw new Error('Cannot find PostgreSQL Unix Domain Socket');
    }
    const pool = new pg.Pool({
        host: socketPath,
        database: process.env.DBNAME,
    });

    let res = await pool.query(`select * from personal_pages_to_parse`)
    l(res.rows.length,'items')
    let processed=0;
    let listings=0;
    try {
        for (let r of res.rows)
        {
            //l('ad',r.adid,'cat',r.catid,'url',r.url.replace(BASE,'').split('?')[0],r.ts)
            listings+=await parse_personal_page({pool,r})
            processed++;
        }
    } catch (err)
    {
        l('err:',err)
    }
    finally
    {
        l(res.rows.length,'requests,',processed,'processed,',listings,'listings inserted.')
        pool.end()
    }
}

main()


