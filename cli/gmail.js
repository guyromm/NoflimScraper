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

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

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


function parse(raw) {
    const subject = raw.headers.find((header) => header.name === 'Subject').value;
    const from = raw.headers.find((header) => header.name === 'From').value;
    const date = raw.headers.find((header) => header.name === 'Date').value;
    //let b;
    let body;
    let parts=raw.parts||[];
    if (raw.payload) parts.push({...raw.payload,src:'payload'});
    parts = (raw.parts||[]).map(p=>
	{
	    const pp = {partId:p.partId,
			filename:p.filename,
			mimeType:p.mimeType,
			contentType:p.headers?p.headers['Content-Type']:null,
			body:p.body.data?Buffer.from(p.body.data,'base64').toString('utf8'):null};
	    if (['text/html','text/x-amp-html'].includes(pp.mimeType))
	    {
		const { JSDOM } = jsdom;
		const dom = new JSDOM('<html><body>'+pp.body+'</body></html>');
		const styles = dom.window.document.querySelectorAll('style')
		for (let st of styles)
		    st.remove()
		pp.text = dom.window.document.body.textContent;
	    }
	    else if (pp.mimeType=='text/plain')
	    {
		pp.body = pp.body.replace(/\s\s+/g,' ').replace(/([\r\n]{2,})/g,'\n')
		pp.text = pp.body;
	    }
	    if (pp.text)
		pp.text = pp.text.replace(/\s\s+/g,' ').replace(/([\r\n]{2,})/g,'\n')
	    return pp;
	}
    );
    let cnt=0;
    body = JSON.stringify(parts)
    return {subject,from,date,body,parts};
}

async function reparse({pool}) {
    const res = await pool.query('select * from emails where raw is not null')
    for (let e of res.rows)
    {
	const p = parse(e.raw)
	l('email',e.id,Object.keys(p),p.parts)
	await pool.query('update emails set subject=$1,"from"=$2,"date"=$3,body=$4 where id=$5',
			 [p.subject,p.from,new Date(Date.parse(p.date)),p.body,e.id])
    }
}

async function pollGmail({pool,auth}) {
    const gmail = google.gmail({version: 'v1', auth});
    const res = await gmail.users.messages.list({userId: 'me', q: 'is:inbox'});
    const messages = res.data.messages;
    
    l(messages.length,'messages.');
    for (const message of messages) {
	const msg = await gmail.users.messages.get({userId: 'me', id: message.id});
	
	const email = msg.data;
	const raw = {headers:email.payload.headers,
		     parts:(email.payload.parts||[]).map(p=>({partId:p.partId,filename:p.filename,mimeType:p.mimeType,headers:p.headers,body:p.body})),
		     payload:email.payload
		    };

	const {subject,from,date,body,parts} = parse(raw)
	const args = [email.id,subject, from, new Date(Date.parse(date)), JSON.stringify(raw)];
	l('about to insert',email.id,from,subject,parts.length,'parts.')
	try {
	    await pool.query(
		'INSERT INTO emails (id, subject,"from","date",raw) VALUES ($1, $2,$3,$4,$5,$6) on conflict (id) do update set subject=$2,"from"=$3,date=$4,raw=$6,ts=now()', //  update set subject=EXCLUDED.subject,"from"=EXCLUDED."from","date"=EXCLUDED."date",body=EXCLUDED."body"',
		args
	    );
	}
	catch (err) {
	    l('ERROR attempting to insert',args[0],':',err);
	}
    }
}

const l = console.log;

async function main() {
    const pool = new pg.Pool({
	host: '/var/run/postgresql',
	database: 'fuse',
    });
    
    if (process.argv.includes('reparse'))
    {
	await reparse({pool})
    }
    else
    {
	// Set up a PostgreSQL connection pool
	
	const auth = await authorize();
	await pollGmail({pool,auth});
    }
}
main();
