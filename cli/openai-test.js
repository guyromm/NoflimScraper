#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
//import got from 'got';
import fetch from 'node-fetch';
import pg from 'pg';
import {encode} from 'gpt-3-encoder';

// const got = require('got');
//const prompt = `Artist: Megadeth\n\nLyrics:\n`;
const prompt=`x+y=15\n
x-y=9\n
x=`;
import hash from 'object-hash';

const l = console.log;

const MAX_TOKENS=4097;

export async function completion({pool,params,email_id})
{
    const cparams = {...params};
    let reduce = (params.prompt.length+params.max_tokens) - MAX_TOKENS;
    let enc,toenc,cond;
    do
    {
	if (!reduce)
	{
	    l('initial reduce',reduce) ; throw 666; 
	}
	else
	    reduce++;
	
	toenc = params.prompt.slice(0,params.prompt.length-reduce);
	enc = encode(toenc);
	cond = (enc.length+params.max_tokens)>MAX_TOKENS;
	if (!cond || (reduce % 10 ==0))
	    l(reduce,'=>',toenc.length,'sliced to',enc.length,'tokens','+',params.max_tokens,'=',(enc.length+params.max_tokens),'?>',MAX_TOKENS);
    } while  (cond)
    cparams.prompt = toenc;
    
    const url = 'https://api.openai.com/v1/engines/text-davinci-003/completions';
    let response,err;
    const id = hash({url,cparams})
    let res = await pool.query('select * from openai where id=$1',[id])
    if (res.rows.length)
    {
	l('found CACHE.')
	const row = res.rows[0];
	response = row.response;
	if (row.err) l('CACHED ERR CODE:',row.err)
	
	//l('cached response',response)
    }
    else
    {
	const headers = {
	    'Authorization': `Bearer ${process.env.OPENAI_SECRET_KEY}`,
	    'Content-Type':'application/json',
	};
	
	try {
	    l('* openai posting')
	    response = await (await fetch(url, { method:'post',
						 body: JSON.stringify(cparams),
						 headers: headers })).json();
	    l('* response=',response)
	    if (response.error)
	    {
		err = response.error;
		if (err.type==='tokens')
		{
		    l('temporary error',err,'- not writing down.')
		    err=null;
		}
		response = null;		
	    }

	    if (err || response)
	    {
		let res = await pool.query('insert into openai (id,url,params,response,err,email_id) values($1,$2,$3,$4,$5,$6) on conflict (id) do update set url=$2,params=$3,response=$4,err=$5,id=$6,ts=now()',[id,url,cparams,response,err,email_id])
	    }
	} catch (err) {
	    l('CODE:',err);
	    if (err)
	    {
		let res = await pool.query('insert into openai (id,url,params,err,email_id) values($1,$2,$3,$4,$5) on conflict (id) do update set url=$2,params=$3,err=$4,email_id=$5,ts=now()',[id,url,cparams,JSON.stringify(err),email_id])
	    }
	    
	}
    }
    return response;
}

/*(async () => {
    const pool = new pg.Pool({
	host: '/var/run/postgresql',
	database: 'fuse',
    });

    const params = {
	"prompt": prompt,
	"max_tokens": 160,
	"frequency_penalty": 0.5,
	"temperature": 0.7,
    };
    const response = await  completion({pool,params})
    pool.end()
    const output = `${prompt}${response.choices[0].text}`;
    console.log(output);
    
})();*/
