import * as cheerio from 'cheerio';

async function fetchFireIncidents() {
  const response = await fetch('https://webapps.sandiego.gov/sdfiredispatch//', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const incidents = [];
  $('table tr').each((i, el) => {
    if ($(el).find('th').length > 0) return;
    
    const tds = $(el).find('td');
    if (tds.length >= 6) {
      incidents.push({
        time: $(tds[0]).text().trim(),
        incidentNo: $(tds[1]).text().trim(),
        callType: $(tds[2]).text().trim(),
        status: $(tds[3]).text().trim(),
        location: $(tds[4]).text().trim(),
        crossStreets: $(tds[5]).text().trim(),
        units: tds.length > 6 ? $(tds[6]).text().trim() : '',
      });
    }
  });
  console.log("Fire mapped:", incidents.length);
  if (incidents.length > 0) console.log(incidents[0]);
}

async function fetchPoliceIncidents() {
  const response = await fetch('https://webapps.sandiego.gov/sdpdonline', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const incidents = [];
  $('table tr').each((i, el) => {
    if ($(el).find('th').length > 0) return;

    const tds = $(el).find('td');
    if (tds.length >= 6) {
      incidents.push({
        incidentNo: $(tds[0]).text().trim(),
        timeStr: $(tds[1]).text().trim(),
        priority: $(tds[2]).text().trim(),
        callType: $(tds[3]).text().trim(),
        location: $(tds[4]).text().trim(),
        neighborhood: $(tds[5]).text().trim(),
      });
    }
  });
  console.log("Police mapped:", incidents.length);
  if (incidents.length > 0) console.log(incidents[0]);
}

async function test() {
  await fetchFireIncidents();
  await fetchPoliceIncidents();
}

test();
