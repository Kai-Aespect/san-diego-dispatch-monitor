import * as cheerio from 'cheerio';
async function test() {
  let res = await fetch('https://webapps.sandiego.gov/sdpdonline/');
  let text = await res.text();
  let $ = cheerio.load(text);
  $('tr').each((i, el) => {
    let tds = $(el).find('td');
    if (tds.length > 0) {
      console.log($(el).html());
      return false; // break after first row
    }
  });
}
test();
