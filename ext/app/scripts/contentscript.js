import {setConfig,cliAuthLogic,select,upsert,selectOne,insert,update,del} from '../../../common/postgrest-cli.js';
import {sleep,DEBUGGER_ATTACH,nextLiveFeed} from './funcs.js';
import html2canvas from 'html2canvas';
const l = (...a) => console.log('WN',...a);


setConfig({authLogic:cliAuthLogic})

let myItemId,reqs;


l('adding listener.');
chrome.runtime.onMessage.addListener(async (req,sender,sendResponse) => {
  let responseStatus = { bCalled: false };
  l('incoming message',req.message,'req',req);
  if (req.message=='pagelogic') {
    pagelogic('onmessage-pagelogic');
  }
  else if (req.message==='reload') {
    document.reload();
    return;
  }
});

let zerocounter=0;

let proxy;
async function setProxy() {
    const p = (await selectOne('settings',{id:'eq.proxy'},true))
    if (p)
	proxy = p.value;
    else
	proxy = null;
}

let H,W,A;
let bottomCount=0;
async function pagelogic() {
    await setProxy();    
    l('pagelogic.',location.pathname);
    const body = document.body;
    const html = document.documentElement;
    if (body)
    {
	H = Math.max(body.scrollHeight, body.offsetHeight,  html.clientHeight, html.scrollHeight, html.offsetHeight); // window.outerHeight;
	W = Math.max(body.scrollWidth, body.offsetWidth, body.clientWidth, html.scrollWidth, html.offsetWidth); // window.outerWidth;
	A = H*W;
    }
    
    const v = (await (await insert('visits',{url:location.href,w:W,h:H,proxy})).json())[0]
    chrome.runtime.sendMessage({message:'visit',visitId:v.id})

    

    //throw new Error('unimplemented pagelogic')
    l('pathname',location.pathname);
    if (location.pathname.startsWith('/%D7%A0%D7%95%D7%A4%D7%9C%D7%99%D7%9D/'))
    {
	const pspl = location.pathname.split('/')
	if (pspl.length===4) // listing page
	{
	    let nxt = document.querySelector('.page-item.active')
	    if (nxt) nxt = nxt.nextElementSibling
	    if (nxt) nxt = nxt.querySelector('a')
	    l('nxt',nxt)
	    if (nxt) nxt.click()
	}

	else if (pspl.length===5) // personal page
	{
	    l('in personal page')
	}
	
	const pptc = await selectOne('personal_pages_to_collect',{limit:1},true)
	if (pptc)
	    location.href='https://www.idf.il'+pptc.url;
	
	    
	// const nxt = document.querySelector('a[rel=next]')
    }

    setTimeout(pagelogic,1000);
}

l('invoking pagelogic');
setTimeout(()=>pagelogic('onload'),1000)
