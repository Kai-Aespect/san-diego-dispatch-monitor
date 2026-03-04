import { fetchFireIncidents, fetchPoliceIncidents } from './server/scraper';

async function test() {
  console.log("Testing Fire Scraper...");
  const fire = await fetchFireIncidents();
  console.log("Fire incidents:", fire.length);
  if (fire.length > 0) console.log(fire[0]);

  console.log("Testing Police Scraper...");
  const police = await fetchPoliceIncidents();
  console.log("Police incidents:", police.length);
  if (police.length > 0) console.log(police[0]);
}

test().catch(console.error);
