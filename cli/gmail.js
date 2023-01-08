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

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './token.json'; // path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = './credentials.json';

/**
    * Reads previously authorized credentials from the save file.
    *
    * @return {Promise<OAuth2Client|null>}
    */
async function loadSavedCredentialsIfExist() {
    try {
	const content = await fs.readFile(TOKEN_PATH);
	const credentials = JSON.parse(content);
	return google.auth.fromJSON(credentials);
    } catch (err) {
	return null;
    }
}

/**
    * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
    *
    * @param {OAuth2Client} client
    * @return {Promise<void>}
    */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
	type: 'authorized_user',
	client_id: key.client_id,
	client_secret: key.client_secret,
	refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
    * Load or request or authorization to call APIs.
    *
    */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
	return client;
    }
    client = await authenticate({
	scopes: SCOPES,
	keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
	await saveCredentials(client);
    }
    return client;
}

/**
    * Lists the labels in the user's account.
    *
    * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
    */
async function listLabels(auth) {
    const gmail = google.gmail({version: 'v1', auth});
    const res = await gmail.users.labels.list({
	userId: 'me',
    });
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
	console.log('No labels found.');
	return;
    }
    console.log('Labels:');
    labels.forEach((label) => {
	console.log(`- ${label.name}`);
    });
}


async function parse({raw,id,pool}) {
    l('parse',id)
    if (!id) throw new Error('wtf no id')
    const subject = raw.headers.find((header) => header.name === 'Subject').value;
    const sender = raw.headers.find((header) => header.name === 'From').value;
    const date = raw.headers.find((header) => header.name === 'Date').value;
    //let b;
    let body;
    let parts=raw.parts||[];
    //l(raw.parts,'=RAW.PARTS')    
    /*if (raw.payload) parts.push({...raw.payload,
				 hash:hash(raw.payload.body),
				 partId:null,
				 src:'payload'});*/
    //l(raw.payload) ; throw new Error('kbye')
    
    let hashes={};
    parts = (raw.parts||[]).map(p=>
	{
	    const pp = {partId:parseInt(p.partId),
			filename:p.filename,
			mimeType:p.mimeType,
			contentType:p.headers?p.headers['Content-Type']:null,
			body:p.body.data?Buffer.from(p.body.data,'base64').toString('utf8'):null,
			src:p.src||'part',
			hash:hash(p)
		       };
	    if (!hashes[pp.hash]) hashes[pp.hash]=0;
	    hashes[pp.hash]++;
	    if (['text/html','text/x-amp-html'].includes(pp.mimeType))
	    {
		const { JSDOM } = jsdom;
		const dom = new JSDOM('<html><body>'+pp.body+'</body></html>');
		const styles = dom.window.document.querySelectorAll('style')
		for (let st of styles)
		    st.remove()
		const title = dom.window.document.querySelector('title')
		let txt='';
		if (title) {
		    txt=`Title: ${title.textContent.trim()}\n`;
		    title.remove();
		}
		txt+=`${dom.window.document.body.textContent.trim()}`;
		//txt="\n\n\n\n";
		pp.text = txt
		//l(txt,p.partId,p.mimeType)
	    }
	    else if (pp.mimeType=='text/plain')
	    {
		//if (pp.body) pp.body = pp.body.replace(/\s\s+/g,' ').replace(/([\r\n]{2,})/g,'\n')
		pp.text = pp.body;
	    }
	    //if (pp.text) pp.text = pp.text.replace(/\s\s+/g,' ').replace(/([\r\n]{2,})/g,'\n')

	    return pp;
	}
    );
    parts = parts.filter(p=>hashes[p.hash]<2);
    parts.sort((p1,p2)=>((p1.filename==='' &&
			  p1.mimeType==='text/plain' &&
			  p1.text &&
			  p1.text.length>p2.text.length)?-1:1))
    /*l(id,
      'part0',
      parts[0].text && parts[0].text.length||'N/A',
      (parts.map(p=>({hash:p.hash,
		      part:p.partId,
		      src:p.src,
		      mime:p.mimeType,
		      tt:p.text?'text':(p.body?'body':'none'),
		      tl:(p.text?p.text.length:p.body?p.body.length:null)
		     })
		)
      )
      )*/
    const pp = parts[0];
    let summary=null;
    //l(pp.mimeType,pp.filename,pp.text)
    if (pp && ['text/plain','text/html'].includes(pp.mimeType) && !pp.filename)
    {
	//const suffix = "One-line summary:"
	const suffix = "One-line English summary without pronouns, determiners and other unnecessary terms or mention of the sender:"; 
	const prompt = Object.entries({'Sender':sender,
				       'Subject':subject,
				       'Date':date,
				       'Contents':pp.text, // .slice(0,3200)
				      }).map(e=>e.join(': ')).join("\n")+"\n\n"+suffix
	const params = {prompt,
			max_tokens:256, // parseInt(pp.text.length/3), // 256,
			temperature:0.7,
			top_p:1,
			best_of:1,
			frequency_penalty:0
		       }
	//l(prompt) ; l(pp.partId); throw 1;
	l('attempting to run completions on a',prompt.length,'long prompt.')
	const comp = await completion({pool,params,email_id:id})	
	if (comp && comp.choices)
	{
	    l(prompt+comp.choices[0].text)
	    l('COMPLETION:',comp.choices[0].text.trim());
	    summary = pp.digest = comp.choices[0].text.trim();
	}
	else
	    l('FAILURE:',prompt.length,params.max_tokens,'=>',comp)
    }
    // l(params.prompt) ;
    let cnt=0;
    body = JSON.stringify(parts)
    return {subject,sender,date,body,parts,summary};
}

