import * as cheerio from 'cheerio';

async function test() {
  console.log("Testing Fire Scraper...");
  try {
    const response = await fetch('https://webapps.sandiego.gov/sdfiredispatch//', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await response.text();
    console.log("HTML length:", html.length);
    console.log("First 500 chars:", html.substring(0, 500));
    const $ = cheerio.load(html);
    console.log("Tables found:", $('table').length);
  } catch(e) {
    console.error(e);
  }

  console.log("\nTesting Police Scraper...");
  try {
    const response = await fetch('https://webapps.sandiego.gov/sdpdonline/Dispatch.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await response.text();
    console.log("HTML length:", html.length);
    console.log("First 500 chars:", html.substring(0, 500));
    const $ = cheerio.load(html);
    console.log("Tables found:", $('table').length);
  } catch (e) {
    console.error(e);
  }
}

test().catch(console.error);
