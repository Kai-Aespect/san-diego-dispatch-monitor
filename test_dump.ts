import * as cheerio from 'cheerio';

async function test() {
  const response = await fetch('https://webapps.sandiego.gov/sdfiredispatch/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await response.text();
  console.log("FIRE HTML DUMP:");
  console.log(html.substring(0, 2000));
}
test();