async function reparse({pool,id}) {
    let res;
    if (id!=='reparse')
	res = await pool.query('select * from emails where raw is not null and id=$1',[id])
    else
	res = await pool.query('select * from emails where raw is not null')
    l('* reparsing',res.rows.length);
    for (let e of res.rows)
    {
	const p = await parse({raw:e.raw,
			       id:e.id,
			       pool})
	//l('email',e.id) // ,Object.keys(p),p.parts)
	await pool.query('update emails set subject=$1,"sender"=$2,"date"=$3,body=$4 where id=$5',
			 [p.subject,p.sender,new Date(Date.parse(p.date)),p.body,e.id])
    }
    l('* done reparse')
}


async function pollGmail({pool,auth}) {
    const gmail = google.gmail({version: 'v1', auth});
    l('* listing messages.')
    const res = await gmail.users.messages.list({userId: 'me', q: 'is:inbox'});
    const messages = res.data.messages;
    
    l('*',messages.length,'messages.');
    for (const message of messages) {
	const msg = await gmail.users.messages.get({userId: 'me', id: message.id});
	
	const email = msg.data;
	const raw = {headers:email.payload.headers,
		     parts:(email.payload.parts||[]).map(p=>({partId:p.partId,filename:p.filename,mimeType:p.mimeType,headers:p.headers,body:p.body})),
		     payload:email.payload
		    };

	const {subject,sender,date,body,parts} = await parse({raw,id:email.id,pool})
	//const p = parse(raw)
	const args = [email.id,
		      subject,
		      sender,
		      new Date(Date.parse(date)),
		      JSON.stringify(raw),
		      body];
	//l('args=',args)
	
	l('about to insert',email.id,sender,subject,parts.length,'parts.')
	try {
	    const qry = 		'INSERT INTO emails (\
id,\
subject,\
"sender",\
"date",\
raw,\
body \
) VALUES (\
$1, \
$2,\
$3,\
$4,\
$5,\
$6\
) on conflict (id) do update set \
subject=$2,\
"sender"=$3,\
date=$4,\
raw=$5,\
body=$6,\
ts=now()';
	    //l(qry)
	    await pool.query(qry
,
		args
	    );
	}
	catch (err) {
	    l('ERROR attempting to insert',args[0],':',err);
	}
    }
    l('* done going over messages.')
}

const l = console.log;

async function main() {
    const pool = new pg.Pool({
	host: '/var/run/postgresql',
	database: 'fuse',
    });

    try {
	if (process.argv.includes('reparse') || process.argv.length>2)
	{
	    const ids = process.argv.slice(2);
	    //l('sliced:',ids) ; throw 234;
	    for (let id of ids)
	    {
		await reparse({pool,id})
	    }
	}
	else
	{
	    // Set up a PostgreSQL connection pool
	    l('* authorizing')
	    const auth = await authorize();
	    l('* polling gmail')
	    await pollGmail({pool,auth});
	    l('* all done.')
	}
    }
    finally {
	pool.end()
    }
}
main();
