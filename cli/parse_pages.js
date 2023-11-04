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
async function parse_page({pool,r})
{
    const page = r.url.includes('page=')?parseInt(/page=([0-9]+)/g.exec(r.url)[1]):1
    const purl = r.url.replace(nofUrl,'')
    let section = decodeURIComponent(purl.split('/')[0])    
    l({page,section})
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
    const title = dom.window.document.querySelector('title').textContent
    const cas = dom.window.document.querySelectorAll('div.list-casualties .col-lg-6')
    l(cas.length,'cas elements.')
    let idx=0
    for (let cel of cas)
    {
	const simg = cel.querySelector('.soldier-image img').src;
	const srank = cel.querySelector('.solder-name span.small').textContent
	const corps = cel.querySelector('.sub-counter').textContent.trim()
	const ddate = cel.querySelector('p').textContent
	const ddatepa = /\((.*)\)$/.exec(ddate)[1].split('.').map(d=>parseInt(d));
	const ddatep = new Date(ddatepa[2],ddatepa[1]-1,ddatepa[0])
	const purl = cel.querySelector('a.btn-link-text').href
	const i = {simg,srank,corps,ddate,purl,ddatep}
	l(i)
	await pool.query('insert into parsed_pages (req_id,req_ts,section,page,page_idx,img,rank,corps,ddate,url,ddate_parsed) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[r.id,r.ts,section,page,idx++,simg,srank,corps,ddate,purl,ddatep])
    }
    //l({title})
    return idx
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

    const rg = 'idf.il/([^/]+)/([^/]+)/(\\?page\=([0-9]+)|)$'
    l(rg)
    let res = await pool.query(`select * from r where url like '${nofUrl}%' and jsonb_typeof(v)='string' and id not in (select req_id from parsed_pages) and url ~* $1`,[rg])
    l(res.rows.length,'items')
    let processed=0;
    let listings=0;
    try {
        for (let r of res.rows)
        {
            l('ad',r.adid,'cat',r.catid,'url',r.url.replace(BASE,'').split('?')[0],r.ts)
            listings+=await parse_page({pool,r})
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


