export function getCallDescription(callType: string, callTypeFamily?: string | null): string {
  const ct = callType.toLowerCase();
  const cf = (callTypeFamily || "").toLowerCase();

  if (ct.includes("structure fire") || ct.includes("structure highrise")) return "Building fire response with engine and truck crews.";
  if (ct.includes("brush") || ct.includes("vegetation fire")) return "Wildland or brush fire; may span multiple agencies.";
  if (ct.includes("rubbish fire")) return "Small debris or dumpster fire; single engine response.";
  if (ct.includes("smoke check")) return "Investigating reported smoke odor or visible smoke.";
  if (ct.includes("ringing alarm") || cf.includes("ringing alarm")) return "Automated fire alarm activation; investigation required.";
  if (ct.includes("carbon monoxide") || cf.includes("carbon monoxide")) return "CO detector alarm; life-safety investigation.";
  if (ct.includes("hazmat") || cf.includes("hazmat")) return "Hazardous materials incident; specialized team response.";
  if (ct.includes("us&r") || ct.includes("urban search") || cf.includes("us&r")) return "Urban search & rescue — collapse or confined space.";
  if (ct.includes("lift assist")) return "Assisting a person who has fallen and cannot get up.";
  if (ct.includes("lock in") || ct.includes("lock out") || cf.includes("lock")) return "Assisting with entry to or exit from a locked structure.";
  if (ct.includes("stand back hold")) return "Units staged; scene not yet cleared for entry.";
  if (ct.includes("advised incident") || ct.includes("adv")) return "Informational dispatch; no active emergency response.";
  if (ct.includes("traffic accident") || ct.includes("traffic accidents") || cf.includes("traffic")) return "Vehicle collision; possible injuries or extrication needed.";
  if (ct.includes("welfare check") || ct.includes("person down")) return "Check on an individual's welfare at the location.";

  if (cf.includes("medical") || ct.includes("medical aid")) {
    if (ct.startsWith("1a")) return "Low-acuity medical; 1 engine + 1 medic responding.";
    if (ct.startsWith("2a")) return "Moderate medical; 2 engines + 1 medic responding.";
    if (ct.startsWith("3a")) return "High-acuity medical (possible cardiac/trauma); full ALS response.";
    if (ct.startsWith("4a")) return "Mass casualty or critical multi-unit medical response.";
    return "Medical emergency; EMS and fire response dispatched.";
  }

  if (ct.includes("single engine response")) return "Low-priority call; single fire engine responding.";
  if (ct.includes("single resource")) return "Single unit response; routine low-acuity call.";

  if (cf.includes("duty mechanic")) return "Mechanical support dispatched for apparatus issues.";
  if (cf.includes("fire system service")) return "Fire suppression system maintenance or service call.";

  if (ct.includes("assault") || cf.includes("assault")) return "Physical assault reported; police responding.";
  if (ct.includes("robbery") || cf.includes("robbery")) return "Robbery in progress or just occurred; police responding.";
  if (ct.includes("shooting") || cf.includes("shooting")) return "Shots fired or shooting victim reported.";
  if (ct.includes("stabbing")) return "Stabbing victim reported; medical and police responding.";
  if (ct.includes("disturbance") || ct.includes("disturbing peace")) return "Noise or disturbance complaint; police responding.";
  if (ct.includes("suspicious") || cf.includes("suspicious")) return "Suspicious person, vehicle, or activity reported.";
  if (ct.includes("theft") || ct.includes("car theft")) return "Theft reported; police investigation required.";
  if (ct.includes("burglary")) return "Burglary reported or in progress; police responding.";
  if (ct.includes("trespass")) return "Trespassing reported; police responding.";
  if (ct.includes("dui") || ct.includes("drunk driver")) return "DUI or impaired driver reported; traffic stop likely.";
  if (ct.includes("citizen contact")) return "Officer-requested civilian contact; non-emergency.";
  if (ct.includes("tamper")) return "Tampering with vehicle or property reported.";

  return "Dispatch call responded to by assigned units.";
}
