import * as cheerio from 'cheerio';
async function test() {
  let res = await fetch('https://webapps.sandiego.gov/sdfiredispatch/');
  let text = await res.text();
  let $ = cheerio.load(text);
  console.log("Table classes:", $('table').attr('class'));
  console.log("Table inner HTML:", $('table').html()?.substring(0, 1000));
}
test();
