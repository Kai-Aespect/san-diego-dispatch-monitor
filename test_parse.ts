import * as cheerio from 'cheerio';

async function test() {
  console.log("Fetching Fire...");
  let res = await fetch('https://webapps.sandiego.gov/sdfiredispatch/');
  let text = await res.text();
  let $ = cheerio.load(text);
  console.log("Fire trs:", $('tr').length);
  if ($('tr').length > 1) {
    console.log("Fire first row:");
    console.log($('tr').eq(1).text().trim().replace(/\s+/g, ' '));
  }

  console.log("Fetching Police...");
  res = await fetch('https://webapps.sandiego.gov/sdpdonline/');
  text = await res.text();
  $ = cheerio.load(text);
  console.log("Police trs:", $('tr').length);
  if ($('tr').length > 1) {
    console.log("Police first row:");
    console.log($('tr').eq(1).text().trim().replace(/\s+/g, ' '));
  }
}

test();
