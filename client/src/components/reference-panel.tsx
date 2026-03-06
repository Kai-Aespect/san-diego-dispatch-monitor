export function ReferencePanel() {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="px-4 pt-4 pb-3 border-b border-white/5 shrink-0">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reference Guide</h3>
      </div>
      <div className="p-4 space-y-6 text-xs">

        <section>
          <h4 className="font-bold border-b border-white/10 pb-1 mb-2 text-sm text-foreground">SDFD Response Levels</h4>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="font-mono font-bold text-emerald-400 w-7 shrink-0">1a</span>
              <div><span className="text-foreground font-semibold">Basic Response</span> — 1 Engine + 1 Medic. Standard low-acuity medical or minor incident.</div>
            </div>
            <div className="flex gap-2">
              <span className="font-mono font-bold text-amber-400 w-7 shrink-0">2a</span>
              <div><span className="text-foreground font-semibold">Enhanced Response</span> — 2 Engines + 1 Medic. Moderate-severity call requiring additional resources.</div>
            </div>
            <div className="flex gap-2">
              <span className="font-mono font-bold text-orange-400 w-7 shrink-0">3a</span>
              <div><span className="text-foreground font-semibold">Critical Response</span> — 2 Engines + 2 Medics + 1 Battalion Chief. High-acuity medical (e.g. cardiac arrest).</div>
            </div>
            <div className="flex gap-2">
              <span className="font-mono font-bold text-red-400 w-7 shrink-0">4a</span>
              <div><span className="text-foreground font-semibold">Major Incident</span> — 3+ Engines + 2+ Medics + BC. Multi-victim, structure fire, or mass casualty.</div>
            </div>
          </div>
        </section>

        <section>
          <h4 className="font-bold border-b border-white/10 pb-1 mb-2 text-sm text-foreground">Common SDFD Call Types</h4>
          <div className="space-y-1 font-mono">
            {[
              ["Medical Aid",            "General medical emergency — covers all 1a/2a/3a levels."],
              ["Structure Fire",         "Building fire requiring engine and truck companies."],
              ["Brush/Vegetation Fire",  "Wildland or brush fire; may involve multiple agencies."],
              ["Traffic Accidents",      "Vehicle collision, may involve extrication."],
              ["Ringing Alarm",          "Automated fire alarm activation — usually investigated by 1 engine."],
              ["Rubbish Fire",           "Small outdoor debris or dumpster fire."],
              ["Carbon Monoxide Alarm",  "CO detector activation; life-safety investigation."],
              ["Lift Assist",            "Assist a person who has fallen and cannot get up."],
              ["Lock in/out",            "Assist entry to/from locked structure."],
              ["Smoke Check",            "Investigate reported smoke odor or visible smoke."],
              ["Stand Back Hold",        "Units staged but not yet dispatched; scene not yet safe."],
              ["Advised Incident",       "Informational dispatch; no active response required."],
              ["Structure Highrise",     "Fire/medical response in a high-rise building (special protocol)."],
              ["Single Engine Response", "Routine low-priority call requiring only 1 engine."],
              ["Single Resource",        "Requires only 1 unit of any type."],
              ["US&R",                   "Urban Search & Rescue — collapse, confined space."],
              ["Hazmat",                 "Hazardous materials incident."],
            ].map(([name, def]) => (
              <div key={name} className="flex gap-2">
                <span className="text-primary font-bold shrink-0 w-36">{name}</span>
                <span className="text-muted-foreground leading-snug">{def}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="font-bold border-b border-white/10 pb-1 mb-2 text-sm text-foreground">Unit Type Legend</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono">
            <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-10">E</span> Engine Co.</div>
            <div className="flex items-center gap-2"><span className="text-red-400 font-bold w-10">T</span> Truck / Ladder</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-10">M</span> Medic (ALS)</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-10">BLS</span> Basic Life Support</div>
            <div className="flex items-center gap-2"><span className="text-emerald-400 font-bold w-10">R</span> Rescue</div>
            <div className="flex items-center gap-2"><span className="text-amber-400 font-bold w-10">B</span> Battalion Chief</div>
            <div className="flex items-center gap-2"><span className="text-blue-400 font-bold w-10">BR</span> Brush Engine</div>
            <div className="flex items-center gap-2"><span className="text-purple-400 font-bold w-10">HZM</span> Hazmat</div>
            <div className="flex items-center gap-2"><span className="text-cyan-400 font-bold w-10">WT</span> Water Tender</div>
            <div className="flex items-center gap-2"><span className="text-pink-400 font-bold w-10">USR</span> Urban S&R</div>
            <div className="flex items-center gap-2"><span className="text-slate-400 font-bold w-10">Dm</span> Duty Mechanic</div>
            <div className="flex items-center gap-2"><span className="text-orange-400 font-bold w-10">HRTE</span> Heavy Rescue Tech</div>
            <div className="flex items-center gap-2"><span className="text-yellow-400 font-bold w-10">SQ</span> Squad Co.</div>
            <div className="flex items-center gap-2"><span className="text-sky-400 font-bold w-10">AIR</span> Air Operations</div>
          </div>
        </section>

        <section>
          <h4 className="font-bold border-b border-white/10 pb-1 mb-2 text-sm text-foreground">Common 10-Codes</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
            <div><span className="text-primary">10-4</span>  Acknowledged / OK</div>
            <div><span className="text-primary">10-7</span>  Out of Service</div>
            <div><span className="text-primary">10-8</span>  In Service / Available</div>
            <div><span className="text-primary">10-19</span> Return to Station</div>
            <div><span className="text-primary">10-20</span> Location / Position</div>
            <div><span className="text-primary">10-21</span> Call by Telephone</div>
            <div><span className="text-primary">10-22</span> Disregard / Cancel</div>
            <div><span className="text-primary">10-23</span> Stand By</div>
            <div><span className="text-primary">10-87</span> Meet an Officer</div>
            <div><span className="text-primary">10-97</span> Arrived on Scene</div>
            <div><span className="text-primary">10-98</span> Finished Assignment</div>
            <div><span className="text-primary">Code 4</span> No further assistance</div>
          </div>
        </section>

        <section>
          <h4 className="font-bold border-b border-white/10 pb-1 mb-2 text-sm text-foreground">SDPD Radio Codes</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
            <div><span className="text-blue-400">Code 1</span> Non-emergency</div>
            <div><span className="text-blue-400">Code 2</span> Urgent, no lights</div>
            <div><span className="text-blue-400">Code 3</span> Emergency, lights+siren</div>
            <div><span className="text-blue-400">Code 5</span> Surveillance / stakeout</div>
            <div><span className="text-blue-400">Code 6</span> Out of vehicle/investigating</div>
            <div><span className="text-blue-400">Code 7</span> Out for meal</div>
            <div><span className="text-blue-400">207</span>  Kidnapping</div>
            <div><span className="text-blue-400">211</span>  Robbery in progress</div>
            <div><span className="text-blue-400">245</span>  Assault with deadly weapon</div>
            <div><span className="text-blue-400">415</span>  Disturbance / Disorderly</div>
            <div><span className="text-blue-400">459</span>  Burglary</div>
            <div><span className="text-blue-400">484</span>  Theft</div>
            <div><span className="text-blue-400">487</span>  Grand Theft</div>
            <div><span className="text-blue-400">496</span>  Receiving stolen property</div>
            <div><span className="text-blue-400">503</span>  Vehicle theft</div>
            <div><span className="text-blue-400">594</span>  Vandalism / Malicious mischief</div>
            <div><span className="text-blue-400">647f</span> Drunk in public</div>
            <div><span className="text-blue-400">5150</span> Mental health hold (5150 W&I)</div>
          </div>
        </section>

      </div>
    </div>
  );
}
